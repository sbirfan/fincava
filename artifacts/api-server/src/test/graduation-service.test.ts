// Item 7 — Unit tests for graduation service pure functions and gap analysis service.
// computeEligibility is async + DB-dependent (CC-2 refactor); its tests use vi.mock.
// All other functions are pure / side-effect-free.
// DB-dependent functions (evaluateSupplier, previewEvaluation) are integration-tested
// via the admin compliance queue e2e flows.

import { describe, it, expect, vi, beforeEach } from "vitest";
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

// ── DB mock (computeEligibility is now async + DB-dependent) ──────────────────
// Do NOT use importOriginal — it loads the real module and triggers the
// DATABASE_URL check before the mock can intercept it.
// Do NOT use require() inside helpers — the package is ESM-typed and require
// triggers a directory import error. Import db here; vitest gives us the mock.

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(),
  },
  supplierRequirementStatusTable: {},
}));

import { db } from "@workspace/db";

// selectMock helper — configures the db.select() chain for a given rows result.
// Each call to computeEligibility does: db.select({...}).from(...).where(...)
function mockDbRows(rows: { requirementCode: string; state: string }[]) {
  const chain = { from: vi.fn() };
  chain.from.mockReturnValue({ where: vi.fn().mockResolvedValue(rows) });
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);
}

// ── computeEligibility ────────────────────────────────────────────────────────

describe("computeEligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns eligible=true when DIAN_RUT is verified", async () => {
    mockDbRows([{ requirementCode: "DIAN_RUT", state: "verified" }]);
    const result = await computeEligibility(1);
    expect(result.eligible).toBe(true);
    expect(result.gaps).toHaveLength(0);
  });

  it("returns eligible=false when DIAN_RUT is not_started", async () => {
    mockDbRows([{ requirementCode: "DIAN_RUT", state: "not_started" }]);
    const result = await computeEligibility(1);
    expect(result.eligible).toBe(false);
    expect(result.gaps).toContain("DIAN_RUT");
  });

  it("returns eligible=false when DIAN_RUT is self_serve_in_progress", async () => {
    mockDbRows([{ requirementCode: "DIAN_RUT", state: "self_serve_in_progress" }]);
    const result = await computeEligibility(1);
    expect(result.eligible).toBe(false);
    expect(result.gaps).toContain("DIAN_RUT");
  });

  it("treats conditionally_approved as eligible", async () => {
    mockDbRows([{ requirementCode: "DIAN_RUT", state: "conditionally_approved" }]);
    const result = await computeEligibility(1);
    expect(result.eligible).toBe(true);
    expect(result.gaps).toHaveLength(0);
  });

  it("returns eligible=false when no requirement rows exist (no DIAN_RUT row = missing)", async () => {
    mockDbRows([]);
    const result = await computeEligibility(1);
    expect(result.eligible).toBe(false);
    expect(result.gaps).toContain("DIAN_RUT");
  });

  it("ignores non-required codes — only REQUIRED_CODES gate eligibility", async () => {
    mockDbRows([
      { requirementCode: "DIAN_RUT", state: "verified" },
      { requirementCode: "ICA_REGISTRO", state: "not_started" },
    ]);
    const result = await computeEligibility(1);
    expect(result.eligible).toBe(true);
    expect(result.gaps).toHaveLength(0);
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
