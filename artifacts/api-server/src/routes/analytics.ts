import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import {
  db, productAnalyticsTable, productsTable, companiesTable, tradeHistoryTable,
  complianceRequirementsTable, trustScoresTable, rfqsTable
} from "@workspace/db";

const router: IRouter = Router();

router.get("/analytics/trending", async (_req, res): Promise<void> => {
  const analytics = await db.select().from(productAnalyticsTable).orderBy(desc(productAnalyticsTable.inquiries)).limit(6);

  const result = await Promise.all(analytics.map(async (a) => {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, a.productId));
    const [company] = product ? await db.select().from(companiesTable).where(eq(companiesTable.id, product.companyId)) : [null];
    return {
      productId: a.productId,
      productName: product?.name ?? "Unknown",
      category: product?.category ?? "OTHER",
      views: a.views,
      inquiries: a.inquiries,
      saves: a.saves,
      rfqCount: a.rfqCount,
      pricePerKgUSD: product?.pricePerKgUSD ?? 0,
      images: product?.images ?? [],
      supplierName: company?.name ?? "Unknown",
      supplierRegion: company?.region ?? null,
    };
  }));

  res.json(result);
});

router.post("/analytics/product/:id/view", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(productAnalyticsTable).where(eq(productAnalyticsTable.productId, productId));
  if (existing) {
    await db.update(productAnalyticsTable)
      .set({ views: existing.views + 1, updatedAt: new Date() })
      .where(eq(productAnalyticsTable.productId, productId));
  } else {
    await db.insert(productAnalyticsTable).values({ productId, views: 1, inquiries: 0, saves: 0, rfqCount: 0 });
  }
  res.json({ success: true });
});

router.get("/analytics/trade-history/:companyId", async (req, res): Promise<void> => {
  const companyId = parseInt(req.params.companyId);
  const history = await db.select().from(tradeHistoryTable)
    .where(eq(tradeHistoryTable.companyId, companyId))
    .orderBy(desc(tradeHistoryTable.year));
  res.json(history);
});

router.get("/compliance", async (req, res): Promise<void> => {
  const { country, productType } = req.query as { country?: string; productType?: string };

  let query = db.select().from(complianceRequirementsTable).$dynamic();
  const conditions: any[] = [];
  if (country) conditions.push(eq(complianceRequirementsTable.country, country));
  if (productType) conditions.push(eq(complianceRequirementsTable.productType, productType));
  if (conditions.length > 0) {
    const { and } = await import("drizzle-orm");
    query = query.where(and(...conditions)) as any;
  }

  const requirements = await query;
  res.json(requirements);
});

router.get("/trust/:companyId", async (req, res): Promise<void> => {
  const companyId = parseInt(req.params.companyId);
  const [trust] = await db.select().from(trustScoresTable).where(eq(trustScoresTable.companyId, companyId));
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));

  if (!company) { res.status(404).json({ error: "Company not found" }); return; }

  const score = trust?.score ?? company.trustScore ?? 0;
  const tier = score >= 85 ? "PLATINUM" : score >= 70 ? "GOLD" : score >= 50 ? "SILVER" : "BASIC";

  res.json({
    companyId,
    score,
    tier,
    factors: {
      ordersCompleted: trust?.ordersCompleted ?? 0,
      certificationsCount: trust?.certificationsCount ?? 0,
      responseTime: trust?.responseTime ?? 0,
      profileCompleteness: trust?.profileCompleteness ?? 0,
      tradeVolume: trust?.tradeVolume ?? 0,
    },
    subscriptionTier: company.subscriptionTier,
    responseTimeHours: company.responseTimeHours ?? null,
    updatedAt: trust?.updatedAt.toISOString() ?? new Date().toISOString(),
  });
});

router.get("/markets/intelligence", async (_req, res): Promise<void> => {
  const trending = await db.select().from(productAnalyticsTable).orderBy(desc(productAnalyticsTable.inquiries)).limit(5);

  const products = await Promise.all(trending.map(async (a) => {
    const [p] = await db.select().from(productsTable).where(eq(productsTable.id, a.productId));
    return p ? { name: p.name, category: p.category, price: p.pricePerKgUSD, inquiries: a.inquiries } : null;
  }));

  const openRfqs = await db.select().from(rfqsTable).where(eq(rfqsTable.status, "OPEN"));
  const rfqByCategory = openRfqs.reduce((acc: any, rfq) => {
    acc[rfq.productCategory] = (acc[rfq.productCategory] ?? 0) + 1;
    return acc;
  }, {});

  res.json({
    trendingProducts: products.filter(Boolean),
    openRfqsByCategory: rfqByCategory,
    marketHighlights: [
      { market: "UAE", signal: "HIGH", demand: "Coffee, Superfoods, Avocado", growth: "+34%", note: "Halal certification mandatory" },
      { market: "China", signal: "HIGH", demand: "Cacao, Coffee", growth: "+28%", note: "GACC registration required" },
      { market: "South Korea", signal: "MEDIUM", demand: "Specialty Coffee", growth: "+19%", note: "Premium single-origin trending" },
      { market: "West Africa", signal: "EMERGING", demand: "Coffee, Cacao", growth: "+42%", note: "Growing middle class" },
    ],
    avgPricesByCategory: {
      COFFEE: 18.50,
      CACAO: 3.50,
      AVOCADO: 1.80,
      SUPERFOOD: 30.00,
      EXOTIC_FRUIT: 3.20,
    },
  });
});

export default router;
