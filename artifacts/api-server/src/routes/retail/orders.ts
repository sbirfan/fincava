// Retail order endpoints — checkout + order status
import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  db, usersTable, profilesTable,
  productsTable, suppliersTable, supplierPaymentMethodsTable,
  ordersTable, retailOrderDetailsTable,
  retailPaymentTransactionsTable, retailShippingZonesTable,
  retailBuyerProfilesTable, retailCartsTable, retailCartItemsTable,
  retailOrderItemsTable,
} from "@workspace/db";
import { ENABLE_CART } from "../../lib/flags";
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

      // Shipping rate lookup — pin originDepartment to NACIONAL to avoid
      // returning a wrong rate when multiple origins share the same destination.
      const [zone] = await tx.select({ rateCents: retailShippingZonesTable.rateCents })
        .from(retailShippingZonesTable)
        .where(and(
          eq(retailShippingZonesTable.originDepartment, "NACIONAL"),
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

  // FIN-114: look up supplier's Nequi phone so buyer knows where to transfer
  // Join path: retail_order_details.product_id → products.supplier_id → supplier_payment_methods
  let nequiPhone: string | null = null;
  if (details?.productId) {
    const [prod] = await db.select({ supplierId: productsTable.supplierId })
      .from(productsTable).where(eq(productsTable.id, details.productId));
    if (prod?.supplierId) {
      const [spm] = await db.select({ nequiPhone: supplierPaymentMethodsTable.nequiPhone })
        .from(supplierPaymentMethodsTable)
        .where(eq(supplierPaymentMethodsTable.supplierId, prod.supplierId));
      nequiPhone = spm?.nequiPhone ?? null;
    }
  }

  res.json({
    data: {
      orderId: order.id,
      status: order.status,
      paymentStatus: payment?.status ?? "PENDING",
      instrumentType: payment?.instrumentType ?? null,
      totalCents: payment?.amountCents ?? 0,
      currency: "COP",
      // FIN-114: Nequi interim payment fields
      nequiPhone,
      buyerPaymentRef: details?.buyerPaymentRef ?? null,
      // Shipping + tracking
      shippingDepartment: details?.shippingDepartment ?? null,
      shippingCity: details?.shippingCity ?? null,
      carrier: details?.carrier ?? null,
      trackingNumber: details?.trackingNumber ?? null,
      deliveredAt: details?.deliveredAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
    },
  });
});

// ── PATCH /api/retail/orders/:id/payment-ref (FIN-114) ───────────────────────
// Buyer submits their Nequi transaction ID after making the manual transfer.
// Admin cross-checks this reference in the Nequi app before marking AUTHORIZED.
// Auth: same as GET — session owner OR valid access token.
router.patch("/retail/orders/:id/payment-ref", async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  if (isNaN(orderId)) { sendError(res, 400, "Invalid id"); return; }

  const ref = (req.body as Record<string, unknown>).ref;
  if (!ref || typeof ref !== "string" || ref.trim().length === 0) {
    sendError(res, 400, "ref is required"); return;
  }
  if (ref.length > 100) { sendError(res, 400, "ref too long (max 100 chars)"); return; }

  const tokenParam = req.query["token"] as string | undefined;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || order.channel !== "retail") { sendError(res, 404, "Order not found"); return; }

  const [details] = await db.select().from(retailOrderDetailsTable)
    .where(eq(retailOrderDetailsTable.orderId, orderId));

  const isOwner = req.userId && req.userId === order.buyerId;
  const tokenValid = tokenParam && details?.orderAccessTokenHash &&
    crypto.timingSafeEqual(Buffer.from(sha256(tokenParam)), Buffer.from(details.orderAccessTokenHash));

  if (!isOwner && !tokenValid) { sendError(res, 403, "Access denied"); return; }

  await db.update(retailOrderDetailsTable)
    .set({ buyerPaymentRef: ref.trim(), updatedAt: new Date() })
    .where(eq(retailOrderDetailsTable.orderId, orderId));

  logger.info({ orderId, ref: ref.trim() }, "FIN-114: buyer payment ref submitted");
  res.json({ success: true });
});

