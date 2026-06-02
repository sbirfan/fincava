// Admin retail order management — V1 manual workflow (8 actions)
import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db, usersTable, profilesTable, productsTable, suppliersTable,
  ordersTable, retailOrderDetailsTable, retailPaymentTransactionsTable,
  retailBuyerProfilesTable,
} from "@workspace/db";
import { adminOnly } from "../../middleware/admin";
import {
  sendEmail, retailShippingEmail, retailReviewRequestEmail,
} from "../../lib/email";
import { sendWhatsAppMessage } from "../../lib/whatsapp";
import { logger } from "../../lib/logger";
import { sendError } from "../../lib/response";

const router: IRouter = Router();

// ── GET /api/admin/retail/orders ──────────────────────────────────────────────
router.get("/admin/retail/orders", ...adminOnly, async (req, res): Promise<void> => {
  const { status, page = "1", pageSize = "25" } = req.query as Record<string, string>;
  const limit = Math.min(100, parseInt(pageSize) || 25);
  const offset = (Math.max(1, parseInt(page) || 1) - 1) * limit;

  let query = db
    .select({
      orderId: ordersTable.id,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
      buyerId: ordersTable.buyerId,
      shippingName: retailOrderDetailsTable.shippingName,
      shippingCity: retailOrderDetailsTable.shippingCity,
      shippingDepartment: retailOrderDetailsTable.shippingDepartment,
      unitQuantity: retailOrderDetailsTable.unitQuantity,
      unitLabel: retailOrderDetailsTable.unitLabel,
      currency: retailOrderDetailsTable.currency,
      carrier: retailOrderDetailsTable.carrier,
      trackingNumber: retailOrderDetailsTable.trackingNumber,
      deliveredAt: retailOrderDetailsTable.deliveredAt,
      farmerPaidAt: retailOrderDetailsTable.farmerPaidAt,
      paymentStatus: retailPaymentTransactionsTable.status,
      amountCents: retailPaymentTransactionsTable.amountCents,
      productId: retailOrderDetailsTable.productId,
    })
    .from(ordersTable)
    .innerJoin(retailOrderDetailsTable, eq(retailOrderDetailsTable.orderId, ordersTable.id))
    .leftJoin(retailPaymentTransactionsTable, eq(retailPaymentTransactionsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.channel, "retail"))
    .$dynamic();

  if (status) query = query.where(and(eq(ordersTable.channel, "retail"), eq(ordersTable.status, status as any))) as any;

  const rows = await query.orderBy(desc(ordersTable.createdAt)).limit(limit).offset(offset);

  // Enrich with product name
  const productIds = [...new Set(rows.map(r => r.productId).filter(Boolean))] as number[];
  const products = productIds.length
    ? await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable).where(sql`id = ANY(${productIds})`)
    : [];
  const productMap = new Map(products.map(p => [p.id, p.name]));

  // Enrich with buyer email
  const buyerIds = [...new Set(rows.map(r => r.buyerId))];
  const buyers = buyerIds.length
    ? await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(sql`id = ANY(${buyerIds})`)
    : [];
  const buyerMap = new Map(buyers.map(b => [b.id, b.email]));

  res.json(rows.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    deliveredAt: r.deliveredAt?.toISOString() ?? null,
    farmerPaidAt: r.farmerPaidAt?.toISOString() ?? null,
    productName: productMap.get(r.productId ?? 0) ?? "—",
    buyerEmail: buyerMap.get(r.buyerId) ?? "—",
  })));
});

// ── GET /api/admin/retail/orders/:id ─────────────────────────────────────────
router.get("/admin/retail/orders/:id", ...adminOnly, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  if (isNaN(orderId)) { sendError(res, 400, "Invalid id"); return; }

  const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.channel, "retail")));
  if (!order) { sendError(res, 404, "Order not found"); return; }

  const [details] = await db.select().from(retailOrderDetailsTable).where(eq(retailOrderDetailsTable.orderId, orderId));
  const [payment] = await db.select().from(retailPaymentTransactionsTable).where(eq(retailPaymentTransactionsTable.orderId, orderId));

  const [buyer] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, order.buyerId));
  const [profile] = await db.select({ firstName: profilesTable.firstName, lastName: profilesTable.lastName })
    .from(profilesTable).where(eq(profilesTable.userId, order.buyerId));

  let productName = "—";
  let supplierWhatsapp: string | null = null;
  let supplierFirstName = "Productor";
  if (details?.productId) {
    const [p] = await db.select({ name: productsTable.name, supplierId: productsTable.supplierId }).from(productsTable).where(eq(productsTable.id, details.productId));
    if (p) {
      productName = p.name;
      if (p.supplierId) {
        const [s] = await db.select({ whatsappNumber: suppliersTable.whatsappNumber, nombreCompleto: suppliersTable.nombreCompleto })
          .from(suppliersTable).where(eq(suppliersTable.id, p.supplierId));
        supplierWhatsapp = s?.whatsappNumber ?? null;
        supplierFirstName = s?.nombreCompleto?.split(" ")[0] ?? "Productor";
      }
    }
  }

  res.json({
    orderId: order.id,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    buyerEmail: buyer?.email ?? "—",
    buyerName: profile ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() : "Comprador",
    productName,
    details: details ? {
      ...details,
      labelGeneratedAt: details.labelGeneratedAt?.toISOString() ?? null,
      deliveredAt: details.deliveredAt?.toISOString() ?? null,
      farmerPaidAt: details.farmerPaidAt?.toISOString() ?? null,
      reviewRequestedAt: details.reviewRequestedAt?.toISOString() ?? null,
      createdAt: details.createdAt.toISOString(),
      updatedAt: details.updatedAt.toISOString(),
    } : null,
    payment: payment ? {
      ...payment,
      slaVoidDeadline: payment.slaVoidDeadline?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    } : null,
    supplierWhatsapp,
    supplierFirstName,
  });
});

