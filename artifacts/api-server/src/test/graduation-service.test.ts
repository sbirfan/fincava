// Item 7 — Unit tests for graduation service pure functions and gap analysis service.
// Tests only pure/side-effect-free functions — no DB calls, no network.
// DB-dependent functions (evaluateSupplier, previewEvaluation) are integration-tested
// via the admin compliance queue e2e flows.

import { describe, it, expect } from "vitest";
import {
  computeEligibility,
  computeSellableStatus,
  parsePathway,
  computeNextActions,
  STATE_ORDER,
} from "../services/supplier-graduation-service";
import {
  REQUIREMENT_REGISTRY,
} from "../services/gap-analysis-service";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_SUPPLIER = {
  id: 1,
  userId: null,
  nombreCompleto: "Juan Café",
  whatsappNumber: "573001234567",
  email: null,
  municipio: "Pitalito",
  department: "Huila",
  vereda: null,
  supplierType: "FARMER" as const,
  registeredBy: null,
  status: "ACTIVE" as const,
  consentGiven: true,
  consentDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  eligibilityStatus: null,
  commercialScore: null,
  sellableStatus: null,
  graduationPathway: null,
  nextActions: null,
  commercialScoreAtOnboarding: null,
  lastEvaluatedAt: null,
  thresholdVersion: null,
  normalizedName: null,
  description: null,
  sourceUrl: null,
  sourceType: null,
  supplierFingerprint: null,
  claimStatus: "UNCLAIMED" as const,
  claimToken: null,
  ingestionSource: "FIELD_COLLECTED" as const,
  ingestionStatus: null,
  createdByAdminId: null,
  batchId: null,
  country: "Colombia",
  dataCompletenessScore: null,
  confidenceScore: null,
  customSupplierType: null,
  publishedToOriginStories: false,
  originStoryImageUrl: null,
};

const BASE_COMPLIANCE = {
  id: 1,
  supplierId: 1,
  rutDian: true,
  icaRegistro: true,
  fitosanitarioCert: true,
  dianExportador: true,
  complianceScore: null,
  lastReviewedAt: null,
};

