import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable, usersTable, profilesTable, companiesTable, messagesTable, suppliersTable } from "@workspace/db";
import {
  CreateOrderBody,
  GetBuyerOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";
import { requireAuth, requireVerifiedEmail } from "../lib/auth";
import { orderStatusEmail, buyerIntentAdminAlertEmail } from "../lib/email";
import { enqueueEmail } from "../lib/email-queue";
import { logger } from "../lib/logger";
import { computeFee } from "../services/fee-service";
import { logInteraction } from "../lib/interaction-logger";
import { incrementAndMaybeLog } from "../lib/volumeCounters";
import { isValidFeeStatus } from "../constants/fee-status";
import { ENABLE_TRANSACTIONS } from "../lib/flags";
import { sendError } from "../lib/response";

const router: IRouter = Router();

router.use(["/buyer/orders", "/supplier/orders"], (_req, res, next): void => {
  if (!ENABLE_TRANSACTIONS) { sendError(res, 404, "Not found"); return; }
  next();
});

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
    // Fee tracking — nullable on legacy orders that pre-date this feature.
    feePercentage: order.feePercentage ?? null,
    feeAmountUSD:  order.feeAmountUSD  ?? null,
    feeStatus:     (() => {
      const v = order.feeStatus ?? null;
      if (v !== null && !isValidFeeStatus(v)) {
        logger.warn({ orderId: order.id, feeStatus: v }, "Unexpected fee_status value read from DB");
      }
      return v;
    })(),
    itemCount: items.length,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

router.get("/buyer/orders", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const page = Math.max(1, Number((req.query as any).page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number((req.query as any).pageSize) || 25));

  const orders = await db.select().from(ordersTable)
    .where(eq(ordersTable.buyerId, userId))
    .orderBy(ordersTable.createdAt)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (orders.length === 0) { res.json([]); return; }

  const [allItems, [buyerProfile]] = await Promise.all([
    db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orders.map(o => o.id))),
    db.select().from(profilesTable).where(eq(profilesTable.userId, userId)),
  ]);

  const buyerName = buyerProfile ? `${buyerProfile.firstName} ${buyerProfile.lastName}` : "Unknown";
  const itemsByOrder = new Map<number, typeof allItems>();
  for (const item of allItems) {
    if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
    itemsByOrder.get(item.orderId)!.push(item);
  }

  const results = orders.map(order => {
    const items = itemsByOrder.get(order.id) ?? [];
    return {
      id: order.id,
      buyerId: order.buyerId,
      buyerName,
      status: order.status,
      totalUSD: order.totalUSD,
      incoterm: order.incoterm,
      destinationPort: order.destinationPort ?? null,
      shippingMethod: order.shippingMethod ?? null,
      notes: order.notes ?? null,
      feePercentage: order.feePercentage ?? null,
      feeAmountUSD: order.feeAmountUSD ?? null,
      feeStatus: (() => {
        const v = order.feeStatus ?? null;
        if (v !== null && !isValidFeeStatus(v)) {
          logger.warn({ orderId: order.id, feeStatus: v }, "Unexpected fee_status value read from DB");
        }
        return v;
      })(),
      itemCount: items.length,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  });
  res.json(results);
});

