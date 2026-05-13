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
import { buildAgencyLinksSection } from "../config/agency-registry";

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

  const aiContent = (message.content[0] as any).text as string;

  if (!aiContent || aiContent.trim().length < 100) {
    throw new Error(
      "document-generator: Claude returned an empty or too-short document",
    );
  }

  // Append the deterministic agency-links section AFTER the AI prose.
  // URLs never come from the AI — they come exclusively from the static registry.
  const documentContent = aiContent + buildAgencyLinksSection();

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
Estructura el documento con secciones claramente delimitadas usando encabezados en mayúsculas.

RESTRICCIONES CRÍTICAS — aplica sin excepción:
1. Solo afirma hechos que estén explícitamente presentes en los datos estructurados proporcionados. No inventes, infieras ni exageres ningún detalle.
2. Los estados de cumplimiento provienen del seguimiento del sistema de Fincava, no de verificación independiente externa. Nunca los describas como confirmados, validados o verificados por entidades gubernamentales a menos que un revisor administrativo haya marcado explícitamente el requisito como "approved" o "verified".
3. No inventes visitas de campo, confirmaciones gubernamentales, resultados de inspecciones, estado de validación, ni ninguna evidencia operativa que no esté presente en los datos.
4. No uses tablas markdown ni caracteres de pipe (|). Usa únicamente secciones de texto plano con encabezados en mayúsculas y párrafos de prosa.
5. Cuando el estado de un requisito sea "no iniciado" o "no seguro", escribe: "el proveedor indicó que aún no cuenta con este documento" — nunca afirmes que el documento no existe como hecho verificado externo.
6. NUNCA inventes ni incluyas: direcciones de oficinas, nombres de calles, números de edificios, teléfonos, correos electrónicos, sitios web o URLs, costos específicos por paso, tiempos de trámite por paso, ubicaciones de oficinas, nombres de sucursales ni datos de contacto de entidades regulatorias. Esta información no está en los datos estructurados.
7. Para orientación sobre entidades, usa únicamente referencias genéricas. Ejemplos correctos: "Acércate a la oficina regional del ICA más cercana", "Visita un punto de atención DIAN en tu municipio", "Comunícate con la oficina local del INVIMA". Nunca escribas: direcciones específicas como "Carrera 22 No. 45-30", números de teléfono, ni URLs de trámites.
8. Para costos: referencia únicamente el estimado total que ya aparece en los datos estructurados. Para pasos individuales sin costo específico, escribe exactamente: "Los costos varían según municipio y entidad — confirma directamente con la entidad correspondiente." No inventes montos por paso.
9. Para cronogramas: referencia únicamente el rango general de tiempo que aparece en los datos. No inventes días de procesamiento, días hábiles ni plazos individuales por trámite o entidad.
10. No incluyas URLs, enlaces web ni páginas de entidades regulatorias en ninguna parte del documento. El sistema añadirá automáticamente una sección de enlaces oficiales al final del texto generado — no la anticipes ni la dupliques.`;

// Maps raw requirement state enum values to hedged Spanish descriptions.
// These states represent the workflow tracking status recorded by field officers
// or seeded by AI scoring — they are NOT independent external verifications.
function requirementStateLabel(state: string): string {
  const labels: Record<string, string> = {
    not_started:               "el proveedor indicó que aún no ha iniciado este trámite",
    not_sure:                  "el proveedor indicó no estar seguro sobre el estado de este requisito",
    self_serve_in_progress:    "el proveedor reportó estar gestionando este trámite de forma independiente",
    assisted_in_progress:      "el proveedor está recibiendo apoyo del equipo Fincava para completar este trámite",
    managed_service_candidate: "este requisito ha sido identificado para gestión asistida por Fincava",
    needs_fix:                 "se requiere corrección en la documentación presentada",
    submitted:                 "documentación enviada; pendiente de revisión por el equipo Fincava",
    approved:                  "requisito aprobado por revisor administrativo de Fincava",
    verified:                  "requisito verificado por revisor administrativo de Fincava",
    rejected:                  "documentación rechazada en revisión; requiere nueva presentación",
  };
  return labels[state] ?? `estado del sistema: ${state}`;
}

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
        `- [${g.severity}] ${g.label} (${g.agency}): ${requirementStateLabel(g.requirementState)}. Acción recomendada: ${g.recommendation}`,
    )
    .join("\n");

  const noGapsMessage =
    gaps.totalGaps === 0
      ? "No se registran brechas de cumplimiento activas en el sistema para este proveedor. Todos los requisitos evaluados se encuentran en un estado satisfactorio según el seguimiento del sistema."
      : "";

  return `Genera una evaluación de cumplimiento para el siguiente proveedor agrícola colombiano.

