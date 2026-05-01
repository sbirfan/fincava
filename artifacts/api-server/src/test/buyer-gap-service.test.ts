import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mock @workspace/db ───────────────────────────────────────────────────────
// The gap service uses two distinct DB shapes:
//   1. db.select(...).from(...).where(...).orderBy(...).limit(...) chains for
//      reads (buyer profile, catalog snapshot, admin lookup)
//   2. db.transaction(async (tx) => { tx.insert(...).values(...).returning();
//      tx.update(...).set(...).where(...); tx.select(...)... }) for writes.
//   3. db.insert(...).values(...).returning() and db.update(...).set(...)
//      .where(...) for batch insert + ingestion_batch_id linkage.
//
// We expose a mutable "queue" of select results so each test can script the
// exact rows the service should see; everything else is a stub returning the
// last-recorded write payload.

interface TxOps {
  inserted: any[];
  updated: any[];
  selected: any[];
}

const selectQueue = vi.hoisted(() => [] as any[]);
const selectCalls = vi.hoisted(() => [] as any[]);
const insertedRows = vi.hoisted(() => [] as any[]);
const updatedRows = vi.hoisted(() => [] as any[]);
const txOps = vi.hoisted(() => ({ inserted: [], updated: [], selected: [] } as TxOps));
const transactionCount = vi.hoisted(() => ({ count: 0 }));

function makeSelectChain(rows: any[]) {
  // Supports .from(...).where(...).orderBy(...).limit(...) and intermediate
  // .innerJoin(...). The returned object is "thenable" via PromiseLike so the
  // service can `await` the chain at any depth.
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.then = (resolve: (v: any) => void) => resolve(rows);
  return chain;
}

const mockSelect = vi.hoisted(() =>
  vi.fn((shape?: any) => {
    selectCalls.push(shape);
    const rows = selectQueue.shift() ?? [];
    return makeSelectChain(rows);
  }),
);

function makeInsertChain(payload: any[]) {
  insertedRows.push(payload);
  return {
    values: vi.fn((vals: any) => ({
      returning: vi.fn(async (_proj?: any) => {
        // Synthesise IDs based on insertion order if caller does not provide.
        const arr = Array.isArray(vals) ? vals : [vals];
        return arr.map((v, i) => ({
          id: insertedRows.length * 100 + i,
          ...v,
        }));
      }),
    })),
  };
}

const mockInsert = vi.hoisted(() => vi.fn(() => makeInsertChain([])));

function makeUpdateChain() {
  return {
    set: vi.fn((v: any) => {
      updatedRows.push(v);
      return { where: vi.fn(async () => undefined) };
    }),
  };
}

const mockUpdate = vi.hoisted(() => vi.fn(() => makeUpdateChain()));

const mockTransaction = vi.hoisted(() =>
  vi.fn(async (cb: (tx: any) => Promise<any>) => {
    transactionCount.count += 1;
    const tx = {
      insert: vi.fn((table: any) => {
        return {
          values: vi.fn((vals: any) => {
            const arr = Array.isArray(vals) ? vals : [vals];
            txOps.inserted.push({ table, vals: arr });
            return {
              returning: vi.fn(async (_proj?: any) =>
                arr.map((v, i) => ({
                  id: 1000 + txOps.inserted.length * 10 + i,
                  ...v,
                })),
              ),
            };
          }),
        };
      }),
      update: vi.fn((table: any) => ({
        set: vi.fn((v: any) => {
          txOps.updated.push({ table, set: v });
          return { where: vi.fn(async () => undefined) };
        }),
      })),
      select: vi.fn((shape: any) => {
        const rows = selectQueue.shift() ?? [{ unresolvedCount: 1 }];
        txOps.selected.push({ shape, rows });
        return makeSelectChain(rows);
      }),
    };
    return cb(tx);
  }),
);

vi.mock("@workspace/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    transaction: mockTransaction,
  },
  buyerProfilesTable: { $name: "buyer_profiles" },
  buyerGapBriefsTable: {
    $name: "buyer_gap_briefs",
    id: "id",
    buyerProfileId: "buyer_profile_id",
    isRealGap: "is_real_gap",
    resolvedAt: "resolved_at",
    priority: "priority",
  },
  suppliersTable: { $name: "suppliers", id: "id", sellableStatus: "sellable_status" },
  productsTable: { $name: "products", supplierId: "supplier_id", active: "active" },
  supplierIngestionBatchesTable: { $name: "supplier_ingestion_batches" },
  usersTable: { $name: "users", id: "id", role: "role" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ eq: [col, val] })),
  inArray: vi.fn((col, vals) => ({ inArray: [col, vals] })),
  and: vi.fn((...args) => ({ and: args })),
  asc: vi.fn((col) => ({ asc: col })),
  sql: Object.assign(vi.fn((...args: any[]) => ({ sql: args })), {
    raw: vi.fn(),
  }),
  isNull: vi.fn((col) => ({ isNull: col })),
  count: vi.fn(() => ({ count: true })),
}));

