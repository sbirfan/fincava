import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, sql, desc, asc, inArray } from "drizzle-orm";
import { db, productsTable, companiesTable, reviewsTable, profilesTable, usersTable, originStoriesTable, productPlaceholdersTable, suppliersTable, sellableStatusEnum } from "@workspace/db";
import {
  ListProductsQueryParams,
  CreateProductBody,
  UpdateProductBody,
  UpdateProductParams,
  DeleteProductParams,
  GetProductParams,
  GetSimilarProductsParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { requireAdmin } from "../middleware/admin";
import { logger } from "../lib/logger";
import { z } from "zod";

const BooleanFilters = z.object({
  smallholder: z.coerce.boolean().optional(),
  womenLed: z.coerce.boolean().optional(),
  directTrade: z.coerce.boolean().optional(),
  organic: z.coerce.boolean().optional(),
});

// Derived from sellableStatusEnum — no raw string literals.
// Only products whose supplier has reached SELLABLE or PUBLISHED appear on the public marketplace.
const GRADUATED_STATUSES = sellableStatusEnum.enumValues.filter(
  (v): v is "SELLABLE" | "PUBLISHED" => v === "SELLABLE" || v === "PUBLISHED",
);

const router: IRouter = Router();

async function buildProductResponse(product: any, company: any) {
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.productId, product.id));
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  return {
    id: product.id,
    companyId: product.companyId,
    supplierName: company?.name ?? "",
    supplierVerified: company?.verified ?? false,
    supplierLogoUrl: company?.logoUrl ?? null,
    name: product.name,
    category: product.category,
    subCategory: product.subCategory ?? null,
    description: product.description,
    origin: product.origin,
    altitude: product.altitude ?? null,
    process: product.process ?? null,
    variety: product.variety ?? null,
    minOrderKg: product.minOrderKg,
    maxOrderKg: product.maxOrderKg ?? null,
    pricePerKgUSD: product.pricePerKgUSD,
    availableKg: product.availableKg,
    harvestSeason: product.harvestSeason ?? null,
    images: product.images ?? [],
    certifications: product.certifications ?? [],
    cupping: product.cupping ?? null,
    active: product.active,
    featured: product.featured,
    avgRating,
    reviewCount: reviews.length,
    createdAt: product.createdAt.toISOString(),
    smallholder: product.smallholder,
    womenLed: product.womenLed,
    directTrade: product.directTrade,
    climateResilient: product.climateResilient,
    organic: product.organic,
    familiesSupported: product.familiesSupported,
    farmerName: product.farmerName ?? null,
    farmName: product.farmName ?? null,
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    category, origin, search, sort,
    minPrice, maxPrice, minCupping,
    featured, supplierId,
    page = 1, limit = 20,
  } = parsed.data;

  // Hard cap — no Zod schema change per spec.
  const cappedLimit = Math.min(limit, 50);

  const boolParsed = BooleanFilters.safeParse(req.query);
  if (!boolParsed.success) {
    res.status(400).json({ error: boolParsed.error.message });
    return;
  }
  const filterSmallholder = boolParsed.data.smallholder === true;
  const filterWomenLed = boolParsed.data.womenLed === true;
  const filterDirectTrade = boolParsed.data.directTrade === true;
  const filterOrganic = boolParsed.data.organic === true;

  // INNER JOIN on suppliersTable via the direct products.supplierId column.
  // Products with supplierId = null (no verified supplier link) are excluded.
  // GRADUATED_STATUSES uses sellableStatusEnum.enumValues — no raw string literals.
  let query = db.select({
    product: productsTable,
    company: companiesTable,
  })
    .from(productsTable)
    .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
    .innerJoin(suppliersTable, eq(productsTable.supplierId, suppliersTable.id))
    .$dynamic();

  const conditions = [
    eq(productsTable.active, true),
    inArray(suppliersTable.sellableStatus, GRADUATED_STATUSES),
  ];

  if (category) conditions.push(eq(productsTable.category, category as any));
  if (origin) conditions.push(ilike(productsTable.origin, `%${origin}%`));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (minPrice != null) conditions.push(gte(productsTable.pricePerKgUSD, minPrice));
  if (maxPrice != null) conditions.push(lte(productsTable.pricePerKgUSD, maxPrice));
  if (minCupping != null) conditions.push(gte(sql`COALESCE(${productsTable.cupping}, 0)`, minCupping));
  if (featured != null) conditions.push(eq(productsTable.featured, featured));
  if (supplierId != null) conditions.push(eq(productsTable.companyId, supplierId));
  if (filterSmallholder) conditions.push(eq(productsTable.smallholder, true));
  if (filterWomenLed) conditions.push(eq(productsTable.womenLed, true));
  if (filterDirectTrade) conditions.push(eq(productsTable.directTrade, true));
  if (filterOrganic) conditions.push(eq(productsTable.organic, true));

  query = query.where(and(...conditions)) as any;

  if (sort === "price_asc") {
    query = query.orderBy(asc(productsTable.pricePerKgUSD)) as any;
  } else if (sort === "price_desc") {
    query = query.orderBy(desc(productsTable.pricePerKgUSD)) as any;
  } else {
    query = query.orderBy(desc(productsTable.createdAt)) as any;
  }

  const offset = (page - 1) * cappedLimit;

  // countQuery carries its own INNER JOIN — conditions reference suppliersTable.
  const countQuery = db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(productsTable)
    .innerJoin(suppliersTable, eq(productsTable.supplierId, suppliersTable.id))
    .where(and(...conditions));

  const [rows, [{ count }]] = await Promise.all([
    (query as any).limit(cappedLimit).offset(offset),
    countQuery,
  ]);

  const products = await Promise.all(rows.map((r: any) => buildProductResponse(r.product, r.company)));

  res.json({
    products,
    total: count,
    page,
    limit: cappedLimit,
    totalPages: Math.ceil(count / cappedLimit),
  });
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const rows = await db.select({
    product: productsTable,
    company: companiesTable,
  })
    .from(productsTable)
    .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
    .where(and(eq(productsTable.featured, true), eq(productsTable.active, true)))
    .limit(8)
    .orderBy(desc(productsTable.createdAt));

  const products = await Promise.all(rows.map((r) => buildProductResponse(r.product, r.company)));
  res.json(products);
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select({
    product: productsTable,
    company: companiesTable,
  })
    .from(productsTable)
    .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
    .where(eq(productsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const base = await buildProductResponse(row.product, row.company);
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.productId, row.product.id));

  const authorIds = [...new Set(reviews.map(r => r.authorId))];
  const profiles = authorIds.length > 0
    ? await db.select().from(profilesTable).where(inArray(profilesTable.userId, authorIds))
    : [];
  const profileMap = new Map(profiles.map(p => [p.userId, p]));

  const reviewsWithAuthor = reviews.map(r => {
    const profile = profileMap.get(r.authorId);
    return {
      id: r.id,
      authorId: r.authorId,
      authorName: profile ? `${profile.firstName} ${profile.lastName}` : "Anonymous",
      authorCountry: profile?.country ?? null,
      productId: r.productId,
      rating: r.rating,
      comment: r.comment ?? null,
      verified: r.verified,
      createdAt: r.createdAt.toISOString(),
    };
  });

  const [story] = await db.select().from(originStoriesTable)
    .where(eq(originStoriesTable.productId, row.product.id));

  res.json({
    ...base,
    supplierDescription: row.company?.description ?? null,
    supplierCountry: row.company?.country ?? null,
    supplierRegion: row.company?.region ?? null,
    supplierWebsite: row.company?.website ?? null,
    supplierMemberSince: row.company?.createdAt?.toISOString() ?? null,
    supplierCertifications: [],
    originStory: row.product.originStory ?? null,
    farmerName: row.product.farmerName ?? null,
    farmName: row.product.farmName ?? null,
    reviews: reviewsWithAuthor,
    story: story ? {
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
    } : null,
  });
});

