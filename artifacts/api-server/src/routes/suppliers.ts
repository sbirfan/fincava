import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  suppliersTable,
  farmsTable,
  economicsTable,
  complianceDocsTable,
  aiOutputsTable,
  interactionsTable,
  supplierEvaluationsTable,
  supplierStateTransitionsTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  sendEmail,
  supplierApplicationConfirmationEmail,
  supplierApplicationAdminAlertEmail,
} from "../lib/email";
import { requireAdmin } from "../middleware/admin";
import { getAnthropicClient, SCORING_MODEL, DOCUMENT_MODEL } from "../lib/anthropic";
import { sendWhatsAppMessage } from "../lib/whatsapp";
import { parsePagination } from "../schemas";
import { desc, eq, and, gte, lte, sql, count, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  evaluateSupplier,
  transitionTo,
  markPublished,
  NotFoundError,
} from "../services/supplier-graduation-service";
import { buildScoringInput } from "../services/scoring-input";
import type { SupplierOnboardingInput } from "../types/supplier-onboarding";

const router: IRouter = Router();

// ── POST /api/suppliers/onboard ─────────────────────────────────────────────
router.post("/suppliers/onboard", async (req, res): Promise<void> => {
  try {
    const rawBody: Record<string, any> = req.body;

    // T1: canonical input normalization — rawBody remains execution layer
    // typedInput is contract surface for T2 (scoring) and T3 (validation)
    // T4 will migrate DB writes
    // RUT MAPPING NOTE: typedInput.rutDian maps to rawBody.has_rut (metadata-level signal only).
    // It does NOT reflect compliance_docs.rut_dian used by the eligibility gate.
    // This mismatch will be resolved in T4 (compliance alignment).
    // TODO (T2): use typedInput to build scoring input contract
    const typedInput: Partial<SupplierOnboardingInput> = {
      fullName: rawBody.contact_name || rawBody.nombreCompleto,
      phone: rawBody.phone || rawBody.whatsappNumber,
      farmSizeHectares: rawBody.farm_size_hectares,
      locationRegion: rawBody.municipio,
      yearsOfExperience: rawBody.farm?.anosEnFinca,
      productType: rawBody.primary_product,
      monthlyVolumeKg: rawBody.annual_volume_kg,
      harvestMonths: rawBody.harvest_months,
      processingMethod: rawBody.farm?.metodoSecado,
      rutDian: rawBody.has_rut,
      icaRegistro: rawBody.ica_registered,
      pricePerKg: rawBody.economics?.precioVentaBanda,
    };

    if (process.env.NODE_ENV !== "production") {
      console.log("typedInput preview", {
        fullName: typedInput.fullName,
        phone: typedInput.phone,
        productType: typedInput.productType,
      });
    }

    // Accept both English (new form) and Spanish (legacy) field names
    const nombreCompleto = rawBody.contact_name || rawBody.nombreCompleto || "";
    const whatsappNumber = rawBody.phone || rawBody.whatsappNumber || "";
    const municipio = rawBody.municipio || "";
    const vereda = rawBody.vereda ?? null;
    const supplierType = rawBody.supplier_type || rawBody.supplierType || "FARMER";
    const registeredBy = rawBody.officer_name || rawBody.registeredBy || null;

    if (!nombreCompleto || !whatsappNumber || !municipio) {
      res.status(400).json({
        error: "Missing required fields: contact_name, phone, municipio",
      });
      return;
    }

    const supplierEmail =
      typeof rawBody.email === "string" && rawBody.email.trim()
        ? rawBody.email.trim().toLowerCase()
        : null;

    const [supplier] = await db
      .insert(suppliersTable)
      .values({
        nombreCompleto,
        whatsappNumber,
        email: supplierEmail,
        municipio,
        department: rawBody.department ?? null,
        vereda,
        supplierType: supplierType.toUpperCase(),
        registeredBy,
        consentGiven: rawBody.consentGiven ?? true,
        consentDate: new Date(),
      })
      .returning();

    // Farm data — map English or Spanish field names
    const primaryProduct =
      rawBody.primary_product || rawBody.farm?.cultivoPrincipal || null;
    const farmSize =
      rawBody.farm_size_hectares?.toString() ||
      rawBody.farm?.hectareasProduccion?.toString() ||
      null;
    const annualVolume =
      rawBody.annual_volume_kg || rawBody.farm?.volumenKgUltimaCosecha || null;

    await db.insert(farmsTable).values({
      supplierId: supplier.id,
      cultivoPrincipal: primaryProduct,
      variedadCafe: rawBody.harvest_months || rawBody.farm?.variedadCafe || null,
      hectareasProduccion: farmSize,
      edadPlantasAnos: rawBody.farm?.edadPlantasAnos ?? null,
      cosechasPorAno: rawBody.farm?.cosechasPorAno ?? null,
      metodoSecado: rawBody.farm?.metodoSecado ?? null,
      accesoAgua: rawBody.farm?.accesoAgua ?? null,
      anosEnFinca: rawBody.farm?.anosEnFinca ?? null,
      tenenciaTierra: rawBody.farm?.tenenciaTierra ?? null,
      asistenciaTecnica: rawBody.farm?.asistenciaTecnica ?? null,
    });

    // Economics
    await db.insert(economicsTable).values({
      supplierId: supplier.id,
      tipoComprador:
        rawBody.currently_exporting === "yes"
          ? "EXPORT"
          : (rawBody.economics?.tipoComprador ?? null),
      volumenKgUltimaCosecha: annualVolume ? Number(annualVolume) : null,
      precioVentaBanda: rawBody.economics?.precioVentaBanda ?? null,
      tiempoPagoDias: rawBody.economics?.tiempoPagoDias ?? null,
      deudaActual:
        rawBody.working_capital_needed?.toString() ||
        rawBody.economics?.deudaActual ||
        null,
      usoCapital: Array.isArray(rawBody.economics?.usoCapital)
        ? rawBody.economics.usoCapital
        : rawBody.export_blocker
          ? [rawBody.export_blocker]
          : null,
      comodidadPagos: rawBody.economics?.comodidadPagos ?? null,
      personasDependientes: rawBody.economics?.personasDependientes ?? null,
      otrasFuentesIngreso: rawBody.economics?.otrasFuentesIngreso ?? null,
      situacionEconomica: rawBody.economics?.situacionEconomica ?? null,
      interesCanalPremium: rawBody.economics?.interesCanalPremium ?? null,
      conocePrecioExportacion: rawBody.economics?.conocePrecioExportacion ?? null,
      haIntentadoExportar:
        rawBody.currently_exporting === "yes"
          ? true
          : rawBody.currently_exporting === "no"
            ? false
            : (rawBody.economics?.haIntentadoExportar ?? null),
    });

    // ica_registered is submitted as body.ica_registered (flat, root level) from Step 3.
    // Frontend sends string "yes" | "no" | undefined (ica_registered was not given the
    // === "yes" boolean conversion that organic_certified and currently_exporting received).
    // Direct API callers may send boolean true. Both forms are treated as positive intent.
    const icaRegisteredTrue =
      rawBody.ica_registered === true || rawBody.ica_registered === "yes";

    // Idempotent initialization:
    // ON CONFLICT DO NOTHING ensures this never clobbers an existing compliance row.
    // icaRegistro seeded from onboarding body for new rows.
    await db
      .insert(complianceDocsTable)
      .values({
        supplierId: supplier.id,
        icaRegistro: icaRegisteredTrue,
      })
      .onConflictDoNothing({ target: complianceDocsTable.supplierId });

    // ICA sync — Epic 2 Precondition
    // If the supplier declares ica_registered, ensure compliance_docs reflects this
    // regardless of whether the row was just created or already existed.
    // Only syncs true → never downgrades an admin-set value.
    // Re-onboarding not supported in v0.
    // This UPDATE handles the case where compliance_docs row pre-existed from a
    // prior admin operation. If re-onboarding is added in future, re-evaluate this path.
    if (icaRegisteredTrue) {
      await db
        .update(complianceDocsTable)
        .set({ icaRegistro: true })
        .where(eq(complianceDocsTable.supplierId, supplier.id));
      logger.info(
        { supplierId: supplier.id, field: "ica_registered", source: "body.ica_registered" },
        "ICA sync applied from onboarding metadata",
      );
    }

    await db.insert(interactionsTable).values({
      supplierId: supplier.id,
      interactionType: "FORM_SUBMISSION",
      actor: registeredBy ?? "SELF",
      notes: rawBody.visit_notes || "Initial onboarding form submitted",
      metadata: {
        officer_code:        rawBody.officer_code        ?? null,
        department:          rawBody.department          ?? null,
        organic_certified:   rawBody.organic_certified   ?? null,
        has_rut:             rawBody.has_rut             ?? null,
        has_bank_account:    rawBody.has_bank_account    ?? null,
        business_structure:  rawBody.business_structure  ?? null,
        part_of_cooperative: rawBody.part_of_cooperative ?? null,
        vuce_registered:     rawBody.vuce_registered     ?? null,
        invima_required:     rawBody.invima_required     ?? null,
        invima_approved:     rawBody.invima_approved     ?? null,
        ica_registered:      rawBody.ica_registered      ?? null,
      },
    });

    res.status(201).json({
      success: true,
      supplierId: supplier.id,
      message: `Registration successful for ${nombreCompleto}`,
    });

    // ── Post-onboard emails (fire-and-forget, runs after response) ───────────
    const appBaseUrl = process.env["FRONTEND_URL"]
      ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");
    const adminUrl = `${appBaseUrl}/admin/suppliers`;

    if (supplierEmail) {
      const { html, text } = supplierApplicationConfirmationEmail({
        name: nombreCompleto,
        municipio,
        primaryProduct,
      });
      sendEmail({
        to: supplierEmail,
        subject: "Hemos recibido su solicitud — Fincava",
        html,
        text,
      }).catch((err) => logger.warn({ err, supplierId: supplier.id }, "Supplier confirmation email failed"));
    }

    const farmName = rawBody.farm_name || rawBody.business_name || null;
    const adminAlertContent = supplierApplicationAdminAlertEmail({
      name: nombreCompleto,
      farmName,
      phone: whatsappNumber,
      email: supplierEmail,
      municipio,
      department: rawBody.department ?? null,
      primaryProduct,
      supplierId: supplier.id,
      adminUrl,
    });
    sendEmail({
      to: "info@fincava.com",
      subject: `New supplier application — ${nombreCompleto}`,
      ...adminAlertContent,
    }).catch((err) => logger.warn({ err, supplierId: supplier.id }, "Admin alert email failed"));

    // ── Post-onboard pipeline (sequential, post-response) ────────────────────
    // scoreSupplier must complete before evaluateSupplier runs — evaluation
    // requires the ai_outputs row that scoring writes. Both run after the
    // response is sent so handler latency is unaffected.
    const sid = supplier.id;
    const correlationId = crypto.randomUUID();

    logger.info({ supplierId: sid, correlationId }, "post-onboard pipeline starting");

    setImmediate(() => {
      (async () => {
        try {
          await scoreSupplier(sid);

          const hasScore = await db
            .select()
            .from(aiOutputsTable)
            .where(eq(aiOutputsTable.supplierId, sid))
            .limit(1);

          if (!hasScore.length) {
            logger.warn({ supplierId: sid, correlationId }, "Skipping evaluation — no AI score");
            return;
          }

          await evaluateSupplier(sid);
          logger.info({ supplierId: sid, correlationId }, "post-onboard pipeline succeeded");
        } catch (err: any) {
          logger.warn({ supplierId: sid, correlationId, err }, "post-onboard pipeline failed");
          try { (globalThis as any).Sentry?.captureException?.(err); } catch {}
        }
      })();
    });
  } catch (err: any) {
    console.error("Onboard error:", err);
    if (err.code === "23505" || err.cause?.code === "23505") {
      res
        .status(409)
        .json({ error: "This phone number is already registered" });
      return;
    }
    res.status(500).json({ error: err.message || "Error saving profile" });
  }
});

