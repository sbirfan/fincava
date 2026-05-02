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
  productsTable,
  originStoriesTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  sendEmail,
  supplierApplicationConfirmationEmail,
  supplierApplicationAdminAlertEmail,
} from "../lib/email";
import { requireAdmin } from "../middleware/admin";
import { computePublicTrustScore } from "../services/confidence-scorer";
import { getAnthropicClient, SCORING_MODEL, DOCUMENT_MODEL } from "../lib/anthropic";
import { sendWhatsAppMessage } from "../lib/whatsapp";
import { parsePagination } from "../schemas";
import { desc, asc, eq, and, gte, lte, sql, count, inArray, ilike, or, isNull, notInArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  evaluateSupplier,
  transitionTo,
  markPublished,
  NotFoundError,
} from "../services/supplier-graduation-service";
import { runOnboardPipeline } from "../services/onboard-pipeline";
import { pipelineEmitter, SUPPLIER_ONBOARD_EVENT } from "../lib/pipeline-emitter";
import type { SupplierOnboardingInput } from "../types/supplier-onboarding";
import { DOCUMENT_PROMPT } from "../config/scoring-prompts";
import { incrementAndMaybeLog } from "../lib/volumeCounters";

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
      req.log.debug(
        { fullName: typedInput.fullName, phone: typedInput.phone, productType: typedInput.productType },
        "typedInput preview",
      );
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

    // ── UPDATE MODE: supplierId provided — complete an existing ingested supplier ──
    // When admin initiates onboarding for an already-ingested supplier, the payload
    // includes an explicit supplierId. We update rather than create.
    const updateSupplierId = rawBody.supplierId ? Number(rawBody.supplierId) : null;
    if (updateSupplierId) {
      const [existing] = await db
        .select({ id: suppliersTable.id, nombreCompleto: suppliersTable.nombreCompleto })
        .from(suppliersTable)
        .where(eq(suppliersTable.id, updateSupplierId))
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: `Supplier ${updateSupplierId} not found` });
        return;
      }

      // Update core supplier row with any additional data from the form.
      await db
        .update(suppliersTable)
        .set({
          nombreCompleto: nombreCompleto || existing.nombreCompleto,
          whatsappNumber: whatsappNumber || undefined,
          email: supplierEmail ?? undefined,
          municipio: municipio || undefined,
          department: rawBody.department ?? undefined,
          vereda: rawBody.vereda ?? undefined,
          supplierType: (supplierType as string).toUpperCase() as any,
          registeredBy: registeredBy ?? undefined,
          consentGiven: rawBody.consentGiven ?? true,
          consentDate: new Date(),
        })
        .where(eq(suppliersTable.id, updateSupplierId));

      // Farm data — upsert pattern: try insert, on conflict update.
      const primaryProduct = rawBody.primary_product || rawBody.farm?.cultivoPrincipal || null;
      const farmSize = rawBody.farm_size_hectares?.toString() || rawBody.farm?.hectareasProduccion?.toString() || null;
      const annualVolume = rawBody.annual_volume_kg || rawBody.farm?.volumenKgUltimaCosecha || null;

      const [existingFarm] = await db
        .select({ id: farmsTable.id })
        .from(farmsTable)
        .where(eq(farmsTable.supplierId, updateSupplierId))
        .limit(1);

      if (existingFarm) {
        await db
          .update(farmsTable)
          .set({
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
          })
          .where(eq(farmsTable.supplierId, updateSupplierId));
      } else {
        await db.insert(farmsTable).values({
          supplierId: updateSupplierId,
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
      }

      // Economics — upsert.
      const [existingEcon] = await db
        .select({ id: economicsTable.id })
        .from(economicsTable)
        .where(eq(economicsTable.supplierId, updateSupplierId))
        .limit(1);

      const econValues = {
        tipoComprador: rawBody.currently_exporting === "yes" ? "EXPORT" as const : (rawBody.economics?.tipoComprador ?? null),
        volumenKgUltimaCosecha: annualVolume ? Number(annualVolume) : null,
        precioVentaBanda: rawBody.economics?.precioVentaBanda ?? null,
        tiempoPagoDias: rawBody.economics?.tiempoPagoDias ?? null,
        deudaActual: rawBody.working_capital_needed?.toString() || rawBody.economics?.deudaActual || null,
        usoCapital: Array.isArray(rawBody.economics?.usoCapital) ? rawBody.economics.usoCapital : rawBody.export_blocker ? [rawBody.export_blocker] : null,
        comodidadPagos: rawBody.economics?.comodidadPagos ?? null,
        personasDependientes: rawBody.economics?.personasDependientes ?? null,
        otrasFuentesIngreso: rawBody.economics?.otrasFuentesIngreso ?? null,
        situacionEconomica: rawBody.economics?.situacionEconomica ?? null,
        interesCanalPremium: rawBody.economics?.interesCanalPremium ?? null,
        conocePrecioExportacion: rawBody.economics?.conocePrecioExportacion ?? null,
        haIntentadoExportar: rawBody.currently_exporting === "yes" ? true : rawBody.currently_exporting === "no" ? false : (rawBody.economics?.haIntentadoExportar ?? null),
      };

      if (existingEcon) {
        await db.update(economicsTable).set(econValues).where(eq(economicsTable.supplierId, updateSupplierId));
      } else {
        await db.insert(economicsTable).values({ supplierId: updateSupplierId, ...econValues });
      }

      // Compliance — upsert with ON CONFLICT (supplierId has unique constraint).
      const icaRegisteredTrue = rawBody.ica_registered === true || rawBody.ica_registered === "yes";
      await db
        .insert(complianceDocsTable)
        .values({ supplierId: updateSupplierId, icaRegistro: icaRegisteredTrue })
        .onConflictDoNothing({ target: complianceDocsTable.supplierId });
      if (icaRegisteredTrue) {
        await db.update(complianceDocsTable).set({ icaRegistro: true }).where(eq(complianceDocsTable.supplierId, updateSupplierId));
      }

      // Interaction log.
      await db.insert(interactionsTable).values({
        supplierId: updateSupplierId,
        interactionType: "FORM_SUBMISSION",
        actor: registeredBy ?? "ADMIN",
        notes: rawBody.visit_notes || "Farm data collected via admin-initiated onboarding",
        metadata: {
          mode:                "admin_profile_completion",
          officer_code:        rawBody.officer_code        ?? null,
          department:          rawBody.department          ?? null,
          organic_certified:   rawBody.organic_certified   ?? null,
          has_rut:             rawBody.has_rut             ?? null,
          has_bank_account:    rawBody.has_bank_account    ?? null,
          ica_registered:      rawBody.ica_registered      ?? null,
        },
      });

      res.status(200).json({
        success: true,
        supplierId: updateSupplierId,
        mode: "profile_completion",
        message: `Profile data collected for ${existing.nombreCompleto}`,
      });

      logger.info({ event: "SUPPLIER_PROFILE_COMPLETED", supplierId: updateSupplierId });

      // Fire the same post-onboard pipeline so scoring + graduation run on combined data.
      const correlationId = crypto.randomUUID();
      setImmediate(() => {
        const listenerCount = pipelineEmitter.listenerCount(SUPPLIER_ONBOARD_EVENT);
        if (listenerCount > 0) {
          pipelineEmitter.emit(SUPPLIER_ONBOARD_EVENT, { supplierId: updateSupplierId, correlationId });
        } else {
          void runOnboardPipeline({ supplierId: updateSupplierId, correlationId });
        }
      });

      return;
    }
    // ── END UPDATE MODE ────────────────────────────────────────────────────────

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

    logger.info({ event: "SUPPLIER_ONBOARDED", supplierId: supplier.id });
    incrementAndMaybeLog(logger, "suppliers", { supplierId: supplier.id });

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
      to: "sbirfan@gmail.com",
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

    // Emit inside setImmediate so the HTTP response is flushed before the AI
    // pipeline starts. The EventEmitter handler (registered in index.ts) runs
    // the pipeline asynchronously. If no handler is registered at emit time the
    // fallback path calls runOnboardPipeline directly so nothing is silently lost.
    setImmediate(() => {
      const listenerCount = pipelineEmitter.listenerCount(SUPPLIER_ONBOARD_EVENT);
      if (listenerCount > 0) {
        logger.info({ supplierId: sid, correlationId, listenerCount }, "post-onboard pipeline: emitting via EventEmitter");
        pipelineEmitter.emit(SUPPLIER_ONBOARD_EVENT, { supplierId: sid, correlationId });
      } else {
        logger.warn({ supplierId: sid, correlationId }, "post-onboard pipeline: no listeners — running directly (fallback)");
        void runOnboardPipeline({ supplierId: sid, correlationId });
      }
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
    const { pathway, municipio, from, to, q, status } = req.query as Record<string, string>;
    const { page, limit, offset } = parsePagination(req.query);

    const VALID_STATUSES = ["PENDING", "ACTIVE", "INACTIVE"] as const;

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

    // Subquery: at most one farm row per supplier (avoids duplicate result rows)
    const latestFarm = db
      .selectDistinctOn([farmsTable.supplierId], {
        supplierId: farmsTable.supplierId,
        cultivoPrincipal: farmsTable.cultivoPrincipal,
      })
      .from(farmsTable)
      .orderBy(farmsTable.supplierId, desc(farmsTable.id))
      .as("latest_farm");

    const conditions = [];
    if (pathway) conditions.push(eq(latestScores.pathway, pathway));
    if (municipio) conditions.push(eq(suppliersTable.municipio, municipio));
    if (from) conditions.push(gte(suppliersTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(suppliersTable.createdAt, new Date(to)));
    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      conditions.push(eq(suppliersTable.status, status as typeof VALID_STATUSES[number]));
    }
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(suppliersTable.nombreCompleto, pattern),
          ilike(suppliersTable.municipio, pattern),
          ilike(suppliersTable.department, pattern),
          ilike(latestFarm.cultivoPrincipal, pattern),
        ),
      );
    }

    let query = db
      .select({
        id: suppliersTable.id,
        nombreCompleto: suppliersTable.nombreCompleto,
        contactName: suppliersTable.registeredBy,
        email: suppliersTable.email,
        phone: suppliersTable.whatsappNumber,
        department: suppliersTable.department,
        municipio: suppliersTable.municipio,
        supplierType: suppliersTable.supplierType,
        status: suppliersTable.status,
        createdAt: suppliersTable.createdAt,
        primaryProduct: latestFarm.cultivoPrincipal,
        // Graduation fields — written by evaluateSupplier, nullable until first evaluation
        sellableStatus: suppliersTable.sellableStatus,
        eligibilityStatus: suppliersTable.eligibilityStatus,
        commercialScore: suppliersTable.commercialScore,
        // AI output fields from latest scoring run
        exportReadinessScore: latestScores.exportReadinessScore,
        pathway: latestScores.pathway,
        capitalCapacityCop: latestScores.capitalCapacityCop,
        complianceGaps: latestScores.complianceGaps,
        gapAnalysis: latestScores.gapAnalysis,
        whatsappMessageSent: latestScores.whatsappMessageSent,
        // Ingestion / Origin Stories fields
        ingestionSource: suppliersTable.ingestionSource,
        description: suppliersTable.description,
        publishedToOriginStories: suppliersTable.publishedToOriginStories,
        originStoryImageUrl: suppliersTable.originStoryImageUrl,
      })
      .from(suppliersTable)
      .leftJoin(latestFarm, eq(latestFarm.supplierId, suppliersTable.id))
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

      const requestedLang = (req.body as any)?.language === "es" ? "Spanish" : "English";
      const languagePrefix = `LANGUAGE: You must write every word of this document in ${requestedLang} only. Do not use ${requestedLang === "English" ? "Spanish" : "English"} anywhere — not in greetings, headings, labels, or body text.\n\n`;

      const client = getAnthropicClient();
      const message = await client.messages.create({
        model: DOCUMENT_MODEL,
        max_tokens: 1500,
        system: languagePrefix + DOCUMENT_PROMPT,
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
      req.log.error({ err }, "Document generation error");
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
    if (!supplier.whatsappNumber) {
      res.status(422).json({ error: "Supplier has no WhatsApp number on record" });
      return;
    }

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
  // FIX 1: Filter at DB level — only suppliers with at least one linked product.
  const rows = await db
    .select({
      id: suppliersTable.id,
      nombreCompleto: suppliersTable.nombreCompleto,
      municipio: suppliersTable.municipio,
      department: suppliersTable.department,
      // T5: Fields needed to compute public_trust_score (internal confidence_score NOT included)
      sourceUrl: suppliersTable.sourceUrl,
      normalizedName: suppliersTable.normalizedName,
      description: suppliersTable.description,
      claimStatus: suppliersTable.claimStatus,
    })
    .from(suppliersTable)
    .where(
      and(
        inArray(suppliersTable.sellableStatus, ["SELLABLE", "PUBLISHED"]),
        sql`EXISTS (SELECT 1 FROM products p WHERE p.supplier_id = ${suppliersTable.id})`,
      )
    )
    // P2-R7: Order by createdAt (stable, intelligence-independent).
    // lastEvaluatedAt was previously used here but is set only by the AI evaluation
    // pipeline — meaning public marketplace order depended on intelligence runs.
    // createdAt is a safe, deterministic public signal (newest suppliers first).
    // id tiebreaker ensures a fully stable page across identical createdAt values.
    .orderBy(desc(suppliersTable.createdAt), asc(suppliersTable.id))
    .limit(20);

  // Secondary query: fetch products linked to these suppliers via supplier_id.
  const supplierIds = rows.map((r) => r.id);
  const linkedProducts = supplierIds.length > 0
    ? await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          pricePerKgUSD: productsTable.pricePerKgUSD,
          supplierId: productsTable.supplierId,
          description: productsTable.description,
          origin: productsTable.origin,
          certifications: productsTable.certifications,
          organic: productsTable.organic,
          directTrade: productsTable.directTrade,
          minOrderKg: productsTable.minOrderKg,
        })
        .from(productsTable)
        .where(inArray(productsTable.supplierId, supplierIds))
    : [];

  const productsBySupplier = new Map<number, typeof linkedProducts>();
  for (const p of linkedProducts) {
    if (p.supplierId == null) continue;
    const list = productsBySupplier.get(p.supplierId) ?? [];
    list.push(p);
    productsBySupplier.set(p.supplierId, list);
  }

  const suppliers = rows.map((r) => ({
    id: r.id,
    name: r.nombreCompleto,
    location: r.department
      ? `${r.municipio}, ${r.department}`
      : r.municipio,
    // T5: Public-facing quality signal — derived from safe signals only.
    // Internal confidence_score (admin/AI metadata) is NOT exposed here.
    public_trust_score: computePublicTrustScore({
      sourceUrl: r.sourceUrl,
      normalizedName: r.normalizedName,
      description: r.description,
      municipio: r.municipio,
      claimStatus: r.claimStatus,
    }),
    // FIX 3: sellableStatus removed — internal state, not buyer-facing.
    products: (productsBySupplier.get(r.id) ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      pricePerKgUSD: p.pricePerKgUSD,
      description: p.description,
      origin: p.origin,
      certifications: p.certifications,
      organic: p.organic,
      directTrade: p.directTrade,
      ...(p.minOrderKg != null ? { minOrderKg: p.minOrderKg } : {}),
    })),
  }));

  // ── ?include_onboarding=true — Section B: Building Export Readiness ──────────
  // Phase I: existence of an origin_stories row = admin approval to appear here.
  //   The admin's act of creating a story in the admin console is the publishing gate.
  let onboarding_suppliers: Array<{
    id: number;
    name: string | null;
    region: string | null;
    department: string | null;
    storyExcerpt: string;
    imageUrl: string | null;
    productCategories: string[];
  }> = [];

  if (req.query.include_onboarding === "true") {
    const onboardingRaw = await db
      .select({
        id:            suppliersTable.id,
        nombreCompleto: suppliersTable.nombreCompleto,
        municipio:     suppliersTable.municipio,
        department:    suppliersTable.department,
        story:         originStoriesTable.story,
        images:        originStoriesTable.images,
      })
      .from(suppliersTable)
      .innerJoin(productsTable, eq(productsTable.supplierId, suppliersTable.id))
      .innerJoin(originStoriesTable, eq(originStoriesTable.productId, productsTable.id))
      .where(
        and(
          eq(originStoriesTable.published, true),
          or(
            isNull(suppliersTable.sellableStatus),
            notInArray(suppliersTable.sellableStatus, ["SELLABLE", "PUBLISHED"]),
          ),
        ),
      )
      .orderBy(suppliersTable.id, originStoriesTable.id)
      .limit(200); // buffer for JS dedup — 200 raw rows → safe up to 10 products/supplier for 20 unique results

    // Deduplicate by supplier ID — keep first origin story row per supplier.
    const seenIds = new Set<number>();
    const onboardingDeduped = onboardingRaw
      .filter((r) => {
        if (seenIds.has(r.id)) return false;
        seenIds.add(r.id);
        return true;
      })
      .slice(0, 20);

    // Secondary query: product categories for onboarding suppliers.
    const onboardingIds = onboardingDeduped.map((r) => r.id);
    const onboardingProducts = onboardingIds.length > 0
      ? await db
          .select({ supplierId: productsTable.supplierId, category: productsTable.category })
          .from(productsTable)
          .where(inArray(productsTable.supplierId, onboardingIds))
      : [];

    const categoriesBySupplier = new Map<number, string[]>();
    for (const p of onboardingProducts) {
      if (p.supplierId == null) continue;
      const list = categoriesBySupplier.get(p.supplierId) ?? [];
      if (p.category && !list.includes(p.category)) list.push(p.category);
      categoriesBySupplier.set(p.supplierId, list);
    }

    onboarding_suppliers = onboardingDeduped.map((r) => ({
      id:               r.id,
      name:             r.nombreCompleto,
      region:           r.municipio,
      department:       r.department,
      storyExcerpt:     r.story.length > 120 ? r.story.slice(0, 120).trimEnd() + "\u2026" : r.story,
      imageUrl:         r.images[0] ?? null,
      productCategories: categoriesBySupplier.get(r.id) ?? [],
    }));
  }

  // platformFeePercent is a static platform rate; surfaced here so buyers
  // can see the cost of trade before submitting an order.
  res.json({
    suppliers,
    ...(req.query.include_onboarding === "true" ? { onboarding_suppliers } : {}),
    platformFeePercent: 4,
  });
});

