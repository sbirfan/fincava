import { Router, type IRouter, type Request } from "express";
import rateLimit from "express-rate-limit";
import { eq, and, gte, lte, ilike, sql, desc, asc, inArray, isNotNull } from "drizzle-orm";
import { db, productsTable, companiesTable, reviewsTable, profilesTable, usersTable, originStoriesTable, productPlaceholdersTable, suppliersTable, sellableStatusEnum, companySupplierLinksTable, supplierPaymentMethodsTable } from "@workspace/db";
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
import { computePlatformTrustScore } from "../services/trust-score-service";
import { z } from "zod";
import { sendError } from "../lib/response";
import { PRODUCT_TYPE_SCHEMAS, PRODUCT_TYPE_SCHEMA_VERSION, getSchemaForType, getZodSchemaForType } from "../lib/product-type-schemas";
import { enrichProduct } from "../services/product-enrichment-service";

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
    productTypeKey: product.productTypeKey ?? null,
    typeAttributes: product.typeAttributes ?? null,
    productStatus: product.productStatus,
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.message);
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
    sendError(res, 400, boolParsed.error.message);
    return;
  }
  const filterSmallholder = boolParsed.data.smallholder === true;
  const filterWomenLed = boolParsed.data.womenLed === true;
  const filterDirectTrade = boolParsed.data.directTrade === true;
  const filterOrganic = boolParsed.data.organic === true;

  // LEFT JOIN on suppliersTable via the direct products.supplierId column.
  // Products appear when either:
  //   (a) supplierId is set and supplier has a graduated sellableStatus (SELLABLE/PUBLISHED), OR
  //   (b) supplierId is NULL (legacy/seed products) and the linked company is verified.
  // GRADUATED_STATUSES uses sellableStatusEnum.enumValues — no raw string literals.
  let query = db.select({
    product: productsTable,
    company: companiesTable,
  })
    .from(productsTable)
    .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
    .leftJoin(suppliersTable, eq(productsTable.supplierId, suppliersTable.id))
    .$dynamic();

  const conditions = [
    eq(productsTable.active, true),
    eq(productsTable.productStatus, "active"),
    sql`(
      (${productsTable.supplierId} IS NOT NULL AND ${suppliersTable.sellableStatus}::text = ANY(ARRAY[${sql.join(GRADUATED_STATUSES.map(s => sql`${s}`), sql`, `)}]))
      OR
      (${productsTable.supplierId} IS NULL AND ${companiesTable.verified} = true)
    )`,
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

  // countQuery mirrors the main query's LEFT JOINs so conditions reference suppliersTable correctly.
  const countQuery = db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(productsTable)
    .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
    .leftJoin(suppliersTable, eq(productsTable.supplierId, suppliersTable.id))
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
    .where(and(eq(productsTable.featured, true), eq(productsTable.active, true), eq(productsTable.productStatus, "active")))
    .limit(8)
    .orderBy(desc(productsTable.createdAt));

  const products = await Promise.all(rows.map((r) => buildProductResponse(r.product, r.company)));
  res.json(products);
});

router.get("/products/type-schemas", (_req, res): void => {
  res.set("Cache-Control", "public, max-age=3600");
  res.json({ version: PRODUCT_TYPE_SCHEMA_VERSION, schemas: Object.values(PRODUCT_TYPE_SCHEMAS) });
});

