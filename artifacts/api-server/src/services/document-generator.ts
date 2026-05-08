// document-generator.ts — Item 5
// Generates a formatted compliance assessment document for a supplier using
// Claude Sonnet, backed by gap analysis data. Stores result in ai_outputs
// with callType = 'COMPLIANCE_DOCUMENT'.
//
// Routes that call this:
//   POST /admin/suppliers/:id/compliance-document  → generateComplianceDocument()
//   GET  /admin/suppliers/:id/compliance-document  → getLatestComplianceDocument()

import { db, aiOutputsTable, suppliersTable, supplierRequirementStatusTable, adminComplianceReviewsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { getAnthropicClient, DOCUMENT_MODEL } from "../lib/anthropic";
import { analyzeGaps, type GapAnalysisResult } from "./gap-analysis-service";
import { logger } from "../lib/logger";
import { INVESTOR_SUMMARY_PROMPT } from "../config/ai-prompts/investor-summary-prompt";

export type GeneratedDocument = {
  id: number;
  supplierId: number;
  documentContent: string;
  gapSummary: GapAnalysisResult;
  generatedAt: Date;
  aiModel: string;
};

// ── generateComplianceDocument ────────────────────────────────────────────────

export async function generateComplianceDocument(
  supplierId: number,
): Promise<GeneratedDocument> {
  const [supplier] = await db
    .select({
      nombreCompleto: suppliersTable.nombreCompleto,
      municipio: suppliersTable.municipio,
      department: suppliersTable.department,
      supplierType: suppliersTable.supplierType,
      eligibilityStatus: suppliersTable.eligibilityStatus,
      sellableStatus: suppliersTable.sellableStatus,
      graduationPathway: suppliersTable.graduationPathway,
      commercialScore: suppliersTable.commercialScore,
      lastEvaluatedAt: suppliersTable.lastEvaluatedAt,
    })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!supplier) {
    throw new Error(`Supplier ${supplierId} not found`);
  }

  const gapSummary = await analyzeGaps(supplierId);

  const prompt = buildDocumentPrompt(supplierId, supplier, gapSummary);

  logger.info(
    { supplierId, totalGaps: gapSummary.totalGaps },
    "document-generator: calling Claude Sonnet",
  );

  const client = getAnthropicClient();
  const start = Date.now();
  const message = await client.messages.create({
    model: DOCUMENT_MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  const duration = Date.now() - start;

  const documentContent = (message.content[0] as any).text as string;

  if (!documentContent || documentContent.trim().length < 100) {
    throw new Error(
      "document-generator: Claude returned an empty or too-short document",
    );
  }

  logger.info({ supplierId, duration }, "document-generator: Claude latency");

  const [row] = await db
    .insert(aiOutputsTable)
    .values({
      supplierId,
      aiModel: DOCUMENT_MODEL,
      callType: "COMPLIANCE_DOCUMENT",
      documentContent,
    })
    .returning();

  return {
    id: row.id,
    supplierId,
    documentContent,
    gapSummary,
    generatedAt: row.createdAt,
    aiModel: DOCUMENT_MODEL,
  };
}

// ── getLatestComplianceDocument ───────────────────────────────────────────────

export async function getLatestComplianceDocument(
  supplierId: number,
): Promise<{ id: number; documentContent: string; generatedAt: Date; aiModel: string } | null> {
  const [row] = await db
    .select()
    .from(aiOutputsTable)
    .where(
      and(
        eq(aiOutputsTable.supplierId, supplierId),
        eq(aiOutputsTable.callType, "COMPLIANCE_DOCUMENT"),
      ),
    )
    .orderBy(desc(aiOutputsTable.createdAt))
    .limit(1);

  if (!row || !row.documentContent) return null;

  return {
    id: row.id,
    documentContent: row.documentContent,
    generatedAt: row.createdAt,
    aiModel: row.aiModel ?? DOCUMENT_MODEL,
  };
}

// ── generateInvestorSummary — Layer D ─────────────────────────────────────────

export type GeneratedInvestorSummary = {
  id: number;
  supplierId: number;
  documentContent: string;
  generatedAt: Date;
  aiModel: string;
};

export async function generateInvestorSummary(
  supplierId: number,
): Promise<GeneratedInvestorSummary> {
  const [supplier] = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!supplier) {
    throw new Error(`Supplier ${supplierId} not found`);
  }

  // All requirement rows
  const requirements = await db
    .select()
    .from(supplierRequirementStatusTable)
    .where(eq(supplierRequirementStatusTable.supplierId, supplierId));

  // Last review per requirement (most recent first)
  const reviews = await db
    .select()
    .from(adminComplianceReviewsTable)
    .where(eq(adminComplianceReviewsTable.supplierId, supplierId))
    .orderBy(desc(adminComplianceReviewsTable.reviewedAt));

  // Latest ONBOARD_SCORE for scoring context
  const [latestScore] = await db
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

  const context = {
    supplier: {
      id: supplier.id,
      nombreCompleto: supplier.nombreCompleto,
      municipio: supplier.municipio,
      department: supplier.department,
      supplierType: supplier.supplierType,
      eligibilityStatus: supplier.eligibilityStatus,
      sellableStatus: supplier.sellableStatus,
      graduationPathway: supplier.graduationPathway,
      commercialScore: supplier.commercialScore,
      lastEvaluatedAt: supplier.lastEvaluatedAt?.toISOString() ?? null,
      country: supplier.country,
    },
    requirements: requirements.map((r) => ({
      requirementCode: r.requirementCode,
      agency: r.agency,
      state: r.state,
      verifiedAt: r.verifiedAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      updatedAt: r.updatedAt.toISOString(),
    })),
    recentReviews: reviews.slice(0, 20).map((rv) => ({
      requirementCode: rv.requirementCode,
      decision: rv.decision,
      reasonCode: rv.reasonCode,
      visibleNote: rv.visibleNote,
      reviewedAt: rv.reviewedAt.toISOString(),
    })),
    aiScoring: latestScore
      ? {
          exportReadinessScore: latestScore.exportReadinessScore,
          pathway: latestScore.pathway,
          complianceGaps: latestScore.complianceGaps,
          scoredAt: latestScore.createdAt.toISOString(),
          aiModel: latestScore.aiModel,
        }
      : null,
    generatedAt: new Date().toISOString(),
    aiModel: DOCUMENT_MODEL,
  };

  logger.info(
    { supplierId, requirementsCount: requirements.length },
    "document-generator: calling Claude Sonnet for investor summary (Layer D)",
  );

  const client = getAnthropicClient();
  const start = Date.now();
  const message = await client.messages.create({
    model: DOCUMENT_MODEL,
    max_tokens: 3000,
    system: INVESTOR_SUMMARY_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(context) }],
  });
  const duration = Date.now() - start;

  const documentContent = (message.content[0] as { type: string; text: string }).text ?? "";
  if (!documentContent || documentContent.trim().length < 100) {
    throw new Error("document-generator: Claude returned an empty investor summary");
  }

  logger.info({ supplierId, duration }, "document-generator: investor summary Claude latency (Layer D)");

  const [row] = await db
    .insert(aiOutputsTable)
    .values({
      supplierId,
      aiModel: DOCUMENT_MODEL,
      callType: "INVESTOR_SUMMARY",
      documentContent,
    })
    .returning();

  return {
    id: row.id,
    supplierId,
    documentContent,
    generatedAt: row.createdAt,
    aiModel: DOCUMENT_MODEL,
  };
}

