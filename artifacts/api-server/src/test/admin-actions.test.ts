import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// ─── Hoisted state ───────────────────────────────────────────────────────────
// selectQueue is drained by each db.select() call in order, allowing tests to
// script exactly which rows the route handler should see.
const selectQueue = vi.hoisted(() => [] as any[]);
const updatedSets = vi.hoisted(() => [] as any[]);
// Toggle to simulate a non-admin request (403 path).
const rejectAuth = vi.hoisted(() => ({ value: false }));

// ─── DB select chain helper ───────────────────────────────────────────────────
// Mirrors the pattern in buyer-gap-service.test.ts. The chain object supports
// .from().where() (and .then for direct await) so route handlers can use the
// standard Drizzle fluent API.
function makeSelectChain(rows: any[]) {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.groupBy = vi.fn(() => chain);
  chain.then = (resolve: (v: any) => void) => resolve(rows);
  return chain;
}

// ─── Hoisted DB mocks ─────────────────────────────────────────────────────────
const mockSelect = vi.hoisted(() =>
  vi.fn((_shape?: any) => {
    const rows = selectQueue.shift() ?? [];
    return makeSelectChain(rows);
  }),
);

const mockReturning = vi.hoisted(() => vi.fn());

const mockUpdate = vi.hoisted(() =>
  vi.fn(() => ({
    set: vi.fn((vals: any) => {
      updatedSets.push(vals);
      return {
        where: vi.fn(() => ({ returning: mockReturning })),
      };
    }),
  })),
);

// ─── @workspace/db ───────────────────────────────────────────────────────────
vi.mock("@workspace/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: vi.fn(() => ({ values: vi.fn(async () => ({ returning: vi.fn(async () => []) })) })),
  },
  usersTable: { $name: "users", id: "id", role: "role" },
  profilesTable: { $name: "profiles" },
  companiesTable: { $name: "companies" },
  loansTable: { $name: "loans", status: "status", principalUSD: "principal_usd", totalRepaymentUSD: "total_repayment_usd" },
  repaymentsTable: { $name: "repayments" },
  ordersTable: { $name: "orders", buyerId: "buyer_id", status: "status", totalUSD: "total_usd" },
  orderItemsTable: { $name: "order_items" },
  productsTable: { $name: "products" },
  staffRolesTable: { $name: "staff_roles" },
  suppliersTable: { $name: "suppliers", id: "id" },
  farmsTable: { $name: "farms" },
  buyerProfilesTable: { $name: "buyer_profiles", id: "id", targetProducts: "target_products" },
  buyerMatchesTable: {
    $name: "buyer_matches",
    id: "id",
    buyerProfileId: "buyer_profile_id",
    supplierId: "supplier_id",
    isCurrent: "is_current",
    disqualifiers: "disqualifiers",
    matchScore: "match_score",
    createdAt: "created_at",
  },
  buyerGapBriefsTable: {
    $name: "buyer_gap_briefs",
    id: "id",
    buyerProfileId: "buyer_profile_id",
    isRealGap: "is_real_gap",
    ingestionBatchId: "ingestion_batch_id",
    priority: "priority",
    resolvedAt: "resolved_at",
    createdAt: "created_at",
    pipelineAction: "pipeline_action",
    searchCategory: "search_category",
    searchRegion: "search_region",
    requiredAttributes: "required_attributes",
    volumeTargetMt: "volume_target_mt",
    buyerUrgencyNote: "buyer_urgency_note",
  },
  buyerAdminActionsTable: { $name: "buyer_admin_actions", id: "id", buyerProfileId: "buyer_profile_id", actorAdminId: "actor_admin_id" },
  supplierIngestionBatchesTable: { $name: "supplier_ingestion_batches", createdAt: "created_at" },
  productPlaceholdersTable: { $name: "product_placeholders" },
  INTERACTION_TYPES: {},
  companyTypeEnum: { enumValues: ["BUYER", "SUPPLIER", "STAFF"] },
}));

// ─── drizzle-orm ─────────────────────────────────────────────────────────────
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ eq: [col, val] })),
  and: vi.fn((...args) => ({ and: args })),
  desc: vi.fn((col) => ({ desc: col })),
  asc: vi.fn((col) => ({ asc: col })),
  inArray: vi.fn((col, vals) => ({ inArray: [col, vals] })),
  count: vi.fn(() => ({ count: true })),
  sum: vi.fn(() => ({ sum: true })),
  sql: Object.assign(vi.fn((...args: any[]) => ({ sql: args })), { raw: vi.fn() }),
  isNull: vi.fn((col) => ({ isNull: col })),
  ilike: vi.fn((col, val) => ({ ilike: [col, val] })),
  or: vi.fn((...args) => ({ or: args })),
  ne: vi.fn((col, val) => ({ ne: [col, val] })),
}));