// ── GET /api/suppliers/admin-list ────────────────────────────────────────────
router.get(
  "/suppliers/admin-list",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const { pathway, municipio, from, to } = req.query as Record<string, string>;
    const { page, limit, offset } = parsePagination(req.query);

    const latestScores = db
      .selectDistinctOn([aiOutputsTable.supplierId], {
        supplierId: aiOutputsTable.supplierId,
        exportReadinessScore: aiOutputsTable.exportReadinessScore,
        pathway: aiOutputsTable.pathway,
        capitalCapacityCop: aiOutputsTable.capitalCapacityCop,
        complianceGaps: aiOutputsTable.complianceGaps,
        gapAnalysis: aiOutputsTable.gapAnalysis,
        scoredAt: aiOutputsTable.createdAt,
        whatsappMessageSent: aiOutputsTable.whatsappMessageSent,
      })
      .from(aiOutputsTable)
      .where(eq(aiOutputsTable.callType, "ONBOARD_SCORE"))
      .orderBy(aiOutputsTable.supplierId, desc(aiOutputsTable.createdAt))
      .as("latest_scores");

    const conditions = [];
    if (pathway) conditions.push(eq(latestScores.pathway, pathway));
    if (municipio) conditions.push(eq(suppliersTable.municipio, municipio));
    if (from) conditions.push(gte(suppliersTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(suppliersTable.createdAt, new Date(to)));

    let query = db
      .select({
        id: suppliersTable.id,
        nombreCompleto: suppliersTable.nombreCompleto,
        contactName: suppliersTable.nombreCompleto,
        phone: suppliersTable.whatsappNumber,
        department: suppliersTable.department,
        municipio: suppliersTable.municipio,
        supplierType: suppliersTable.supplierType,
        status: suppliersTable.status,
        createdAt: suppliersTable.createdAt,
        primaryProduct: farmsTable.cultivoPrincipal,
        exportReadinessScore: latestScores.exportReadinessScore,
        pathway: latestScores.pathway,
        capitalCapacityCop: latestScores.capitalCapacityCop,
        complianceGaps: latestScores.complianceGaps,
        gapAnalysis: latestScores.gapAnalysis,
        whatsappMessageSent: latestScores.whatsappMessageSent,
      })
      .from(suppliersTable)
      .leftJoin(farmsTable, eq(farmsTable.supplierId, suppliersTable.id))
      .leftJoin(latestScores, eq(latestScores.supplierId, suppliersTable.id))
      .orderBy(desc(suppliersTable.createdAt))
      .$dynamic();

    if (conditions.length) query = query.where(and(...conditions));

    const [data, [{ total }], [summary]] = await Promise.all([
      query.limit(limit).offset(offset),
      db.select({ total: count() }).from(suppliersTable),
      db
        .select({
          total: sql<number>`count(*)::int`,
          totalCapital: sql<number>`coalesce(sum(${latestScores.capitalCapacityCop}), 0)::int`,
          pathwayA: sql<number>`count(*) filter (where ${latestScores.pathway} = 'A')::int`,
          pathwayB: sql<number>`count(*) filter (where ${latestScores.pathway} = 'B')::int`,
          pathwayC: sql<number>`count(*) filter (where ${latestScores.pathway} = 'C')::int`,
          pathwayD: sql<number>`count(*) filter (where ${latestScores.pathway} = 'D')::int`,
        })
        .from(suppliersTable)
        .leftJoin(latestScores, eq(latestScores.supplierId, suppliersTable.id)),
    ]);

    res.json({ summary, data, total: Number(total), page, limit, totalPages: Math.max(1, Math.ceil(Number(total) / limit)) });
  },
);