// ── GET /api/suppliers/marketplace/:id — public buyer-safe supplier detail ────
// No authentication required.
// Excludes: commercialScore, scoreSnapshot, eligibilityStatus, graduationPathway,
// whatsappNumber, rutDian, icaRegistro, fitosanitarioCert, economics, ai_outputs.
// Must be registered BEFORE GET /api/suppliers/:id to avoid path collision.
router.get("/suppliers/marketplace/:id", async (req, res): Promise<void> => {
  const supplierId = Number(req.params.id);
  if (isNaN(supplierId)) {
    res.status(400).json({ error: "Invalid supplier id" });
    return;
  }

  const [supplier] = await db
    .select({
      id:           suppliersTable.id,
      nombreCompleto: suppliersTable.nombreCompleto,
      supplierType: suppliersTable.supplierType,
      municipio:    suppliersTable.municipio,
      department:   suppliersTable.department,
      sellableStatus: suppliersTable.sellableStatus,
    })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  const isExportReady =
    supplier.sellableStatus === "SELLABLE" ||
    supplier.sellableStatus === "PUBLISHED";

  // First published origin story linked to this supplier (via products join).
  const [storyRow] = await db
    .select({
      farmerName: originStoriesTable.farmerName,
      story:      originStoriesTable.story,
      images:     originStoriesTable.images,
      region:     originStoriesTable.region,
    })
    .from(originStoriesTable)
    .innerJoin(productsTable, eq(originStoriesTable.productId, productsTable.id))
    .where(
      and(
        eq(productsTable.supplierId, supplierId),
        eq(originStoriesTable.published, true),
      ),
    )
    .orderBy(originStoriesTable.id)
    .limit(1);

  const originStory = storyRow
    ? {
        farmerName: storyRow.farmerName,
        story:      storyRow.story,
        imageUrl:   storyRow.images[0] ?? null,
        location:   storyRow.region,
      }
    : null;

  // Products are only surfaced for export-ready suppliers.
  const products = isExportReady
    ? (
        await db
          .select({
            id:           productsTable.id,
            name:         productsTable.name,
            category:     productsTable.category,
            description:  productsTable.description,
            pricePerKgUSD: productsTable.pricePerKgUSD,
            images:       productsTable.images,
          })
          .from(productsTable)
          .where(eq(productsTable.supplierId, supplierId))
      ).map((p) => ({
        id:           p.id,
        name:         p.name,
        category:     p.category,
        description:  p.description,
        pricePerKgUSD: p.pricePerKgUSD,
        unit:         "kg",
        imageUrl:     p.images[0] ?? null,
      }))
    : [];

  res.json({
    id:               supplier.id,
    name:             supplier.nombreCompleto,
    supplierType:     supplier.supplierType,
    region:           supplier.municipio ?? null,
    department:       supplier.department ?? null,
    isExportReady,
    inquiryCTAEnabled: isExportReady,
    originStory,
    certifications:   [],
    products,
  });
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

// ── GET /api/suppliers/:id/profile — public supplier profile ─────────────────
// No authentication required. Returns a curated public profile with
// `public_trust_score` computed from safe signals. Internal fields such as
// `confidenceScore`, ingestion metadata, and admin notes are intentionally excluded.
// Response is a flat PublicSupplierProfile object the frontend can read directly.
router.get("/suppliers/:id/profile", async (req, res): Promise<void> => {
  const supplierId = Number(req.params.id);
  if (isNaN(supplierId)) {
    res.status(400).json({ error: "Invalid supplier id" });
    return;
  }

  const [supplier] = await db
    .select({
      id: suppliersTable.id,
      nombreCompleto: suppliersTable.nombreCompleto,
      normalizedName: suppliersTable.normalizedName,
      municipio: suppliersTable.municipio,
      department: suppliersTable.department,
      vereda: suppliersTable.vereda,
      description: suppliersTable.description,
      sourceUrl: suppliersTable.sourceUrl,
      country: suppliersTable.country,
      supplierType: suppliersTable.supplierType,
      status: suppliersTable.status,
      sellableStatus: suppliersTable.sellableStatus,
      claimStatus: suppliersTable.claimStatus,
      createdAt: suppliersTable.createdAt,
      registeredBy: suppliersTable.registeredBy,
      originStoryImageUrl: suppliersTable.originStoryImageUrl,
    })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  // Fetch products linked to this supplier.
  const supplierProducts = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      category: productsTable.category,
      pricePerKgUSD: productsTable.pricePerKgUSD,
      description: productsTable.description,
      origin: productsTable.origin,
      certifications: productsTable.certifications,
      organic: productsTable.organic,
      directTrade: productsTable.directTrade,
      minOrderKg: productsTable.minOrderKg,
      images: productsTable.images,
    })
    .from(productsTable)
    .where(eq(productsTable.supplierId, supplierId));

  // Derive phase flags.
  const isCertified = supplier.claimStatus === "CLAIMED";
  const isVerified = isCertified;

  // Compute public trust score from safe public signals.
  const public_trust_score = computePublicTrustScore({
    sourceUrl: supplier.sourceUrl,
    normalizedName: supplier.normalizedName,
    description: supplier.description,
    municipio: supplier.municipio,
    claimStatus: supplier.claimStatus,
  });

  // Derive product categories from linked products.
  const productCategories = [...new Set(supplierProducts.map((p) => p.category).filter(Boolean))];

  res.json({
    id: supplier.id,
    name: supplier.nombreCompleto,
    region: supplier.department ?? supplier.municipio,
    country: supplier.country ?? "Colombia",
    description: supplier.description ?? null,
    type: supplier.supplierType ?? null,
    status: supplier.status,
    sellableStatus: supplier.sellableStatus,
    isCertified,
    verified: isVerified,
    memberSince: supplier.createdAt,
    public_trust_score,
    farmerName: supplier.registeredBy ?? null,
    originStory: supplier.description ?? null,
    originStoryImageUrl: supplier.originStoryImageUrl ?? null,
    products: supplierProducts,
    certificationDetails: [],
    productCategories,
    logoUrl: null,
    website: null,
    avgRating: null,
    responseTimeHours: null,
  });
});