router.get("/products/type-schemas/:typeKey", (req, res): void => {
  const schema = getSchemaForType(req.params.typeKey);
  if (!schema) {
    sendError(res, 404, `No schema found for type '${req.params.typeKey}'`);
    return;
  }
  res.set("Cache-Control", "public, max-age=3600");
  res.json({ version: PRODUCT_TYPE_SCHEMA_VERSION, schema });
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.message);
    return;
  }

  const [row] = await db.select({
    product: productsTable,
    company: companiesTable,
  })
    .from(productsTable)
    .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.productStatus, "active")));

  if (!row) {
    sendError(res, 404, "Product not found");
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

  // Origin stories are now farm-level. Look up via supplier who owns this product.
  // Legacy rows with productId still work via the supplierId→products join.
  const [story] = row.product.supplierId
    ? await db
        .select({
          farmerName:  originStoriesTable.farmerName,
          farmerPhoto: originStoriesTable.farmerPhoto,
          farmName:    originStoriesTable.farmName,
          region:      originStoriesTable.region,
          elevation:   originStoriesTable.elevation,
          farmSizeHa:  originStoriesTable.farmSizeHa,
          yearsFarming: originStoriesTable.yearsFarming,
          story:       originStoriesTable.story,
          challenges:  originStoriesTable.challenges,
          impact:      originStoriesTable.impact,
          images:      originStoriesTable.images,
        })
        .from(originStoriesTable)
        .where(
          and(
            eq(originStoriesTable.supplierId, row.product.supplierId),
            eq(originStoriesTable.published, true),
          ),
        )
        .orderBy(originStoriesTable.id)
        .limit(1)
    : [undefined];

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
    sendError(res, 400, params.error.message);
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) {
    sendError(res, 404, "Product not found");
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
        eq(productsTable.productStatus, "active"),
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
    sendError(res, 403, "Only supplier accounts can manage products");
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
      sendError(res, 403, "Only supplier accounts can manage products");
      return;
    }
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
    if (!company) {
      sendError(res, 400, "Supplier company not found");
      return;
    }

    const parsed = CreateProductBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.message);
      return;
    }

    if (!(VALID_PRODUCT_CATEGORIES as readonly string[]).includes(parsed.data.category)) {
      sendError(res, 400, `Invalid category. Must be one of: ${VALID_PRODUCT_CATEGORIES.join(", ")}`);
      return;
    }

    const incomingTypeKey: string | undefined = typeof req.body.productTypeKey === "string" ? req.body.productTypeKey : undefined;
    const incomingTypeAttributes: unknown = req.body.typeAttributes;

    let validatedTypeAttributes: Record<string, unknown> | null = null;
    if (incomingTypeKey !== undefined && incomingTypeAttributes !== undefined) {
      const typeSchema = getZodSchemaForType(incomingTypeKey);
      if (typeSchema) {
        const attrResult = typeSchema.safeParse(incomingTypeAttributes);
        if (!attrResult.success) {
          sendError(res, 400, `Invalid typeAttributes for '${incomingTypeKey}': ${attrResult.error.message}`);
          return;
        }
        validatedTypeAttributes = attrResult.data as Record<string, unknown>;
      }
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
      productTypeKey: incomingTypeKey ?? null,
      typeAttributes: validatedTypeAttributes,
      productStatus: "draft",
    }).returning();

    const result = await buildProductResponse(product, company);
    res.status(201).json(result);

    // Fire-and-forget: recompute platform trust score when a new product is listed.
    // The productsCatalog dimension scales from 0→100 over 3+ products — each new
    // listing may meaningfully change the score, especially in the 0–3 product range.
    setImmediate(() => {
      void computePlatformTrustScore(company.id).catch((err) =>
        logger.warn(
          { err, companyId: company.id },
          "trust-score: recompute on product create failed (non-fatal)",
        )
      );
    });
  } catch (err: any) {
    logger.error({ err }, "Create product error");
    sendError(res, 500, "Failed to create product");
  }
});

router.patch("/supplier/products/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const userRole = req.userRole;
  if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
    sendError(res, 403, "Only supplier accounts can manage products");
    return;
  }
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.message);
    return;
  }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) {
    sendError(res, 400, "Supplier company not found");
    return;
  }

  const [product] = await db.select().from(productsTable)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.companyId, company.id)));
  if (!product) {
    sendError(res, 404, "Product not found");
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.message);
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

  // V2: productTypeKey, typeAttributes, productStatus
  const incomingTypeKey: string | undefined = typeof req.body.productTypeKey === "string" ? req.body.productTypeKey : undefined;
  const incomingTypeAttributes: unknown = req.body.typeAttributes;
  const incomingStatus: unknown = req.body.productStatus;

  if (incomingStatus !== undefined) {
    if (incomingStatus !== "pending_review") {
      sendError(res, 400, "Suppliers may only set productStatus to 'pending_review'");
      return;
    }
    updateData.productStatus = "pending_review";
  }

  if (incomingTypeKey !== undefined) {
    const typeKeyChanged = incomingTypeKey !== product.productTypeKey;
    updateData.productTypeKey = incomingTypeKey;
    if (typeKeyChanged && product.productStatus === "active") {
      updateData.productStatus = "pending_review";
    }
  }

  if (incomingTypeKey !== undefined && incomingTypeAttributes !== undefined) {
    const typeSchema = getZodSchemaForType(incomingTypeKey);
    if (typeSchema) {
      const attrResult = typeSchema.safeParse(incomingTypeAttributes);
      if (!attrResult.success) {
        sendError(res, 400, `Invalid typeAttributes for '${incomingTypeKey}': ${attrResult.error.message}`);
        return;
      }
      updateData.typeAttributes = attrResult.data;
    } else {
      updateData.typeAttributes = null;
    }
  }

  const [updated] = await db.update(productsTable).set(updateData)
    .where(eq(productsTable.id, params.data.id)).returning();

  const result = await buildProductResponse(updated, company);
  res.json(result);

  // G4.4: Catalog changes (active toggle) affect the productsCatalog dimension — recompute.
  if (parsed.data.active !== undefined) {
    setImmediate(() => {
      void computePlatformTrustScore(company.id).catch((err) =>
        logger.warn(
          { err, companyId: company.id },
          "trust-score: recompute on product update failed (non-fatal)",
        )
      );
    });
  }
});

