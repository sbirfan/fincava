import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  suppliersTable, farmsTable, economicsTable,
  complianceDocsTable, aiOutputsTable, interactionsTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = (req as any).userRole;
  if (role !== "ADMIN") { res.status(403).json({ error: "Admin only" }); return; }
  next();
}

// ── POST /api/suppliers/onboard ─────────────────────────────────────────────
router.post("/suppliers/onboard", async (req, res): Promise<void> => {
  try {
    const body = req.body;

    const [supplier] = await db.insert(suppliersTable).values({
      nombreCompleto: body.nombreCompleto,
      whatsappNumber: body.whatsappNumber,
      municipio: body.municipio,
      vereda: body.vereda ?? null,
      supplierType: body.supplierType ?? "FARMER",
      registeredBy: body.registeredBy ?? null,
      consentGiven: body.consentGiven ?? false,
      consentDate: body.consentGiven ? new Date() : null,
    }).returning();

    if (body.farm) {
      await db.insert(farmsTable).values({
        supplierId: supplier.id,
        cultivoPrincipal: body.farm.cultivoPrincipal ?? null,
        variedadCafe: body.farm.variedadCafe ?? null,
        hectareasProduccion: body.farm.hectareasProduccion?.toString() ?? null,
        edadPlantasAnos: body.farm.edadPlantasAnos ?? null,
        cosechasPorAno: body.farm.cosechasPorAno ?? null,
        metodoSecado: body.farm.metodoSecado ?? null,
        accesoAgua: body.farm.accesoAgua ?? null,
        anosEnFinca: body.farm.anosEnFinca ?? null,
        tenenciaTierra: body.farm.tenenciaTierra ?? null,
        asistenciaTecnica: body.farm.asistenciaTecnica ?? null,
      });
    }

    if (body.economics) {
      await db.insert(economicsTable).values({
        supplierId: supplier.id,
        tipoComprador: body.economics.tipoComprador ?? null,
        volumenKgUltimaCosecha: body.economics.volumenKgUltimaCosecha ?? null,
        precioVentaBanda: body.economics.precioVentaBanda ?? null,
        tiempoPagoDias: body.economics.tiempoPagoDias ?? null,
        deudaActual: body.economics.deudaActual ?? null,
        usoCapital: body.economics.usoCapital ?? null,
        comodidadPagos: body.economics.comodidadPagos ?? null,
        personasDependientes: body.economics.personasDependientes ?? null,
        otrasFuentesIngreso: body.economics.otrasFuentesIngreso ?? null,
        situacionEconomica: body.economics.situacionEconomica ?? null,
        interesCanalPremium: body.economics.interesCanalPremium ?? null,
        conocePrecioExportacion: body.economics.conocePrecioExportacion ?? null,
        haIntentadoExportar: body.economics.haIntentadoExportar ?? null,
      });
    }

    await db.insert(complianceDocsTable).values({ supplierId: supplier.id });

    await db.insert(interactionsTable).values({
      supplierId: supplier.id,
      interactionType: "FORM_SUBMISSION",
      actor: body.registeredBy ?? "SELF",
      notes: "Initial onboarding form submitted",
      metadata: body.officerFields ?? null,
    });

    scoreSupplier(supplier.id).catch((err) =>
      console.error("Claude scoring failed for supplier", supplier.id, err)
    );

    res.status(201).json({
      success: true,
      supplierId: supplier.id,
      message: `Gracias ${supplier.nombreCompleto}, recibirá su evaluación por WhatsApp`,
    });
  } catch (err: any) {
    console.error("Onboard error:", err);
    if (err.code === "23505") {
      res.status(409).json({ error: "Este número de WhatsApp ya está registrado" });
      return;
    }
    res.status(500).json({ error: "Error al guardar el perfil" });
  }
});