// ── GET /api/suppliers/my-profile ─────────────────────────────────────────────
// Resolves the logged-in user's supplier record by matching their account email
// against suppliersTable.email (the only field shared between both systems).
// Returns profileCompleteness so the supplier dashboard can render the self-
// completion widget without the user knowing their supplierId.
router.get("/suppliers/my-profile", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number;

  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user?.email) {
    res.json({ found: false });
    return;
  }

  const [supplier] = await db
    .select({
      id:               suppliersTable.id,
      nombreCompleto:   suppliersTable.nombreCompleto,
      municipio:        suppliersTable.municipio,
      department:       suppliersTable.department,
      sellableStatus:   suppliersTable.sellableStatus,
      graduationPathway: suppliersTable.graduationPathway,
      lastEvaluatedAt:  suppliersTable.lastEvaluatedAt,
      claimStatus:      suppliersTable.claimStatus,
    })
    .from(suppliersTable)
    .where(eq(suppliersTable.email, user.email))
    .limit(1);

  if (!supplier) {
    res.json({ found: false });
    return;
  }

  const supplierId = supplier.id;
  const [farmRows, econRows, complianceRows, aiRows] = await Promise.all([
    db.select({ id: farmsTable.id }).from(farmsTable).where(eq(farmsTable.supplierId, supplierId)).limit(1),
    db.select({ id: economicsTable.id }).from(economicsTable).where(eq(economicsTable.supplierId, supplierId)).limit(1),
    db.select({ id: complianceDocsTable.id }).from(complianceDocsTable).where(eq(complianceDocsTable.supplierId, supplierId)).limit(1),
    db.select({ id: aiOutputsTable.id }).from(aiOutputsTable).where(eq(aiOutputsTable.supplierId, supplierId)).limit(1),
  ]);

  const profileCompleteness = {
    hasFarmData:       farmRows.length > 0,
    hasEconomicsData:  econRows.length > 0,
    hasComplianceData: complianceRows.length > 0,
    hasAiScore:        aiRows.length > 0,
    isGraduated:       supplier.sellableStatus != null && supplier.sellableStatus !== "NOT_READY",
  };

  res.json({ found: true, supplierId, supplier, profileCompleteness });
});