// ─── Admin middleware ─────────────────────────────────────────────────────────
// Replace the real JWT + DB auth with a controllable stub. Flip rejectAuth.value
// to true in individual tests to verify the 403 path.
vi.mock("../middleware/admin", () => ({
  adminOnly: [
    (req: any, res: any, next: any) => {
      if (rejectAuth.value) {
        res.status(403).json({ error: "Admin only" });
        return;
      }
      req.userId = 99;
      req.userRole = "ADMIN";
      next();
    },
  ],
  requireAdmin: vi.fn((req: any, res: any, next: any) => next()),
}));

// ─── buyer-gap-service ────────────────────────────────────────────────────────
const mockEscalateGap = vi.hoisted(() => vi.fn());
vi.mock("../services/buyer-gap-service", () => ({
  escalateGap: mockEscalateGap,
  analyseGaps: vi.fn(),
  NotFoundError: class NotFoundError extends Error {},
}));

// ─── buyer-matching-service ───────────────────────────────────────────────────
const mockRunBuyerMatching = vi.hoisted(() => vi.fn());
vi.mock("../services/buyer-matching-service", () => ({
  runMatching: mockRunBuyerMatching,
  NotFoundError: class NotFoundError extends Error {},
}));

// ─── Remaining dependencies used by admin.ts (stubbed to silence imports) ────
vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../lib/interaction-logger", () => ({
  logInteraction: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
  requireAuth: vi.fn((req: any, res: any, next: any) => next()),
  verifyToken: vi.fn(),
  generateToken: vi.fn(),
  getUserWithProfile: vi.fn(),
}));

vi.mock("../lib/email", () => ({
  sendEmail: vi.fn(),
  supplierStatusChangeEmail: vi.fn(),
  orderStatusEmail: vi.fn(),
  loanStatusEmail: vi.fn(),
  adminCreatedAccountEmail: vi.fn(),
  adminPasswordResetEmail: vi.fn(),
  adminRoleChangeEmail: vi.fn(),
}));

vi.mock("../services/trust-score-service", () => ({
  computeTrustScore: vi.fn(),
}));

vi.mock("../services/ingestion-structuring-service", () => ({
  enrichSupplierWithAI: vi.fn(),
}));

vi.mock("../services/duplicate-detector", () => ({
  checkDuplicate: vi.fn(),
  computeSupplierFingerprint: vi.fn(),
  logDuplicateOverride: vi.fn(),
}));

vi.mock("../services/discovery-engine", () => ({
  discoverLeads: vi.fn(),
}));

vi.mock("../services/backup-service", () => ({
  runBackup: vi.fn(),
}));

vi.mock("../lib/volumeCounters", () => ({
  incrementAndMaybeLog: vi.fn(),
}));

// ─── System under test (imported after mocks are in place) ───────────────────
const { default: adminRouter } = await import("../routes/admin");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", adminRouter);
  return app;
}

