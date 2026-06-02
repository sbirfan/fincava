// Retail order endpoints — checkout + order status
import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  db, usersTable, profilesTable,
  productsTable, suppliersTable,
  ordersTable, retailOrderDetailsTable,
  retailPaymentTransactionsTable, retailShippingZonesTable,
  retailBuyerProfilesTable,
} from "@workspace/db";
import { requireAuth } from "../../lib/auth";
import {
  sendEmail, getAdminEmails,
  retailOrderConfirmationEmail, retailAdminOrderAlertEmail,
} from "../../lib/email";
import { logger } from "../../lib/logger";
import { sendError } from "../../lib/response";

const router: IRouter = Router();

const SLA_DAYS = 14;

function sha256(val: string): string {
  return crypto.createHash("sha256").update(val).digest("hex");
}

// ── POST /api/retail/orders ───────────────────────────────────────────────────
router.post("/retail/orders", async (req, res): Promise<void> => {
  const {
    productId, quantity,
    shippingName, shippingAddressLine1, shippingAddressLine2,
    shippingCity, shippingDepartment, shippingPostalCode,
    email, phone,
    paymentInstrument = "CARD",
    notificationChannel = "EMAIL",
    lang = "es",
  } = req.body as Record<string, any>;

  if (!productId || !quantity || !shippingName || !shippingAddressLine1 || !shippingCity || !shippingDepartment || !email) {
    sendError(res, 400, "Missing required fields"); return;
  }

  // Resolve buyer userId — from session or by email
  let buyerId: number;
  let buyerProfileId: number | null = null;

  if (req.userId) {
    buyerId = req.userId;
    const [bp] = await db.select({ id: retailBuyerProfilesTable.id })
      .from(retailBuyerProfilesTable).where(eq(retailBuyerProfilesTable.userId, buyerId));
    buyerProfileId = bp?.id ?? null;
  } else {
    // Guest — find or create user by email
    let [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (!existing) {
      const [newUser] = await db.insert(usersTable).values({ email, passwordHash: "RETAIL_GUEST", role: "BUYER", tokenVersion: 0 }).returning({ id: usersTable.id });
      existing = newUser;
    }
    buyerId = existing.id;
  }

  // Run checkout in a transaction
  let orderId: number;
  let totalCents: number;
  let productName: string;
  let unitLabel: string | null;
  let supplierId: number;
  let supplierName: string;
  let shippingRateCents = 0;

  try {
    await db.transaction(async (tx) => {
      // SELECT FOR UPDATE on product row to prevent oversell
      const productRows = await tx.execute(sql`
        SELECT p.id, p.name, p.retail_price_cop, p.retail_stock_units, p.retail_max_per_order,
               p.retail_unit_label, p.retail_enabled, p.active, p.supplier_id
        FROM products p
        WHERE p.id = ${productId}
        FOR UPDATE
      `);
      const p = (productRows as any).rows?.[0] ?? (productRows as any)[0];
      if (!p || !p.retail_enabled || !p.active) { throw new Error("Product not available"); }
      if (p.retail_stock_units == null || p.retail_stock_units < quantity) { throw new Error("Insufficient stock"); }
      if (p.retail_max_per_order && quantity > p.retail_max_per_order) { throw new Error(`Maximum ${p.retail_max_per_order} per order`); }

      productName = p.name;
      unitLabel = p.retail_unit_label ?? null;
      supplierId = p.supplier_id;
      const priceCents = p.retail_price_cop ?? 0;

      // Resolve supplier name
      const [sup] = await tx.select({ name: suppliersTable.nombreCompleto })
        .from(suppliersTable).where(eq(suppliersTable.id, supplierId));
      supplierName = sup?.name ?? "Productor";

      // Verify supplier is PUBLISHED
      const supStatusRows = await tx.execute(sql`
        SELECT sellable_status FROM suppliers WHERE id = ${supplierId} LIMIT 1
      `);
      const supStatus = (supStatusRows as any).rows?.[0] ?? (supStatusRows as any)[0];
      if ((supStatus as any)?.sellable_status !== "PUBLISHED") { throw new Error("Supplier not available"); }

      // Shipping rate lookup
      const [zone] = await tx.select({ rateCents: retailShippingZonesTable.rateCents })
        .from(retailShippingZonesTable)
        .where(and(
          eq(retailShippingZonesTable.destinationDepartment, shippingDepartment),
          eq(retailShippingZonesTable.weightClass, "SMALL"),
          eq(retailShippingZonesTable.active, true),
        ));
      if (zone) { shippingRateCents = zone.rateCents; }
      else {
        const [national] = await tx.select({ rateCents: retailShippingZonesTable.rateCents })
          .from(retailShippingZonesTable)
          .where(and(
            eq(retailShippingZonesTable.originDepartment, "NACIONAL"),
            eq(retailShippingZonesTable.destinationDepartment, "NACIONAL"),
            eq(retailShippingZonesTable.weightClass, "SMALL"),
          ));
        shippingRateCents = national?.rateCents ?? 1500000;
      }

      totalCents = priceCents * quantity + shippingRateCents;

      // 1. Create orders row
      const [order] = await tx.insert(ordersTable).values({
        buyerId,
        supplierId,
        status: "INQUIRY",
        totalUSD: 0,
        incoterm: "FOB",
        channel: "retail",
      }).returning({ id: ordersTable.id });
      orderId = order.id;

      // 2. Create retail_order_details
      const rawAccessToken = crypto.randomBytes(32).toString("hex");
      const accessTokenHash = sha256(rawAccessToken);
      // Store raw token temporarily for the confirmation email — not stored plain
      (res as any)._orderAccessToken = rawAccessToken;

      await tx.insert(retailOrderDetailsTable).values({
        orderId,
        retailBuyerProfileId: buyerProfileId,
        productId: Number(productId),
        unitQuantity: quantity,
        unitLabel,
        productPriceCents: priceCents,
        orderAccessTokenHash: accessTokenHash,
        shippingName,
        shippingAddressLine1,
        shippingAddressLine2: shippingAddressLine2 ?? null,
        shippingCity,
        shippingDepartment,
        shippingPostalCode: shippingPostalCode ?? null,
        shippingRateCents,
        currency: "COP",
      });

      // 3. Create retail_payment_transactions
      const slaVoidDeadline = new Date(Date.now() + SLA_DAYS * 24 * 60 * 60 * 1000);
      await tx.insert(retailPaymentTransactionsTable).values({
        orderId,
        gateway: "WOMPI",
        instrumentType: paymentInstrument,
        settlesImmediately: paymentInstrument === "NEQUI" || paymentInstrument === "PSE",
        status: "PENDING",
        amountCents: totalCents,
        currency: "COP",
        slaVoidDeadline,
        initiatedBy: "BUYER",
      });

      // 4. Decrement stock
      await tx.execute(sql`
        UPDATE products SET retail_stock_units = retail_stock_units - ${quantity}
        WHERE id = ${productId}
      `);
    });
  } catch (err: any) {
    logger.warn({ err, productId, quantity }, "retail/orders: transaction failed");
    const msg = err.message ?? "Order could not be placed";
    if (msg.includes("stock") || msg.includes("available") || msg.includes("Maximum")) {
      sendError(res, 409, msg);
    } else {
      sendError(res, 500, msg);
    }
    return;
  }

  res.status(201).json({ data: { orderId: orderId!, totalCents: totalCents!, currency: "COP", status: "INQUIRY" } });

  // Fire-and-forget: admin alert + buyer confirmation
  void Promise.resolve().then(async () => {
    try {
      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:5173");

      const rawAccessToken = (res as any)._orderAccessToken as string;
      const orderStatusUrl = `${appBaseUrl}/tienda/orders/${orderId}?token=${rawAccessToken}`;
      const adminOrderUrl = `${appBaseUrl}/admin/retail/orders/${orderId}`;

      // Buyer name
      const [profile] = await db.select({ firstName: profilesTable.firstName })
        .from(profilesTable).where(eq(profilesTable.userId, buyerId));
      const buyerFirstName = profile?.firstName ?? email.split("@")[0]!;

      // Buyer confirmation
      const confirmContent = retailOrderConfirmationEmail({
        buyerFirstName,
        farmerName: supplierName!,
        productName: productName!,
        quantity,
        unitLabel: unitLabel ?? null,
        totalCents: totalCents!,
        shippingDepartment,
        orderId: orderId!,
        orderStatusUrl,
        lang,
      });
      await sendEmail({ to: email, subject: confirmContent.subject, html: confirmContent.html, text: confirmContent.text });

      // Admin alert
      const adminEmails = await getAdminEmails();
      if (adminEmails.length > 0) {
        const alertContent = retailAdminOrderAlertEmail({
          productName: productName!,
          quantity,
          unitLabel: unitLabel ?? null,
          buyerName: buyerFirstName,
          buyerEmail: email,
          buyerCity: shippingCity,
          totalCents: totalCents!,
          orderId: orderId!,
          adminOrderUrl,
        });
        await sendEmail({ to: adminEmails, subject: alertContent.subject, html: alertContent.html, text: alertContent.text });
      }
    } catch (err) {
      logger.warn({ err, orderId }, "retail/orders: post-order emails failed");
    }
  });
});

// ── GET /api/retail/orders/:id ────────────────────────────────────────────────
router.get("/retail/orders/:id", async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  if (isNaN(orderId)) { sendError(res, 400, "Invalid id"); return; }

  const tokenParam = req.query["token"] as string | undefined;

  // Load order + details + payment
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || order.channel !== "retail") { sendError(res, 404, "Order not found"); return; }

  const [details] = await db.select().from(retailOrderDetailsTable).where(eq(retailOrderDetailsTable.orderId, orderId));
  const [payment] = await db.select().from(retailPaymentTransactionsTable).where(eq(retailPaymentTransactionsTable.orderId, orderId));

  // Auth: session owner OR valid access token
  const isOwner = req.userId && req.userId === order.buyerId;
  const tokenValid = tokenParam && details?.orderAccessTokenHash &&
    crypto.timingSafeEqual(Buffer.from(sha256(tokenParam)), Buffer.from(details.orderAccessTokenHash));

  if (!isOwner && !tokenValid) { sendError(res, 403, "Access denied"); return; }

  res.json({
    data: {
      orderId: order.id,
      status: order.status,
      paymentStatus: payment?.status ?? "PENDING",
      totalCents: payment?.amountCents ?? 0,
      currency: "COP",
      shippingDepartment: details?.shippingDepartment ?? null,
      shippingCity: details?.shippingCity ?? null,
      carrier: details?.carrier ?? null,
      trackingNumber: details?.trackingNumber ?? null,
      deliveredAt: details?.deliveredAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
    },
  });
});

export { requireAuth };
export default router;