router.delete("/supplier/products/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const userRole = req.userRole;
  if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
    sendError(res, 403, "Only supplier accounts can manage products");
    return;
  }
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.message);
    return;
  }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) {
    sendError(res, 400, "Supplier company not found");
    return;
  }

  const [product] = await db.select().from(productsTable)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.companyId, company.id)));
  if (!product) {
    sendError(res, 404, "Product not found");
    return;
  }

  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
  res.sendStatus(204);
});

// ── POST /api/supplier/products/:id/enrich ────────────────────────────────────
// Rate limit: 20 calls per 24h per user (Claude calls are expensive).
const enrichLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `enrich:u:${req.userId ?? req.ip}`,
  message: { error: "AI enrichment limit reached. Try again tomorrow." },
});

router.post(
  "/supplier/products/:id/enrich",
  requireAuth,
  enrichLimiter,
  async (req, res): Promise<void> => {
    const userRole = req.userRole;
    if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
      sendError(res, 403, "Only supplier accounts can enrich products");
      return;
    }

    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) { sendError(res, 400, "Invalid id"); return; }

    const force = req.body?.force === true;

    // Fetch product for ownership + status checks.
    let productForCheck: { id: number; productStatus: string; companyId: number } | undefined;

    if (userRole === "SUPPLIER") {
      const [company] = await db
        .select({ id: companiesTable.id })
        .from(companiesTable)
        .where(eq(companiesTable.userId, req.userId));
      if (!company) { sendError(res, 400, "Supplier company not found"); return; }

      const [product] = await db
        .select({ id: productsTable.id, productStatus: productsTable.productStatus, companyId: productsTable.companyId })
        .from(productsTable)
        .where(and(eq(productsTable.id, productId), eq(productsTable.companyId, company.id)));
      if (!product) { sendError(res, 404, "Product not found"); return; }
      productForCheck = product;
    } else {
      // ADMIN: no ownership restriction, but still fetch for status check.
      const [product] = await db
        .select({ id: productsTable.id, productStatus: productsTable.productStatus, companyId: productsTable.companyId })
        .from(productsTable)
        .where(eq(productsTable.id, productId));
      if (!product) { sendError(res, 404, "Product not found"); return; }
      productForCheck = product;
    }

    // Allowlist: only draft/pending_review may be enriched without force.
    // Active products require force:true to prevent accidental overwrites on live listings.
    if (productForCheck.productStatus !== "draft" && productForCheck.productStatus !== "pending_review" && !force) {
      sendError(res, 409, "Product is active — pass force:true to re-enrich after attribute changes");
      return;
    }

    const result = await enrichProduct(productId, { force });

    if (!result.success) {
      res.status(422).json({ success: false, error: result.error, cached: result.cached });
      return;
    }

    res.json({ success: true, enrichment: result.enrichment });
  },
);

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
      sendError(res, 400, "Invalid supplier id");
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

// ── Admin: supplier candidates for a product ─────────────────────────────────
router.get(
  "/admin/products/:id/supplier-candidates",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) { sendError(res, 400, "Invalid id"); return; }

    const [product] = await db
      .select({ companyId: productsTable.companyId })
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    if (!product) { sendError(res, 404, "Product not found"); return; }

    const candidates = await db
      .select({
        supplierId: suppliersTable.id,
        supplierName: suppliersTable.nombreCompleto,
        sellableStatus: suppliersTable.sellableStatus,
      })
      .from(companySupplierLinksTable)
      .innerJoin(suppliersTable, eq(suppliersTable.id, companySupplierLinksTable.supplierId))
      .where(eq(companySupplierLinksTable.companyId, product.companyId));

    res.json({ candidates });
  },
);