// ─── Mock the Anthropic client ────────────────────────────────────────────────
const mockClaudeCreate = vi.hoisted(() => vi.fn());
vi.mock("../lib/anthropic", () => ({
  getAnthropicClient: () => ({ messages: { create: mockClaudeCreate } }),
}));

// ─── Mock the discovery engine ────────────────────────────────────────────────
const mockDiscoverLeads = vi.hoisted(() => vi.fn());
vi.mock("../services/discovery-engine", () => ({
  discoverLeads: mockDiscoverLeads,
}));

// ─── Mock the logger so we don't litter test output ───────────────────────────
vi.mock("../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── System under test (imported AFTER mocks) ────────────────────────────────
const { analyseGaps, NotFoundError } = await import(
  "../services/buyer-gap-service"
);

function resetAll() {
  selectQueue.length = 0;
  selectCalls.length = 0;
  insertedRows.length = 0;
  updatedRows.length = 0;
  txOps.inserted = [];
  txOps.updated = [];
  txOps.selected = [];
  transactionCount.count = 0;
  mockClaudeCreate.mockReset();
  mockDiscoverLeads.mockReset();
}

// ─── Helpers to script Claude responses ───────────────────────────────────────
function claudeReturns(payload: object): void {
  mockClaudeCreate.mockResolvedValueOnce({
    content: [{ type: "text", text: JSON.stringify(payload) }],
  });
}

const buyerProfileFixture = {
  id: 42,
  companyName: "Demo Importer",
  country: "United Arab Emirates",
  destinationPort: "Jebel Ali",
  targetProducts: ["COFFEE", "CACAO"],
  requiredCertsP1: ["Organic"],
  volumeBand: "50-200MT",
  intendedVolumeMt: 120,
  importFrequency: "QUARTERLY",
  timeToFirstOrder: "WITHIN_30D",
  preferredIncoterm: "FOB",
  traceabilityLevel: "FARM",
  existingColombiaRel: false,
  auditStandard: "SMETA",
  prevSourcingChannel: "BROKER",
  discoveryBudgetBand: "25k+",
  supplierDevOpen: true,
  supplierTypePref: ["COOPERATIVE"],
  socialImpactReqs: ["women-led"],
  earlyStageSupplierOpen: false,
};

describe("buyer-gap-service.analyseGaps", () => {
  beforeEach(resetAll);

  it("throws NotFoundError when the buyer profile does not exist", async () => {
    selectQueue.push([]); // profile lookup → empty
    await expect(analyseGaps(999)).rejects.toBeInstanceOf(NotFoundError);
    expect(mockClaudeCreate).not.toHaveBeenCalled();
    expect(transactionCount.count).toBe(0);
  });

  it(
    "writes one gap brief per row, sets state=GAP_SCANNED, and escalates only HIGH gaps via the discovery engine",
    async () => {
      // 1. analyseGaps does: profile lookup → catalog suppliers → catalog products
      selectQueue.push([buyerProfileFixture]); // profile
      selectQueue.push([
        // catalog suppliers
        {
          id: 1,
          name: "Coop A",
          municipio: "Pitalito",
          department: "Huila",
          supplierType: "COOPERATIVE",
          sellableStatus: "SELLABLE",
        },
      ]);
      selectQueue.push([
        // catalog products for those suppliers
        { supplierId: 1, category: "COFFEE", subCategory: null, certifications: ["Organic"] },
      ]);
      // 2. Inside the transaction, after insert, the service counts unresolved
      //    real gaps. Script that as 2 — matches our scripted Claude response.
      selectQueue.push([{ unresolvedCount: 2 }]);
      // 3. Inside escalateIfHigh, the service first does a priority-only select
      //    to decide whether to escalate. Then escalateGap does a full re-read
      //    of the brief, followed by the admin id lookup.
      selectQueue.push([{ priority: "HIGH" }]); // escalateIfHigh priority check
      selectQueue.push([
        // escalateGap full brief re-read
        {
          id: 1010,
          buyerProfileId: 42,
          gapType: "CERTIFICATION",
          priority: "HIGH",
          searchCategory: "Specialty Coffee",
          searchRegion: "Cauca",
          isRealGap: true,
          ingestionBatchId: null,
        },
      ]);
      selectQueue.push([{ id: 7 }]); // resolveSystemAdminId

      claudeReturns({
        gaps: [
          {
            gap_type: "CERTIFICATION",
            priority: "HIGH",
            pipeline_action: "IMMEDIATE_DISCOVERY",
            is_real_gap: true,
            search_category: "Specialty Coffee",
            search_region: "Cauca",
            required_attributes: ["Fairtrade"],
            volume_target_mt: 50,
            buyer_urgency_note: "Buyer needs Fairtrade-certified Cauca coffee within 30 days.",
            discovery_search_terms: ["café Fairtrade Cauca", "cooperativa cafetera Cauca"],
          },
          {
            gap_type: "SOCIAL_IMPACT",
            priority: "LOW",
            pipeline_action: "NEXT_BATCH",
            is_real_gap: true,
            search_category: null,
            search_region: null,
            required_attributes: [],
            volume_target_mt: null,
            buyer_urgency_note: "Soft preference for women-led cooperatives.",
            discovery_search_terms: [],
          },
        ],
      });

      mockDiscoverLeads.mockResolvedValueOnce([
        {
          name: "Cooperativa Café Cauca",
          location: "Popayán, Cauca",
          website: null,
          categoryHint: "Specialty Coffee",
        },
      ]);

      const result = await analyseGaps(42);

      // Service-level outcome
      expect(result.gapsInserted).toBe(2);
      expect(result.highPriorityCount).toBe(1);

      // Transaction was opened exactly once
      expect(transactionCount.count).toBe(1);

      // Two rows inserted into buyer_gap_briefs in the tx (one batch insert)
      expect(txOps.inserted).toHaveLength(1);
      expect(txOps.inserted[0].vals).toHaveLength(2);
      expect(txOps.inserted[0].vals[0]).toMatchObject({
        buyerProfileId: 42,
        gapType: "CERTIFICATION",
        priority: "HIGH",
        pipelineAction: "IMMEDIATE_DISCOVERY",
        isRealGap: true,
        searchCategory: "Specialty Coffee",
        searchRegion: "Cauca",
      });

      // gap_flag_count is REPLACED with the unresolved count (2), not incremented
      expect(txOps.updated).toHaveLength(1);
      expect(txOps.updated[0].set).toMatchObject({
        state: "GAP_SCANNED",
        gapFlagCount: 2,
      });

      // HIGH gap → ingestion batch insert outside the tx
      expect(insertedRows.length).toBeGreaterThanOrEqual(1);
      const batchInsert = insertedRows.find((p) => p.length === 0);
      expect(batchInsert).toBeDefined();

      // Discovery engine called with the brief's category/region exactly once
      expect(mockDiscoverLeads).toHaveBeenCalledTimes(1);
      expect(mockDiscoverLeads).toHaveBeenCalledWith({
        category: "Specialty Coffee",
        region: "Cauca",
        maxResults: expect.any(Number),
      });
    },
  );

  it("does NOT write to the DB or invoke discovery if the Claude call fails (rollback semantics)", async () => {
    selectQueue.push([buyerProfileFixture]); // profile
    selectQueue.push([]); // suppliers
    selectQueue.push([]); // products
    mockClaudeCreate.mockRejectedValueOnce(new Error("Anthropic 503"));

    await expect(analyseGaps(42)).rejects.toThrow("Anthropic 503");

    // Critical: the transaction was never opened, no rows inserted, no
    // batch created, no discovery call kicked off. Section E remains in
    // its pre-analysis state.
    expect(transactionCount.count).toBe(0);
    expect(txOps.inserted).toHaveLength(0);
    expect(txOps.updated).toHaveLength(0);
    expect(insertedRows).toHaveLength(0);
    expect(updatedRows).toHaveLength(0);
    expect(mockDiscoverLeads).not.toHaveBeenCalled();
  });

  it("falls back to buyer-profile signals when a HIGH gap omits search_category/search_region (HIGH ⇒ discovery invariant)", async () => {
    selectQueue.push([buyerProfileFixture]); // profile
    selectQueue.push([]); // empty catalog
    selectQueue.push([{ unresolvedCount: 1 }]); // post-insert unresolved count
    selectQueue.push([{ priority: "HIGH" }]); // escalateIfHigh priority check
    selectQueue.push([
      // escalateGap full brief re-read — both search_* are null, simulating model omission
      {
        id: 1010,
        buyerProfileId: 42,
        gapType: "PRODUCT_CATEGORY",
        priority: "HIGH",
        searchCategory: null,
        searchRegion: null,
        isRealGap: true,
        ingestionBatchId: null,
      },
    ]);
    selectQueue.push([{ id: 7 }]); // admin lookup

    claudeReturns({
      gaps: [
        {
          gap_type: "PRODUCT_CATEGORY",
          priority: "HIGH",
          pipeline_action: "IMMEDIATE_DISCOVERY",
          is_real_gap: true,
          search_category: null,
          search_region: null,
          required_attributes: [],
          volume_target_mt: null,
          buyer_urgency_note: "No suppliers for buyer's category.",
          discovery_search_terms: [],
        },
      ],
    });
    mockDiscoverLeads.mockResolvedValueOnce([]);

    await analyseGaps(42);

    // Discovery MUST be invoked even though the model omitted category/region;
    // the service derives them from buyer.targetProducts[0] + "Colombia".
    expect(mockDiscoverLeads).toHaveBeenCalledTimes(1);
    expect(mockDiscoverLeads).toHaveBeenCalledWith({
      category: "COFFEE",
      region: "Colombia",
      maxResults: expect.any(Number),
    });
  });
});
