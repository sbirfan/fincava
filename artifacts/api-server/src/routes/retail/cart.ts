// Retail cart endpoints — guest and authenticated cart management
import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  db,
  productsTable,
  retailCartsTable,
  retailCartItemsTable,
} from "@workspace/db";
import { ENABLE_CART } from "../../lib/flags";
import { sendError } from "../../lib/response";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

const GUEST_TTL_MS  = 24 * 60 * 60 * 1000;       // 24 h
const AUTH_TTL_MS   = 7  * 24 * 60 * 60 * 1000;   // 7 days
const COOKIE_NAME   = "fincava_cart_session";

function cartDisabled(res: any): boolean {
  if (!ENABLE_CART) {
    res.status(503).json({ error: "Cart not available" });
    return true;
  }
  return false;
}

// ── Cart helper: find or create ───────────────────────────────────────────────

async function resolveCart(req: any, res: any): Promise<{ cartId: number; isGuest: boolean } | null> {
  const userId: number | undefined = req.userId;
  const sessionId: string | undefined = req.cookies?.[COOKIE_NAME];

  const now = new Date();

  if (userId) {
    // Authenticated path — find by userId via retail_buyer_profile or session merge
    let [cart] = await db
      .select({ id: retailCartsTable.id, expiresAt: retailCartsTable.expiresAt, sessionId: retailCartsTable.sessionId })
      .from(retailCartsTable)
      .where(sql`retail_buyer_profile_id IS NOT NULL AND retail_buyer_profile_id = (
        SELECT id FROM retail_buyer_profiles WHERE user_id = ${userId} LIMIT 1
      )`);

    // Merge guest cart if cookie present
    if (sessionId && !cart) {
      const [guestCart] = await db
        .select({ id: retailCartsTable.id })
        .from(retailCartsTable)
        .where(and(eq(retailCartsTable.sessionId, sessionId)));

      if (guestCart) {
        // No auth profile yet — promote guest cart to session-less auth cart by
        // keeping it as-is; clear cookie so next request creates auth cart.
        // Full merge deferred until buyer profile exists.
        res.clearCookie(COOKIE_NAME);
        return { cartId: guestCart.id, isGuest: false };
      }
    }

    if (cart) {
      if (cart.expiresAt < now) {
        await db.delete(retailCartsTable).where(eq(retailCartsTable.id, cart.id));
        cart = undefined as any;
      } else {
        // Refresh TTL
        await db.update(retailCartsTable)
          .set({ expiresAt: new Date(now.getTime() + AUTH_TTL_MS), updatedAt: now })
          .where(eq(retailCartsTable.id, cart.id));
        return { cartId: cart.id, isGuest: false };
      }
    }

    // Create new auth cart (no profile yet — use session_id as temporary identity)
    const newSessionId = randomUUID();
    const [newCart] = await db.insert(retailCartsTable).values({
      sessionId: newSessionId,
      expiresAt: new Date(now.getTime() + AUTH_TTL_MS),
    }).returning({ id: retailCartsTable.id });
    res.cookie(COOKIE_NAME, newSessionId, { httpOnly: true, sameSite: "strict", path: "/api/retail" });
    return { cartId: newCart.id, isGuest: false };
  }

  // Guest path
  if (sessionId) {
    const [cart] = await db
      .select({ id: retailCartsTable.id, expiresAt: retailCartsTable.expiresAt })
      .from(retailCartsTable)
      .where(eq(retailCartsTable.sessionId, sessionId));

    if (cart) {
      if (cart.expiresAt < now) {
        await db.delete(retailCartsTable).where(eq(retailCartsTable.id, cart.id));
        // Fall through to create new
      } else {
        await db.update(retailCartsTable)
          .set({ expiresAt: new Date(now.getTime() + GUEST_TTL_MS), updatedAt: now })
          .where(eq(retailCartsTable.id, cart.id));
        return { cartId: cart.id, isGuest: true };
      }
    }
  }

  // Create new guest cart
  const newSessionId = randomUUID();
  const [newCart] = await db.insert(retailCartsTable).values({
    sessionId: newSessionId,
    expiresAt: new Date(now.getTime() + GUEST_TTL_MS),
  }).returning({ id: retailCartsTable.id });
  res.cookie(COOKIE_NAME, newSessionId, { httpOnly: true, sameSite: "strict", path: "/api/retail" });
  return { cartId: newCart.id, isGuest: true };
}