// ── Admin: link a supplier to a product ──────────────────────────────────────
router.patch(
  "/admin/products/:id/link-supplier",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) { sendError(res, 400, "Invalid id"); return; }

    const supplierId = Number(req.body.supplierId);
    if (isNaN(supplierId) || supplierId <= 0) {
      sendError(res, 400, "supplierId must be a positive integer");
      return;
    }

    const [product] = await db
      .select({ id: productsTable.id, companyId: productsTable.companyId })
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    if (!product) { sendError(res, 404, "Product not found"); return; }

    const [link] = await db
      .select({ id: companySupplierLinksTable.id })
      .from(companySupplierLinksTable)
      .where(
        and(
          eq(companySupplierLinksTable.companyId, product.companyId),
          eq(companySupplierLinksTable.supplierId, supplierId),
        ),
      );
    if (!link) {
      sendError(res, 409, "Supplier not linked to this company");
      return;
    }

    const [updated] = await db
      .update(productsTable)
      .set({ supplierId })
      .where(eq(productsTable.id, productId))
      .returning();

    res.json({ product: updated });
  },
);

// ── GET /api/admin/products ───────────────────────────────────────────────────
// Admin product list with optional productStatus filter and pagination.
const AdminProductsQuery = z.object({
  productStatus: z.enum(["draft", "pending_review", "active"]).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

router.get(
  "/admin/products",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const parsed = AdminProductsQuery.safeParse(req.query);
    if (!parsed.success) { sendError(res, 400, parsed.error.message); return; }
    const { productStatus, page, pageSize } = parsed.data;
    const offset = (page - 1) * pageSize;

    let query = db
      .select({
        id:                 productsTable.id,
        name:               productsTable.name,
        category:           productsTable.category,
        productStatus:      productsTable.productStatus,
        productTypeKey:     productsTable.productTypeKey,
        wholesaleEnabled:   productsTable.wholesaleEnabled,
        retailEnabled:      productsTable.retailEnabled,
        wholesaleApprovedAt: productsTable.wholesaleApprovedAt,
        retailApprovedAt:   productsTable.retailApprovedAt,
        supplierId:         productsTable.supplierId,
        companyId:          productsTable.companyId,
        createdAt:          productsTable.createdAt,
      })
      .from(productsTable)
      .$dynamic();

    const conditions = productStatus ? [eq(productsTable.productStatus, productStatus)] : [];
    if (conditions.length) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const countQuery = db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(productsTable)
      .where(conditions.length ? and(...conditions) : undefined);

    const [products, [{ count }]] = await Promise.all([
      query.orderBy(desc(productsTable.createdAt)).limit(pageSize).offset(offset),
      countQuery,
    ]);

    res.json({ products, total: count, page, pageSize, totalPages: Math.ceil(count / pageSize) });
  },
);

// ── Required-for-channel validation helper ────────────────────────────────────
// Returns the list of required field keys that are missing for the given channel.
// Only runs when the product has a productTypeKey; untyped products skip schema validation.
function checkRequiredForChannel(
  product: Record<string, unknown>,
  channel: "wholesale" | "retail",
): string[] {
  const typeKey = product.productTypeKey as string | null | undefined;
  if (!typeKey) return [];
  const schema = getSchemaForType(typeKey);
  if (!schema) return [];

  const allFields = [...schema.coreFields, ...schema.typeAttributes];
  const fieldMap = new Map(allFields.map((f) => [f.key, f]));
  const missing: string[] = [];

  for (const fieldKey of schema.channels[channel].requiredFields) {
    const fieldDef = fieldMap.get(fieldKey);
    let val: unknown;
    if (fieldDef) {
      if (fieldDef.storageLocation === "products_column") {
        if (!fieldDef.columnName) {
          logger.warn({ fieldKey, typeKey }, "checkRequiredForChannel: products_column field missing columnName in schema");
          missing.push(fieldKey);
          continue;
        }
        val = product[fieldDef.columnName];
      } else {
        const attrs = (product.typeAttributes as Record<string, unknown>) ?? {};
        val = attrs[fieldKey];
      }
    } else {
      val = product[fieldKey];
    }
    if (val === null || val === undefined || val === "") missing.push(fieldKey);
  }
  return missing;
}

// ── Admin: approve wholesale or retail channel ────────────────────────────────
const ApproveProductBody = z.object({
  channel: z.enum(["wholesale", "retail"]),
  note: z.string().optional(),
});

router.post(
  "/admin/products/:id/approve",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) { sendError(res, 400, "Invalid id"); return; }

    const parsed = ApproveProductBody.safeParse(req.body);
    if (!parsed.success) { sendError(res, 400, parsed.error.message); return; }
    const { channel } = parsed.data;

    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    if (!product) { sendError(res, 404, "Product not found"); return; }

    if (channel === "wholesale") {
      // Idempotency guard — prevent re-approval from overwriting the original approval timestamp.
      if (product.wholesaleEnabled) {
        sendError(res, 409, "Product is already wholesale approved");
        return;
      }

      // Wholesale preflight: minimum bars before a product goes live.
      if (!product.supplierId) {
        sendError(res, 409, "Product must be linked to a supplier before wholesale approval");
        return;
      }
      const [wholesaleSupplier] = await db
        .select({ sellableStatus: suppliersTable.sellableStatus })
        .from(suppliersTable)
        .where(eq(suppliersTable.id, product.supplierId));
      if (!wholesaleSupplier) {
        sendError(res, 409, "Linked supplier record not found — data integrity issue, re-link the supplier");
        return;
      }
      if (!GRADUATED_STATUSES.includes(wholesaleSupplier.sellableStatus as any)) {
        sendError(res, 409, "Supplier must be SELLABLE or PUBLISHED before wholesale approval");
        return;
      }
      if (!product.images || product.images.length < 1) {
        sendError(res, 409, "At least one product image required for wholesale approval");
        return;
      }

      const missingWholesale = checkRequiredForChannel(product as Record<string, unknown>, "wholesale");
      if (missingWholesale.length > 0) {
        sendError(res, 409, `Missing required wholesale fields: ${missingWholesale.join(", ")}`);
        return;
      }

      const [updated] = await db
        .update(productsTable)
        .set({
          wholesaleEnabled: true,
          wholesaleApprovedAt: new Date(),
          productStatus: "active",
        })
        .where(eq(productsTable.id, productId))
        .returning();
      res.json({ product: updated });
      return;
    }

    // channel === "retail" — full pre-flight
    if (!product.wholesaleApprovedAt) {
      sendError(res, 409, "Wholesale must be approved before retail");
      return;
    }

    if (product.productStatus === "pending_review") {
      sendError(res, 409, "Product is pending review — resolve the pending type change before retail approval");
      return;
    }

    const missingRetail = checkRequiredForChannel(product as Record<string, unknown>, "retail");
    if (missingRetail.length > 0) {
      sendError(res, 409, `Missing required retail fields: ${missingRetail.join(", ")}`);
      return;
    }

    if (!product.supplierId) {
      const candidates = await db
        .select({
          supplierId: suppliersTable.id,
          supplierName: suppliersTable.nombreCompleto,
          sellableStatus: suppliersTable.sellableStatus,
        })
        .from(companySupplierLinksTable)
        .innerJoin(suppliersTable, eq(suppliersTable.id, companySupplierLinksTable.supplierId))
        .where(eq(companySupplierLinksTable.companyId, product.companyId));
      res.status(409).json({ error: "supplier_link_required", candidates });
      return;
    }

    const [[paymentMethod], [supplier]] = await Promise.all([
      db.select({ nequiPhone: supplierPaymentMethodsTable.nequiPhone })
        .from(supplierPaymentMethodsTable)
        .where(eq(supplierPaymentMethodsTable.supplierId, product.supplierId)),
      db.select({ sellableStatus: suppliersTable.sellableStatus })
        .from(suppliersTable)
        .where(eq(suppliersTable.id, product.supplierId)),
    ]);
    if (!paymentMethod?.nequiPhone) {
      sendError(res, 409, "No Nequi payment method for this supplier");
      return;
    }
    if (supplier?.sellableStatus !== "PUBLISHED") {
      sendError(res, 409, "Supplier is not PUBLISHED");
      return;
    }

    if (!product.retailPriceCop || product.retailPriceCop <= 0) {
      sendError(res, 409, "Retail price not set");
      return;
    }
    if (!product.retailStockUnits || product.retailStockUnits <= 0) {
      sendError(res, 409, "Stock units not set");
      return;
    }
    if (!product.retailUnitLabel) {
      sendError(res, 409, "Unit label not set");
      return;
    }
    if (!product.retailUnitWeightG) {
      sendError(res, 409, "Unit weight not set");
      return;
    }
    if (!product.images || product.images.length < 1) {
      sendError(res, 409, "At least one product image required");
      return;
    }

    // Origin story: non-blocking — warn only
    const [story] = await db
      .select({ id: originStoriesTable.id })
      .from(originStoriesTable)
      .where(
        and(
          eq(originStoriesTable.supplierId, product.supplierId),
          eq(originStoriesTable.published, true),
          isNotNull(originStoriesTable.farmerApprovedAt),
        ),
      );
    const warnings = story ? [] : ["No approved origin story — product approved without one"];

    const [updated] = await db
      .update(productsTable)
      .set({ retailEnabled: true, retailApprovedAt: new Date(), productStatus: "active" })
      .where(eq(productsTable.id, productId))
      .returning();

    res.json({ product: updated, warnings });
  },
);

export default router;
