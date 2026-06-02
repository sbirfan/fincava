// Retail catalog endpoints — public, no auth required.
// All queries filter: retail_enabled = true AND active = true AND sellable_status = 'PUBLISHED'

import { Router, type IRouter } from "express";
import { eq, and, gt, desc, ne, sql } from "drizzle-orm";
import {
  db,
  productsTable,
  suppliersTable,
  originStoriesTable,
  interactionsTable,
  buyerVisibilitySignalsTable,
  retailShippingZonesTable,
  retailWaitlistsTable,
} from "@workspace/db";
import { sendError } from "../../lib/response";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

// ── Shared filter builder ──────────────────────────────────────────────────────
function retailProductBase() {
  return db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      category: productsTable.category,
      retailPriceCop: productsTable.retailPriceCop,
      retailStockUnits: productsTable.retailStockUnits,
      retailUnitLabel: productsTable.retailUnitLabel,
      retailUnitWeightG: productsTable.retailUnitWeightG,
      retailMaxPerOrder: productsTable.retailMaxPerOrder,
      nextWindowStart: productsTable.nextWindowStart,
      nextWindowEnd: productsTable.nextWindowEnd,
      images: productsTable.images,
      certifications: productsTable.certifications,
      organic: productsTable.organic,
      womenLed: productsTable.womenLed,
      smallholder: productsTable.smallholder,
      supplierId: suppliersTable.id,
      supplierName: suppliersTable.nombreCompleto,
      municipio: suppliersTable.municipio,
      department: suppliersTable.department,
    })
    .from(productsTable)
    .innerJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
    .where(
      and(
        eq(productsTable.retailEnabled, true),
        eq(productsTable.active, true),
        eq(suppliersTable.sellableStatus, "PUBLISHED"),
      )
    );
}

function stockState(units: number | null, windowStart: Date | null) {
  return units && units > 0 ? "IN_STOCK" : "HARVEST_WAIT";
}

// ── GET /api/retail/products ───────────────────────────────────────────────────
router.get("/retail/products", async (req, res): Promise<void> => {
  const {
    category, region, inStock, womenLed, organic,
    page = "1", limit = "20",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  try {
    const conditions: ReturnType<typeof eq>[] = [
      eq(productsTable.retailEnabled, true),
      eq(productsTable.active, true),
      eq(suppliersTable.sellableStatus, "PUBLISHED"),
    ];
    if (category) conditions.push(eq(productsTable.category, category as any));
    if (region) conditions.push(eq(suppliersTable.department, region));
    if (womenLed === "true") conditions.push(eq(productsTable.womenLed, true));
    if (organic === "true") conditions.push(eq(productsTable.organic, true));
    if (inStock === "true") conditions.push(gt(productsTable.retailStockUnits, 0));

    const rows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        category: productsTable.category,
        retailPriceCop: productsTable.retailPriceCop,
        retailStockUnits: productsTable.retailStockUnits,
        retailUnitLabel: productsTable.retailUnitLabel,
        retailUnitWeightG: productsTable.retailUnitWeightG,
        nextWindowStart: productsTable.nextWindowStart,
        nextWindowEnd: productsTable.nextWindowEnd,
        images: productsTable.images,
        organic: productsTable.organic,
        womenLed: productsTable.womenLed,
        smallholder: productsTable.smallholder,
        supplierId: suppliersTable.id,
        supplierName: suppliersTable.nombreCompleto,
        municipio: suppliersTable.municipio,
        department: suppliersTable.department,
      })
      .from(productsTable)
      .innerJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
      .where(and(...conditions))
      .orderBy(desc(productsTable.retailStockUnits), desc(productsTable.id))
      .limit(limitNum)
      .offset(offset);

    const result = rows.map(r => ({
      ...r,
      nextWindowStart: r.nextWindowStart?.toISOString() ?? null,
      nextWindowEnd: r.nextWindowEnd?.toISOString() ?? null,
      stockState: stockState(r.retailStockUnits, r.nextWindowStart),
    }));

    res.json({ data: result, page: pageNum, limit: limitNum });
  } catch (err) {
    logger.error({ err }, "retail/products: query failed");
    sendError(res, 500, "Failed to load catalog");
  }
});

