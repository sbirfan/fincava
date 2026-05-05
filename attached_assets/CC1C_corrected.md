# CC-1C — Admin Compliance Queue (Corrected v3)
**Fixes applied: C1 (import path depth 3→4 levels), C2 (complianceDocs import note).**  
**Prerequisite: CC-1B v4 fully verified — all 7 tables confirmed in Neon, tsc clean.**  
**Date:** 2026-05-05

---

## Before You Start — Use Step 0 Output

From your CC-1B Step 0 inspection, you should have confirmed:
- The exact column name for graduation/sellable status on `suppliers` (confirmed: `sellable_status`)
- The exact column for AI quality score on `supplier_evaluations` (confirmed: `commercial_score`)
- The actual column for the supplier's display name (e.g. `business_name` or `farm_name` — use whatever Step 0 revealed)
- The exact logger import pattern for this codebase

If any of these are still unknown, run a targeted search now before writing code:
```bash
grep -r "sellable_status\|graduation_status" lib/db/src/schema/
grep -r "commercial_score\|overall_score" lib/db/src/schema/
grep -r "business_name\|farm_name\|display_name" lib/db/src/schema/suppliers.ts
```

Use the actual column names you find. The corrected SQL below uses `sellable_status` and `commercial_score` — confirm these match before running.

---

## Task CC-1C: Admin Compliance Priority Queue

### New Admin API Endpoints

Open `artifacts/api-server/src/routes/admin.ts`. Add these routes — do not replace any existing routes.

Also add these imports at the top of admin.ts if not already present:

```typescript
import { z } from 'zod';
import {
  supplierRequirementStatus,
  adminComplianceReviews,
  buyerVisibilitySignals,
  complianceDocumentsV2,
} from '../../../../lib/db/src/schema/compliance-concierge';
// C1 FIX: admin.ts lives at artifacts/api-server/src/routes/admin.ts
// Path depth from routes/: routes → src → api-server → artifacts → root = 4 levels (../../../../)
// The previous version used '../../../' (3 levels) which resolves to artifacts/, not the root.
// If the codebase imports lib/db via workspace package name (e.g. '@workspace/db'),
// use that pattern instead — check how other files in routes/ import from lib/db.
```

> **C2 FIX — Confirm `complianceDocs` is already imported:**  
> The `GET /compliance/supplier/:supplierId` route below reads from `complianceDocs`
> (the existing boolean compliance layer table). Before adding these routes, verify it
> is already imported in `admin.ts`:
> ```bash
> grep -n "complianceDocs" artifacts/api-server/src/routes/admin.ts | head -5
> ```
> If it is **not** already imported, add it from the existing schema barrel:
> ```typescript
> import { complianceDocs } from '../../../../lib/db/src/schema'; // adjust export name if different
> ```
> If the export name is different (e.g. `complianceDocsTable`), use the actual name.
> Failure to import it will cause `pnpm tsc --noEmit` to fail with
> `"Cannot find name 'complianceDocs'"`.