// ── POST /api/retail/checkout ─────────────────────────────────────────────────
// Multi-supplier atomic checkout. Cart → one order per supplier group.
router.post("/retail/checkout", async (req, res): Promise<void> => {
  if (!ENABLE_CART) { res.status(503).json({ error: "Cart checkout not available" }); return; }

  const {
    shippingName, shippingAddressLine1, shippingAddressLine2,
    shippingCity, shippingDepartment, shippingPostalCode,
    email, phone,
    notificationChannel = "EMAIL",
    lang = "es",
  } = req.body as Record<string, any>;

  if (!shippingName || !shippingAddressLine1 || !shippingCity || !shippingDepartment || !email) {
    sendError(res, 400, "Missing required shipping fields"); return;
  }

  // Resolve buyer
  let buyerId: number;
  let buyerProfileId: number | null = null;

  if (req.userId) {
    buyerId = req.userId;
    const [bp] = await db.select({ id: retailBuyerProfilesTable.id })
      .from(retailBuyerProfilesTable).where(eq(retailBuyerProfilesTable.userId, buyerId));
    buyerProfileId = bp?.id ?? null;
  } else {
    // Guest checkout — always create a fresh user row for this email to avoid
    // silently attaching the order to an existing account (email impersonation).
    // Existing accounts should authenticate first; guest orders get a unique row.
    const [newUser] = await db.insert(usersTable)
      .values({ email, passwordHash: "RETAIL_GUEST", role: "BUYER", tokenVersion: 0 })
      .returning({ id: usersTable.id });
    buyerId = newUser.id;
  }

  // Find cart
  const sessionId = req.cookies?.["fincava_cart_session"] as string | undefined;
  let cartId: number | null = null;

  if (req.userId) {
    const [cart] = await db.select({ id: retailCartsTable.id })
      .from(retailCartsTable)
      .where(sql`retail_buyer_profile_id = (SELECT id FROM retail_buyer_profiles WHERE user_id = ${req.userId} LIMIT 1)`);
    cartId = cart?.id ?? null;
  }
  if (!cartId && sessionId) {
    const [cart] = await db.select({ id: retailCartsTable.id })
      .from(retailCartsTable).where(eq(retailCartsTable.sessionId, sessionId));
    cartId = cart?.id ?? null;
  }
  if (!cartId) { sendError(res, 409, "Cart not found or empty"); return; }

  // Load cart items
  const cartItems = await db
    .select({
      itemId:    retailCartItemsTable.id,
      productId: retailCartItemsTable.productId,
      quantity:  retailCartItemsTable.quantity,
    })
    .from(retailCartItemsTable)
    .where(eq(retailCartItemsTable.cartId, cartId));

  if (cartItems.length === 0) { sendError(res, 409, "Cart is empty"); return; }

  // ── Phase A — Pre-flight (no DB writes) ──────────────────────────────────────
  interface ValidatedItem {
    productId:   number;
    productName: string;
    supplierId:  number;
    supplierName: string;
    nequiPhone:  string;
    quantity:    number;
    unitLabel:   string | null;
    priceCents:  number;
  }
  const validated: ValidatedItem[] = [];

  for (const item of cartItems) {
    const [product] = await db
      .select({
        id:               productsTable.id,
        name:             productsTable.name,
        retailEnabled:    productsTable.retailEnabled,
        productStatus:    productsTable.productStatus,
        supplierId:       productsTable.supplierId,
        retailPriceCop:   productsTable.retailPriceCop,
        retailStockUnits: productsTable.retailStockUnits,
        retailUnitLabel:  productsTable.retailUnitLabel,
      })
      .from(productsTable).where(eq(productsTable.id, item.productId));

    if (!product || !product.retailEnabled || product.productStatus !== "active") {
      sendError(res, 409, `Product ${item.productId} is not available`); return;
    }
    if (product.supplierId === null) {
      sendError(res, 409, `Product "${product.name}" cannot be purchased: payment routing unavailable.`); return;
    }
    if (product.retailStockUnits === null || product.retailStockUnits < item.quantity) {
      sendError(res, 409, `Insufficient stock for "${product.name}".`); return;
    }

    // Load supplier
    const [supplier] = await db
      .select({ id: suppliersTable.id, name: suppliersTable.nombreCompleto, status: suppliersTable.sellableStatus })
      .from(suppliersTable).where(eq(suppliersTable.id, product.supplierId));

    if (!supplier || supplier.status !== "PUBLISHED") {
      sendError(res, 409, `Supplier not available for "${product.name}".`); return;
    }

    // Load Nequi
    const [spm] = await db
      .select({ nequiPhone: supplierPaymentMethodsTable.nequiPhone })
      .from(supplierPaymentMethodsTable)
      .where(eq(supplierPaymentMethodsTable.supplierId, product.supplierId));

    if (!spm?.nequiPhone) {
      sendError(res, 409, `Payment method unavailable for "${product.name}".`); return;
    }

    validated.push({
      productId:    product.id,
      productName:  product.name,
      supplierId:   product.supplierId,
      supplierName: supplier.name ?? "Productor",
      nequiPhone:   spm.nequiPhone,
      quantity:     item.quantity,
      unitLabel:    product.retailUnitLabel ?? null,
      priceCents:   product.retailPriceCop ?? 0,
    });
  }

  // Shipping rate lookup (shared across all groups — single destination department)
  // Use NACIONAL origin to match the national rate row; avoids returning a
  // wrong rate when multiple origin zones share the same destination.
  let shippingRateCents = 0;
  const [zone] = await db.select({ rateCents: retailShippingZonesTable.rateCents })
    .from(retailShippingZonesTable)
    .where(and(
      eq(retailShippingZonesTable.originDepartment, "NACIONAL"),
      eq(retailShippingZonesTable.destinationDepartment, shippingDepartment),
      eq(retailShippingZonesTable.weightClass, "SMALL"),
      eq(retailShippingZonesTable.active, true),
    ));
  if (zone) {
    shippingRateCents = zone.rateCents;
  } else {
    // Fallback to NACIONAL→NACIONAL flat rate
    const [national] = await db.select({ rateCents: retailShippingZonesTable.rateCents })
      .from(retailShippingZonesTable)
      .where(and(
        eq(retailShippingZonesTable.originDepartment, "NACIONAL"),
        eq(retailShippingZonesTable.destinationDepartment, "NACIONAL"),
        eq(retailShippingZonesTable.weightClass, "SMALL"),
      ));
    shippingRateCents = national?.rateCents ?? 1500000;
  }

  // Group by supplier
  const groups = new Map<number, ValidatedItem[]>();
  for (const v of validated) {
    if (!groups.has(v.supplierId)) groups.set(v.supplierId, []);
    groups.get(v.supplierId)!.push(v);
  }

  // ── Phase B — Atomic write ────────────────────────────────────────────────────
  const checkoutBatchRef = randomUUID();
  const createdOrders: Array<{
    orderId: number;
    supplierId: number;
    supplierName: string;
    totalCents: number;
    nequiPhone: string;
    accessToken: string;
    items: Array<{ productName: string; quantity: number; unitLabel: string | null; priceCents: number }>;
  }> = [];

  try {
    await db.transaction(async (tx) => {
      // SELECT FOR UPDATE on all products
      for (const v of validated) {
        const locked = await tx.execute(sql`
          SELECT retail_stock_units FROM products WHERE id = ${v.productId} FOR UPDATE
        `);
        const row = (locked as any).rows?.[0] ?? (locked as any)[0];
        const stock = Number(row?.retail_stock_units ?? 0);
        if (stock < v.quantity) {
          throw new Error(`Insufficient stock for "${v.productName}" (final check).`);
        }
      }

      const slaVoidDeadline = new Date(Date.now() + SLA_DAYS * 24 * 60 * 60 * 1000);

      for (const [supplierId, items] of groups) {
        const supplierName = items[0]!.supplierName;
        const nequiPhone   = items[0]!.nequiPhone;
        const itemTotal    = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
        const orderTotal   = itemTotal + shippingRateCents;

        // a. Insert order
        const [order] = await tx.insert(ordersTable).values({
          buyerId,
          supplierId,
          status: "INQUIRY",
          totalUSD: 0,
          incoterm: "FOB",
          channel: "retail",
          checkoutBatchRef,
        }).returning({ id: ordersTable.id });

        // b. Insert retail_order_details
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = sha256(rawToken);

        await tx.insert(retailOrderDetailsTable).values({
          orderId: order.id,
          retailBuyerProfileId: buyerProfileId,
          shippingName,
          shippingAddressLine1,
          shippingAddressLine2: shippingAddressLine2 ?? null,
          shippingCity,
          shippingDepartment,
          shippingPostalCode: shippingPostalCode ?? null,
          shippingRateCents,
          currency: "COP",
          orderAccessTokenHash: tokenHash,
        });

        // c. Insert retail_order_items
        for (const item of items) {
          await tx.insert(retailOrderItemsTable).values({
            orderId:                   order.id,
            productId:                 item.productId,
            supplierId:                item.supplierId,
            unitQuantity:              item.quantity,
            unitLabelSnapshot:         item.unitLabel,
            productPriceCentsSnapshot: item.priceCents,
            nequiPhoneSnapshot:        item.nequiPhone,
          });
        }

        // d. Insert payment transaction
        await tx.insert(retailPaymentTransactionsTable).values({
          orderId:    order.id,
          gateway:    "WOMPI",
          instrumentType: "NEQUI",
          settlesImmediately: true,
          status:     "PENDING",
          amountCents: orderTotal,
          currency:   "COP",
          slaVoidDeadline,
          initiatedBy: "BUYER",
        });

        // e. Decrement stock
        for (const item of items) {
          await tx.execute(sql`
            UPDATE products SET retail_stock_units = retail_stock_units - ${item.quantity}
            WHERE id = ${item.productId}
          `);
        }

        createdOrders.push({
          orderId:      order.id,
          supplierId,
          supplierName,
          totalCents:   orderTotal,
          nequiPhone,
          accessToken:  rawToken,
          items: items.map(i => ({
            productName: i.productName,
            quantity:    i.quantity,
            unitLabel:   i.unitLabel,
            priceCents:  i.priceCents,
          })),
        });
      }
    });
  } catch (err: any) {
    logger.warn({ err, cartId }, "retail/checkout: transaction failed");
    const msg = err.message ?? "Checkout failed";
    sendError(res, msg.includes("stock") || msg.includes("unavailable") ? 409 : 500, msg);
    return;
  }

  // ── Phase C — Post-commit ─────────────────────────────────────────────────────
  // Delete cart (fire-and-forget — not transactional)
  void db.delete(retailCartsTable).where(eq(retailCartsTable.id, cartId)).catch(err => {
    logger.warn({ err, cartId }, "checkout: failed to delete cart after commit");
  });
  // Clear session cookie
  res.clearCookie("fincava_cart_session");

  res.status(201).json({
    data: {
      checkoutBatchRef,
      orders: createdOrders.map(o => ({
        orderId:      o.orderId,
        supplierId:   o.supplierId,
        supplierName: o.supplierName,
        totalCents:   o.totalCents,
        nequiPhone:   o.nequiPhone,
        accessToken:  o.accessToken,
        items:        o.items,
      })),
    },
  });

  // Fire-and-forget emails
  void Promise.resolve().then(async () => {
    try {
      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:5173");

      const [profile] = await db.select({ firstName: profilesTable.firstName })
        .from(profilesTable).where(eq(profilesTable.userId, buyerId));
      const buyerFirstName = profile?.firstName ?? email.split("@")[0]!;

      for (const o of createdOrders) {
        const firstItem = o.items[0];
        if (!firstItem) continue;
        const orderStatusUrl = `${appBaseUrl}/tienda/orders/${o.orderId}?token=${o.accessToken}`;

        const confirmContent = retailOrderConfirmationEmail({
          buyerFirstName,
          farmerName:        o.supplierName,
          productName:       firstItem.productName,
          quantity:          firstItem.quantity,
          unitLabel:         firstItem.unitLabel ?? null,
          totalCents:        o.totalCents,
          shippingDepartment,
          orderId:           o.orderId,
          orderStatusUrl,
          lang,
        });
        await sendEmail({ to: email, subject: confirmContent.subject, html: confirmContent.html, text: confirmContent.text });
      }
    } catch (err) {
      logger.warn({ err }, "checkout: post-commit emails failed");
    }
  });
});

export { requireAuth };
export default router;