router.get("/products/:id/similar", async (req, res): Promise<void> => {
  const params = GetSimilarProductsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const rows = await db.select({
    product: productsTable,
    company: companiesTable,
  })
    .from(productsTable)
    .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
    .where(
      and(
        eq(productsTable.category, product.category),
        eq(productsTable.active, true),
        sql`${productsTable.id} != ${product.id}`,
      )
    )
    .limit(4);

  const products = await Promise.all(rows.map((r) => buildProductResponse(r.product, r.company)));
  res.json(products);
});

// Supplier product management
// H-8: All /supplier/products routes require SUPPLIER role.
// NOTE: supplierId is not set on product insert because suppliersTable has no userId/companyId FK
// in Phase 1. The bridge column (company_id → suppliers) is tracked as a separate arch gap.
router.get("/supplier/products", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const userRole = req.userRole;
  if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
    res.status(403).json({ error: "Only supplier accounts can manage products" });
    return;
  }
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) {
    res.json([]);
    return;
  }

  const rows = await db.select({
    product: productsTable,
    company: companiesTable,
  })
    .from(productsTable)
    .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
    .where(eq(productsTable.companyId, company.id))
    .orderBy(desc(productsTable.createdAt));

  const products = await Promise.all(rows.map((r) => buildProductResponse(r.product, r.company)));
  res.json(products);
});