```typescript
// ── CC-1C: Admin Compliance Priority Queue ────────────────────────────

// GET /api/admin/compliance/queue?offset=0&limit=100
// Returns suppliers ranked by priority score (admin only).
// priority_score = (0.40 × sellable_proximity) + (0.30 × ai_quality_score)
//               + (0.20 × low_blocker_score)   + (0.10 × staleness_score)
// Weights are hardcoded for MVP — extract to config in a later iteration.
router.get('/compliance/queue', requireAuth, requireAdmin, async (req, res) => {
  const offset = parseInt(String(req.query.offset ?? '0'), 10);
  const limit  = Math.min(parseInt(String(req.query.limit ?? '100'), 10), 200);

  // COLUMN NOTE: uses sellable_status (not graduation_status) and commercial_score (not overall_score)
  // DISPLAY NAME: replace [DISPLAY_NAME_COLUMN] with the actual column from your Step 0 inspection
  const queue = await db.execute(sql`
    WITH blocker_counts AS (
      SELECT supplier_id,
             COUNT(*) FILTER (WHERE state IN (
               'not_started','not_sure','self_serve_in_progress',
               'assisted_in_progress','needs_fix','submitted'
             )) AS open_blockers
      FROM supplier_requirement_status
      GROUP BY supplier_id
    ),
    last_review AS (
      SELECT supplier_id,
             MAX(reviewed_at) AS last_reviewed_at
      FROM admin_compliance_reviews
      GROUP BY supplier_id
    ),
    ai_scores AS (
      SELECT DISTINCT ON (supplier_id) supplier_id, commercial_score
      FROM supplier_evaluations
      ORDER BY supplier_id, created_at DESC
    ),
    proximity AS (
      SELECT id,
        CASE sellable_status
          WHEN 'PUBLISHED'  THEN 1.00
          WHEN 'SELLABLE'   THEN 0.85
          WHEN 'ELIGIBLE'   THEN 0.50
          ELSE 0.10
        END AS sellable_proximity
      FROM suppliers
    )
    SELECT
      s.id,
      s.[DISPLAY_NAME_COLUMN] AS display_name,
      s.sellable_status,
      COALESCE(ai.commercial_score, 0)  AS ai_quality_score,
      COALESCE(bc.open_blockers, 0)     AS open_blockers,
      lr.last_reviewed_at,
      ROUND((
        0.40 * p.sellable_proximity +
        0.30 * (COALESCE(ai.commercial_score, 0) / 100.0) +
        0.20 * GREATEST(0, 1 - COALESCE(bc.open_blockers, 0) / 10.0) +
        0.10 * LEAST(1, EXTRACT(EPOCH FROM (
          NOW() - COALESCE(lr.last_reviewed_at, s.created_at)
        )) / (30 * 86400))
      )::numeric, 3) AS priority_score
    FROM suppliers s
    LEFT JOIN proximity       p  ON p.id            = s.id
    LEFT JOIN ai_scores       ai ON ai.supplier_id  = s.id
    LEFT JOIN blocker_counts  bc ON bc.supplier_id  = s.id
    LEFT JOIN last_review     lr ON lr.supplier_id  = s.id
    ORDER BY priority_score DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  res.json({ queue: queue.rows, offset, limit });
});

// GET /api/admin/compliance/supplier/:supplierId
// Full compliance picture: existing boolean layer + new requirement rows.
router.get('/compliance/supplier/:supplierId', requireAuth, requireAdmin, async (req, res) => {
  const sid = parseInt(req.params.supplierId, 10);
  if (isNaN(sid)) return res.status(400).json({ error: 'Invalid supplierId' });

  const [booleans, requirements, documents, reviews, visibility] = await Promise.all([
    db.select().from(complianceDocs).where(eq(complianceDocs.supplierId, sid)).limit(1),
    db.select().from(supplierRequirementStatus)
      .where(eq(supplierRequirementStatus.supplierId, sid)),
    db.select().from(complianceDocumentsV2)
      .where(eq(complianceDocumentsV2.supplierId, sid))
      .orderBy(desc(complianceDocumentsV2.createdAt)),
    db.select().from(adminComplianceReviews)
      .where(eq(adminComplianceReviews.supplierId, sid))
      .orderBy(desc(adminComplianceReviews.reviewedAt)),
    db.select().from(buyerVisibilitySignals)
      .where(eq(buyerVisibilitySignals.supplierId, sid)),
  ]);

  res.json({
    booleans:     booleans[0] ?? null,
    requirements,
    documents,
    reviews,
    visibility,
  });
});

// POST /api/admin/compliance/supplier/:supplierId/review
// Admin reviews a requirement. Writes audit log + updates state.
const reviewBodySchema = z.object({
  requirementCode: z.enum(['DIAN_RUT', 'ICA_CONTEXT', 'FNC_COFFEE']),
  decision: z.enum(['verified', 'needs_fix', 'conditionally_approved', 'rejected', 'escalated']),
  newState: z.enum([
    'not_started', 'not_sure', 'self_serve_in_progress', 'assisted_in_progress',
    'managed_service_candidate', 'submitted', 'needs_fix', 'conditionally_approved',
    'verified', 'rejected'
  ]),
  reasonCode:   z.string().optional(),
  visibleNote:  z.string().optional(),
  internalNote: z.string().optional(),
});