// ── POST /api/suppliers/:id/generate-document ────────────────────────────────
router.post(
  "/suppliers/:id/generate-document",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const supplierId = Number(req.params.id);
    try {
      const [supplier] = await db
        .select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, supplierId));
      if (!supplier) {
        res.status(404).json({ error: "Supplier not found" });
        return;
      }

      const [farm] = await db
        .select()
        .from(farmsTable)
        .where(eq(farmsTable.supplierId, supplierId));
      const [compliance] = await db
        .select()
        .from(complianceDocsTable)
        .where(eq(complianceDocsTable.supplierId, supplierId));
      const [latestScore] = await db
        .select()
        .from(aiOutputsTable)
        .where(eq(aiOutputsTable.supplierId, supplierId))
        .orderBy(desc(aiOutputsTable.createdAt))
        .limit(1);

      const client = getAnthropicClient();
      const message = await client.messages.create({
        model: DOCUMENT_MODEL,
        max_tokens: 1500,
        system: `You are a Colombian agricultural export compliance specialist. Write a personalised export compliance guide in plain Spanish for a smallholder farmer. Use usted. Maximum 800 words. Structure: greeting with name, their score summary, missing documents, numbered steps with WHERE/WHAT/COST for each step, total cost estimate, next Fincava contact.`,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              supplier,
              farm,
              compliance,
              latestScore,
            }),
          },
        ],
      });

      const documentContent = (message.content[0] as any).text;
      await db.insert(aiOutputsTable).values({
        supplierId,
        aiModel: DOCUMENT_MODEL,
        callType: "DOCUMENT_GENERATION",
        documentContent,
      });

      res.json({ success: true, documentContent });
    } catch (err) {
      console.error("Document generation error:", err);
      res.status(500).json({ error: "Document generation failed" });
    }
  },
);

