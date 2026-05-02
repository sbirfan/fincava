// P2-R8: Boundary tests for feature-flag gates.
//
// All flags are mocked to false (the closed/gated state) so every describe
// block tests what happens when a gate is disabled.  The auth state is
// controlled via a hoisted mutable object so individual tests can simulate
// unauthenticated, authenticated-non-admin, or authenticated-admin callers.

import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

// ─── Hoisted flag values — all false (gated/disabled) ────────────────────────
const flagValues = vi.hoisted(() => ({
  ENABLE_TRANSACTIONS: false,
  ENABLE_FINANCE: false,
  ENABLE_LOGISTICS: false,
  ENABLE_INTELLIGENCE_PUBLIC: false,
}));

vi.mock("../lib/flags", () => flagValues);

// ─── Hoisted auth state — controls requireAuth / requireAdmin stubs ───────────
const authState = vi.hoisted(() => ({ authenticated: true, isAdmin: false }));

// ─── Chainable DB select mock (needed when an admin passes the gate) ──────────
// Using a function declaration so JS hoisting makes it available inside vi.hoisted.
function makeChain(rows: any[] = []): any {
  const chain: any = {
    then: (resolve: (v: any[]) => void) => Promise.resolve(rows).then(resolve),
  };
  ["from", "where", "orderBy", "limit", "leftJoin", "groupBy", "innerJoin"].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  return chain;
}

// ─── Module mocks (hoisted automatically by vitest) ──────────────────────────