// Valid state transitions (from → allowed tos)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  submitted:              ['verified', 'needs_fix', 'conditionally_approved', 'rejected', 'escalated'],
  self_serve_in_progress: ['assisted_in_progress', 'managed_service_candidate', 'needs_fix'],
  assisted_in_progress:   ['submitted', 'managed_service_candidate', 'needs_fix'],
  needs_fix:              ['submitted', 'assisted_in_progress', 'managed_service_candidate'],
  conditionally_approved: ['verified', 'needs_fix', 'rejected'],
  verified:               ['needs_fix', 'rejected'],   // admin can revert
  not_started:            ['not_sure', 'assisted_in_progress'],
  not_sure:               ['assisted_in_progress', 'managed_service_candidate'],
  managed_service_candidate: ['submitted', 'assisted_in_progress'],
  rejected:               ['not_started'],
};

router.post('/compliance/supplier/:supplierId/review', requireAuth, requireAdmin, async (req, res) => {
  const sid = parseInt(req.params.supplierId, 10);
  if (isNaN(sid)) return res.status(400).json({ error: 'Invalid supplierId' });

  const parsed = reviewBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.issues });
  const { requirementCode, decision, newState, reasonCode, visibleNote, internalNote } = parsed.data;

  // Existence check — row must exist before we can update it
  const existing = await db.select({ state: supplierRequirementStatus.state })
    .from(supplierRequirementStatus)
    .where(and(
      eq(supplierRequirementStatus.supplierId, sid),
      eq(supplierRequirementStatus.requirementCode, requirementCode)
    ))
    .limit(1);

  if (!existing.length) {
    return res.status(404).json({ error: 'Requirement row not found for this supplier' });
  }

  const currentState = existing[0].state;
  const allowed = ALLOWED_TRANSITIONS[currentState] ?? [];
  if (!allowed.includes(newState)) {
    return res.status(422).json({
      error: `Transition from '${currentState}' to '${newState}' is not permitted`,
      allowedTransitions: allowed,
    });
  }

  // Write state update
  await db.update(supplierRequirementStatus)
    .set({ state: newState, visibleNote, internalNote, updatedAt: new Date() })
    .where(and(
      eq(supplierRequirementStatus.supplierId, sid),
      eq(supplierRequirementStatus.requirementCode, requirementCode)
    ));

  // Append audit log row
  await db.insert(adminComplianceReviews).values({
    supplierId:      sid,
    requirementCode,
    decision,
    reasonCode:      reasonCode  ?? null,
    visibleNote:     visibleNote ?? null,
    internalNote:    internalNote ?? null,
    reviewerId:      req.user?.id ?? null,
  });

  res.json({ ok: true, previousState: currentState, newState });
});

// PATCH /api/admin/compliance/supplier/:supplierId/visibility
// Admin-only toggle for buyer-facing compliance badge. Never auto-enabled.
const visibilityBodySchema = z.object({
  requirementCode: z.enum(['DIAN_RUT', 'ICA_CONTEXT', 'FNC_COFFEE']),
  visible:         z.boolean(),
  badgeLabel:      z.string().optional(),
  disclaimer:      z.string().optional(),
});

router.patch('/compliance/supplier/:supplierId/visibility', requireAuth, requireAdmin, async (req, res) => {
  const sid = parseInt(req.params.supplierId, 10);
  if (isNaN(sid)) return res.status(400).json({ error: 'Invalid supplierId' });

  const parsed = visibilityBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.issues });
  const { requirementCode, visible, badgeLabel, disclaimer } = parsed.data;

  await db.insert(buyerVisibilitySignals)
    .values({
      supplierId:      sid,
      requirementCode,
      visible,
      badgeLabel:  badgeLabel  ?? null,
      disclaimer:  disclaimer  ?? null,
      enabledBy:   visible ? (req.user?.id ?? null) : null,
      enabledAt:   visible ? new Date() : null,
      updatedAt:   new Date(),
    })
    .onConflictDoUpdate({
      target: [buyerVisibilitySignals.supplierId, buyerVisibilitySignals.requirementCode],
      set: {
        visible,
        badgeLabel:  badgeLabel  ?? null,
        disclaimer:  disclaimer  ?? null,
        enabledBy:   visible ? (req.user?.id ?? null) : null,
        enabledAt:   visible ? new Date() : null,
        updatedAt:   new Date(),
      },
    });

  res.json({ ok: true });
});
```

### Admin UI — Priority Queue Page

Create `artifacts/fincava/src/pages/admin/ComplianceQueue.tsx`:

```tsx
// artifacts/fincava/src/pages/admin/ComplianceQueue.tsx
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter'; // or whatever router this project uses