router.post("/buyer/intent", requireAuth, requireVerifiedEmail, async (req, res): Promise<void> => {
  const userId = req.userId;

  const { supplierId, productId, estimatedQuantityKg, notes } = req.body ?? {};
  if (!supplierId || typeof supplierId !== "number") {
    sendError(res, 400, "supplierId (number) is required"); return;
  }
  if (!estimatedQuantityKg || typeof estimatedQuantityKg !== "number" || estimatedQuantityKg <= 0) {
    sendError(res, 400, "estimatedQuantityKg must be a positive number"); return;
  }

  const [supplier] = await db.select({ id: suppliersTable.id, nombreCompleto: suppliersTable.nombreCompleto })
    .from(suppliersTable).where(eq(suppliersTable.id, supplierId));
  if (!supplier) { sendError(res, 404, "Supplier not found"); return; }

  const notesText = [
    `Estimated quantity: ${estimatedQuantityKg.toLocaleString()} kg`,
    notes ? notes.trim() : null,
  ].filter(Boolean).join(". ");

  const [order] = await db.insert(ordersTable).values({
    buyerId: userId,
    status: "INQUIRY",
    totalUSD: 0,
    incoterm: "FOB",
    supplierId: supplier.id,
    notes: notesText,
  }).returning();

  logger.info({ event: "BUYER_INTENT_CREATED", intentId: order.id, buyerId: userId, supplierId: supplier.id, estimatedQuantityKg });

  res.status(201).json({
    intentId: order.id,
    message: "Fincava will reach out within 48 hours to coordinate next steps.",
  });

  // Fire-and-forget: admin notification email
  Promise.resolve().then(async () => {
    try {
      const [buyerUser] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
      if (!buyerUser?.email) return;

      const [buyerProfile] = await db.select({ firstName: profilesTable.firstName, lastName: profilesTable.lastName })
        .from(profilesTable).where(eq(profilesTable.userId, userId));
      const buyerName = buyerProfile
        ? `${buyerProfile.firstName} ${buyerProfile.lastName}`.trim()
        : buyerUser.email;

      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");

      const emailContent = buyerIntentAdminAlertEmail({
        buyerName,
        buyerEmail: buyerUser.email,
        supplierName: supplier.nombreCompleto,
        estimatedQuantityKg,
        notes: notes?.trim() ?? null,
        intentId: order.id,
        adminUrl: `${appBaseUrl}/admin`,
      });

      enqueueEmail({ to: "info@fincava.com", subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
    } catch (err) {
      logger.warn({ err, intentId: order.id }, "Buyer intent admin email failed");
    }
  });
});

router.post("/buyer/orders", requireAuth, requireVerifiedEmail, async (req, res): Promise<void> => {
  const userId = req.userId;
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.message);
    return;
  }

  const { incoterm, destinationPort, shippingMethod, notes, items } = parsed.data;

  // Calculate total — batch-load all products in one query to avoid N+1
  const productIds = [...new Set(items.map(i => i.productId))];
  const productRows = productIds.length
    ? await db.select().from(productsTable).where(inArray(productsTable.id, productIds))
    : [];
  const productMap = new Map(productRows.map(p => [p.id, p]));

  let totalUSD = 0;
  const itemsWithPrices = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    const itemTotal = item.quantityKg * product.pricePerKgUSD;
    totalUSD += itemTotal;
    if (product.supplierId == null) {
      logger.warn({ event: "ORDER_PRODUCT_NO_SUPPLIER", productId: product.id },
        "Order attempted with product missing supplier_id");
    }
    return { productId: item.productId, quantityKg: item.quantityKg, pricePerKg: product.pricePerKgUSD, totalUSD: itemTotal, supplierId: product.supplierId ?? null };
  });

  // Compute platform fee before inserting so it lands in the first write.
  // computeFee counts prior non-CANCELLED orders to determine waiver status.
  const fee = await computeFee(userId, totalUSD);

  const [order] = await db.insert(ordersTable).values({
    buyerId: userId,
    status: "INQUIRY",
    totalUSD,
    incoterm: incoterm ?? "FOB",
    destinationPort: destinationPort ?? null,
    shippingMethod: shippingMethod ?? null,
    notes: notes ?? null,
    feePercentage: fee.feePercentage,
    feeAmountUSD:  fee.feeAmountUSD,
    feeStatus:     fee.feeStatus,
  }).returning();

  logger.info(
    { orderId: order.id, buyerId: userId, totalUSD, ...fee },
    "order created with fee",
  );
  logger.info({
    event:      "ORDER_CREATED",
    orderId:    order.id,
    supplierId: itemsWithPrices[0]?.supplierId ?? null,
    totalUSD,
  });
  incrementAndMaybeLog(logger, "orders", {
    orderId:    order.id,
    supplierId: itemsWithPrices[0]?.supplierId ?? null,
  });

  // ── Interaction signal (fire-and-forget) ─────────────────────────────────
  logInteraction({
    eventType:     "order_created",
    actorId:       userId,
    actorType:     "buyer",
    referenceId:   order.id,
    referenceType: "order",
    payload: {
      totalUSD,
      feeStatus:    fee.feeStatus,
      feeAmountUSD: fee.feeAmountUSD,
      incoterm:     incoterm ?? "FOB",
      itemCount:    itemsWithPrices.length,
    },
  });

  await Promise.all(itemsWithPrices.map(item =>
    db.insert(orderItemsTable).values({
      orderId: order.id,
      productId: item.productId,
      quantityKg: item.quantityKg,
      pricePerKg: item.pricePerKg,
      totalUSD: item.totalUSD,
      supplierId: item.supplierId,
    })
  ));

  const result = await buildOrderResponse(order);
  res.status(201).json({
    ...result,
    statusDescription: "Your request has been submitted. The supplier will be contacted.",
  });
});