NOTA SOBRE LA PROCEDENCIA DE LOS DATOS:
Los estados de cumplimiento a continuación provienen del sistema de seguimiento de Fincava. Los estados "no iniciado" y "no seguro" reflejan lo que el proveedor reportó durante su incorporación — no son verificaciones externas independientes. Solo los estados "aprobado" o "verificado" han sido confirmados por un revisor administrativo. No afirmes como hechos verificados externos ninguna información que provenga exclusivamente del formulario de incorporación del proveedor.

RESTRICCIÓN ADICIONAL SOBRE DATOS NO PRESENTES:
Los datos estructurados a continuación NO incluyen: direcciones de oficinas, teléfonos, URLs, costos por paso individual, ni plazos de trámite por entidad. No inventes ninguno de estos datos. Para orientación sobre entidades, usa únicamente referencias genéricas ("la oficina regional del ICA más cercana", "un punto de atención DIAN en tu municipio"). Para costos por paso, escribe: "Los costos varían según municipio y entidad — confirma directamente con la entidad correspondiente."

DATOS DEL PROVEEDOR:
- Nombre: ${supplier.nombreCompleto}
- Municipio: ${supplier.municipio}${supplier.department ? `, ${supplier.department}` : ""}
- Tipo: ${supplier.supplierType}
- Puntaje de exportación (calculado por IA): ${supplier.commercialScore ?? "No evaluado"}/100
- Estado de elegibilidad: ${supplier.eligibilityStatus ?? "No evaluado"}
- Estado de comercialización: ${supplier.sellableStatus ?? "No evaluado"}
- Camino asignado: ${supplier.graduationPathway ?? "No asignado"}
- Última evaluación: ${supplier.lastEvaluatedAt ? supplier.lastEvaluatedAt.toLocaleDateString("es-CO") : "Nunca"}

ANÁLISIS DE BRECHAS (según seguimiento del sistema):
- Total de brechas activas: ${gaps.totalGaps}
- Brechas críticas: ${gaps.criticalGaps}
- Brechas altas: ${gaps.highGaps}
- Brechas medias: ${gaps.mediumGaps}
- Costo total estimado (estimado del sistema, no verificado): $${gaps.estimatedTotalCostCOP.toLocaleString("es-CO")} COP
- Tiempo estimado de resolución (rango general del sistema): ${formatTimeline(gaps.overallTimeline)}

${gaps.totalGaps > 0 ? `BRECHAS DETALLADAS:\n${gapLines}` : noGapsMessage}

Redacta el documento con las siguientes secciones usando ÚNICAMENTE texto plano. No uses tablas markdown, guiones de tabla ni caracteres de pipe (|). Usa encabezados en mayúsculas y párrafos de prosa:

1. RESUMEN EJECUTIVO (2-3 oraciones sobre el estado actual según el seguimiento del sistema)
2. ESTADO DE CUMPLIMIENTO (describe cada requisito indicando lo que el proveedor reportó o lo que el sistema registra)
3. BRECHAS Y PLAN DE ACCIÓN (para cada brecha: qué trámite completar y con cuál entidad — usa solo la entidad indicada en los datos; no incluyas direcciones ni costos específicos por paso)
4. CRONOGRAMA RECOMENDADO (usa el rango general de tiempo indicado en los datos; no inventes fechas específicas ni plazos por trámite)
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