// ── GET /api/supplier/status ───────────────────────────────────────────────────
// Returns structured graduation status for the logged-in supplier.
// Requires SUPPLIER role. Resolves via email match (same bridge as my-profile).
// nextAction is a plain-English guidance string derived from sellableStatus.
router.get("/supplier/status", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number;

  const [user] = await db
    .select({ email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  if (user.role !== "SUPPLIER") {
    res.status(403).json({ error: "Supplier accounts only" });
    return;
  }

  if (!user.email) {
    res.json({
      found: false,
      message: "No farm profile linked. Use the claim flow to connect.",
    });
    return;
  }

  const [supplier] = await db
    .select({
      sellableStatus:    suppliersTable.sellableStatus,
      graduationPathway: suppliersTable.graduationPathway,
      lastEvaluatedAt:   suppliersTable.lastEvaluatedAt,
    })
    .from(suppliersTable)
    .where(eq(suppliersTable.email, user.email))
    .limit(1);

  if (!supplier) {
    res.json({
      found: false,
      message: "No farm profile linked. Use the claim flow to connect.",
    });
    return;
  }

  function deriveNextAction(status: string | null): string {
    switch (status) {
      case "NOT_READY":  return "Upload your ICA registration document to advance to ELIGIBLE.";
      case "ELIGIBLE":   return "Farm data verified — awaiting commercial scoring to become SELLABLE.";
      case "SELLABLE":   return "Commercially scored and ready — contact support to publish to the marketplace.";
      case "PUBLISHED":  return "Your profile is export ready and live on the marketplace.";
      default:           return "Complete your farm profile to begin the graduation process.";
    }
  }

  res.json({
    found:             true,
    sellableStatus:    supplier.sellableStatus,
    graduationPathway: supplier.graduationPathway,
    lastEvaluatedAt:   supplier.lastEvaluatedAt?.toISOString() ?? null,
    isGraduated:       supplier.sellableStatus != null && supplier.sellableStatus !== "NOT_READY",
    nextAction:        deriveNextAction(supplier.sellableStatus),
  });
});

// ── PATCH /api/suppliers/:id/claim ────────────────────────────────────────────
// Allows a logged-in user to claim a farmer record when their account email
// matches the supplier's email. Sets claimStatus → CLAIMED, which awards a
// public trust score point and formally links the B2B account to the farmer record.
router.patch("/suppliers/:id/claim", requireAuth, async (req, res): Promise<void> => {
  const supplierId = Number(req.params.id);
  if (isNaN(supplierId)) {
    res.status(400).json({ error: "Invalid supplier id" });
    return;
  }

  const userId = (req as any).userId as number;

  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user?.email) {
    res.status(403).json({ error: "Account has no email — cannot claim" });
    return;
  }

  const [supplier] = await db
    .select({
      id:          suppliersTable.id,
      email:       suppliersTable.email,
      claimStatus: suppliersTable.claimStatus,
    })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  if (supplier.claimStatus === "CLAIMED") {
    res.json({ ok: true, claimStatus: "CLAIMED", message: "Already claimed" });
    return;
  }

  if (!supplier.email || supplier.email.toLowerCase() !== user.email.toLowerCase()) {
    res.status(403).json({ error: "Email does not match this supplier record" });
    return;
  }

  await db
    .update(suppliersTable)
    .set({ claimStatus: "CLAIMED" })
    .where(eq(suppliersTable.id, supplierId));

  logger.info({ userId, supplierId }, "supplier claimed");

  res.json({ ok: true, claimStatus: "CLAIMED" });
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

  // Profile completeness — parallel checks across related tables.
  const [farmRows, econRows, complianceRows, aiRows] = await Promise.all([
    db.select({ id: farmsTable.id }).from(farmsTable).where(eq(farmsTable.supplierId, supplierId)).limit(1),
    db.select({ id: economicsTable.id }).from(economicsTable).where(eq(economicsTable.supplierId, supplierId)).limit(1),
    db.select({ id: complianceDocsTable.id }).from(complianceDocsTable).where(eq(complianceDocsTable.supplierId, supplierId)).limit(1),
    db.select({ id: aiOutputsTable.id }).from(aiOutputsTable).where(eq(aiOutputsTable.supplierId, supplierId)).limit(1),
  ]);

  const profileCompleteness = {
    hasFarmData:       farmRows.length > 0,
    hasEconomicsData:  econRows.length > 0,
    hasComplianceData: complianceRows.length > 0,
    hasAiScore:        aiRows.length > 0,
    isGraduated:       supplier.sellableStatus != null && supplier.sellableStatus !== "NOT_READY",
  };

  // T5: Compute public trust score from safe, public-facing signals.
  const public_trust_score = computePublicTrustScore({
    sourceUrl: supplier.sourceUrl,
    normalizedName: supplier.normalizedName,
    description: supplier.description,
    municipio: supplier.municipio,
    claimStatus: supplier.claimStatus,
  });

  res.json({ supplier, public_trust_score, profileCompleteness });
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

    // Check supplier exists; admins can publish from any non-PUBLISHED state.
    const [supplier] = await db
      .select({ id: suppliersTable.id, sellableStatus: suppliersTable.sellableStatus })
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .limit(1);

    if (!supplier) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    if (supplier.sellableStatus === "PUBLISHED") {
      res.status(409).json({ error: "Supplier is already published" });
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

// ── POST /api/admin/suppliers/:id/unpublish ──────────────────────────────────
// Reverses a publish action: PUBLISHED → SELLABLE. Supplier remains evaluated
// and scored but is no longer publicly visible on the marketplace.
router.post(
  "/admin/suppliers/:id/unpublish",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) {
      res.status(400).json({ error: "Invalid supplier id" });
      return;
    }

    const { actor, justification } = req.body as Record<string, string>;

    if (!actor || !(VALID_ADMIN_ACTORS as readonly string[]).includes(actor)) {
      res.status(400).json({ error: "actor must be ADMIN or FOUNDER" });
      return;
    }
    if (!justification || justification.trim() === "") {
      res.status(400).json({ error: "justification is required" });
      return;
    }

    const [supplier] = await db
      .select({ id: suppliersTable.id, sellableStatus: suppliersTable.sellableStatus })
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .limit(1);

    if (!supplier) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }
    if (supplier.sellableStatus !== "PUBLISHED") {
      res.status(409).json({ error: "Supplier must be PUBLISHED before unpublishing" });
      return;
    }

    try {
      const result = await transitionTo(
        supplierId,
        "SELLABLE",
        actor as "ADMIN" | "FOUNDER",
        { justification },
      );
      res.json({ transition: result });
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof TypeError) {
        res.status(400).json({ error: err.message });
        return;
      }
      logger.error({ err, supplierId }, "admin unpublish failed");
      res.status(500).json({ error: "Unpublish failed" });
    }
  },
);