function resetAll() {
  selectQueue.length = 0;
  updatedSets.length = 0;
  rejectAuth.value = false;
  mockReturning.mockReset();
  mockEscalateGap.mockReset();
  mockRunBuyerMatching.mockReset();
  // Restore the select mock to queue-draining behaviour after any per-test overrides.
  mockSelect.mockReset().mockImplementation((_shape?: any) => {
    const rows = selectQueue.shift() ?? [];
    return makeSelectChain(rows);
  });
  mockUpdate.mockReset().mockImplementation(() => ({
    set: vi.fn((vals: any) => {
      updatedSets.push(vals);
      return {
        where: vi.fn(() => ({ returning: mockReturning })),
      };
    }),
  }));
}

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/admin/buyers/:id/suppress-match
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/admin/buyers/:id/suppress-match", () => {
  const app = makeApp();

  beforeEach(resetAll);

  // ── Happy path ──────────────────────────────────────────────────────────
  it("suppresses a match: appends disqualifier tag and sets isCurrent=false", async () => {
    const existingMatch = {
      id: 10,
      buyerProfileId: 1,
      supplierId: 5,
      isCurrent: true,
      disqualifiers: ["[system] low volume"],
    };
    const updatedMatch = { ...existingMatch, isCurrent: false, disqualifiers: ["[system] low volume", "[admin:99@2026-04-30T00:00:00.000Z] Bad quality"] };

    selectQueue.push([existingMatch]);
    mockReturning.mockResolvedValueOnce([updatedMatch]);

    const res = await request(app)
      .post("/api/admin/buyers/1/suppress-match")
      .send({ matchId: 10, reason: "Bad quality" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ id: 10, isCurrent: false });

    // The update payload must mark the match as not current.
    expect(updatedSets).toHaveLength(1);
    expect(updatedSets[0]).toMatchObject({ isCurrent: false });

    // The disqualifiers array must include the new tag (contains adminId 99).
    const newDisqualifiers: string[] = updatedSets[0].disqualifiers;
    expect(Array.isArray(newDisqualifiers)).toBe(true);
    expect(newDisqualifiers.length).toBe(2);
    expect(newDisqualifiers[0]).toBe("[system] low volume");
    expect(newDisqualifiers[1]).toMatch(/^\[admin:99@\d{4}-\d{2}-\d{2}T/);
    expect(newDisqualifiers[1]).toContain("Bad quality");
  });

  it("appends the disqualifier even when the match starts with no disqualifiers", async () => {
    const existingMatch = { id: 20, buyerProfileId: 2, supplierId: 6, isCurrent: true, disqualifiers: null };
    selectQueue.push([existingMatch]);
    mockReturning.mockResolvedValueOnce([{ ...existingMatch, isCurrent: false, disqualifiers: ["[admin:99@ts] reason"] }]);

    const res = await request(app)
      .post("/api/admin/buyers/2/suppress-match")
      .send({ matchId: 20, reason: "Duplicate supplier" });

    expect(res.status).toBe(200);
    const newDisqualifiers: string[] = updatedSets[0].disqualifiers;
    expect(newDisqualifiers).toHaveLength(1);
    expect(newDisqualifiers[0]).toContain("Duplicate supplier");
  });

  // ── Auth gating ─────────────────────────────────────────────────────────
  it("returns 403 for non-admin requests", async () => {
    rejectAuth.value = true;

    const res = await request(app)
      .post("/api/admin/buyers/1/suppress-match")
      .send({ matchId: 10, reason: "reason" });

    expect(res.status).toBe(403);
    expect(mockSelect).not.toHaveBeenCalled();
    expect(updatedSets).toHaveLength(0);
  });

  // ── Invalid id ──────────────────────────────────────────────────────────
  it("returns 400 for a non-numeric buyer profile id", async () => {
    const res = await request(app)
      .post("/api/admin/buyers/abc/suppress-match")
      .send({ matchId: 10, reason: "reason" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid buyer profile id/i);
  });

  it("returns 400 when the request body fails validation (missing reason)", async () => {
    const res = await request(app)
      .post("/api/admin/buyers/1/suppress-match")
      .send({ matchId: 10 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when matchId is not a positive integer", async () => {
    const res = await request(app)
      .post("/api/admin/buyers/1/suppress-match")
      .send({ matchId: -5, reason: "reason" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Match not found ──────────────────────────────────────────────────────
  it("returns 404 when the match does not exist for the given buyer", async () => {
    selectQueue.push([]); // empty → match not found

    const res = await request(app)
      .post("/api/admin/buyers/1/suppress-match")
      .send({ matchId: 999, reason: "reason" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/match not found/i);
    expect(updatedSets).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/admin/gaps/:id/escalate
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/admin/gaps/:id/escalate", () => {
  const app = makeApp();

  beforeEach(resetAll);

  const mediumRealGap = {
    id: 50,
    buyerProfileId: 3,
    priority: "MEDIUM",
    isRealGap: true,
    ingestionBatchId: null,
  };

  const buyerProfile = {
    targetProducts: ["COFFEE", "CACAO"],
  };

  // ── Happy path ──────────────────────────────────────────────────────────
  it("creates an ingestion batch for a real MEDIUM gap and returns its id", async () => {
    selectQueue.push([mediumRealGap]);   // gap brief lookup
    selectQueue.push([buyerProfile]);    // buyer profile lookup

    const fakeBatchId = 77;
    mockEscalateGap.mockResolvedValueOnce(fakeBatchId);

    const res = await request(app).post("/api/admin/gaps/50/escalate");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ gapId: 50, ingestionBatchId: fakeBatchId });

    // escalateGap must be called with the correct args.
    expect(mockEscalateGap).toHaveBeenCalledTimes(1);
    expect(mockEscalateGap).toHaveBeenCalledWith(
      50,
      { targetProducts: ["COFFEE", "CACAO"] },
      { manual: true, actorAdminId: 99 },
    );
  });

  // ── Auth gating ─────────────────────────────────────────────────────────
  it("returns 403 for non-admin requests", async () => {
    rejectAuth.value = true;

    const res = await request(app).post("/api/admin/gaps/50/escalate");

    expect(res.status).toBe(403);
    expect(mockEscalateGap).not.toHaveBeenCalled();
  });

  // ── Invalid id ──────────────────────────────────────────────────────────
  it("returns 400 for a non-numeric gap id", async () => {
    const res = await request(app).post("/api/admin/gaps/abc/escalate");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid gap id/i);
    expect(mockEscalateGap).not.toHaveBeenCalled();
  });

  // ── Gap not found ────────────────────────────────────────────────────────
  it("returns 404 when the gap brief does not exist", async () => {
    selectQueue.push([]); // empty → gap not found

    const res = await request(app).post("/api/admin/gaps/999/escalate");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/gap brief not found/i);
    expect(mockEscalateGap).not.toHaveBeenCalled();
  });

  // ── MEDIUM-only guard: rejects HIGH gaps ─────────────────────────────────
  it("returns 400 and blocks escalation when the gap priority is HIGH", async () => {
    const highGap = { ...mediumRealGap, priority: "HIGH" };
    selectQueue.push([highGap]);

    const res = await request(app).post("/api/admin/gaps/50/escalate");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/MEDIUM/);
    expect(res.body.error).toMatch(/HIGH/);
    expect(mockEscalateGap).not.toHaveBeenCalled();
  });

  // ── MEDIUM-only guard: rejects LOW gaps ─────────────────────────────────
  it("returns 400 and blocks escalation when the gap priority is LOW", async () => {
    const lowGap = { ...mediumRealGap, priority: "LOW" };
    selectQueue.push([lowGap]);

    const res = await request(app).post("/api/admin/gaps/50/escalate");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/MEDIUM/);
    expect(res.body.error).toMatch(/LOW/);
    expect(mockEscalateGap).not.toHaveBeenCalled();
  });

  // ── Already escalated ────────────────────────────────────────────────────
  it("returns 409 when the gap already has an ingestion batch", async () => {
    const alreadyEscalated = { ...mediumRealGap, ingestionBatchId: 42 };
    selectQueue.push([alreadyEscalated]);

    const res = await request(app).post("/api/admin/gaps/50/escalate");

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already escalated/i);
    expect(res.body.data).toMatchObject({ ingestionBatchId: 42 });
    expect(mockEscalateGap).not.toHaveBeenCalled();
  });

  // ── Non-real gap ─────────────────────────────────────────────────────────
  it("returns 400 when the gap is not a real gap (isRealGap=false)", async () => {
    const notRealGap = { ...mediumRealGap, isRealGap: false };
    selectQueue.push([notRealGap]);

    const res = await request(app).post("/api/admin/gaps/50/escalate");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/non-real gap/i);
    expect(mockEscalateGap).not.toHaveBeenCalled();
  });

  // ── Service failure ──────────────────────────────────────────────────────
  it("returns 500 when escalateGap returns null (no batch created)", async () => {
    selectQueue.push([mediumRealGap]);
    selectQueue.push([buyerProfile]);
    mockEscalateGap.mockResolvedValueOnce(null);

    const res = await request(app).post("/api/admin/gaps/50/escalate");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/escalation failed/i);
  });

  it("returns 500 when escalateGap throws unexpectedly", async () => {
    selectQueue.push([mediumRealGap]);
    selectQueue.push([buyerProfile]);
    mockEscalateGap.mockRejectedValueOnce(new Error("DB connection lost"));

    const res = await request(app).post("/api/admin/gaps/50/escalate");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/DB connection lost/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/admin/buyers/:id/reset-score
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/admin/buyers/:id/reset-score", () => {
  const app = makeApp();

  beforeEach(resetAll);

  const existingProfile = { id: 7 };
  const resetProfile = {
    id: 7,
    p2CompletionPct: 0,
    p2SectionsDone: [],
    gapFlagCount: 0,
    subscriptionRecommendation: null,
  };

  // ── Happy path ──────────────────────────────────────────────────────────
  it("resets the buyer score fields and returns the updated profile", async () => {
    selectQueue.push([existingProfile]); // profile existence check
    mockReturning.mockResolvedValueOnce([resetProfile]);

    const res = await request(app).post("/api/admin/buyers/7/reset-score");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: 7,
      p2CompletionPct: 0,
      p2SectionsDone: [],
      gapFlagCount: 0,
    });

    // The update payload must zero-out the scoring fields.
    expect(updatedSets).toHaveLength(1);
    expect(updatedSets[0]).toMatchObject({
      p2CompletionPct: 0,
      p2SectionsDone: [],
      gapFlagCount: 0,
      subscriptionRecommendation: null,
    });
  });

  // ── Auth gating ─────────────────────────────────────────────────────────
  it("returns 403 for non-admin requests", async () => {
    rejectAuth.value = true;

    const res = await request(app).post("/api/admin/buyers/7/reset-score");

    expect(res.status).toBe(403);
    expect(mockSelect).not.toHaveBeenCalled();
    expect(updatedSets).toHaveLength(0);
  });

  // ── Invalid id ──────────────────────────────────────────────────────────
  it("returns 400 for a non-numeric buyer profile id", async () => {
    const res = await request(app).post("/api/admin/buyers/abc/reset-score");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid buyer profile id/i);
    expect(updatedSets).toHaveLength(0);
  });

  // ── Profile not found ────────────────────────────────────────────────────
  it("returns 404 when the buyer profile does not exist", async () => {
    selectQueue.push([]); // empty → profile not found

    const res = await request(app).post("/api/admin/buyers/999/reset-score");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/buyer profile not found/i);
    expect(updatedSets).toHaveLength(0);
  });

  // ── DB failure ───────────────────────────────────────────────────────────
  it("returns 500 when the update throws unexpectedly", async () => {
    selectQueue.push([existingProfile]);
    mockUpdate.mockImplementationOnce(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.reject(new Error("DB write failed"))),
        })),
      })),
    }));

    const res = await request(app).post("/api/admin/buyers/7/reset-score");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/DB write failed/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/admin/buyers/:id/run-match
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/admin/buyers/:id/run-match", () => {
  const app = makeApp();

  beforeEach(resetAll);

  const matchResult = { matchesInserted: 3, candidatesEvaluated: 12 };

  // ── Happy path ──────────────────────────────────────────────────────────
  it("triggers the matching pipeline and returns the result", async () => {
    mockRunBuyerMatching.mockResolvedValueOnce(matchResult);

    const res = await request(app).post("/api/admin/buyers/4/run-match");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ matchesInserted: 3, candidatesEvaluated: 12 });

    expect(mockRunBuyerMatching).toHaveBeenCalledTimes(1);
    expect(mockRunBuyerMatching).toHaveBeenCalledWith(4);
  });

  // ── Auth gating ─────────────────────────────────────────────────────────
  it("returns 403 for non-admin requests", async () => {
    rejectAuth.value = true;

    const res = await request(app).post("/api/admin/buyers/4/run-match");

    expect(res.status).toBe(403);
    expect(mockRunBuyerMatching).not.toHaveBeenCalled();
  });

  // ── Invalid id ──────────────────────────────────────────────────────────
  it("returns 400 for a non-numeric buyer profile id", async () => {
    const res = await request(app).post("/api/admin/buyers/xyz/run-match");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid buyer profile id/i);
    expect(mockRunBuyerMatching).not.toHaveBeenCalled();
  });

  // ── Profile not found (service throws NotFoundError) ─────────────────────
  it("returns 404 when the buyer profile does not exist in the matching service", async () => {
    const { NotFoundError } = await import("../services/buyer-matching-service");
    mockRunBuyerMatching.mockRejectedValueOnce(
      new NotFoundError("Buyer profile 999 not found"),
    );

    const res = await request(app).post("/api/admin/buyers/999/run-match");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/buyer profile 999 not found/i);
  });

  // ── Service failure ──────────────────────────────────────────────────────
  it("returns 500 when the matching service throws an unexpected error", async () => {
    mockRunBuyerMatching.mockRejectedValueOnce(new Error("Claude API timeout"));

    const res = await request(app).post("/api/admin/buyers/4/run-match");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Claude API timeout/i);
  });

  // ── Zero matches ─────────────────────────────────────────────────────────
  it("returns 200 with zero matches when no candidates are found", async () => {
    mockRunBuyerMatching.mockResolvedValueOnce({ matchesInserted: 0, candidatesEvaluated: 0 });

    const res = await request(app).post("/api/admin/buyers/4/run-match");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ matchesInserted: 0, candidatesEvaluated: 0 });
  });
});