// ── Helper: transition guard ──────────────────────────────────────────────────
async function assertOrderStatus(orderId: number, expected: string[], res: any): Promise<typeof ordersTable.$inferSelect | null> {
  const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.channel, "retail")));
  if (!order) { sendError(res, 404, "Order not found"); return null; }
  if (!expected.includes(order.status)) {
    sendError(res, 409, `Order is ${order.status} — expected ${expected.join(" or ")}`); return null;
  }
  return order;
}

// ── PATCH /api/admin/retail/orders/:id/notify-farmer ─────────────────────────
// Action 1: send T-F1 WhatsApp to farmer
router.patch("/admin/retail/orders/:id/notify-farmer", ...adminOnly, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  const order = await assertOrderStatus(orderId, ["INQUIRY"], res);
  if (!order) return;

  const [details] = await db.select().from(retailOrderDetailsTable).where(eq(retailOrderDetailsTable.orderId, orderId));
  const [buyer] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, order.buyerId));
  const [profile] = await db.select({ firstName: profilesTable.firstName }).from(profilesTable).where(eq(profilesTable.userId, order.buyerId));

  let supplierWhatsapp: string | null = null;
  let supplierFirstName = "Productor";
  let productName = "tu producto";
  let unitLabel = "unidades";

  if (details?.productId) {
    const [p] = await db.select({ name: productsTable.name, supplierId: productsTable.supplierId, unitLabel: productsTable.retailUnitLabel })
      .from(productsTable).where(eq(productsTable.id, details.productId));
    if (p) {
      productName = p.name;
      unitLabel = p.unitLabel ?? "unidades";
      if (p.supplierId) {
        const [s] = await db.select({ whatsappNumber: suppliersTable.whatsappNumber, nombreCompleto: suppliersTable.nombreCompleto })
          .from(suppliersTable).where(eq(suppliersTable.id, p.supplierId));
        supplierWhatsapp = s?.whatsappNumber ?? null;
        supplierFirstName = s?.nombreCompleto?.split(" ")[0] ?? "Productor";
      }
    }
  }

  const buyerFirstName = profile?.firstName ?? buyer?.email?.split("@")[0] ?? "Comprador";

  if (supplierWhatsapp) {
    const msg = `Hola ${supplierFirstName}, tienes un nuevo pedido. ${buyerFirstName} de ${details?.shippingCity ?? "Colombia"} compró ${details?.unitQuantity ?? 1} ${unitLabel} de ${productName}. Cuando esté listo para enviar, responde LISTO. — FINCAVA`;
    await sendWhatsAppMessage(supplierWhatsapp, msg).catch(err => logger.warn({ err }, "notify-farmer: WhatsApp failed"));
    res.json({ success: true, channel: "WHATSAPP" });
  } else {
    res.json({ success: false, reason: "Supplier has no WhatsApp number on file" });
  }
});

// ── PATCH /api/admin/retail/orders/:id/mark-authorized ───────────────────────
// Action 2: manual Wompi authorization
router.patch("/admin/retail/orders/:id/mark-authorized", ...adminOnly, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  const order = await assertOrderStatus(orderId, ["INQUIRY"], res);
  if (!order) return;

  await db.update(ordersTable).set({ status: "AUTHORIZED" }).where(eq(ordersTable.id, orderId));
  await db.update(retailPaymentTransactionsTable).set({ status: "AUTHORIZED", updatedAt: new Date() })
    .where(eq(retailPaymentTransactionsTable.orderId, orderId));

  res.json({ success: true, status: "AUTHORIZED" });
});

