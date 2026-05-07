import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, productsTable, originStoriesTable, suppliersTable, productPlaceholdersTable } from "@workspace/db";
import { sendError } from "../lib/response";

const router: IRouter = Router();

// ── GET /api/origin-stories ──────────────────────────────────────────────────
// Public list of supplier profiles published to the Origin Stories page.
// Returns a flat OriginStory shape shaped for the /origin-stories frontend.
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

  const placeholders =
    supplierIds.length > 0
      ? await db
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
      : [];

  const hintBySupplierId = new Map(
    placeholders.map((p) => [p.supplierId, p.categoryHint]),
  );

  const stories = suppliers.map((s) => ({
    id: s.id,
    supplierId: s.id,
    supplierName: s.nombreCompleto,
    farmerName: s.registeredBy ?? s.nombreCompleto,
    region: s.department
      ? `${s.municipio}, ${s.department}`
      : s.municipio,
    product: hintBySupplierId.get(s.id) ?? "Colombian Coffee",
    story: s.description ?? "",
    imageUrl: s.originStoryImageUrl ?? null,
    elevation: null as number | null,
  }));

  res.json(stories);
});

router.get("/stories/:productId", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) {
    sendError(res, 400, "Invalid product ID");
    return;
  }

  const [story] = await db.select().from(originStoriesTable)
    .where(eq(originStoriesTable.productId, productId));

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

router.get("/impact", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).where(eq(productsTable.active, true));
  const stories = await db.select().from(originStoriesTable);

  const farmersSupported = stories.length;
  const totalFamiliesSupported = products.reduce((sum, p) => sum + (p.familiesSupported ?? 0), 0);
  const directTradeProducts = products.filter(p => p.directTrade).length;
  const smallholderProducts = products.filter(p => p.smallholder).length;
  const womenLedFarms = products.filter(p => p.womenLed).length;
  const organicProducts = products.filter(p => p.organic).length;

  const regions = [...new Set(stories.map(s => s.region))];

  const avgFarmSizeHa = stories.length
    ? stories.reduce((sum, s) => sum + (s.farmSizeHa ?? 0), 0) / stories.filter(s => s.farmSizeHa).length
    : 0;

  res.json({
    farmersSupported,
    totalFamiliesSupported,
    directTradeProducts,
    smallholderProducts,
    womenLedFarms,
    organicProducts,
    regionsRepresented: regions,
    avgFarmSizeHa: Math.round(avgFarmSizeHa * 10) / 10,
    tradeVolumeUSD: 4200000,
  });
});

export default router;