// ── GET /api/suppliers/:id/document ──────────────────────────────────────────
router.get(
  "/suppliers/:id/document",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) { res.status(400).json({ error: "Invalid supplier id" }); return; }

    const [row] = await db
      .select({
        documentContent: aiOutputsTable.documentContent,
        createdAt: aiOutputsTable.createdAt,
      })
      .from(aiOutputsTable)
      .where(
        and(
          eq(aiOutputsTable.supplierId, supplierId),
          eq(aiOutputsTable.callType, "DOCUMENT_GENERATION"),
        ),
      )
      .orderBy(desc(aiOutputsTable.createdAt))
      .limit(1);

    if (!row?.documentContent) {
      res.status(404).json({ error: "No document found for this supplier" });
      return;
    }

    res.json({ documentContent: row.documentContent, createdAt: row.createdAt });
  },
);

// ── Internal: Score supplier with Claude Haiku ───────────────────────────────
// Retry policy: max 3 attempts, exponential backoff (1s, 2s, 4s), ALL errors.
// Handles its own failures internally — never throws to caller.
async function scoreSupplier(supplierId: number): Promise<void> {
  const attemptScore = async (attempt = 1): Promise<void> => {
    try {
      // T2: DB reads extracted to buildScoringInput — called inside retry loop
      // so each attempt fetches fresh data (identical to prior inline behaviour).
      const { supplier, farm, economics, compliance } = await buildScoringInput(supplierId);

      // Supplier must exist — it was just created, but guard here for type safety
      // and to surface a clear error if called with a stale/invalid supplierId.
      // Throws to the catch block, which triggers the retry policy.
      if (!supplier) {
        throw new Error(`scoreSupplier: supplier ${supplierId} not found in DB`);
      }

      if (process.env.NODE_ENV !== "production") {
        logger.debug(
          { supplierId, aiInput: JSON.stringify({ supplier, farm, economics, compliance }) },
          "scoreSupplier AI input",
        );
      }

      const client = getAnthropicClient();
      const start = Date.now();
      const message = await client.messages.create({
        model: SCORING_MODEL,
        max_tokens: 512,
        system: `You are a Colombian agricultural export readiness scoring system. Score the supplier on: land rights (20pts), production volume (20pts), post-harvest quality (20pts), compliance docs (20pts), commitment (20pts). Return ONLY valid JSON: {"export_readiness_score": integer, "pathway": "A"|"B"|"C"|"D", "pathway_label": string, "capital_capacity_cop": integer, "compliance_gaps": string[], "gap_analysis": string, "primary_recommendation": string}`,
        messages: [
          {
            role: "user",
            content: JSON.stringify({ supplier, farm, economics, compliance }),
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

      const VALID_AI_PATHWAYS = ["A", "B", "C", "D"];
      if (!VALID_AI_PATHWAYS.includes(parsed.pathway)) {
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

      try {
        const waBody =
          `Hola ${supplier.nombreCompleto}, tu registro en Fincava fue exitoso ✅\n` +
          `Puntaje de exportación: ${parsed.export_readiness_score}/100\n` +
          `Camino asignado: ${parsed.pathway}\n` +
          `Nos pondremos en contacto pronto. — Equipo Fincava`;
        const sid = await sendWhatsAppMessage(supplier.whatsappNumber, waBody);
        await db
          .update(aiOutputsTable)
          .set({ whatsappMessageSent: sid })
          .where(eq(aiOutputsTable.id, scoreRow.id));
      } catch (waErr) {
        console.error("WhatsApp send failed for supplier", supplierId, waErr);
      }
    } catch (err: any) {
      if (attempt < 3) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        logger.info(
          { supplierId, attempt, delay },
          "scoreSupplier retry scheduled",
        );
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

// ── POST /api/suppliers/:id/send-whatsapp ────────────────────────────────────
router.post(
  "/suppliers/:id/send-whatsapp",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) { res.status(400).json({ error: "Invalid supplier id" }); return; }

    const [supplier] = await db
      .select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId));
    if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }

    const [scoreRow] = await db
      .select()
      .from(aiOutputsTable)
      .where(
        and(
          eq(aiOutputsTable.supplierId, supplierId),
          eq(aiOutputsTable.callType, "ONBOARD_SCORE"),
        ),
      )
      .orderBy(desc(aiOutputsTable.createdAt))
      .limit(1);

    const score = scoreRow?.exportReadinessScore ?? "N/A";
    const pathway = scoreRow?.pathway ?? "N/A";

    const waBody =
      `Hola ${supplier.nombreCompleto}, tu registro en Fincava fue exitoso ✅\n` +
      `Puntaje de exportación: ${score}/100\n` +
      `Camino asignado: ${pathway}\n` +
      `Nos pondremos en contacto pronto. — Equipo Fincava`;

    try {
      const sid = await sendWhatsAppMessage(supplier.whatsappNumber, waBody);
      if (scoreRow) {
        await db
          .update(aiOutputsTable)
          .set({ whatsappMessageSent: sid })
          .where(eq(aiOutputsTable.id, scoreRow.id));
      }
      res.json({ success: true, messageSid: sid });
    } catch (err: any) {
      console.error("Manual WA send failed for supplier", supplierId, err);
      res.status(500).json({ error: err.message || "Failed to send WhatsApp message" });
    }
  },
);

// ── GET /api/suppliers ────────────────────────────────────────────────────────
router.get("/suppliers", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const suppliers = await db
    .select({
      id: suppliersTable.id,
      nombreCompleto: suppliersTable.nombreCompleto,
      municipio: suppliersTable.municipio,
      department: suppliersTable.department,
      supplierType: suppliersTable.supplierType,
      status: suppliersTable.status,
      createdAt: suppliersTable.createdAt,
      sellableStatus: suppliersTable.sellableStatus,
      commercialScore: suppliersTable.commercialScore,
      eligibilityStatus: suppliersTable.eligibilityStatus,
      graduationPathway: suppliersTable.graduationPathway,
      lastEvaluatedAt: suppliersTable.lastEvaluatedAt,
    })
    .from(suppliersTable)
    .orderBy(desc(suppliersTable.createdAt));

  res.json({ suppliers });
});

// ── GET /api/suppliers/marketplace ───────────────────────────────────────────
router.get("/suppliers/marketplace", async (req, res): Promise<void> => {
  // T6 NOTE: This endpoint returns supplier-side data only (graduation scores, farm info).
  // It cannot JOIN to products because suppliers and products are on disconnected entity graphs.
  // To show products alongside suppliers, enrich this response with a secondary products query
  // filtered by company_id — do not attempt a direct JOIN.
  const rows = await db
    .select({
      id: suppliersTable.id,
      nombreCompleto: suppliersTable.nombreCompleto,
      municipio: suppliersTable.municipio,
      department: suppliersTable.department,
      sellableStatus: suppliersTable.sellableStatus,
    })
    .from(suppliersTable)
    .where(inArray(suppliersTable.sellableStatus, ["SELLABLE", "PUBLISHED"]))
    .orderBy(sql`${suppliersTable.lastEvaluatedAt} DESC NULLS LAST`)
    .limit(20);

  const suppliers = rows.map((r) => ({
    id: r.id,
    name: r.nombreCompleto,
    location: r.department
      ? `${r.municipio}, ${r.department}`
      : r.municipio,
    sellableStatus: r.sellableStatus,
  }));

  res.json({ suppliers });
});

// ── GET /api/suppliers/:id/evaluations ───────────────────────────────────────
router.get("/suppliers/:id/evaluations", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const supplierId = Number(req.params.id);
  if (isNaN(supplierId)) {
    res.status(400).json({ error: "Invalid supplier id" });
    return;
  }

  const [existing] = await db
    .select({ id: suppliersTable.id })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  const evaluations = await db
    .select({
      id: supplierEvaluationsTable.id,
      eligibilityStatus: supplierEvaluationsTable.eligibilityStatus,
      commercialScore: supplierEvaluationsTable.commercialScore,
      sellableStatus: supplierEvaluationsTable.sellableStatus,
      pathway: supplierEvaluationsTable.pathway,
      thresholdVersion: supplierEvaluationsTable.thresholdVersion,
      evaluatedAt: supplierEvaluationsTable.evaluatedAt,
    })
    .from(supplierEvaluationsTable)
    .where(eq(supplierEvaluationsTable.supplierId, supplierId))
    .orderBy(desc(supplierEvaluationsTable.evaluatedAt))
    .limit(20);

  res.json({ evaluations });
});

// ── GET /api/suppliers/:id/transitions ───────────────────────────────────────
router.get("/suppliers/:id/transitions", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const supplierId = Number(req.params.id);
  if (isNaN(supplierId)) {
    res.status(400).json({ error: "Invalid supplier id" });
    return;
  }

  const [existing] = await db
    .select({ id: suppliersTable.id })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  const transitions = await db
    .select({
      id: supplierStateTransitionsTable.id,
      fromState: supplierStateTransitionsTable.fromState,
      toState: supplierStateTransitionsTable.toState,
      actor: supplierStateTransitionsTable.actor,
      justification: supplierStateTransitionsTable.justification,
      evaluationId: supplierStateTransitionsTable.evaluationId,
      createdAt: supplierStateTransitionsTable.createdAt,
    })
    .from(supplierStateTransitionsTable)
    .where(eq(supplierStateTransitionsTable.supplierId, supplierId))
    .orderBy(desc(supplierStateTransitionsTable.createdAt))
    .limit(20);

  res.json({ transitions });
});

