import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, publicMetricsTable, publicStoriesTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { adminOnly } from "../middleware/admin";

const router: IRouter = Router();

// ── GET /api/public-metrics ───────────────────────────────────────────────────
// Public: returns only visible metrics, optionally filtered by page / section.
router.get("/public-metrics", async (req, res): Promise<void> => {
  const page = typeof req.query.page === "string" ? req.query.page : undefined;
  const section = typeof req.query.section === "string" ? req.query.section : undefined;

  const conditions = [eq(publicMetricsTable.isVisible, true)];
  if (page) conditions.push(eq(publicMetricsTable.page, page));
  if (section) conditions.push(eq(publicMetricsTable.section, section));

  const rows = await db
    .select()
    .from(publicMetricsTable)
    .where(and(...conditions))
    .orderBy(asc(publicMetricsTable.sortOrder), asc(publicMetricsTable.id));

  res.json(rows);
});

// ── GET /api/public-stories ───────────────────────────────────────────────────
// Public: returns only visible producer story cards.
router.get("/public-stories", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(publicStoriesTable)
    .where(eq(publicStoriesTable.isVisible, true))
    .orderBy(asc(publicStoriesTable.sortOrder), asc(publicStoriesTable.id));

  res.json(rows);
});

// ── GET /api/admin/public-metrics ─────────────────────────────────────────────
// Admin: returns ALL metrics (incl. hidden).
router.get("/admin/public-metrics", ...adminOnly, async (req, res): Promise<void> => {
  const page = typeof req.query.page === "string" ? req.query.page : undefined;

  const conditions = page ? [eq(publicMetricsTable.page, page)] : [];

  const rows = await db
    .select()
    .from(publicMetricsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(publicMetricsTable.page), asc(publicMetricsTable.section), asc(publicMetricsTable.sortOrder));

  res.json(rows);
});

const PatchMetricBody = z.object({
  label:          z.string().min(1).optional(),
  value:          z.string().optional(),
  sourceType:     z.enum(["manual_verified", "live_db", "external_research"]).optional(),
  sourceNote:     z.string().nullable().optional(),
  lastVerifiedAt: z.string().datetime({ offset: true }).nullable().optional(),
  sortOrder:      z.number().int().optional(),
  isVisible:      z.boolean().optional(),
});

// ── PATCH /api/admin/public-metrics/:id ──────────────────────────────────────
router.patch("/admin/public-metrics/:id", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = PatchMetricBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: parsed.error.flatten() }); return; }

  const updates: Partial<typeof publicMetricsTable.$inferInsert> = {
    ...parsed.data,
    lastVerifiedAt: parsed.data.lastVerifiedAt
      ? new Date(parsed.data.lastVerifiedAt)
      : parsed.data.lastVerifiedAt === null
      ? null
      : undefined,
    updatedAt: new Date(),
  };

  const [updated] = await db
    .update(publicMetricsTable)
    .set(updates)
    .where(eq(publicMetricsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Metric not found" }); return; }
  res.json(updated);
});

// ── GET /api/admin/public-stories ────────────────────────────────────────────
// Admin: returns ALL story cards (incl. hidden).
router.get("/admin/public-stories", ...adminOnly, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(publicStoriesTable)
    .orderBy(asc(publicStoriesTable.sortOrder), asc(publicStoriesTable.id));

  res.json(rows);
});

const UpsertStoryBody = z.object({
  storyKey:  z.string().min(1),
  page:      z.string().default("impact"),
  section:   z.string().default("farmer_voices"),
  name:      z.string().min(1),
  region:    z.string().nullable().optional(),
  product:   z.string().nullable().optional(),
  quote:     z.string().nullable().optional(),
  photoUrl:  z.string().url().nullable().optional(),
  isVisible: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const PatchStoryBody = UpsertStoryBody.partial().omit({ storyKey: true });

// ── POST /api/admin/public-stories ───────────────────────────────────────────
router.post("/admin/public-stories", ...adminOnly, async (req, res): Promise<void> => {
  const parsed = UpsertStoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: parsed.error.flatten() }); return; }

  const [created] = await db
    .insert(publicStoriesTable)
    .values({ ...parsed.data, updatedAt: new Date() })
    .returning();

  res.status(201).json(created);
});

// ── PATCH /api/admin/public-stories/:id ──────────────────────────────────────
router.patch("/admin/public-stories/:id", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = PatchStoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: parsed.error.flatten() }); return; }

  const [updated] = await db
    .update(publicStoriesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(publicStoriesTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Story not found" }); return; }
  res.json(updated);
});

// ── DELETE /api/admin/public-stories/:id ─────────────────────────────────────
router.delete("/admin/public-stories/:id", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db
    .delete(publicStoriesTable)
    .where(eq(publicStoriesTable.id, id))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Story not found" }); return; }
  res.status(204).send();
});

export default router;
