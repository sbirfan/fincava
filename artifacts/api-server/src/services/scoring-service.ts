// scoring-service.ts
// Encapsulates the full scoreSupplier pipeline:
//   1. Build AI input from DB (via buildScoringInput)
//   2. Call Claude for export readiness score
//   3. Validate AI output fields
//   4. Write ai_outputs row
//   5. Send WhatsApp confirmation (non-fatal if it fails)
//   6. Retry up to 3 times with exponential backoff on any failure

import { db, aiOutputsTable, complianceDocsTable, supplierRequirementStatusTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAnthropicClient, SCORING_MODEL } from "../lib/anthropic";
import { sendWhatsAppMessage } from "../lib/whatsapp";
import { logger } from "../lib/logger";
import { buildScoringInput } from "./scoring-input";
import { SCORING_PROMPT } from "../config/scoring-prompts";

const VALID_AI_PATHWAYS = ["A", "B", "C", "D"] as const;

export async function scoreSupplier(supplierId: number): Promise<void> {
  const attemptScore = async (attempt = 1): Promise<void> => {
    try {
      const { supplier, farm, economics, compliance, ingestion } = await buildScoringInput(supplierId);

      if (!supplier) {
        throw new Error(`scoreSupplier: supplier ${supplierId} not found in DB`);
      }

      if (process.env.NODE_ENV !== "production") {
        logger.debug(
          { supplierId, aiInput: JSON.stringify({ supplier, farm, economics, compliance, ingestion }) },
          "scoreSupplier AI input",
        );
      }

      const client = getAnthropicClient();
      const start = Date.now();
      const message = await client.messages.create({
        model: SCORING_MODEL,
        max_tokens: 512,
        system: SCORING_PROMPT,
        messages: [
          {
            role: "user",
            content: JSON.stringify({ supplier, farm, economics, compliance, ingestion }),
          },
        ],
      });
      const duration = Date.now() - start;
      logger.info({ supplierId, duration }, "scoreSupplier latency");

      const raw = (message.content[0] as any).text as string;
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      const parsed = JSON.parse(jsonStr);

      if (!Number.isFinite(parsed.export_readiness_score)) {
        throw new Error(
          `Invalid export_readiness_score from Claude: ${JSON.stringify(parsed.export_readiness_score)}`,
        );
      }

      if (!(VALID_AI_PATHWAYS as readonly string[]).includes(parsed.pathway)) {
        logger.warn(
          { supplierId, rawPathway: parsed.pathway },
          "scoreSupplier: Claude returned invalid pathway — storing null",
        );
        parsed.pathway = null;
      }

      const [scoreRow] = await db
        .insert(aiOutputsTable)
        .values({
          supplierId,
          aiModel: SCORING_MODEL,
          callType: "ONBOARD_SCORE",
          exportReadinessScore: parsed.export_readiness_score,
          pathway: parsed.pathway,
          capitalCapacityCop: parsed.capital_capacity_cop,
          complianceGaps: parsed.compliance_gaps?.join(", "),
          gapAnalysis: parsed.gap_analysis,
        })
        .returning();

      // CC-1A: Parse compliance gaps from AI output and write back to compliance_docs.
      // Gap present in list = supplier is NOT compliant for that requirement (false).
      // Gap absent from list = supplier IS compliant (true).
      // Non-fatal: a write-back failure must not abort the scoring pipeline.
      try {
        const gapSet = new Set<string>(
          Array.isArray(parsed.compliance_gaps)
            ? parsed.compliance_gaps.map((g: string) => String(g).toUpperCase())
            : [],
        );
        await db
          .insert(complianceDocsTable)
          .values({
            supplierId,
            rutDian: !gapSet.has("DIAN_RUT"),
            icaRegistro: !gapSet.has("ICA_REGISTRO"),
            fitosanitarioCert: !gapSet.has("FITOSANITARIO"),
            dianExportador: !gapSet.has("DIAN_EXPORTADOR"),
          })
          .onConflictDoUpdate({
            target: complianceDocsTable.supplierId,
            set: {
              rutDian: !gapSet.has("DIAN_RUT"),
              icaRegistro: !gapSet.has("ICA_REGISTRO"),
              fitosanitarioCert: !gapSet.has("FITOSANITARIO"),
              dianExportador: !gapSet.has("DIAN_EXPORTADOR"),
            },
          });
        logger.info(
          { supplierId, gaps: [...gapSet] },
          "scoreSupplier: compliance_docs updated from AI gaps (CC-1A)",
        );

        // CC-1A Part 2: Seed supplier_requirement_status rows for each gap code.
        // onConflictDoNothing — re-scoring must never reset officer progress.
        const AGENCY_MAP: Record<string, string> = {
          DIAN_RUT: "DIAN",
          DIAN_EXPORTADOR: "DIAN",
          ICA_REGISTRO: "ICA",
          ICA_CONTEXT: "ICA",
          FITOSANITARIO: "ICA",
          FNC_COFFEE: "FNC",
        };
        const requirementRows = [...gapSet]
          .filter((code) => code in AGENCY_MAP)
          .map((code) => ({
            supplierId,
            requirementCode: code,
            agency: AGENCY_MAP[code]!,
            state: "not_started" as const,
          }));
        if (requirementRows.length > 0) {
          await db
            .insert(supplierRequirementStatusTable)
            .values(requirementRows)
            .onConflictDoNothing();
          logger.info(
            { supplierId, count: requirementRows.length },
            "scoreSupplier: supplier_requirement_status seeded from AI gaps (CC-1A Part 2)",
          );
        }
      } catch (complianceErr) {
        logger.warn(
          { supplierId, err: complianceErr },
          "scoreSupplier: compliance write-back failed (non-fatal)",
        );
      }

      try {
        if (!supplier.whatsappNumber) {
          logger.warn({ supplierId }, "scoreSupplier: skipping WhatsApp send — no phone number");
          return;
        }
        const waBody =
          `Hola ${supplier.nombreCompleto}, tu registro en Fincava fue exitoso ✅\n` +
          `Puntaje de exportación: ${parsed.export_readiness_score}/100\n` +
          `Camino asignado: ${parsed.pathway ?? "N/A"}\n` +
          `Nos pondremos en contacto pronto. — Equipo Fincava`;
        const sid = await sendWhatsAppMessage(supplier.whatsappNumber, waBody);
        await db
          .update(aiOutputsTable)
          .set({ whatsappMessageSent: sid })
          .where(eq(aiOutputsTable.id, scoreRow.id));
      } catch (waErr) {
        logger.warn({ supplierId, err: waErr }, "scoreSupplier: WhatsApp send failed (non-fatal)");
      }
    } catch (err: any) {
      if (attempt < 3) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        logger.info({ supplierId, attempt, delay }, "scoreSupplier retry scheduled");
        await new Promise((r) => setTimeout(r, delay));
        return attemptScore(attempt + 1);
      }
      logger.error({ supplierId, err }, "scoreSupplier failed after retries");
      try {
        (globalThis as any).Sentry?.captureException?.(err);
      } catch {}
    }
  };

  await attemptScore();
}