// ── Prompt builders ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un experto en cumplimiento regulatorio para exportaciones agrícolas colombianas. 
Redactas evaluaciones de cumplimiento claras, profesionales y accionables en español para agricultores y cooperativas.
Tu tono es directo, empático y orientado a soluciones. Evita tecnicismos innecesarios.
Estructura el documento con secciones claramente delimitadas usando encabezados en mayúsculas.`;

function buildDocumentPrompt(
  supplierId: number,
  supplier: {
    nombreCompleto: string;
    municipio: string;
    department: string | null;
    supplierType: string;
    eligibilityStatus: string | null;
    sellableStatus: string | null;
    graduationPathway: string | null;
    commercialScore: number | null;
    lastEvaluatedAt: Date | null;
  },
  gaps: GapAnalysisResult,
): string {
  const gapLines = gaps.gaps
    .map(
      (g) =>
        `- [${g.severity}] ${g.label} (${g.agency}): Estado actual: ${g.requirementState}. ${g.recommendation}`,
    )
    .join("\n");

  const noGapsMessage =
    gaps.totalGaps === 0
      ? "El proveedor no tiene brechas de cumplimiento activas. Todos los requisitos evaluados están en estado satisfactorio."
      : "";

  return `Genera una evaluación de cumplimiento para el siguiente proveedor agrícola colombiano.

DATOS DEL PROVEEDOR:
- Nombre: ${supplier.nombreCompleto}
- Municipio: ${supplier.municipio}${supplier.department ? `, ${supplier.department}` : ""}
- Tipo: ${supplier.supplierType}
- Puntaje de exportación: ${supplier.commercialScore ?? "No evaluado"}/100
- Estado de elegibilidad: ${supplier.eligibilityStatus ?? "No evaluado"}
- Estado de comercialización: ${supplier.sellableStatus ?? "No evaluado"}
- Camino asignado: ${supplier.graduationPathway ?? "No asignado"}
- Última evaluación: ${supplier.lastEvaluatedAt ? supplier.lastEvaluatedAt.toLocaleDateString("es-CO") : "Nunca"}

ANÁLISIS DE BRECHAS:
- Total de brechas activas: ${gaps.totalGaps}
- Brechas críticas: ${gaps.criticalGaps}
- Brechas altas: ${gaps.highGaps}
- Brechas medias: ${gaps.mediumGaps}
- Costo total estimado: $${gaps.estimatedTotalCostCOP.toLocaleString("es-CO")} COP
- Tiempo estimado de resolución: ${formatTimeline(gaps.overallTimeline)}

${gaps.totalGaps > 0 ? `BRECHAS DETALLADAS:\n${gapLines}` : noGapsMessage}

Redacta el documento con las siguientes secciones:
1. RESUMEN EJECUTIVO (2-3 oraciones sobre el estado actual)
2. ESTADO DE CUMPLIMIENTO (evaluación de cada requisito)
3. BRECHAS Y PLAN DE ACCIÓN (pasos concretos, responsable, costo estimado)
4. CRONOGRAMA RECOMENDADO (con fechas aproximadas desde hoy)
5. PRÓXIMOS PASOS INMEDIATOS (3-5 acciones prioritarias)

Fecha de generación: ${new Date().toLocaleDateString("es-CO")}`;
}

function formatTimeline(timeline: string): string {
  const map: Record<string, string> = {
    "7days": "7 días",
    "30days": "30 días",
    "90days": "90 días",
    longterm: "Más de 90 días",
  };
  return map[timeline] ?? timeline;
}