// ── GET /api/retail/products/:id ──────────────────────────────────────────────
router.get("/retail/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { sendError(res, 400, "Invalid id"); return; }

  try {
    const [product] = await db
      .select()
      .from(productsTable)
      .innerJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
      .where(
        and(
          eq(productsTable.id, id),
          eq(productsTable.retailEnabled, true),
          eq(productsTable.active, true),
          eq(suppliersTable.sellableStatus, "PUBLISHED"),
        )
      );

    if (!product) { sendError(res, 404, "Product not found"); return; }

    const p = product.products;
    const s = product.suppliers;

    // Origin story (published only)
    const [story] = await db
      .select()
      .from(originStoriesTable)
      .where(and(eq(originStoriesTable.supplierId, s.id), eq(originStoriesTable.published, true)));

    // Verification signal — most recent FARM_VISIT interaction
    // interactionsTable.actor is a text field (e.g. "FIELD_OFFICER:userId")
    const [visit] = await db
      .select({
        visitedAt: interactionsTable.createdAt,
        actor: interactionsTable.actor,
      })
      .from(interactionsTable)
      .where(
        and(
          eq(interactionsTable.supplierId, s.id),
          eq(interactionsTable.interactionType, "FARM_VISIT"),
        )
      )
      .orderBy(desc(interactionsTable.createdAt))
      .limit(1);

    // Compliance badges
    const badges = await db
      .select({ requirementCode: buyerVisibilitySignalsTable.requirementCode, badgeLabel: buyerVisibilitySignalsTable.badgeLabel })
      .from(buyerVisibilitySignalsTable)
      .where(
        and(
          eq(buyerVisibilitySignalsTable.supplierId, s.id),
          eq(buyerVisibilitySignalsTable.visible, true),
        )
      );

    // Waitlist count
    const [{ waitlistCount }] = await db
      .select({ waitlistCount: sql<number>`count(*)::int` })
      .from(retailWaitlistsTable)
      .where(
        and(
          eq(retailWaitlistsTable.productId, id),
          sql`exited_at IS NULL`,
        )
      );

    res.json({
      data: {
        ...p,
        nextWindowStart: p.nextWindowStart?.toISOString() ?? null,
        nextWindowEnd: p.nextWindowEnd?.toISOString() ?? null,
        lastReplenishedAt: p.lastReplenishedAt?.toISOString() ?? null,
        stockState: stockState(p.retailStockUnits, p.nextWindowStart),
        supplier: {
          id: s.id,
          name: s.nombreCompleto,
          municipio: s.municipio,
          department: s.department,
          womenLed: p.womenLed,
          organic: p.organic,
        },
        originStory: story ? {
          farmerName: story.farmerName,
          farmerPhoto: story.farmerPhoto,
          farmName: story.farmName,
          region: story.region,
          story: story.story,
          farmerVoiceEs: story.farmerVoiceEs,
          farmerVoiceEn: story.farmerVoiceEn,
          buyerCopyEs: story.buyerCopyEs,
          buyerCopyEn: story.buyerCopyEn,
          farmerApprovedAt: story.farmerApprovedAt?.toISOString() ?? null,
        } : null,
        verificationSignal: visit ? {
          visitedAt: visit.visitedAt.toISOString(),
          officerName: visit.actor ?? "Field Officer",
        } : null,
        complianceBadges: badges,
        waitlistCount: waitlistCount ?? 0,
      },
    });
  } catch (err) {
    logger.error({ err, id }, "retail/products/:id: query failed");
    sendError(res, 500, "Failed to load product");
  }
});

