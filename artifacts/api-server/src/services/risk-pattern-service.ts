// risk-pattern-service.ts — Layer C
// Pure deterministic rules engine over supplier_requirement_status rows.
// No DB writes, no Claude calls. Zero latency cost.
// Runs inline in GET /admin/compliance-queue and GET /admin/compliance-queue/:supplierId.

// ── COMPLIANCE_STALE_DAYS — env var, bounded 7–90, default 30 (OD-3) ─────────
const rawStaleDays = parseInt(process.env["COMPLIANCE_STALE_DAYS"] ?? "30", 10);
export const COMPLIANCE_STALE_DAYS = Math.min(90, Math.max(7, isNaN(rawStaleDays) ? 30 : rawStaleDays));

// ── Types ─────────────────────────────────────────────────────────────────────

export type RequirementSnapshot = {
  requirementCode: string;
  state: string;
  agency: string;
  updatedAt: Date;
};

export type SupplierContext = {
  commercialScore: number | null;
  eligibilityStatus: string | null;
};

export type RiskFlag = {
  patternCode: string;
  severity: "critical" | "warning" | "info";
  label: string;
  description: string;
};

// ── CRITICAL requirement codes — used for STALE_SUBMISSION check ──────────────
const CRITICAL_REQUIREMENTS = new Set(["DIAN_RUT", "DIAN_EXPORTADOR", "ICA_REGISTRO", "FITOSANITARIO", "INVIMA"]);

// ── Pattern registry (Phase I — 5 patterns) ───────────────────────────────────

export function evaluateRiskPatterns(
  requirements: RequirementSnapshot[],
  supplier: SupplierContext,
  now: Date = new Date(),
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Index states by requirementCode for quick lookups
  const stateByCode = new Map<string, string>();
  for (const r of requirements) {
    stateByCode.set(r.requirementCode, r.state);
  }

  // ── P1: SEQUENCING_RISK ────────────────────────────────────────────────────
  // ICA_REGISTRO progressing but DIAN_RUT not started — DIAN must come first.
  const icaState = stateByCode.get("ICA_REGISTRO");
  const dianRutState = stateByCode.get("DIAN_RUT");
  if (
    icaState != null &&
    (icaState === "submitted" || icaState === "verified") &&
    dianRutState != null &&
    (dianRutState === "not_started" || dianRutState === "not_sure")
  ) {
    flags.push({
      patternCode: "SEQUENCING_RISK",
      severity: "warning",
      label: "Sequencing risk",
      description:
        "ICA progressing but DIAN RUT not started — DIAN must be resolved first for export eligibility.",
    });
  }

  // ── P2: SYSTEMIC_ISSUES ───────────────────────────────────────────────────
  // ≥ 2 requirements simultaneously in needs_fix state
  const needsFixCount = requirements.filter((r) => r.state === "needs_fix").length;
  if (needsFixCount >= 2) {
    flags.push({
      patternCode: "SYSTEMIC_ISSUES",
      severity: "critical",
      label: "Systemic issues",
      description: `Multiple requirements rejected simultaneously (${needsFixCount}) — consider escalating to managed service.`,
    });
  }

  // ── P3: COMMERCIAL_READINESS_GAP ──────────────────────────────────────────
  // DIAN_EXPORTADOR progressing but commercial score is low (< 40)
  const dianExportadorState = stateByCode.get("DIAN_EXPORTADOR");
  if (
    dianExportadorState != null &&
    (dianExportadorState === "submitted" || dianExportadorState === "verified") &&
    supplier.commercialScore != null &&
    supplier.commercialScore < 40
  ) {
    flags.push({
      patternCode: "COMMERCIAL_READINESS_GAP",
      severity: "warning",
      label: "Commercial readiness gap",
      description:
        "Export authorization progressing but commercial score is low — may not clear SELLABLE threshold.",
    });
  }

  // ── P4: STALE_SUBMISSION ──────────────────────────────────────────────────
  // Any CRITICAL requirement in submitted state with updatedAt > COMPLIANCE_STALE_DAYS ago
  const staleThresholdMs = COMPLIANCE_STALE_DAYS * 24 * 60 * 60 * 1000;
  for (const r of requirements) {
    if (
      r.state === "submitted" &&
      CRITICAL_REQUIREMENTS.has(r.requirementCode) &&
      now.getTime() - r.updatedAt.getTime() > staleThresholdMs
    ) {
      flags.push({
        patternCode: "STALE_SUBMISSION",
        severity: "warning",
        label: "Stale submission",
        description: `Submitted document for ${r.requirementCode} has had no admin action for ${COMPLIANCE_STALE_DAYS}+ days — re-engagement needed.`,
      });
      break; // One stale flag is enough per supplier
    }
  }

  // ── P5: SCORE_COMPLIANCE_MISMATCH ─────────────────────────────────────────
  // Strong commercial score but compliance still failing
  if (
    supplier.commercialScore != null &&
    supplier.commercialScore >= 60 &&
    supplier.eligibilityStatus === "FAIL"
  ) {
    flags.push({
      patternCode: "SCORE_COMPLIANCE_MISMATCH",
      severity: "info",
      label: "Score-compliance mismatch",
      description:
        "Strong commercial score but compliance still failing — fast track compliance to unlock SELLABLE.",
    });
  }

  // ── P7: INVIMA_NOT_STARTED ────────────────────────────────────────────────
  // Supplier has an INVIMA requirement row (seeded because they sell processed,
  // packaged, or value-added products) but has not yet begun the registration.
  const invimaState = stateByCode.get("INVIMA");
  if (invimaState != null && (invimaState === "not_started" || invimaState === "not_sure")) {
    flags.push({
      patternCode: "INVIMA_NOT_STARTED",
      severity: "critical",
      label: "INVIMA registration not started",
      description:
        "Supplier sells processed, packaged, or value-added products but has not started " +
        "INVIMA health registration — mandatory before any commercial shipment of these goods.",
    });
  }

  // ── P6: PHYTO_SEQUENCING_RISK ─────────────────────────────────────────────
  // ICA_REGISTRO must be active before FITOSANITARIO can be verified.
  // Flagging this early prevents a supplier from submitting phytosanitary
  // documents while their ICA registry is not yet in progress — the
  // certification authority will reject the submission regardless.
  {
    const p6PhytoState = stateByCode.get("FITOSANITARIO");
    const p6IcaState   = stateByCode.get("ICA_REGISTRO");
    const phytoActive = p6PhytoState != null &&
      (p6PhytoState === "submitted" || p6PhytoState === "verified");
    const icaNotReady = p6IcaState != null &&
      (p6IcaState === "not_started" || p6IcaState === "not_sure");
    if (phytoActive && icaNotReady) {
      flags.push({
        patternCode: "PHYTO_SEQUENCING_RISK",
        severity: "warning",
        label: "Phytosanitary sequencing risk",
        description:
          "FITOSANITARIO certificate submitted but ICA_REGISTRO is not yet active. " +
          "ICA Registro must be in progress before the phytosanitary certificate " +
          "can be verified — reorder the compliance sequence.",
      });
    }
  }

  return flags;
}