vi.mock("../lib/auth", () => ({
  requireAuth: vi.fn((req: any, res: any, next: any) => {
    if (!authState.authenticated) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = 1;
    next();
  }),
  requireVerifiedEmail: vi.fn((_req: any, _res: any, next: any) => next()),
  getUserWithProfile: vi.fn(),
  generateToken: vi.fn(),
  hashPassword: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock("../middleware/admin", () => ({
  requireAdmin: vi.fn((req: any, res: any, next: any) => {
    if (!authState.isAdmin) {
      res.status(403).json({ error: "Admin only" });
      return;
    }
    next();
  }),
  adminOnly: [
    (req: any, res: any, next: any) => {
      if (!authState.isAdmin) {
        res.status(403).json({ error: "Admin only" });
        return;
      }
      (req as any).userId = 1;
      (req as any).userRole = "ADMIN";
      next();
    },
  ],
}));

vi.mock("@workspace/db", () => ({
  db: { select: vi.fn(() => makeChain([])) },
  ordersTable: {}, orderItemsTable: {}, productsTable: {}, usersTable: {},
  profilesTable: {}, companiesTable: {}, messagesTable: {}, loansTable: {},
  repaymentsTable: {}, shipmentsTable: {}, paymentMilestonesTable: {},
  productAnalyticsTable: { inquiries: "inquiries" },
  tradeHistoryTable: {}, complianceRequirementsTable: {}, trustScoresTable: {}, rfqsTable: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), or: vi.fn(), ne: vi.fn(), inArray: vi.fn(),
  desc: vi.fn(), asc: vi.fn(), count: vi.fn(), sum: vi.fn(), ilike: vi.fn(), isNull: vi.fn(),
  sql: Object.assign(vi.fn((...args: any[]) => args), { raw: vi.fn() }),
}));

vi.mock("@workspace/api-zod", () => ({
  CreateOrderBody: { parse: vi.fn(), safeParse: vi.fn() },
  GetBuyerOrderParams: { parse: vi.fn(), safeParse: vi.fn() },
  UpdateOrderStatusParams: { parse: vi.fn(), safeParse: vi.fn() },
  UpdateOrderStatusBody: { parse: vi.fn(), safeParse: vi.fn() },
}));

vi.mock("../lib/email", () => ({
  sendEmail: vi.fn(), orderStatusEmail: vi.fn(), loanRepaidBuyerEmail: vi.fn(),
}));
vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../services/fee-service", () => ({ computeFee: vi.fn() }));
vi.mock("../lib/interaction-logger", () => ({ logInteraction: vi.fn() }));
vi.mock("../lib/volumeCounters", () => ({ incrementAndMaybeLog: vi.fn() }));

// ─── Import routers after all mocks are in place ──────────────────────────────
const { default: ordersRouter }    = await import("../routes/orders");
const { default: financingRouter } = await import("../routes/financing");
const { default: shipmentsRouter } = await import("../routes/shipments");
const { default: analyticsRouter } = await import("../routes/analytics");

function makeApp(router: ReturnType<typeof express.Router>) {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. ENABLE_TRANSACTIONS gate
// ═════════════════════════════════════════════════════════════════════════════

describe("ENABLE_TRANSACTIONS gate — flag=false", () => {
  const app = makeApp(ordersRouter);

  it("GET /api/buyer/orders returns 404 when ENABLE_TRANSACTIONS is off", async () => {
    const res = await request(app).get("/api/buyer/orders");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("POST /api/buyer/orders returns 404 when ENABLE_TRANSACTIONS is off", async () => {
    const res = await request(app).post("/api/buyer/orders").send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("GET /api/supplier/orders returns 404 when ENABLE_TRANSACTIONS is off", async () => {
    const res = await request(app).get("/api/supplier/orders");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. ENABLE_FINANCE gate
// ═════════════════════════════════════════════════════════════════════════════

describe("ENABLE_FINANCE gate — flag=false", () => {
  const app = makeApp(financingRouter);

  it("GET /api/finance/credit-score returns 404 when ENABLE_FINANCE is off", async () => {
    const res = await request(app).get("/api/finance/credit-score");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("GET /api/finance/loans returns 404 when ENABLE_FINANCE is off", async () => {
    const res = await request(app).get("/api/finance/loans");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. ENABLE_LOGISTICS gate
// ═════════════════════════════════════════════════════════════════════════════

describe("ENABLE_LOGISTICS gate — flag=false", () => {
  const app = makeApp(shipmentsRouter);

  it("GET /api/orders/1/shipment returns 404 when ENABLE_LOGISTICS is off", async () => {
    const res = await request(app).get("/api/orders/1/shipment");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("GET /api/orders/1/milestones returns 404 when ENABLE_LOGISTICS is off", async () => {
    const res = await request(app).get("/api/orders/1/milestones");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. ENABLE_INTELLIGENCE_PUBLIC gate — admin-only enforcement
// ═════════════════════════════════════════════════════════════════════════════

describe("ENABLE_INTELLIGENCE_PUBLIC gate — flag=false, admin-only access", () => {
  const app = makeApp(analyticsRouter);

  beforeEach(() => {
    authState.authenticated = true;
    authState.isAdmin = false;
  });

  it("GET /api/analytics/trending returns 401 for unauthenticated requests", async () => {
    authState.authenticated = false;
    const res = await request(app).get("/api/analytics/trending");
    expect(res.status).toBe(401);
  });

  it("GET /api/analytics/trending returns 403 for authenticated non-admin requests", async () => {
    const res = await request(app).get("/api/analytics/trending");
    expect(res.status).toBe(403);
  });

  it("GET /api/analytics/trending passes gate and returns 200 for admin", async () => {
    authState.isAdmin = true;
    const res = await request(app).get("/api/analytics/trending");
    // Gate cleared — handler runs, DB mock returns [], route responds with []
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/compliance/* returns 401 for unauthenticated requests", async () => {
    authState.authenticated = false;
    const res = await request(app).get("/api/compliance/requirements");
    expect(res.status).toBe(401);
  });

  it("GET /api/compliance/* returns 403 for authenticated non-admin requests", async () => {
    const res = await request(app).get("/api/compliance/requirements");
    expect(res.status).toBe(403);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. Core route independence — no ENABLE_* flag gates on public paths
// ═════════════════════════════════════════════════════════════════════════════

describe("Core route independence", () => {
  const routeDir = join(dirname(fileURLToPath(import.meta.url)), "../routes");

  it("products.ts has no ENABLE_* feature-flag gates", () => {
    const src = readFileSync(join(routeDir, "products.ts"), "utf8");
    expect(src).not.toMatch(
      /ENABLE_TRANSACTIONS|ENABLE_FINANCE|ENABLE_LOGISTICS|ENABLE_INTELLIGENCE_PUBLIC/,
    );
  });

  it("suppliers.ts marketplace endpoint no longer sorts by lastEvaluatedAt (P2-R7)", () => {
    const src = readFileSync(join(routeDir, "suppliers.ts"), "utf8");
    // The public marketplace must not use the AI-pipeline-written lastEvaluatedAt column
    // for ordering. This test locks in the P2-R7 fix.
    expect(src).not.toMatch(/lastEvaluatedAt.*DESC/);
    expect(src).not.toMatch(/last_evaluated_at.*DESC/i);
  });

  it("flags module exports all four expected boolean flags", async () => {
    const actual = await vi.importActual<typeof import("../lib/flags")>("../lib/flags");
    expect(actual).toHaveProperty("ENABLE_TRANSACTIONS");
    expect(actual).toHaveProperty("ENABLE_FINANCE");
    expect(actual).toHaveProperty("ENABLE_LOGISTICS");
    expect(actual).toHaveProperty("ENABLE_INTELLIGENCE_PUBLIC");
    expect(typeof actual.ENABLE_TRANSACTIONS).toBe("boolean");
    expect(typeof actual.ENABLE_FINANCE).toBe("boolean");
    expect(typeof actual.ENABLE_LOGISTICS).toBe("boolean");
    expect(typeof actual.ENABLE_INTELLIGENCE_PUBLIC).toBe("boolean");
  });
});