// ── PATCH /api/admin/retail/orders/:id/mark-ready ────────────────────────────
// Action 3: farmer confirmed LISTO
router.patch("/admin/retail/orders/:id/mark-ready", ...adminOnly, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  const order = await assertOrderStatus(orderId, ["AUTHORIZED"], res);
  if (!order) return;

  await db.update(ordersTable).set({ status: "READY_TO_SHIP" }).where(eq(ordersTable.id, orderId));

  // Send T-F2 WhatsApp to farmer
  const [details] = await db.select({ productId: retailOrderDetailsTable.productId, shippingCity: retailOrderDetailsTable.shippingCity, unitQuantity: retailOrderDetailsTable.unitQuantity })
    .from(retailOrderDetailsTable).where(eq(retailOrderDetailsTable.orderId, orderId));
  const [buyerProfile] = await db.select({ firstName: profilesTable.firstName }).from(profilesTable).where(eq(profilesTable.userId, order.buyerId));
  const buyerFirstName = buyerProfile?.firstName ?? "Comprador";

  if (details?.productId) {
    const [p] = await db.select({ supplierId: productsTable.supplierId }).from(productsTable).where(eq(productsTable.id, details.productId));
    if (p?.supplierId) {
      const [s] = await db.select({ whatsappNumber: suppliersTable.whatsappNumber })
        .from(suppliersTable).where(eq(suppliersTable.id, p.supplierId));
      if (s?.whatsappNumber) {
        const msg = `¡Listo! ${buyerFirstName} sabe que su pedido está en camino. Generaremos la guía y te avisamos. — FINCAVA`;
        await sendWhatsAppMessage(s.whatsappNumber, msg).catch(err => logger.warn({ err }, "mark-ready: WhatsApp T-F2 failed"));
      }
    }
  }

  res.json({ success: true, status: "READY_TO_SHIP" });
});

// ── PATCH /api/admin/retail/orders/:id/capture ───────────────────────────────
// Action 4: capture payment (V1 manual — marks DB without calling Wompi API)
router.patch("/admin/retail/orders/:id/capture", ...adminOnly, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  const order = await assertOrderStatus(orderId, ["READY_TO_SHIP", "AUTHORIZED"], res);
  if (!order) return;

  await db.update(ordersTable).set({ status: "CAPTURED" }).where(eq(ordersTable.id, orderId));
  await db.update(retailPaymentTransactionsTable).set({ status: "CAPTURED", updatedAt: new Date() })
    .where(eq(retailPaymentTransactionsTable.orderId, orderId));

  res.json({ success: true, status: "CAPTURED" });
});

// ── PATCH /api/admin/retail/orders/:id/tracking ──────────────────────────────
// Action 5: enter carrier + tracking number, transition to IN_TRANSIT, notify buyer
router.patch("/admin/retail/orders/:id/tracking", ...adminOnly, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  const order = await assertOrderStatus(orderId, ["CAPTURED", "READY_TO_SHIP"], res);
  if (!order) return;

  const { carrier, trackingNumber } = req.body as { carrier?: string; trackingNumber?: string };
  if (!carrier || !trackingNumber) { sendError(res, 400, "carrier and trackingNumber required"); return; }

  await db.update(ordersTable).set({ status: "IN_TRANSIT" }).where(eq(ordersTable.id, orderId));
  await db.update(retailOrderDetailsTable).set({
    carrier, trackingNumber, labelGeneratedAt: new Date(), updatedAt: new Date(),
  }).where(eq(retailOrderDetailsTable.orderId, orderId));

  // T-B6: notify buyer
  const [buyer] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, order.buyerId));
  const [profile] = await db.select({ firstName: profilesTable.firstName }).from(profilesTable).where(eq(profilesTable.userId, order.buyerId));
  const [details] = await db.select({ productId: retailOrderDetailsTable.productId }).from(retailOrderDetailsTable).where(eq(retailOrderDetailsTable.orderId, orderId));

  let farmerName = "FINCAVA";
  if (details?.productId) {
    const [p] = await db.select({ supplierId: productsTable.supplierId }).from(productsTable).where(eq(productsTable.id, details.productId));
    if (p?.supplierId) {
      const [s] = await db.select({ nombreCompleto: suppliersTable.nombreCompleto }).from(suppliersTable).where(eq(suppliersTable.id, p.supplierId));
      farmerName = s?.nombreCompleto ?? farmerName;
    }
  }

  if (buyer?.email) {
    const content = retailShippingEmail({ buyerFirstName: profile?.firstName ?? "Comprador", farmerName, carrier, trackingNumber });
    await sendEmail({ to: buyer.email, subject: content.subject, html: content.html, text: content.text })
      .catch(err => logger.warn({ err }, "tracking: shipping email failed"));
  }

  res.json({ success: true, status: "IN_TRANSIT", carrier, trackingNumber });
});