// ── POST /api/admin/suppliers/:id/score ──────────────────────────────────────
// G5: Trigger the full onboard pipeline for an existing supplier on-demand.
// Used by the admin "Score Now" button in the detail drawer.
router.post(
  "/admin/suppliers/:id/score",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) {
      res.status(400).json({ error: "Invalid supplier id" });
      return;
    }

    const [existing] = await db
      .select({ id: suppliersTable.id, nombreCompleto: suppliersTable.nombreCompleto })
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    // Fire the pipeline asynchronously so the HTTP response returns immediately.
    const correlationId = crypto.randomUUID();
    setImmediate(() => {
      const listenerCount = pipelineEmitter.listenerCount(SUPPLIER_ONBOARD_EVENT);
      if (listenerCount > 0) {
        pipelineEmitter.emit(SUPPLIER_ONBOARD_EVENT, { supplierId, correlationId });
      } else {
        void runOnboardPipeline({ supplierId, correlationId });
      }
    });

    logger.info({ admin: (req as any).userId, supplierId, correlationId }, "admin: manual score triggered");
    res.json({ success: true, supplierId, correlationId, message: `Scoring pipeline started for ${existing.nombreCompleto}` });
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

    // G6: Re-evaluate graduation state after compliance update — but ONLY when
    // an AI score already exists for this supplier. Guards against calling
    // evaluateSupplier on a supplier that has never been scored (no ONBOARD_SCORE row).
    const [existingScore] = await db
      .select({ id: aiOutputsTable.id })
      .from(aiOutputsTable)
      .where(
        and(
          eq(aiOutputsTable.supplierId, supplierId),
          eq(aiOutputsTable.callType, "ONBOARD_SCORE"),
        ),
      )
      .orderBy(desc(aiOutputsTable.createdAt))
      .limit(1);

    let evaluationResult: { sellableStatus?: string | null; commercialScore?: number | null } | null = null;
    if (existingScore) {
      try {
        const evalResult = await evaluateSupplier(supplierId);
        evaluationResult = {
          sellableStatus: evalResult.supplier.sellableStatus,
          commercialScore: evalResult.supplier.commercialScore,
        };
        logger.info({ supplierId, sellableStatus: evalResult.supplier.sellableStatus }, "compliance update: re-evaluated");
      } catch (evalErr) {
        logger.warn({ evalErr, supplierId }, "compliance update: re-evaluation failed (non-fatal)");
      }
    }

    res.json({
      complianceDocs: updatedDocs,
      consentGiven: consentGivenPatch ?? supplier.consentGiven,
      fieldsUpdated,
      ...(evaluationResult ? { evaluation: evaluationResult } : {}),
    });
  },
);

export default router;