router.get("/buyer/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const params = GetBuyerOrderParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.message);
    return;
  }

  const [order] = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, params.data.id), eq(ordersTable.buyerId, userId)));

  if (!order) {
    sendError(res, 404, "Order not found");
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
  const userId = req.userId;
  const page = Math.max(1, Number((req.query as any).page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number((req.query as any).pageSize) || 25));

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) { res.json([]); return; }

  // Efficient lookup: find supplier's products, then find orders via items — no full scan
  const supplierProducts = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.companyId, company.id));

  if (supplierProducts.length === 0) { res.json([]); return; }

  const productIds = supplierProducts.map(p => p.id);

  // Distinct order IDs that contain at least one of the supplier's products
  const orderIdRows = await db
    .selectDistinct({ orderId: orderItemsTable.orderId })
    .from(orderItemsTable)
    .where(inArray(orderItemsTable.productId, productIds));

  if (orderIdRows.length === 0) { res.json([]); return; }

  const orderIds = orderIdRows.map(r => r.orderId);

  const orders = await db
    .select()
    .from(ordersTable)
    .where(inArray(ordersTable.id, orderIds))
    .orderBy(ordersTable.createdAt)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (orders.length === 0) { res.json([]); return; }

  // Batch fetch items + buyer profiles for these orders only
  const [allItems, buyerProfiles] = await Promise.all([
    db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orders.map(o => o.id))),
    db.select().from(profilesTable).where(inArray(profilesTable.userId, [...new Set(orders.map(o => o.buyerId))])),
  ]);

  const itemsByOrder = new Map<number, typeof allItems>();
  for (const item of allItems) {
    if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
    itemsByOrder.get(item.orderId)!.push(item);
  }
  const profileByUser = new Map(buyerProfiles.map(p => [p.userId, p]));

  const results = orders.map(order => {
    const items = itemsByOrder.get(order.id) ?? [];
    const buyerProfile = profileByUser.get(order.buyerId);
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
      feePercentage: order.feePercentage ?? null,
      feeAmountUSD: order.feeAmountUSD ?? null,
      feeStatus: (() => {
        const v = order.feeStatus ?? null;
        if (v !== null && !isValidFeeStatus(v)) {
          logger.warn({ orderId: order.id, feeStatus: v }, "Unexpected fee_status value read from DB");
        }
        return v;
      })(),
      itemCount: items.length,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  });
  res.json(results);
});

router.patch("/supplier/orders/:id/status", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;

  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.message);
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.message);
    return;
  }

  // Ownership check: supplier must own ALL items in the order, not just one.
  // Partial participation does not grant authority over the whole order's state.
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) { sendError(res, 403, "Only suppliers can update order status"); return; }

  const orderItems = await db.select({ productId: orderItemsTable.productId })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, params.data.id));
  if (orderItems.length === 0) { sendError(res, 404, "Order not found"); return; }

  // Deduplicate product IDs so repeated line items don't skew the count check
  const productIds = [...new Set(orderItems.map(i => i.productId))];

  // All distinct products in the order must belong to this supplier's company
  const supplierProducts = await db.select({ id: productsTable.id })
    .from(productsTable)
    .where(and(eq(productsTable.companyId, company.id), inArray(productsTable.id, productIds)));

  if (supplierProducts.length !== productIds.length) {
    sendError(res, 403, "Not authorized to update this order — you do not own all items in it"); return;
  }

  const [order] = await db.update(ordersTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    sendError(res, 404, "Order not found");
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
        enqueueEmail({ to: buyerUser.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
      }
    } catch (err) {
      logger.warn({ err, orderId: order.id }, "Order status email failed");
    }
  });
});

export default router;