// ── GET /api/suppliers/admin-list ────────────────────────────────────────────
router.get("/suppliers/admin-list", requireAuth, requireAdmin,
  async (req, res): Promise<void> => {
    const { pathway, municipio, from, to } = req.query as Record<string, string>;

    const latestScores = db
      .selectDistinctOn([aiOutputsTable.supplierId], {
        supplierId: aiOutputsTable.supplierId,
        exportReadinessScore: aiOutputsTable.exportReadinessScore,
        pathway: aiOutputsTable.pathway,
        capitalCapacityCop: aiOutputsTable.capitalCapacityCop,
        complianceGaps: aiOutputsTable.complianceGaps,
        gapAnalysis: aiOutputsTable.gapAnalysis,
        scoredAt: aiOutputsTable.createdAt,
      })
      .from(aiOutputsTable)
      .orderBy(aiOutputsTable.supplierId, desc(aiOutputsTable.createdAt))
      .as("latest_scores");

    let query = db
      .select({
        id: suppliersTable.id,
        nombreCompleto: suppliersTable.nombreCompleto,
        municipio: suppliersTable.municipio,
        supplierType: suppliersTable.supplierType,
        status: suppliersTable.status,
        createdAt: suppliersTable.createdAt,
        exportReadinessScore: latestScores.exportReadinessScore,
        pathway: latestScores.pathway,
        capitalCapacityCop: latestScores.capitalCapacityCop,
        complianceGaps: latestScores.complianceGaps,
        gapAnalysis: latestScores.gapAnalysis,
      })
      .from(suppliersTable)
      .leftJoin(latestScores, eq(latestScores.supplierId, suppliersTable.id))
      .orderBy(desc(suppliersTable.createdAt))
      .$dynamic();

    const conditions = [];
    if (pathway) conditions.push(eq(latestScores.pathway, pathway));
    if (municipio) conditions.push(eq(suppliersTable.municipio, municipio));
    if (from) conditions.push(gte(suppliersTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(suppliersTable.createdAt, new Date(to)));
    if (conditions.length) query = query.where(and(...conditions));

    const suppliers = await query;

    const [totals] = await db.select({
      total: sql<number>`count(*)::int`,
      totalCapital: sql<number>`coalesce(sum(ls.capital_capacity_cop), 0)::int`,
      pathwayA: sql<number>`count(*) filter (where ls.pathway = 'A')::int`,
      pathwayB: sql<number>`count(*) filter (where ls.pathway = 'B')::int`,
      pathwayC: sql<number>`count(*) filter (where ls.pathway = 'C')::int`,
      pathwayD: sql<number>`count(*) filter (where ls.pathway = 'D')::int`,
    }).from(suppliersTable)
      .leftJoin(latestScores, eq(latestScores.supplierId, suppliersTable.id));

    res.json({ summary: totals, suppliers });
  }
);

// ── POST /api/suppliers/:id/generate-document ────────────────────────────────
router.post("/suppliers/:id/generate-document", requireAuth, requireAdmin,
  async (req, res): Promise<void> => {
    const supplierId = Number(req.params.id);
    try {
      const [supplier] = await db.select().from(suppliersTable)
        .where(eq(suppliersTable.id, supplierId));
      if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }

      const [farm] = await db.select().from(farmsTable)
        .where(eq(farmsTable.supplierId, supplierId));
      const [compliance] = await db.select().from(complianceDocsTable)
        .where(eq(complianceDocsTable.supplierId, supplierId));
      const [latestScore] = await db.select().from(aiOutputsTable)
        .where(eq(aiOutputsTable.supplierId, supplierId))
        .orderBy(desc(aiOutputsTable.createdAt)).limit(1);

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: `You are a Colombian agricultural export compliance specialist. Write a personalised export compliance guide in plain Spanish for a smallholder farmer. Use usted. Maximum 800 words. Structure: greeting with name, their score summary, missing documents, numbered steps with WHERE/WHAT/COST for each step, total cost estimate, next Fincava contact.`,
        messages: [{ role: "user", content: JSON.stringify({ supplier, farm, compliance, latestScore }) }],
      });

      const documentContent = (message.content[0] as any).text;
      await db.insert(aiOutputsTable).values({
        supplierId,
        aiModel: "claude-sonnet-4-6",
        callType: "DOCUMENT_GENERATION",
        documentContent,
      });

      res.json({ success: true, documentContent });
    } catch (err) {
      console.error("Document generation error:", err);
      res.status(500).json({ error: "Document generation failed" });
    }
  }
);

// ── Internal: Score supplier with Claude Haiku ───────────────────────────────
async function scoreSupplier(supplierId: number): Promise<void> {
  const [supplier] = await db.select().from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId));
  const [farm] = await db.select().from(farmsTable)
    .where(eq(farmsTable.supplierId, supplierId));
  const [economics] = await db.select().from(economicsTable)
    .where(eq(economicsTable.supplierId, supplierId));
  const [compliance] = await db.select().from(complianceDocsTable)
    .where(eq(complianceDocsTable.supplierId, supplierId));

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system: `You are a Colombian agricultural export readiness scoring system. Score the supplier on: land rights (20pts), production volume (20pts), post-harvest quality (20pts), compliance docs (20pts), commitment (20pts). Return ONLY valid JSON: {"export_readiness_score": integer, "pathway": "A"|"B"|"C"|"D", "pathway_label": string, "capital_capacity_cop": integer, "compliance_gaps": string[], "gap_analysis": string, "primary_recommendation": string}`,
    messages: [{ role: "user", content: JSON.stringify({ supplier, farm, economics, compliance }) }],
  });

  const raw = (message.content[0] as any).text;
  const parsed = JSON.parse(raw);

  await db.insert(aiOutputsTable).values({
    supplierId,
    aiModel: "claude-haiku-4-5",
    callType: "ONBOARD_SCORE",
    exportReadinessScore: parsed.export_readiness_score,
    pathway: parsed.pathway,
    capitalCapacityCop: parsed.capital_capacity_cop,
    complianceGaps: parsed.compliance_gaps?.join(", "),
    gapAnalysis: parsed.gap_analysis,
  });
}

export default router;