const VALID_PRODUCT_CATEGORIES = ["COFFEE", "CACAO", "AVOCADO", "EXOTIC_FRUIT", "SUPERFOOD", "PROCESSED", "TEXTILE", "OTHER"] as const;

router.post("/supplier/products", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
      res.status(403).json({ error: "Only supplier accounts can manage products" });
      return;
    }
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
    if (!company) {
      res.status(400).json({ error: "Supplier company not found" });
      return;
    }

    const parsed = CreateProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    if (!(VALID_PRODUCT_CATEGORIES as readonly string[]).includes(parsed.data.category)) {
      res.status(400).json({
        error: `Invalid category. Must be one of: ${VALID_PRODUCT_CATEGORIES.join(", ")}`,
      });
      return;
    }

    const [product] = await db.insert(productsTable).values({
      companyId: company.id,
      name: parsed.data.name,
      category: parsed.data.category as any,
      subCategory: parsed.data.subCategory ?? null,
      description: parsed.data.description,
      origin: parsed.data.origin,
      altitude: parsed.data.altitude ?? null,
      process: parsed.data.process ?? null,
      variety: parsed.data.variety ?? null,
      minOrderKg: parsed.data.minOrderKg,
      maxOrderKg: parsed.data.maxOrderKg ?? null,
      pricePerKgUSD: parsed.data.pricePerKgUSD,
      availableKg: parsed.data.availableKg,
      harvestSeason: parsed.data.harvestSeason ?? null,
      images: parsed.data.images ?? [],
      certifications: parsed.data.certifications ?? [],
      cupping: parsed.data.cupping ?? null,
      originStory: parsed.data.originStory ?? null,
      farmerName: parsed.data.farmerName ?? null,
    }).returning();

    const result = await buildProductResponse(product, company);
    res.status(201).json(result);
  } catch (err: any) {
    logger.error({ err }, "Create product error");
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.patch("/supplier/products/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const userRole = req.userRole;
  if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
    res.status(403).json({ error: "Only supplier accounts can manage products" });
    return;
  }
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) {
    res.status(400).json({ error: "Supplier company not found" });
    return;
  }

  const [product] = await db.select().from(productsTable)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.companyId, company.id)));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: any = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.origin !== undefined) updateData.origin = parsed.data.origin;
  if (parsed.data.pricePerKgUSD !== undefined) updateData.pricePerKgUSD = parsed.data.pricePerKgUSD;
  if (parsed.data.availableKg !== undefined) updateData.availableKg = parsed.data.availableKg;
  if (parsed.data.minOrderKg !== undefined) updateData.minOrderKg = parsed.data.minOrderKg;
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
  if (parsed.data.featured !== undefined) updateData.featured = parsed.data.featured;
  if (parsed.data.images !== undefined) updateData.images = parsed.data.images;
  if (parsed.data.certifications !== undefined) updateData.certifications = parsed.data.certifications;
  if (parsed.data.cupping !== undefined) updateData.cupping = parsed.data.cupping;

  const [updated] = await db.update(productsTable).set(updateData)
    .where(eq(productsTable.id, params.data.id)).returning();

  const result = await buildProductResponse(updated, company);
  res.json(result);
});

router.delete("/supplier/products/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const userRole = req.userRole;
  if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
    res.status(403).json({ error: "Only supplier accounts can manage products" });
    return;
  }
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) {
    res.status(400).json({ error: "Supplier company not found" });
    return;
  }

  const [product] = await db.select().from(productsTable)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.companyId, company.id)));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
  res.sendStatus(204);
});

// ── GET /api/admin/ingestion/suppliers/:id/product-placeholders ───────────────
// Returns product placeholders for an ingested supplier.
// Each placeholder includes a computed `status` field:
//   "UNVERIFIED_INFERRED" — dataOrigin="inferred" AND verificationStatus="unverified"
//   "VERIFIED"            — verificationStatus="verified"
//   otherwise             — verificationStatus value passed through verbatim
router.get(
  "/admin/ingestion/suppliers/:id/product-placeholders",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) {
      res.status(400).json({ error: "Invalid supplier id" });
      return;
    }

    const rows = await db
      .select()
      .from(productPlaceholdersTable)
      .where(eq(productPlaceholdersTable.supplierId, supplierId));

    const placeholders = rows.map((p) => ({
      ...p,
      status:
        p.dataOrigin === "inferred" && p.verificationStatus === "unverified"
          ? "UNVERIFIED_INFERRED"
          : p.verificationStatus === "verified"
            ? "VERIFIED"
            : p.verificationStatus,
    }));

    res.json({ placeholders });
  },
);

export default router;
