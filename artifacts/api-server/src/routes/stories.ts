import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, productsTable, originStoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stories/:productId", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const [story] = await db.select().from(originStoriesTable)
    .where(eq(originStoriesTable.productId, productId));

  if (!story) {
    res.status(404).json({ error: "Story not found" });
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