const makeReqRow = (
  code: string,
  agency: string,
  state: string,
) => ({
  id: 1,
  supplierId: 1,
  requirementCode: code,
  agency,
  state,
  selectedMode: null,
  adminRequired: false,
  confidenceScore: null,
  visibleNote: null,
  internalNote: null,
  verifiedAt: null,
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ── computeEligibility ────────────────────────────────────────────────────────

describe("computeEligibility", () => {
  it("returns PASS when all CC-1 requirements are verified", () => {
    const rows = [
      makeReqRow("DIAN_RUT", "DIAN", "verified"),
      makeReqRow("ICA_REGISTRO", "ICA", "verified"),
      makeReqRow("FITOSANITARIO", "ICA", "verified"),
    ];
    const result = computeEligibility(BASE_SUPPLIER, BASE_COMPLIANCE, rows);
    expect(result.eligibilityStatus).toBe("PASS");
    expect(result.missingFields).toHaveLength(0);
  });

  it("returns FAIL when a CRITICAL CC-1 requirement is not_started", () => {
    const rows = [
      makeReqRow("DIAN_RUT", "DIAN", "not_started"),
      makeReqRow("ICA_REGISTRO", "ICA", "verified"),
      makeReqRow("FITOSANITARIO", "ICA", "verified"),
    ];
    const result = computeEligibility(BASE_SUPPLIER, BASE_COMPLIANCE, rows);
    expect(result.eligibilityStatus).toBe("FAIL");
    expect(result.missingFields).toContain("rutDian");
  });

  it("returns FAIL when a requirement is in_progress (not yet satisfied)", () => {
    const rows = [
      makeReqRow("DIAN_RUT", "DIAN", "self_serve_in_progress"),
      makeReqRow("ICA_REGISTRO", "ICA", "verified"),
      makeReqRow("FITOSANITARIO", "ICA", "verified"),
    ];
    const result = computeEligibility(BASE_SUPPLIER, BASE_COMPLIANCE, rows);
    expect(result.eligibilityStatus).toBe("FAIL");
    expect(result.missingFields).toContain("rutDian");
  });

  it("treats conditionally_approved as satisfied", () => {
    const rows = [
      makeReqRow("DIAN_RUT", "DIAN", "conditionally_approved"),
      makeReqRow("ICA_REGISTRO", "ICA", "verified"),
      makeReqRow("FITOSANITARIO", "ICA", "verified"),
    ];
    const result = computeEligibility(BASE_SUPPLIER, BASE_COMPLIANCE, rows);
    expect(result.eligibilityStatus).toBe("PASS");
  });

  it("treats submitted as satisfied", () => {
    const rows = [
      makeReqRow("DIAN_RUT", "DIAN", "submitted"),
      makeReqRow("ICA_REGISTRO", "ICA", "submitted"),
      makeReqRow("FITOSANITARIO", "ICA", "submitted"),
    ];
    const result = computeEligibility(BASE_SUPPLIER, BASE_COMPLIANCE, rows);
    expect(result.eligibilityStatus).toBe("PASS");
  });

  it("falls back to compliance_docs boolean when no CC-1 row exists", () => {
    // No CC-1 rows — relies on compliance_docs (all true in BASE_COMPLIANCE)
    const result = computeEligibility(BASE_SUPPLIER, BASE_COMPLIANCE, []);
    expect(result.eligibilityStatus).toBe("PASS");
  });

  it("fails via compliance_docs fallback when boolean is false and no CC-1 row", () => {
    const compliance = { ...BASE_COMPLIANCE, rutDian: false };
    const result = computeEligibility(BASE_SUPPLIER, compliance, []);
    expect(result.eligibilityStatus).toBe("FAIL");
    expect(result.missingFields).toContain("rutDian");
  });

  it("returns FAIL when consentGiven is false regardless of CC-1 rows", () => {
    const supplier = { ...BASE_SUPPLIER, consentGiven: false };
    const rows = [
      makeReqRow("DIAN_RUT", "DIAN", "verified"),
      makeReqRow("ICA_REGISTRO", "ICA", "verified"),
      makeReqRow("FITOSANITARIO", "ICA", "verified"),
    ];
    const result = computeEligibility(supplier, BASE_COMPLIANCE, rows);
    expect(result.eligibilityStatus).toBe("FAIL");
    expect(result.missingFields).toContain("consentGiven");
  });

  it("reports all missing fields, not just the first", () => {
    const rows = [
      makeReqRow("DIAN_RUT", "DIAN", "not_started"),
      makeReqRow("ICA_REGISTRO", "ICA", "not_started"),
      makeReqRow("FITOSANITARIO", "ICA", "not_started"),
    ];
    const result = computeEligibility(BASE_SUPPLIER, BASE_COMPLIANCE, rows);
    expect(result.missingFields.length).toBeGreaterThanOrEqual(3);
  });
});

// ── computeSellableStatus ─────────────────────────────────────────────────────

describe("computeSellableStatus", () => {
  it("returns NOT_READY when eligibility FAIL regardless of score", () => {
    expect(computeSellableStatus("FAIL", 100)).toBe("NOT_READY");
    expect(computeSellableStatus("FAIL", 0)).toBe("NOT_READY");
  });

  it("returns NOT_READY when score is below partialMin (30)", () => {
    expect(computeSellableStatus("PASS", 29)).toBe("NOT_READY");
    expect(computeSellableStatus("PASS", 0)).toBe("NOT_READY");
  });

  it("returns ELIGIBLE when score is between partialMin and sellableMin", () => {
    expect(computeSellableStatus("PASS", 30)).toBe("ELIGIBLE");
    expect(computeSellableStatus("PASS", 59)).toBe("ELIGIBLE");
  });

  it("returns SELLABLE when score meets sellableMin (60)", () => {
    expect(computeSellableStatus("PASS", 60)).toBe("SELLABLE");
    expect(computeSellableStatus("PASS", 100)).toBe("SELLABLE");
  });

  it("never returns PUBLISHED (EP6 — only set manually)", () => {
    const result = computeSellableStatus("PASS", 100);
    expect(result).not.toBe("PUBLISHED");
  });
});

// ── parsePathway ──────────────────────────────────────────────────────────────

describe("parsePathway", () => {
  it("returns valid pathway letters A-D", () => {
    expect(parsePathway("A")).toBe("A");
    expect(parsePathway("B")).toBe("B");
    expect(parsePathway("C")).toBe("C");
    expect(parsePathway("D")).toBe("D");
  });

  it("returns null for invalid pathway strings", () => {
    expect(parsePathway("E")).toBeNull();
    expect(parsePathway("Z")).toBeNull();
    expect(parsePathway("pathway_a")).toBeNull();
  });

  it("returns null for null/undefined input", () => {
    expect(parsePathway(null)).toBeNull();
    expect(parsePathway(undefined)).toBeNull();
  });
});

// ── STATE_ORDER forward-only guard ────────────────────────────────────────────

describe("STATE_ORDER", () => {
  it("defines a strict forward-only order", () => {
    expect(STATE_ORDER["NOT_READY"]).toBeLessThan(STATE_ORDER["ELIGIBLE"]);
    expect(STATE_ORDER["ELIGIBLE"]).toBeLessThan(STATE_ORDER["SELLABLE"]);
    expect(STATE_ORDER["SELLABLE"]).toBeLessThan(STATE_ORDER["PUBLISHED"]);
  });

  it("has 5 states (includes INACTIVE suspension state)", () => {
    expect(Object.keys(STATE_ORDER)).toHaveLength(5);
    expect(STATE_ORDER["INACTIVE"]).toBe(-1);
  });

  it("uses monotonically increasing integers", () => {
    const values = Object.values(STATE_ORDER);
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
  });
});

// ── computeNextActions ────────────────────────────────────────────────────────

describe("computeNextActions", () => {
  it("includes missingFields in output", () => {
    const result = computeNextActions(["rutDian", "consentGiven"], "B");
    expect(result.missingFields).toEqual(["rutDian", "consentGiven"]);
  });

  it("includes pathway steps when pathway is set", () => {
    const result = computeNextActions([], "A");
    expect((result.pathwaySteps as string[]).length).toBeGreaterThan(0);
  });

  it("returns empty pathwaySteps when pathway is null", () => {
    const result = computeNextActions([], null);
    expect(result.pathwaySteps).toHaveLength(0);
  });

  it("includes additional warnings in output", () => {
    const result = computeNextActions([], null, ["noProductsListed", "invalidPhoneFormat"]);
    expect(result.warnings).toContain("noProductsListed");
    expect(result.warnings).toContain("invalidPhoneFormat");
  });

  it("defaults warnings to empty array when not provided", () => {
    const result = computeNextActions([], "C");
    expect(result.warnings).toEqual([]);
  });
});

// ── REQUIREMENT_REGISTRY ──────────────────────────────────────────────────────

describe("REQUIREMENT_REGISTRY", () => {
  it("has entries for all known Phase-I gap codes", () => {
    const expectedCodes = [
      "DIAN_RUT",
      "DIAN_EXPORTADOR",
      "ICA_REGISTRO",
      "ICA_CONTEXT",
      "FITOSANITARIO",
      "FNC_COFFEE",
    ];
    for (const code of expectedCodes) {
      expect(REQUIREMENT_REGISTRY[code]).toBeDefined();
    }
  });

  it("marks DIAN_RUT and DIAN_EXPORTADOR as CRITICAL severity", () => {
    expect(REQUIREMENT_REGISTRY["DIAN_RUT"]!.severity).toBe("CRITICAL");
    expect(REQUIREMENT_REGISTRY["DIAN_EXPORTADOR"]!.severity).toBe("CRITICAL");
  });

  it("marks ICA_REGISTRO as CRITICAL severity", () => {
    expect(REQUIREMENT_REGISTRY["ICA_REGISTRO"]!.severity).toBe("CRITICAL");
  });

  it("marks FNC_COFFEE as MEDIUM severity", () => {
    expect(REQUIREMENT_REGISTRY["FNC_COFFEE"]!.severity).toBe("MEDIUM");
  });

  it("assigns 7days timeline to CRITICAL DIAN requirements", () => {
    expect(REQUIREMENT_REGISTRY["DIAN_RUT"]!.resolutionTimeline).toBe("7days");
    expect(REQUIREMENT_REGISTRY["DIAN_EXPORTADOR"]!.resolutionTimeline).toBe("7days");
  });

  it("assigns 30days timeline to ICA requirements", () => {
    expect(REQUIREMENT_REGISTRY["ICA_REGISTRO"]!.resolutionTimeline).toBe("30days");
    expect(REQUIREMENT_REGISTRY["FITOSANITARIO"]!.resolutionTimeline).toBe("30days");
  });

  it("has a non-empty Spanish recommendation for every entry", () => {
    for (const [code, meta] of Object.entries(REQUIREMENT_REGISTRY)) {
      expect(meta.recommendation.length, `${code} recommendation`).toBeGreaterThan(20);
    }
  });

  it("has non-negative estimated costs for all entries", () => {
    for (const [code, meta] of Object.entries(REQUIREMENT_REGISTRY)) {
      expect(meta.estimatedCostCOP, `${code} cost`).toBeGreaterThanOrEqual(0);
    }
  });
});
