import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, publicMetricsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { adminOnly } from "../middleware/admin";
import { sendError } from "../lib/response";

const router: IRouter = Router();

// ── GET /api/public-metrics ───────────────────────────────────────────────────
// Public: returns only visible metrics.
router.get("/public-metrics", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(publicMetricsTable)
    .where(eq(publicMetricsTable.isVisible, true))
    .orderBy(asc(publicMetricsTable.id));

  res.json(rows);
});

// ── POST /api/admin/public-metrics/seed ──────────────────────────────────────
// Admin: idempotent seed — inserts default metric slots, skips any that already exist.
const DEFAULT_METRICS: (typeof publicMetricsTable.$inferInsert)[] = [
  { metricKey: "home.hero.verified_suppliers", label: "Verified Suppliers",       value: "" },
  { metricKey: "home.hero.total_products",     label: "Export Products",           value: "" },
  { metricKey: "impact.numbers.farmers",       label: "Farmers Directly Supported",value: "" },
  { metricKey: "impact.numbers.women_led",     label: "Women-Led Farms",           value: "" },
  { metricKey: "impact.numbers.organic",       label: "Organic Products",          value: "" },
  { metricKey: "impact.numbers.direct_trade",  label: "Direct Trade Products",     value: "" },
];

router.post("/admin/public-metrics/seed", ...adminOnly, async (_req, res): Promise<void> => {
  let seeded = 0;
  for (const row of DEFAULT_METRICS) {
    const result = await db
      .insert(publicMetricsTable)
      .values({ ...row, updatedAt: new Date() })
      .onConflictDoNothing()
      .returning();
    if (result.length > 0) seeded++;
  }
  res.json({ seeded, total: DEFAULT_METRICS.length, message: `${seeded} new metric(s) inserted. ${DEFAULT_METRICS.length - seeded} already existed.` });
});

// ── GET /api/admin/public-metrics ─────────────────────────────────────────────
// Admin: returns ALL metrics (incl. hidden).
router.get("/admin/public-metrics", ...adminOnly, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(publicMetricsTable)
    .orderBy(asc(publicMetricsTable.id));

  res.json(rows);
});

const PatchMetricBody = z.object({
  label:     z.string().min(1).optional(),
  value:     z.string().optional(),
  isVisible: z.boolean().optional(),
});

// ── PATCH /api/admin/public-metrics/:id ──────────────────────────────────────
router.patch("/admin/public-metrics/:id", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { sendError(res, 400, "Invalid id"); return; }

  const parsed = PatchMetricBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: parsed.error.flatten() }); return; }

  const [updated] = await db
    .update(publicMetricsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(publicMetricsTable.id, id))
    .returning();

  if (!updated) { sendError(res, 404, "Metric not found"); return; }
  res.json(updated);
});

export default router;