// ── PATCH /api/admin/retail/orders/:id/mark-delivered ────────────────────────
// Action 6+7: mark delivered, send review request
router.patch("/admin/retail/orders/:id/mark-delivered", ...adminOnly, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  const order = await assertOrderStatus(orderId, ["IN_TRANSIT"], res);
  if (!order) return;

  const deliveredAt = new Date();
  await db.update(ordersTable).set({ status: "DELIVERED_RETAIL" }).where(eq(ordersTable.id, orderId));
  await db.update(retailOrderDetailsTable).set({ deliveredAt, reviewRequestedAt: deliveredAt, updatedAt: deliveredAt })
    .where(eq(retailOrderDetailsTable.orderId, orderId));

  // T-B8: review request email
  const [buyer] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, order.buyerId));
  const [profile] = await db.select({ firstName: profilesTable.firstName }).from(profilesTable).where(eq(profilesTable.userId, order.buyerId));
  const [details] = await db.select({ productId: retailOrderDetailsTable.productId }).from(retailOrderDetailsTable).where(eq(retailOrderDetailsTable.orderId, orderId));

  let farmerName = "FINCAVA";
  if (details?.productId) {
    const [p] = await db.select({ supplierId: productsTable.supplierId }).from(productsTable).where(eq(productsTable.id, details.productId));
    if (p?.supplierId) {
      const [s] = await db.select({ nombreCompleto: suppliersTable.nombreCompleto }).from(suppliersTable).where(eq(suppliersTable.id, p.supplierId));
      farmerName = s?.nombreCompleto ?? farmerName;
    }
  }

  if (buyer?.email) {
    const content = retailReviewRequestEmail({ buyerFirstName: profile?.firstName ?? "Comprador", farmerName });
    await sendEmail({ to: buyer.email, subject: content.subject, html: content.html, text: content.text })
      .catch(err => logger.warn({ err }, "mark-delivered: review email failed"));
  }

  res.json({ success: true, status: "DELIVERED_RETAIL" });
});

// ── PATCH /api/admin/retail/orders/:id/pay-farmer ────────────────────────────
// Action 8: record farmer Nequi payment
router.patch("/admin/retail/orders/:id/pay-farmer", ...adminOnly, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  if (isNaN(orderId)) { sendError(res, 400, "Invalid id"); return; }

  const { farmerPaymentRef, farmerPaymentAmountCents } = req.body as { farmerPaymentRef?: string; farmerPaymentAmountCents?: number };
  if (!farmerPaymentRef || !farmerPaymentAmountCents) { sendError(res, 400, "farmerPaymentRef and farmerPaymentAmountCents required"); return; }

  const farmerPaidAt = new Date();
  await db.update(retailOrderDetailsTable).set({ farmerPaymentRef, farmerPaymentAmountCents, farmerPaidAt, updatedAt: farmerPaidAt })
    .where(eq(retailOrderDetailsTable.orderId, orderId));

  // T-F3: notify farmer via WhatsApp
  const [order] = await db.select({ channel: ordersTable.channel }).from(ordersTable).where(eq(ordersTable.id, orderId));
  if (order?.channel === "retail") {
    const [details] = await db.select({ productId: retailOrderDetailsTable.productId, unitQuantity: retailOrderDetailsTable.unitQuantity, unitLabel: retailOrderDetailsTable.unitLabel })
      .from(retailOrderDetailsTable).where(eq(retailOrderDetailsTable.orderId, orderId));
    if (details?.productId) {
      const [p] = await db.select({ supplierId: productsTable.supplierId }).from(productsTable).where(eq(productsTable.id, details.productId));
      if (p?.supplierId) {
        const [s] = await db.select({ whatsappNumber: suppliersTable.whatsappNumber, nombreCompleto: suppliersTable.nombreCompleto })
          .from(suppliersTable).where(eq(suppliersTable.id, p.supplierId));
        if (s?.whatsappNumber) {
          const amountFormatted = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(farmerPaymentAmountCents / 100);
          const firstName = s.nombreCompleto?.split(" ")[0] ?? "Productor";
          const msg = `${firstName}, hoy te transferimos ${amountFormatted} por la venta de ${details.unitQuantity ?? 1} ${details.unitLabel ?? "unidades"}. Revisa tu Nequi. — FINCAVA`;
          await sendWhatsAppMessage(s.whatsappNumber, msg).catch(err => logger.warn({ err }, "pay-farmer: WhatsApp T-F3 failed"));
        }
      }
    }
  }

  res.json({ success: true, farmerPaidAt: farmerPaidAt.toISOString() });
});

export default router;