// ── Cart read helper ──────────────────────────────────────────────────────────

async function readCartItems(cartId: number) {
  const rows = await db
    .select({
      itemId:               retailCartItemsTable.id,
      productId:            retailCartItemsTable.productId,
      quantity:             retailCartItemsTable.quantity,
      unitLabelSnapshot:    retailCartItemsTable.unitLabelSnapshot,
      priceCopSnapshot:     retailCartItemsTable.priceCopSnapshot,
      maxPerOrderSnapshot:  retailCartItemsTable.maxPerOrderSnapshot,
      addedAt:              retailCartItemsTable.addedAt,
      currentPriceCop:      productsTable.retailPriceCop,
      currentStock:         productsTable.retailStockUnits,
      productName:          productsTable.name,
    })
    .from(retailCartItemsTable)
    .innerJoin(productsTable, eq(retailCartItemsTable.productId, productsTable.id))
    .where(eq(retailCartItemsTable.cartId, cartId));

  return rows.map(r => ({
    itemId:              r.itemId,
    productId:           r.productId,
    productName:         r.productName,
    quantity:            r.quantity,
    unitLabelSnapshot:   r.unitLabelSnapshot,
    priceCopSnapshot:    r.priceCopSnapshot,
    maxPerOrderSnapshot: r.maxPerOrderSnapshot,
    addedAt:             r.addedAt,
    priceChanged:        r.currentPriceCop !== null && r.currentPriceCop !== r.priceCopSnapshot,
    insufficientStock:   r.currentStock !== null && r.currentStock < r.quantity,
  }));
}

// ── GET /api/retail/cart ──────────────────────────────────────────────────────
router.get("/retail/cart", async (req, res): Promise<void> => {
  if (cartDisabled(res)) return;
  try {
    const resolved = await resolveCart(req, res);
    if (!resolved) return;
    const items = await readCartItems(resolved.cartId);
    res.json({ data: { cartId: resolved.cartId, items } });
  } catch (err) {
    logger.error({ err }, "GET /api/retail/cart failed");
    sendError(res, 500, "Cart unavailable");
  }
});

// ── POST /api/retail/cart/items ───────────────────────────────────────────────
router.post("/retail/cart/items", async (req, res): Promise<void> => {
  if (cartDisabled(res)) return;
  const { productId, quantity } = req.body as { productId?: number; quantity?: number };
  if (!productId || !quantity || quantity < 1) {
    sendError(res, 400, "productId and quantity (>= 1) are required"); return;
  }

  try {
    const [product] = await db
      .select({
        id:               productsTable.id,
        retailEnabled:    productsTable.retailEnabled,
        productStatus:    productsTable.productStatus,
        retailPriceCop:   productsTable.retailPriceCop,
        retailStockUnits: productsTable.retailStockUnits,
        retailUnitLabel:  productsTable.retailUnitLabel,
        retailMaxPerOrder: productsTable.retailMaxPerOrder,
      })
      .from(productsTable)
      .where(eq(productsTable.id, productId));

    if (!product) { sendError(res, 404, "Product not found"); return; }
    if (!product.retailEnabled || product.productStatus !== "active") {
      sendError(res, 409, "Product not available for retail"); return;
    }
    if (product.retailStockUnits === null || product.retailStockUnits < quantity) {
      sendError(res, 409, "Insufficient stock"); return;
    }
    const maxPerOrder = product.retailMaxPerOrder ?? 10;
    if (quantity > maxPerOrder) {
      sendError(res, 409, `Quantity exceeds max per order (${maxPerOrder})`); return;
    }

    const resolved = await resolveCart(req, res);
    if (!resolved) return;

    await db
      .insert(retailCartItemsTable)
      .values({
        cartId:              resolved.cartId,
        productId,
        quantity,
        unitLabelSnapshot:   product.retailUnitLabel ?? "",
        priceCopSnapshot:    product.retailPriceCop ?? 0,
        maxPerOrderSnapshot: maxPerOrder,
      })
      .onConflictDoUpdate({
        target: [retailCartItemsTable.cartId, retailCartItemsTable.productId],
        set: { quantity, priceCopSnapshot: product.retailPriceCop ?? 0 },
      });

    await db.update(retailCartsTable)
      .set({ updatedAt: new Date() })
      .where(eq(retailCartsTable.id, resolved.cartId));

    const items = await readCartItems(resolved.cartId);
    res.json({ data: { cartId: resolved.cartId, items } });
  } catch (err) {
    logger.error({ err }, "POST /api/retail/cart/items failed");
    sendError(res, 500, "Failed to add item");
  }
});