// ── GET /api/suppliers/:id ────────────────────────────────────────────────────
router.get("/suppliers/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const supplierId = Number(req.params.id);
  if (isNaN(supplierId)) {
    res.status(400).json({ error: "Invalid supplier id" });
    return;
  }

  const [supplier] = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  res.json({ supplier });
});

// ── POST /api/admin/suppliers/:id/transition ─────────────────────────────────
const VALID_SELLABLE_STATES = ["NOT_READY", "ELIGIBLE", "SELLABLE", "PUBLISHED"] as const;
const VALID_ADMIN_ACTORS    = ["ADMIN", "FOUNDER"] as const;

router.post(
  "/admin/suppliers/:id/transition",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) {
      res.status(400).json({ error: "Invalid supplier id" });
      return;
    }

    const { toState, actor, justification } = req.body as Record<string, string>;

    // Validate actor — SYSTEM is forbidden from this endpoint.
    if (!actor || !(VALID_ADMIN_ACTORS as readonly string[]).includes(actor)) {
      res.status(400).json({ error: "actor must be ADMIN or FOUNDER" });
      return;
    }

    // Validate justification — required for ADMIN and FOUNDER.
    if (!justification || justification.trim() === "") {
      res.status(400).json({ error: "justification is required" });
      return;
    }

    // Validate toState.
    if (!toState || !(VALID_SELLABLE_STATES as readonly string[]).includes(toState)) {
      res.status(400).json({
        error: `toState must be one of: ${VALID_SELLABLE_STATES.join(", ")}`,
      });
      return;
    }

    try {
      const result = await transitionTo(
        supplierId,
        toState as (typeof VALID_SELLABLE_STATES)[number],
        actor as "ADMIN" | "FOUNDER",
        { justification },
      );
      res.json({ transition: result.transition });
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof TypeError) {
        res.status(400).json({ error: err.message });
        return;
      }
      logger.error({ err, supplierId }, "admin transition failed");
      res.status(500).json({ error: "Transition failed" });
    }
  },
);