interface QueueRow {
  id: number;
  display_name: string;
  sellable_status: string;
  ai_quality_score: number;
  open_blockers: number;
  last_reviewed_at: string | null;
  priority_score: number;
}

// Status badge colors — mirrors the graduation machine states
const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-green-600',
  SELLABLE:  'bg-blue-500',
  ELIGIBLE:  'bg-yellow-500',
};

export default function ComplianceQueue() {
  const [rows, setRows]       = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset]   = useState(0);
  const [, navigate]          = useLocation();
  const LIMIT = 100;

  const fetchQueue = async (off: number) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/compliance/queue?offset=${off}&limit=${LIMIT}`);
      const data = await res.json();
      setRows(data.queue ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(offset); }, [offset]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1">Compliance Priority Queue</h1>
      <p className="text-sm text-gray-500 mb-4">
        Suppliers ranked by readiness. Click any row to open the supplier compliance drawer.
      </p>

      {loading ? (
        <p className="text-gray-400">Loading queue…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-400">No suppliers in queue.</p>
      ) : (
        <>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">Rank</th>
                <th className="p-2 border">Supplier</th>
                <th className="p-2 border">Readiness</th>
                <th className="p-2 border">Open Blockers</th>
                <th className="p-2 border">Last Reviewed</th>
                {/* Priority score not shown to admin per D-CE-2 */}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className="hover:bg-blue-50 cursor-pointer"
                  onClick={() => navigate(`/admin/suppliers/${row.id}`)}
                >
                  <td className="p-2 border text-gray-500">{offset + i + 1}</td>
                  <td className="p-2 border font-medium">{row.display_name}</td>
                  <td className="p-2 border">
                    <span className={`px-2 py-0.5 rounded text-white text-xs ${STATUS_COLORS[row.sellable_status] ?? 'bg-gray-400'}`}>
                      {row.sellable_status}
                    </span>
                  </td>
                  <td className="p-2 border">
                    {row.open_blockers === 0
                      ? <span className="text-green-600">✓ None</span>
                      : <span className="text-red-600">{row.open_blockers}</span>}
                  </td>
                  <td className="p-2 border text-gray-500">
                    {row.last_reviewed_at
                      ? new Date(row.last_reviewed_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex gap-3 mt-4">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              disabled={rows.length < LIMIT}
              onClick={() => setOffset(offset + LIMIT)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

### Route Registration

Open the admin router registration file (likely `artifacts/api-server/src/routes/index.ts` or wherever admin routes are mounted). Confirm the compliance routes above are being mounted — they were added to `admin.ts` which should already be registered. No new registration needed unless CC-1C routes are in a separate file.

Open `artifacts/fincava/src/App.tsx` (or wherever wouter routes are defined). Add:
```tsx
<Route path="/admin/compliance-queue" component={ComplianceQueue} />
```
And add a nav link to `/admin/compliance-queue` in the existing admin navigation component.

### Acceptance Criteria for CC-1C

- [ ] `GET /api/admin/compliance/queue` returns ranked rows with correct column names (`sellable_status`, `commercial_score`)
- [ ] `GET /api/admin/compliance/supplier/:id` returns both boolean layer and new requirement rows
- [ ] `POST /api/admin/compliance/supplier/:id/review` — Zod validates body; returns 404 if row missing; returns 422 for invalid state transition; writes audit log
- [ ] `PATCH /api/admin/compliance/supplier/:id/visibility` — Zod validates; upserts correctly
- [ ] `/admin/compliance-queue` page renders ranked table with pagination
- [ ] Clicking a row navigates to the supplier detail view
- [ ] `pnpm tsc --noEmit` passes clean

**Stop here. Report results. CC-1D prompt follows.**