// ── PATCH /api/retail/cart/items/:itemId ──────────────────────────────────────
router.patch("/retail/cart/items/:itemId", async (req, res): Promise<void> => {
  if (cartDisabled(res)) return;
  const itemId = Number(req.params.itemId);
  const { quantity } = req.body as { quantity?: number };
  if (!quantity || quantity < 1) {
    sendError(res, 400, "quantity must be >= 1 (use DELETE to remove)"); return;
  }

  try {
    const [item] = await db
      .select({
        id:                  retailCartItemsTable.id,
        cartId:              retailCartItemsTable.cartId,
        maxPerOrderSnapshot: retailCartItemsTable.maxPerOrderSnapshot,
        productId:           retailCartItemsTable.productId,
      })
      .from(retailCartItemsTable)
      .where(eq(retailCartItemsTable.id, itemId));

    if (!item) { sendError(res, 404, "Cart item not found"); return; }

    // Re-validate stock
    const [product] = await db
      .select({ retailStockUnits: productsTable.retailStockUnits })
      .from(productsTable)
      .where(eq(productsTable.id, item.productId));

    if (product && product.retailStockUnits !== null && product.retailStockUnits < quantity) {
      sendError(res, 409, "Insufficient stock"); return;
    }

    const capped = Math.min(quantity, item.maxPerOrderSnapshot);
    await db.update(retailCartItemsTable)
      .set({ quantity: capped })
      .where(eq(retailCartItemsTable.id, itemId));

    const items = await readCartItems(item.cartId);
    res.json({ data: { cartId: item.cartId, items } });
  } catch (err) {
    logger.error({ err }, "PATCH /api/retail/cart/items/:itemId failed");
    sendError(res, 500, "Failed to update item");
  }
});

// ── DELETE /api/retail/cart/items/:itemId ─────────────────────────────────────
router.delete("/retail/cart/items/:itemId", async (req, res): Promise<void> => {
  if (cartDisabled(res)) return;
  const itemId = Number(req.params.itemId);

  try {
    const [item] = await db
      .select({ cartId: retailCartItemsTable.cartId })
      .from(retailCartItemsTable)
      .where(eq(retailCartItemsTable.id, itemId));

    if (!item) { sendError(res, 404, "Cart item not found"); return; }

    await db.delete(retailCartItemsTable).where(eq(retailCartItemsTable.id, itemId));

    const items = await readCartItems(item.cartId);
    res.json({ data: { cartId: item.cartId, items } });
  } catch (err) {
    logger.error({ err }, "DELETE /api/retail/cart/items/:itemId failed");
    sendError(res, 500, "Failed to remove item");
  }
});

export default router;
