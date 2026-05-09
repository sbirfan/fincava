// gap-analysis-service.ts
// Item 4 — Structured gap analysis from supplier_requirement_status rows.
// Reads CC-1 data and returns classified output: severity, resolution timeline,
// estimated COP cost, and recommended next actions (Spanish).
//
// Design rules:
//   - Read-only: no DB writes.
//   - Colombian regulatory context baked in as constants.
//   - Feeds document-generator.ts (Item 5) and future Phase 4 reporting.

import { db, supplierRequirementStatusTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ── Requirement metadata registry ────────────────────────────────────────────

export type GapSeverity = "CRITICAL" | "HIGH" | "MEDIUM";
export type ResolutionTimeline = "7days" | "30days" | "90days" | "longterm";

export interface RequirementMeta {
  code: string;
  label: string;
  agency: string;
  severity: GapSeverity;
  estimatedCostCOP: number;
  estimatedDays: number;
  resolutionTimeline: ResolutionTimeline;
  recommendation: string;
}

export const REQUIREMENT_REGISTRY: Record<string, RequirementMeta> = {
  DIAN_RUT: {
    code: "DIAN_RUT",
    label: "Registro Único Tributario (RUT)",
    agency: "DIAN",
    severity: "CRITICAL",
    estimatedCostCOP: 0,
    estimatedDays: 3,
    resolutionTimeline: "7days",
    recommendation:
      "Registrarse en el RUT a través del portal de la DIAN (dian.gov.co). El registro es gratuito y puede completarse en línea en 1-3 días hábiles.",
  },
  DIAN_EXPORTADOR: {
    code: "DIAN_EXPORTADOR",
    label: "Habilitación como Exportador ante DIAN",
    agency: "DIAN",
    severity: "CRITICAL",
    estimatedCostCOP: 0,
    estimatedDays: 7,
    resolutionTimeline: "7days",
    recommendation:
      "Solicitar habilitación como exportador en el portal de la DIAN. Requiere RUT activo. Proceso gratuito, tiempo estimado: 5-7 días hábiles.",
  },
  ICA_REGISTRO: {
    code: "ICA_REGISTRO",
    label: "Registro ICA (Instituto Colombiano Agropecuario)",
    agency: "ICA",
    severity: "CRITICAL",
    estimatedCostCOP: 500_000,
    estimatedDays: 21,
    resolutionTimeline: "30days",
    recommendation:
      "Registrarse ante el ICA como productor agrícola. Costo aproximado: $500.000 COP. Tiempo estimado: 15-21 días. Contactar la oficina regional del ICA más cercana.",
  },
  ICA_CONTEXT: {
    code: "ICA_CONTEXT",
    label: "Contexto de Registro ICA",
    agency: "ICA",
    severity: "HIGH",
    estimatedCostCOP: 200_000,
    estimatedDays: 14,
    resolutionTimeline: "30days",
    recommendation:
      "Completar el registro de predio ante el ICA. Requiere inspección de campo. Tiempo estimado: 10-14 días hábiles.",
  },
  FITOSANITARIO: {
    code: "FITOSANITARIO",
    label: "Certificado Fitosanitario",
    agency: "ICA",
    severity: "HIGH",
    estimatedCostCOP: 200_000,
    estimatedDays: 14,
    resolutionTimeline: "30days",
    recommendation:
      "Solicitar certificado fitosanitario al ICA. Requiere registro ICA activo y cumplir estándares de manejo de plagas. Costo aproximado: $200.000 COP.",
  },
  FNC_COFFEE: {
    code: "FNC_COFFEE",
    label: "Registro Cafetero (FNC)",
    agency: "FNC",
    severity: "MEDIUM",
    estimatedCostCOP: 0,
    estimatedDays: 30,
    resolutionTimeline: "90days",
    recommendation:
      "Registrarse como cafetero en la Federación Nacional de Cafeteros. El registro habilita acceso a precios de garantía y mercados diferenciados.",
  },
  INVIMA: {
    code: "INVIMA",
    label: "Registro / Notificación Sanitaria INVIMA",
    agency: "INVIMA",
    severity: "CRITICAL",
    estimatedCostCOP: 1_000_000,
    estimatedDays: 60,
    resolutionTimeline: "90days",
    recommendation:
      "Obtener Notificación Sanitaria Automática (NSA) o Registro Sanitario ante INVIMA para productos procesados, empacados o de valor agregado (frutas deshidratadas, superalimentos, alimentos procesados). " +
      "Costo estimado: $500.000–2.000.000 COP según categoría. Tiempo estimado: 30–90 días. " +
      "Iniciar el trámite en invima.gov.co o en la Cámara de Comercio más cercana.",
  },
};

// States that represent an open gap (requirement not yet satisfied)
const OPEN_GAP_STATES = new Set([
  "not_started",
  "not_sure",
  "self_serve_in_progress",
  "assisted_in_progress",
  "managed_service_candidate",
  "needs_fix",
]);

// ── Gap output types ──────────────────────────────────────────────────────────

export interface Gap {
  requirementCode: string;
  requirementState: string;
  label: string;
  agency: string;
  severity: GapSeverity;
  estimatedCostCOP: number;
  resolutionTimeline: ResolutionTimeline;
  recommendation: string;
}

export interface GapAnalysisResult {
  supplierId: number;
  gaps: Gap[];
  totalGaps: number;
  criticalGaps: number;
  highGaps: number;
  mediumGaps: number;
  overallTimeline: ResolutionTimeline;
  estimatedTotalCostCOP: number;
  recommendedActions: string[];
  generatedAt: Date;
}

// ── analyzeGaps ───────────────────────────────────────────────────────────────

export async function analyzeGaps(
  supplierId: number,
): Promise<GapAnalysisResult> {
  const rows = await db
    .select()
    .from(supplierRequirementStatusTable)
    .where(eq(supplierRequirementStatusTable.supplierId, supplierId));

  const gaps: Gap[] = [];

  for (const row of rows) {
    if (!OPEN_GAP_STATES.has(row.state)) continue;

    const meta = REQUIREMENT_REGISTRY[row.requirementCode];
    if (!meta) {
      // Unknown requirement code — treat as HIGH severity gap
      gaps.push({
        requirementCode: row.requirementCode,
        requirementState: row.state,
        label: row.requirementCode,
        agency: row.agency,
        severity: "HIGH",
        estimatedCostCOP: 0,
        resolutionTimeline: "30days",
        recommendation: `Completar el requisito ${row.requirementCode} ante ${row.agency}.`,
      });
      continue;
    }

    gaps.push({
      requirementCode: row.requirementCode,
      requirementState: row.state,
      label: meta.label,
      agency: meta.agency,
      severity: meta.severity,
      estimatedCostCOP: meta.estimatedCostCOP,
      resolutionTimeline: meta.resolutionTimeline,
      recommendation: meta.recommendation,
    });
  }

  const criticalGaps = gaps.filter((g) => g.severity === "CRITICAL").length;
  const highGaps = gaps.filter((g) => g.severity === "HIGH").length;
  const mediumGaps = gaps.filter((g) => g.severity === "MEDIUM").length;
  const estimatedTotalCostCOP = gaps.reduce(
    (sum, g) => sum + g.estimatedCostCOP,
    0,
  );

  const overallTimeline = computeOverallTimeline(gaps);
  const recommendedActions = gaps.map((g) => g.recommendation);

  return {
    supplierId,
    gaps,
    totalGaps: gaps.length,
    criticalGaps,
    highGaps,
    mediumGaps,
    overallTimeline,
    estimatedTotalCostCOP,
    recommendedActions,
    generatedAt: new Date(),
  };
}

function computeOverallTimeline(gaps: Gap[]): ResolutionTimeline {
  if (gaps.some((g) => g.resolutionTimeline === "7days")) return "7days";
  if (gaps.some((g) => g.resolutionTimeline === "30days")) return "30days";
  if (gaps.some((g) => g.resolutionTimeline === "90days")) return "90days";
  return "longterm";
}