// ── POST /api/admin/suppliers/:id/publish ────────────────────────────────────
router.post(
  "/admin/suppliers/:id/publish",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) {
      res.status(400).json({ error: "Invalid supplier id" });
      return;
    }

    const { actor, justification } = req.body as Record<string, string>;

    // Validate actor — SYSTEM is forbidden from this endpoint.
    if (!actor || !(VALID_ADMIN_ACTORS as readonly string[]).includes(actor)) {
      res.status(400).json({ error: "actor must be ADMIN or FOUNDER" });
      return;
    }

    // Validate justification — required for publishing.
    if (!justification || justification.trim() === "") {
      res.status(400).json({ error: "justification is required" });
      return;
    }

    // Preflight gate (1.10): supplier must be SELLABLE before publishing.
    const [supplier] = await db
      .select({ id: suppliersTable.id, sellableStatus: suppliersTable.sellableStatus })
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .limit(1);

    if (!supplier) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    if (supplier.sellableStatus !== "SELLABLE") {
      res.status(409).json({ error: "Supplier must be SELLABLE before publishing" });
      return;
    }

    try {
      const result = await markPublished(
        supplierId,
        actor as "ADMIN" | "FOUNDER",
        justification,
      );
      res.json({ transition: result.transition });
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof TypeError) {
        res.status(400).json({ error: err.message });
        return;
      }
      logger.error({ err, supplierId }, "admin publish failed");
      res.status(500).json({ error: "Publish failed" });
    }
  },
);