// ── GET /api/retail/products/:id/shipping-estimate ───────────────────────────
router.get("/retail/products/:id/shipping-estimate", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { sendError(res, 400, "Invalid id"); return; }

  const { department, weightClass = "SMALL" } = req.query as { department?: string; weightClass?: string };
  if (!department) { sendError(res, 400, "department required"); return; }

  try {
    // Get supplier's department as origin
    const [product] = await db
      .select({ department: suppliersTable.department })
      .from(productsTable)
      .innerJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
      .where(eq(productsTable.id, id));

    if (!product) { sendError(res, 404, "Product not found"); return; }
    const origin = product.department ?? "Huila";

    // Look up zone rate
    let [zone] = await db
      .select({ rateCents: retailShippingZonesTable.rateCents, currency: retailShippingZonesTable.currency })
      .from(retailShippingZonesTable)
      .where(
        and(
          eq(retailShippingZonesTable.originDepartment, origin),
          eq(retailShippingZonesTable.destinationDepartment, department),
          eq(retailShippingZonesTable.weightClass, weightClass),
          eq(retailShippingZonesTable.active, true),
        )
      );

    // Fall back to NACIONAL sentinel rate
    if (!zone) {
      [zone] = await db
        .select({ rateCents: retailShippingZonesTable.rateCents, currency: retailShippingZonesTable.currency })
        .from(retailShippingZonesTable)
        .where(
          and(
            eq(retailShippingZonesTable.originDepartment, "NACIONAL"),
            eq(retailShippingZonesTable.destinationDepartment, "NACIONAL"),
            eq(retailShippingZonesTable.weightClass, weightClass),
          )
        );
    }

    res.json({
      data: {
        rateCents: zone?.rateCents ?? 1500000,
        currency: zone?.currency ?? "COP",
        estimated: !zone,
      },
    });
  } catch (err) {
    logger.error({ err, id }, "retail/shipping-estimate: query failed");
    sendError(res, 500, "Failed to get shipping estimate");
  }
});

// ── GET /api/retail/products/:id/similar ──────────────────────────────────────
router.get("/retail/products/:id/similar", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { sendError(res, 400, "Invalid id"); return; }

  const { category, region, womenLed, organic } = req.query as Record<string, string>;

  try {
    const conditions: ReturnType<typeof eq>[] = [
      eq(productsTable.retailEnabled, true),
      eq(productsTable.active, true),
      eq(suppliersTable.sellableStatus, "PUBLISHED"),
      ne(productsTable.id, id),
      gt(productsTable.retailStockUnits, 0),
    ];
    if (category) conditions.push(eq(productsTable.category, category as any));
    if (region) conditions.push(eq(suppliersTable.department, region));
    if (womenLed === "true") conditions.push(eq(productsTable.womenLed, true));
    if (organic === "true") conditions.push(eq(productsTable.organic, true));

    const rows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        category: productsTable.category,
        retailPriceCop: productsTable.retailPriceCop,
        retailStockUnits: productsTable.retailStockUnits,
        retailUnitLabel: productsTable.retailUnitLabel,
        images: productsTable.images,
        supplierName: suppliersTable.nombreCompleto,
        municipio: suppliersTable.municipio,
        department: suppliersTable.department,
        organic: productsTable.organic,
        womenLed: productsTable.womenLed,
      })
      .from(productsTable)
      .innerJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
      .where(and(...conditions))
      .orderBy(desc(productsTable.retailStockUnits))
      .limit(5);

    // Build a human-readable match reason
    const result = rows.map(r => {
      const reasons: string[] = [];
      if (category && r.category === category) reasons.push(category.toLowerCase());
      if (region && r.department === region) reasons.push(`de ${r.department}`);
      if (organic === "true" && r.organic) reasons.push("orgánica");
      if (womenLed === "true" && r.womenLed) reasons.push("liderada por mujeres");
      return { ...r, matchReason: reasons.length ? `También ${reasons.join(", ")}` : "Producto similar" };
    });

    res.json({ data: result });
  } catch (err) {
    logger.error({ err, id }, "retail/similar: query failed");
    sendError(res, 500, "Failed to load similar products");
  }
});

export default router;
