import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, originStoriesTable, suppliersTable, productPlaceholdersTable } from "@workspace/db";
import { sendError } from "../lib/response";

const router: IRouter = Router();

// ── GET /api/origin-stories ──────────────────────────────────────────────────
// Public list of supplier profiles published to the Origin Stories page.
// Returns a flat OriginStory shape shaped for the /origin-stories frontend.
// Story text preference order:
//   1. origin_stories.story where supplierId FK matches (Prompt 4 or Prompt 2)
//   2. suppliers.description (legacy fallback for rows seeded before this fix)
router.get("/origin-stories", async (_req, res): Promise<void> => {
  const suppliers = await db
    .select({
      id: suppliersTable.id,
      nombreCompleto: suppliersTable.nombreCompleto,
      description: suppliersTable.description,
      municipio: suppliersTable.municipio,
      department: suppliersTable.department,
      originStoryImageUrl: suppliersTable.originStoryImageUrl,
      registeredBy: suppliersTable.registeredBy,
      updatedAt: suppliersTable.updatedAt,
    })
    .from(suppliersTable)
    .where(eq(suppliersTable.publishedToOriginStories, true))
    .orderBy(desc(suppliersTable.updatedAt));

  const supplierIds = suppliers.map((s) => s.id);

  const [placeholders, originStoryRows] = await Promise.all([
    supplierIds.length > 0
      ? db
          .select({
            supplierId: productPlaceholdersTable.supplierId,
            categoryHint: productPlaceholdersTable.categoryHint,
          })
          .from(productPlaceholdersTable)
          .where(
            sql`${productPlaceholdersTable.supplierId} = ANY(${sql.raw(
              `ARRAY[${supplierIds.join(",")}]::int[]`,
            )})`,
          )
      : Promise.resolve([]),

    // Batch-fetch origin_stories rows by supplierId FK.
    // These contain the AI-generated story text from Prompt 4 or Prompt 2.
    supplierIds.length > 0
      ? db
          .select({
            supplierId: originStoriesTable.supplierId,
            story: originStoriesTable.story,
            farmerPhoto: originStoriesTable.farmerPhoto,
            elevation: originStoriesTable.elevation,
          })
          .from(originStoriesTable)
          .where(
            and(
              inArray(originStoriesTable.supplierId, supplierIds),
              eq(originStoriesTable.published, true),
            ),
          )
      : Promise.resolve([]),
  ]);

  const hintBySupplierId = new Map(
    (placeholders as { supplierId: number; categoryHint: string | null }[]).map((p) => [p.supplierId, p.categoryHint]),
  );

  // Map supplierId → origin story row (prefer first published row per supplier)
  const originStoryBySupplierId = new Map<
    number,
    { story: string; farmerPhoto: string | null; elevation: string | null }
  >();
  for (const row of originStoryRows as { supplierId: number | null; story: string; farmerPhoto: string | null; elevation: string | null }[]) {
    if (row.supplierId !== null && !originStoryBySupplierId.has(row.supplierId)) {
      originStoryBySupplierId.set(row.supplierId, {
        story: row.story,
        farmerPhoto: row.farmerPhoto,
        elevation: row.elevation,
      });
    }
  }

  const stories = suppliers.map((s) => {
    const originStoryRow = originStoryBySupplierId.get(s.id);
    return {
      id: s.id,
      supplierId: s.id,
      supplierName: s.nombreCompleto,
      farmerName: s.registeredBy ?? s.nombreCompleto,
      region: s.department
        ? `${s.municipio}, ${s.department}`
        : s.municipio,
      product: hintBySupplierId.get(s.id) ?? "Colombian Coffee",
      // Prefer origin_stories.story (Prompt 4 / Prompt 2); fall back to
      // suppliers.description for legacy rows published before this fix.
      story: originStoryRow?.story ?? s.description ?? "",
      imageUrl: s.originStoryImageUrl ?? originStoryRow?.farmerPhoto ?? null,
      elevation: originStoryRow?.elevation ? parseInt(originStoryRow.elevation, 10) || null : null,
    };
  });

  res.json(stories);
});

router.get("/stories/:productId", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) {
    sendError(res, 400, "Invalid product ID");
    return;
  }

  const [story] = await db.select().from(originStoriesTable)
    .where(and(eq(originStoriesTable.productId, productId), eq(originStoriesTable.published, true)));

  if (!story) {
    sendError(res, 404, "Story not found");
    return;
  }

  res.json({
    id: story.id,
    productId: story.productId,
    farmerName: story.farmerName,
    farmerPhoto: story.farmerPhoto,
    farmName: story.farmName,
    region: story.region,
    elevation: story.elevation,
    farmSizeHa: story.farmSizeHa,
    yearsFarming: story.yearsFarming,
    story: story.story,
    challenges: story.challenges,
    impact: story.impact,
    images: story.images,
    videoUrl: story.videoUrl,
  });
});

export default router;
