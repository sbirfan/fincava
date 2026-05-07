import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, productsTable, companiesTable, ordersTable, inquiriesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/stats/platform", async (_req, res): Promise<void> => {
  const [supplierCount] = await db.select({ count: count() }).from(companiesTable).where(eq(companiesTable.verified, true));
  const [productCount] = await db.select({ count: count() }).from(productsTable).where(eq(productsTable.active, true));
  const [orderSum] = await db.select({ total: sql<number>`COALESCE(SUM(${ordersTable.totalUSD}), 0)` }).from(ordersTable);

  res.json({
    verifiedSuppliers: supplierCount?.count ?? 0,
    exportDestinations: 15,
    facilitatedTradeUSD: orderSum?.total ?? 2000000,
    productCategories: 8,
    totalProducts: productCount?.count ?? 0,
  });
});

router.get("/buyer/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;

  const [orderCount] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.buyerId, userId));
  const [activeOrders] = await db.select({ count: count() }).from(ordersTable)
    .where(eq(ordersTable.buyerId, userId));

  const inquiries = await db.select().from(inquiriesTable).limit(5);
  const recentOrders = await db.select().from(ordersTable)
    .where(eq(ordersTable.buyerId, userId))
    .limit(5)
    .orderBy(ordersTable.createdAt);

  const recentInquiries = await Promise.all(inquiries.map(async (i) => {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, i.productId));
    return {
      id: i.id, productId: i.productId,
      productName: product?.name ?? "Unknown",
      productImage: product?.images?.[0] ?? null,
      supplierName: "Supplier",
      buyerEmail: i.buyerEmail, buyerName: i.buyerName,
      company: i.company, country: i.country,
      message: i.message, quantityKg: i.quantityKg ?? null,
      status: i.status, createdAt: i.createdAt.toISOString(),
    };
  }));

  const recentOrdersFormatted = await Promise.all(recentOrders.map(async (o) => {
    const items = await db.select().from(ordersTable).where(eq(ordersTable.id, o.id));
    return {
      id: o.id, buyerId: o.buyerId, buyerName: "You",
      status: o.status, totalUSD: o.totalUSD, incoterm: o.incoterm,
      destinationPort: o.destinationPort ?? null, shippingMethod: o.shippingMethod ?? null,
      notes: o.notes ?? null, itemCount: items.length,
      createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(),
    };
  }));

  res.json({
    activeInquiries: inquiries.length,
    totalOrders: orderCount?.count ?? 0,
    ordersInProgress: activeOrders?.count ?? 0,
    savedProducts: 0,
    recentInquiries,
    recentOrders: recentOrdersFormatted,
  });
});

router.get("/supplier/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));

  if (!company) {
    res.json({
      listedProducts: 0, activeInquiries: 0, totalOrders: 0,
      totalRevenueUSD: 0, verificationStatus: "UNVERIFIED",
      recentInquiries: [], recentOrders: [],
    });
    return;
  }

  const [productCount] = await db.select({ count: count() }).from(productsTable)
    .where(eq(productsTable.companyId, company.id));

  const supplierProducts = await db.select().from(productsTable).where(eq(productsTable.companyId, company.id));
  const productIds = supplierProducts.map(p => p.id);

  const inquiries = await db.select().from(inquiriesTable).limit(5);
  const filtered = inquiries.filter(i => productIds.includes(i.productId));

  const recentInquiries = await Promise.all(filtered.slice(0, 5).map(async (i) => {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, i.productId));
    return {
      id: i.id, productId: i.productId,
      productName: product?.name ?? "Unknown",
      productImage: product?.images?.[0] ?? null,
      supplierName: company.name,
      buyerEmail: i.buyerEmail, buyerName: i.buyerName,
      company: i.company, country: i.country,
      message: i.message, quantityKg: i.quantityKg ?? null,
      status: i.status, createdAt: i.createdAt.toISOString(),
    };
  }));

  res.json({
    listedProducts: productCount?.count ?? 0,
    activeInquiries: filtered.length,
    totalOrders: 0,
    totalRevenueUSD: 0,
    verificationStatus: company.verified ? "VERIFIED" : "PENDING",
    recentInquiries,
    recentOrders: [],
  });
});

export default router;
