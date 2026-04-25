import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable, usersTable, profilesTable, companiesTable, messagesTable } from "@workspace/db";
import {
  CreateOrderBody,
  GetBuyerOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { sendEmail, orderStatusEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function buildOrderResponse(order: any) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  
  const [buyerProfile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, order.buyerId));

  return {
    id: order.id,
    buyerId: order.buyerId,
    buyerName: buyerProfile ? `${buyerProfile.firstName} ${buyerProfile.lastName}` : "Unknown",
    status: order.status,
    totalUSD: order.totalUSD,
    incoterm: order.incoterm,
    destinationPort: order.destinationPort ?? null,
    shippingMethod: order.shippingMethod ?? null,
    notes: order.notes ?? null,
    itemCount: items.length,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

router.get("/buyer/orders", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const orders = await db.select().from(ordersTable)
    .where(eq(ordersTable.buyerId, userId))
    .orderBy(ordersTable.createdAt);

  const results = await Promise.all(orders.map(buildOrderResponse));
  res.json(results);
});

router.post("/buyer/orders", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { incoterm, destinationPort, shippingMethod, notes, items } = parsed.data;

  // Calculate total
  let totalUSD = 0;
  const itemsWithPrices = await Promise.all(items.map(async (item) => {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (!product) throw new Error(`Product ${item.productId} not found`);
    const itemTotal = item.quantityKg * product.pricePerKgUSD;
    totalUSD += itemTotal;
    return { productId: item.productId, quantityKg: item.quantityKg, pricePerKg: product.pricePerKgUSD, totalUSD: itemTotal };
  }));

  const [order] = await db.insert(ordersTable).values({
    buyerId: userId,
    status: "INQUIRY",
    totalUSD,
    incoterm: incoterm ?? "FOB",
    destinationPort: destinationPort ?? null,
    shippingMethod: shippingMethod ?? null,
    notes: notes ?? null,
  }).returning();

  await Promise.all(itemsWithPrices.map(item =>
    db.insert(orderItemsTable).values({
      orderId: order.id,
      productId: item.productId,
      quantityKg: item.quantityKg,
      pricePerKg: item.pricePerKg,
      totalUSD: item.totalUSD,
    })
  ));

  const result = await buildOrderResponse(order);
  res.status(201).json(result);
});

router.get("/buyer/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = GetBuyerOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, params.data.id), eq(ordersTable.buyerId, userId)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const base = await buildOrderResponse(order);
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));

  const itemDetails = await Promise.all(items.map(async (item) => {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    return {
      id: item.id,
      productId: item.productId,
      productName: product?.name ?? "Unknown",
      productImage: product?.images?.[0] ?? null,
      quantityKg: item.quantityKg,
      pricePerKg: item.pricePerKg,
      totalUSD: item.totalUSD,
    };
  }));

  res.json({ ...base, items: itemDetails, messages: [] });
});

router.get("/supplier/orders", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) {
    res.json([]);
    return;
  }

  // Get orders that have items with supplier's products
  const allOrders = await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  const supplierProducts = await db.select().from(productsTable).where(eq(productsTable.companyId, company.id));
  const productIds = new Set(supplierProducts.map(p => p.id));

  const filteredOrders: any[] = [];
  for (const order of allOrders) {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    const hasSupplierProduct = items.some(i => productIds.has(i.productId));
    if (hasSupplierProduct) filteredOrders.push(order);
  }

  const results = await Promise.all(filteredOrders.map(buildOrderResponse));
  res.json(results);
});

router.patch("/supplier/orders/:id/status", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;

  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Ownership check: at least one item in the order must belong to this supplier
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) { res.status(403).json({ error: "Only suppliers can update order status" }); return; }

  const orderItems = await db.select({ productId: orderItemsTable.productId })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, params.data.id));
  if (orderItems.length === 0) { res.status(404).json({ error: "Order not found" }); return; }

  const productIds = orderItems.map(i => i.productId);
  const supplierProducts = await db.select({ id: productsTable.id })
    .from(productsTable)
    .where(and(eq(productsTable.companyId, company.id), inArray(productsTable.id, productIds)));
  if (supplierProducts.length === 0) {
    res.status(403).json({ error: "Not authorized to update this order" }); return;
  }

  const [order] = await db.update(ordersTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const result = await buildOrderResponse(order);
  res.json(result);

  // Fire-and-forget: notify buyer of order status change
  Promise.resolve().then(async () => {
    try {
      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");

      const [buyerUser] = await db.select({ email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, order.buyerId));
      if (!buyerUser?.email) return;

      const [buyerProfile] = await db.select({ firstName: profilesTable.firstName, lastName: profilesTable.lastName })
        .from(profilesTable).where(eq(profilesTable.userId, order.buyerId));
      const buyerName = buyerProfile
        ? `${buyerProfile.firstName} ${buyerProfile.lastName}`.trim()
        : "Customer";

      const emailContent = orderStatusEmail({
        buyerName,
        orderId: order.id,
        newStatus: order.status,
        totalUSD: order.totalUSD,
        incoterm: order.incoterm ?? null,
        destinationPort: order.destinationPort ?? null,
        orderUrl: `${appBaseUrl}/dashboard/orders/${order.id}`,
      });

      if (emailContent) {
        await sendEmail({ to: buyerUser.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
      }
    } catch (err) {
      logger.warn({ err, orderId: order.id }, "Order status email failed");
    }
  });
});

export default router;
