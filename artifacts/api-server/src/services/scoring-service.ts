// scoring-service.ts
// Encapsulates the full scoreSupplier pipeline:
//   1. Build AI input from DB (via buildScoringInput)
//   2. Call Claude for export readiness score
//   3. Validate AI output fields
//   4. Write ai_outputs row
//   5. Send WhatsApp confirmation (non-fatal if it fails)
//   6. Retry up to 3 times with exponential backoff on any failure

import { db, aiOutputsTable, supplierRequirementStatusTable, productsTable, complianceDocsTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
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
        max_tokens: 768,
        system: [{ type: "text", text: SCORING_PROMPT, cache_control: { type: "ephemeral" } }],
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
          confidenceLevel: parsed.confidence_level ?? null,
          dataCompleteness:
            typeof parsed.data_completeness === "number"
              ? parsed.data_completeness
              : null,
          evidenceTier: parsed.evidence_tier ?? "SELF_REPORTED",
        })
        .returning();

      // Seed supplier_requirement_status work items from AI-detected gaps.
      // gap present in AI list → seed a "not_started" row for the field officer.
      // gap absent from AI list → no action taken.
      //   IMPORTANT: AI gap absence is NOT evidence of compliance. compliance_docs
      //   booleans are written only by the onboarding form and admin review — never
      //   by AI scoring output. The !gapSet.has() pattern must never appear here.
      // onConflictDoNothing: re-scoring must never reset officer progress.
      // Non-fatal: a write-back failure must not abort the scoring pipeline.
      try {
        // Normalize AI-returned gap codes to canonical AGENCY_MAP keys.
        // Claude returns field-guide names (camelCase e.g. "fitosanitarioCert",
        // "dianExportador") or descriptive strings ("fitosanitarioCert — …").
        // Strip the description suffix, then map known aliases to canonical codes.
        const GAP_CODE_ALIAS: Record<string, string> = {
          RUTDIAN: "DIAN_RUT",
          DIANRUT: "DIAN_RUT",
          DIANEXPORTADOR: "DIAN_EXPORTADOR",
          FITOSANITARIOCERT: "FITOSANITARIO",
          FITOSANITARIO_CERT: "FITOSANITARIO",
          ICAREGISTRO: "ICA_REGISTRO",
          ICACONTEXT: "ICA_CONTEXT",
          FNCCOFFEE: "FNC_COFFEE",
          FNC_CAFE: "FNC_COFFEE",
          INVIMA_REGISTRO: "INVIMA",
          INVIMAREGISTRO: "INVIMA",
        };

        const gapSet = new Set<string>(
          Array.isArray(parsed.compliance_gaps)
            ? parsed.compliance_gaps.map((g: string) => {
                // Strip " — description" or ": description" suffixes
                const rawCode = String(g).replace(/[\s\u2014\-:].*/u, "").trim().toUpperCase();
                return GAP_CODE_ALIAS[rawCode] ?? rawCode;
              })
            : [],
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
          INVIMA: "INVIMA",
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
            "scoreSupplier: supplier_requirement_status work items seeded from AI-detected gaps",
          );
        }

        // INVIMA seeding — deterministic rule, independent of AI gap list.
        // Triggered when the supplier's primary crop or existing products belong
        // to EXOTIC_FRUIT (dried/packaged), SUPERFOOD, or PROCESSED categories.
        // onConflictDoNothing: re-scoring must never reset officer progress.
        const INVIMA_CULTIVO_KEYWORDS = [
          "procesado", "processed", "tostado", "roasted", "chocolate",
          "mermelada", "conserva", "pulpa", "deshidratado", "dried",
          "snack", "harina", "flour", "superfood", "superalimento",
          "spirulina", "espirulina", "moringa", "acai", "açaí", "maca", "camu",
        ];
        const INVIMA_PRODUCT_CATEGORIES = new Set(["SUPERFOOD", "PROCESSED", "EXOTIC_FRUIT"]);

        const cultivoNorm = (farm?.cultivoPrincipal ?? "").toLowerCase();
        const cultivoTriggersInvima = INVIMA_CULTIVO_KEYWORDS.some((kw) =>
          cultivoNorm.includes(kw),
        );

        let productTriggersInvima = false;
        if (!cultivoTriggersInvima) {
          const productRows = await db
            .select({ category: productsTable.category })
            .from(productsTable)
            .where(eq(productsTable.supplierId, supplierId));
          productTriggersInvima = productRows.some((p) =>
            INVIMA_PRODUCT_CATEGORIES.has(p.category),
          );
        }

        if (cultivoTriggersInvima || productTriggersInvima) {
          await db
            .insert(supplierRequirementStatusTable)
            .values({ supplierId, requirementCode: "INVIMA", agency: "INVIMA", state: "not_started" })
            .onConflictDoNothing();
          logger.info(
            { supplierId, source: cultivoTriggersInvima ? "cultivo" : "products" },
            "scoreSupplier: INVIMA requirement seeded (processed/packaged product category)",
          );
        }

        // FIN-019: write AI-detected gaps back to compliance_docs booleans.
        // Only the negative direction: gap detected → set field to false.
        // Never sets a field to true from AI output (absence of gap ≠ compliance).
        // Guard: skip fields where supplier_requirement_status is already
        // verified or conditionally_approved (admin has confirmed the document).
        const GAP_TO_COMPLIANCE_FIELD: Record<string, keyof typeof complianceDocsTable.$inferInsert> = {
          DIAN_RUT:        "rutDian",
          ICA_REGISTRO:    "icaRegistro",
          FITOSANITARIO:   "fitosanitarioCert",
          DIAN_EXPORTADOR: "dianExportador",
        };
        const relevantGaps = [...gapSet].filter((code) => code in GAP_TO_COMPLIANCE_FIELD);

        if (relevantGaps.length > 0) {
          // Fetch current requirement states to guard against downgrading admin-verified docs.
          const currentStates = await db
            .select({
              requirementCode: supplierRequirementStatusTable.requirementCode,
              state:           supplierRequirementStatusTable.state,
            })
            .from(supplierRequirementStatusTable)
            .where(
              and(
                inArray(supplierRequirementStatusTable.requirementCode, relevantGaps),
                eq(supplierRequirementStatusTable.supplierId, supplierId)
              )
            );

          const stateMap = new Map(currentStates.map((r) => [r.requirementCode, r.state]));
          const PROTECTED_STATES = new Set(["verified", "conditionally_approved"]);

          const fieldsToFalse: Partial<Record<string, boolean>> = {};
          for (const code of relevantGaps) {
            const state = stateMap.get(code);
            if (!PROTECTED_STATES.has(state ?? "")) {
              const field = GAP_TO_COMPLIANCE_FIELD[code]!;
              fieldsToFalse[field] = false;
            }
          }

          if (Object.keys(fieldsToFalse).length > 0) {
            await db
              .update(complianceDocsTable)
              .set(fieldsToFalse)
              .where(eq(complianceDocsTable.supplierId, supplierId));
            logger.info(
              { supplierId, fields: Object.keys(fieldsToFalse) },
              "FIN-019: compliance_docs updated from AI-detected gaps",
            );
          }
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
