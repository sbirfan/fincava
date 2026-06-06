/**
 * FIN-001 — company_supplier_links admin CRUD endpoints
 *
 * Tests cover:
 *   GET    /api/admin/suppliers/:id/links
 *   POST   /api/admin/suppliers/:id/links
 *   DELETE /api/admin/suppliers/:id/links/:linkId
 *
 * Follows the DB-mock pattern from admin-actions.test.ts.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// ─── Hoisted state ────────────────────────────────────────────────────────────
const selectQueue   = vi.hoisted(() => [] as any[]);
const rejectAuth    = vi.hoisted(() => ({ value: false }));
const insertedRows  = vi.hoisted(() => [] as any[]);
const deletedRows   = vi.hoisted(() => [] as any[]);
const updatedSets   = vi.hoisted(() => [] as any[]);

function makeSelectChain(rows: any[]) {
  const chain: any = {};
  chain.from      = vi.fn(() => chain);
  chain.where     = vi.fn(() => chain);
  chain.orderBy   = vi.fn(() => chain);
  chain.limit     = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.leftJoin  = vi.fn(() => chain);
  chain.then      = (resolve: (v: any) => void) => resolve(rows);
  return chain;
}

const mockSelect = vi.hoisted(() =>
  vi.fn((_shape?: any) => {
    const rows = selectQueue.shift() ?? [];
    return makeSelectChain(rows);
  }),
);

const mockInsertReturning = vi.hoisted(() => vi.fn(async () => insertedRows.shift() ?? []));
const mockDeleteReturning = vi.hoisted(() => vi.fn(async () => deletedRows.shift() ?? []));

const mockUpdate = vi.hoisted(() =>
  vi.fn(() => ({
    set: vi.fn((vals: any) => {
      updatedSets.push(vals);
      return { where: vi.fn(async () => []) };
    }),
  })),
);

// ─── @workspace/db mock ───────────────────────────────────────────────────────
vi.mock("@workspace/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: mockInsertReturning,
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: mockDeleteReturning,
      })),
    })),
  },
  usersTable:               { id: "id", email: "email", role: "role" },
  profilesTable:            { $name: "profiles", userId: "user_id", firstName: "first_name", lastName: "last_name" },
  companiesTable:           { $name: "companies", id: "id", userId: "user_id", name: "name", type: "type", verified: "verified" },
  suppliersTable:           { $name: "suppliers", id: "id", userId: "user_id", nombreCompleto: "nombre_completo", municipio: "municipio", department: "department", sellableStatus: "sellable_status" },
  companySupplierLinksTable: {
    $name: "company_supplier_links",
    id: "id",
    companyId: "company_id",
    supplierId: "supplier_id",
    linkType: "link_type",
    isPrimary: "is_primary",
    linkedByAdminId: "linked_by_admin_id",
    linkedAt: "linked_at",
    notes: "notes",
  },
  productsTable:            { $name: "products", supplierId: "supplier_id", companyId: "company_id", active: "active", certifications: "certifications" },
  buyerProfilesTable:       { $name: "buyer_profiles", userId: "user_id", companyName: "company_name" },
  ordersTable:              { $name: "orders" },
  orderItemsTable:          { $name: "order_items" },
  loansTable:               { $name: "loans" },
  repaymentsTable:          { $name: "repayments" },
  rfqsTable:                { $name: "rfqs", id: "id", buyerId: "buyer_id", status: "status", productCategory: "product_category", quantityKg: "quantity_kg", destination: "destination" },
  rfqResponsesTable:        { $name: "rfq_responses" },
  inquiriesTable:           { $name: "inquiries" },
  staffRolesTable:          { $name: "staff_roles" },
  buyerMatchesTable:        { $name: "buyer_matches" },
  buyerGapBriefsTable:      { $name: "buyer_gap_briefs" },
  buyerAdminActionsTable:   { $name: "buyer_admin_actions" },
  marketingCampaignsTable:  { $name: "marketing_campaigns" },
  campaignLogsTable:        { $name: "campaign_logs" },
  supplierIngestionBatchesTable: { $name: "supplier_ingestion_batches" },
  productPlaceholdersTable: { $name: "product_placeholders" },
  originStoriesTable:       { $name: "origin_stories" },
  farmsTable:               { $name: "farms" },
  economicsTable:           { $name: "economics" },
  complianceDocsTable:      { $name: "compliance_docs" },
  aiOutputsTable:           { $name: "ai_outputs" },
  interactionsTable:        { $name: "interactions" },
  supplierContactsTable:    { $name: "supplier_contacts" },
  supplierPaymentMethodsTable: { $name: "supplier_payment_methods" },
  complianceRequirementsTable: { $name: "compliance_requirements" },
  INTERACTION_TYPES:        {},
  companyTypeEnum:          { enumValues: ["COOPERATIVE", "EXPORTER"] },
}));

// ─── drizzle-orm mock ─────────────────────────────────────────────────────────
vi.mock("drizzle-orm", () => ({
  eq:      vi.fn((col, val) => ({ eq: [col, val] })),
  and:     vi.fn((...args) => ({ and: args })),
  desc:    vi.fn((col) => ({ desc: col })),
  asc:     vi.fn((col) => ({ asc: col })),
  inArray: vi.fn((col, vals) => ({ inArray: [col, vals] })),
  count:   vi.fn(() => ({ count: true })),
  sum:     vi.fn(() => ({ sum: true })),
  sql:     Object.assign(vi.fn((...args: any[]) => ({ sql: args })), { raw: vi.fn(), join: vi.fn() }),
  isNull:  vi.fn((col) => ({ isNull: col })),
  ilike:   vi.fn((col, val) => ({ ilike: [col, val] })),
  or:      vi.fn((...args) => ({ or: args })),
  ne:      vi.fn((col, val) => ({ ne: [col, val] })),
}));

// ─── Auth middleware mock ─────────────────────────────────────────────────────
vi.mock("../lib/auth", () => ({
  requireAuth: vi.fn((req: any, res: any, next: any) => {
    if (rejectAuth.value) { res.status(401).json({ error: "Unauthorized" }); return; }
    req.userId = 99;
    next();
  }),
  hashPassword: vi.fn(async (p: string) => `hashed_${p}`),
}));

vi.mock("../middleware/admin", () => ({
  requireAdmin: vi.fn((req: any, res: any, next: any) => {
    if (rejectAuth.value) { res.status(403).json({ error: "Forbidden" }); return; }
    next();
  }),
  adminOnly: [
    vi.fn((req: any, res: any, next: any) => { if (rejectAuth.value) { res.status(403).json({ error: "Forbidden" }); return; } req.userId = 99; next(); }),
    vi.fn((_req: any, _res: any, next: any) => next()),
  ],
}));

// Silence service mocks not under test
vi.mock("../services/buyer-gap-service", () => ({ escalateGap: vi.fn() }));
vi.mock("../services/buyer-matching-service", () => ({ runMatching: vi.fn(), NotFoundError: class extends Error {} }));
vi.mock("../services/trust-score-service", () => ({ computeTrustScore: vi.fn(() => 0), getTrustTier: vi.fn(() => "LOW") }));
vi.mock("../services/ingestion-structuring-service", () => ({ enrichSupplierWithAI: vi.fn() }));
vi.mock("../services/origin-story-service", () => ({ seedOriginStory: vi.fn() }));
vi.mock("../services/duplicate-detector", () => ({ checkDuplicate: vi.fn(), computeSupplierFingerprint: vi.fn(), logDuplicateOverride: vi.fn() }));
vi.mock("../services/discovery-engine", () => ({ discoverLeads: vi.fn() }));
vi.mock("../lib/pipeline-emitter", () => ({ pipelineEmitter: { emit: vi.fn() }, SUPPLIER_ONBOARD_EVENT: "onboard" }));
vi.mock("../services/onboard-pipeline", () => ({ runOnboardPipeline: vi.fn() }));
vi.mock("../lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("../lib/sms", () => ({ sendSms: vi.fn() }));
vi.mock("../lib/whatsapp", () => ({ sendWhatsApp: vi.fn() }));
vi.mock("../lib/logger", () => {
  const mock = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { default: mock, logger: mock };
});
vi.mock("../lib/volumeCounters", () => ({ incrementAndMaybeLog: vi.fn() }));
vi.mock("../config/agency-registry", () => ({ AGENCY_REGISTRY: [] }));
vi.mock("../instrument", () => ({}));

// ─── App setup ────────────────────────────────────────────────────────────────
async function buildApp() {
  const { default: adminRouter } = await import("../routes/admin");
  const app = express();
  app.use(express.json());
  app.use("/api", adminRouter);
  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("FIN-001 — company_supplier_links admin CRUD", () => {
  let app: express.Express;

  beforeEach(async () => {
    selectQueue.length  = 0;
    insertedRows.length = 0;
    deletedRows.length  = 0;
    updatedSets.length  = 0;
    rejectAuth.value    = false;
    app = await buildApp();
  });

  // ── GET /api/admin/suppliers/:id/links ─────────────────────────────────────

  describe("GET /api/admin/suppliers/:id/links", () => {
    it("returns list of links for a supplier", async () => {
      selectQueue.push([
        { id: 1, companyId: 3, companyName: "Cooperativa Huilas", companyType: "COOPERATIVE", linkType: "MEMBER", isPrimary: true, linkedAt: new Date().toISOString(), notes: null },
      ]);

      const res = await request(app).get("/api/admin/suppliers/7/links");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ companyId: 3, linkType: "MEMBER", isPrimary: true });
    });

    it("returns empty array when supplier has no links", async () => {
      selectQueue.push([]);

      const res = await request(app).get("/api/admin/suppliers/99/links");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns 400 for a non-numeric supplier id", async () => {
      const res = await request(app).get("/api/admin/suppliers/abc/links");
      expect(res.status).toBe(400);
    });

    it("returns 403 for non-admin requests", async () => {
      rejectAuth.value = true;
      const res = await request(app).get("/api/admin/suppliers/7/links");
      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/admin/suppliers/:id/links ────────────────────────────────────

  describe("POST /api/admin/suppliers/:id/links", () => {
    it("creates a link and returns 201", async () => {
      // supplier exists, company exists
      selectQueue.push([{ id: 7 }]);
      selectQueue.push([{ id: 3 }]);
      insertedRows.push([{ id: 1, companyId: 3, supplierId: 7, linkType: "MEMBER", isPrimary: true, linkedAt: new Date().toISOString(), notes: null }]);

      const res = await request(app)
        .post("/api/admin/suppliers/7/links")
        .send({ companyId: 3, linkType: "MEMBER", isPrimary: true });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ companyId: 3, supplierId: 7, linkType: "MEMBER", isPrimary: true });
    });

    it("returns 404 when supplier does not exist", async () => {
      selectQueue.push([]); // no supplier

      const res = await request(app)
        .post("/api/admin/suppliers/999/links")
        .send({ companyId: 3, linkType: "MEMBER", isPrimary: true });

      expect(res.status).toBe(404);
    });

    it("returns 404 when company does not exist", async () => {
      selectQueue.push([{ id: 7 }]); // supplier exists
      selectQueue.push([]);           // no company

      const res = await request(app)
        .post("/api/admin/suppliers/7/links")
        .send({ companyId: 999, linkType: "MEMBER", isPrimary: true });

      expect(res.status).toBe(404);
    });

    it("returns 409 when a duplicate link already exists (onConflictDoNothing returns empty)", async () => {
      selectQueue.push([{ id: 7 }]);
      selectQueue.push([{ id: 3 }]);
      insertedRows.push([]); // onConflictDoNothing returned nothing

      const res = await request(app)
        .post("/api/admin/suppliers/7/links")
        .send({ companyId: 3, linkType: "MEMBER", isPrimary: true });

      expect(res.status).toBe(409);
    });

    it("returns 400 for invalid linkType", async () => {
      const res = await request(app)
        .post("/api/admin/suppliers/7/links")
        .send({ companyId: 3, linkType: "INVALID" });

      expect(res.status).toBe(400);
    });

    it("returns 403 for non-admin requests", async () => {
      rejectAuth.value = true;
      const res = await request(app)
        .post("/api/admin/suppliers/7/links")
        .send({ companyId: 3 });
      expect(res.status).toBe(403);
    });
  });

  // ── DELETE /api/admin/suppliers/:id/links/:linkId ──────────────────────────

  describe("DELETE /api/admin/suppliers/:id/links/:linkId", () => {
    it("deletes an existing link and returns success", async () => {
      deletedRows.push([{ id: 1 }]);

      const res = await request(app).delete("/api/admin/suppliers/7/links/1");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it("returns 404 when link does not exist", async () => {
      deletedRows.push([]); // nothing deleted

      const res = await request(app).delete("/api/admin/suppliers/7/links/999");

      expect(res.status).toBe(404);
    });

    it("returns 400 for non-numeric ids", async () => {
      const res = await request(app).delete("/api/admin/suppliers/abc/links/1");
      expect(res.status).toBe(400);
    });

    it("returns 403 for non-admin requests", async () => {
      rejectAuth.value = true;
      const res = await request(app).delete("/api/admin/suppliers/7/links/1");
      expect(res.status).toBe(403);
    });
  });
});