// ── PATCH /api/admin/suppliers/:id/compliance ────────────────────────────────
// Admin-only partial update of compliance_docs fields.
// Unblocks the eligibility gate without triggering evaluation.
// MUST: compliance_docs row already exists (created at onboarding).
// MUST NOT: create a new compliance_docs row.
// MUST NOT: trigger evaluation or modify any evaluation logic.
router.patch(
  "/admin/suppliers/:id/compliance",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) {
      res.status(400).json({ error: "Invalid supplier id" });
      return;
    }

    const body = req.body as Record<string, unknown>;

    // Build compliance_docs patch — only fields explicitly provided as booleans.
    // Untyped or missing fields are silently skipped (partial update semantics).
    const compliancePatch: Partial<{
      rutDian: boolean;
      icaRegistro: boolean;
      fitosanitarioCert: boolean;
      dianExportador: boolean;
    }> = {};

    if (typeof body.rutDian === "boolean")           compliancePatch.rutDian           = body.rutDian;
    if (typeof body.icaRegistro === "boolean")       compliancePatch.icaRegistro       = body.icaRegistro;
    if (typeof body.fitosanitarioCert === "boolean") compliancePatch.fitosanitarioCert = body.fitosanitarioCert;
    if (typeof body.dianExportador === "boolean")    compliancePatch.dianExportador    = body.dianExportador;

    // consentGiven lives on suppliers table — handled separately.
    const consentGivenPatch: boolean | undefined =
      typeof body.consentGiven === "boolean" ? body.consentGiven : undefined;

    const complianceFieldCount = Object.keys(compliancePatch).length;

    if (complianceFieldCount === 0 && consentGivenPatch === undefined) {
      res.status(400).json({
        error:
          "No valid boolean fields provided. Accepted: rutDian, icaRegistro, fitosanitarioCert, dianExportador, consentGiven",
      });
      return;
    }

    // Validate supplier exists.
    const [supplier] = await db
      .select({ id: suppliersTable.id, consentGiven: suppliersTable.consentGiven })
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .limit(1);

    if (!supplier) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    // Validate compliance_docs row exists — onboarding always creates it.
    // Reject if missing; DO NOT create a new row here.
    const [existing] = await db
      .select({ id: complianceDocsTable.id })
      .from(complianceDocsTable)
      .where(eq(complianceDocsTable.supplierId, supplierId))
      .limit(1);

    if (!existing) {
      res.status(404).json({
        error: "Compliance record not found for this supplier — supplier may not have completed onboarding",
      });
      return;
    }

    // Update suppliers.consent_given if provided.
    if (consentGivenPatch !== undefined) {
      await db
        .update(suppliersTable)
        .set({ consentGiven: consentGivenPatch })
        .where(eq(suppliersTable.id, supplierId));
    }

    // Update compliance_docs with only the provided fields.
    // If only consentGiven was provided, re-select without updating compliance_docs.
    let updatedDocs;
    if (complianceFieldCount > 0) {
      [updatedDocs] = await db
        .update(complianceDocsTable)
        .set(compliancePatch)
        .where(eq(complianceDocsTable.supplierId, supplierId))
        .returning();
    } else {
      [updatedDocs] = await db
        .select()
        .from(complianceDocsTable)
        .where(eq(complianceDocsTable.supplierId, supplierId))
        .limit(1);
    }

    const fieldsUpdated = [
      ...Object.keys(compliancePatch),
      ...(consentGivenPatch !== undefined ? ["consentGiven"] : []),
    ];

    logger.info(
      { admin: (req as any).userId, supplierId, fieldsUpdated },
      "admin compliance update",
    );

    res.json({
      complianceDocs: updatedDocs,
      consentGiven: consentGivenPatch ?? supplier.consentGiven,
      fieldsUpdated,
    });
  },
);

export default router;

