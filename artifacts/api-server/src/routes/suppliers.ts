import { Router, type IRouter } from "express";
import { eq, and, ilike, inArray } from "drizzle-orm";
import { db, companiesTable, productsTable, certificationsTable, reviewsTable, profilesTable, usersTable } from "@workspace/db";
import {
  ListSuppliersQueryParams,
  GetSupplierParams,
  UpdateSupplierProfileBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function buildSupplierResponse(company: any) {
  const products = await db.select().from(productsTable)
    .where(and(eq(productsTable.companyId, company.id), eq(productsTable.active, true)));

  const certs = await db.select().from(certificationsTable)
    .where(eq(certificationsTable.companyId, company.id));

  const productIds = products.map(p => p.id);
  const reviews = productIds.length > 0
    ? await db.select().from(reviewsTable).where(inArray(reviewsTable.productId, productIds))
    : [];

  const categories = [...new Set(products.map(p => p.category))];
  const certTypes = certs.map(c => c.type);
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  return {
    id: company.id,
    userId: company.userId,
    name: company.name,
    type: company.type,
    country: company.country,
    region: company.region ?? null,
    description: company.description,
    logoUrl: company.logoUrl ?? null,
    website: company.website ?? null,
    verified: company.verified,
    certifications: certTypes,
    productCategories: categories,
    productCount: products.length,
    avgRating,
    trustScore: company.trustScore ?? null,
    subscriptionTier: company.subscriptionTier ?? null,
    responseTimeHours: company.responseTimeHours ?? null,
    memberSince: company.createdAt.toISOString(),
  };
}

router.get("/suppliers", async (req, res): Promise<void> => {
  const parsed = ListSuppliersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { companyType, region, search } = parsed.data;

  let companiesQuery = db.select().from(companiesTable).$dynamic();
  
  const conditions: any[] = [];
  if (companyType) conditions.push(eq(companiesTable.type, companyType as any));
  if (region) conditions.push(ilike(companiesTable.region, `%${region}%`));
  if (search) conditions.push(ilike(companiesTable.name, `%${search}%`));

  if (conditions.length > 0) {
    companiesQuery = companiesQuery.where(and(...conditions)) as any;
  }

  const companies = await companiesQuery;
  const suppliers = await Promise.all(companies.map(buildSupplierResponse));
  res.json(suppliers);
});

router.get("/suppliers/:id", async (req, res): Promise<void> => {
  const params = GetSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, params.data.id));
  if (!company) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  const base = await buildSupplierResponse(company);

  const products = await db.select({
    product: productsTable,
    company: companiesTable,
  })
    .from(productsTable)
    .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
    .where(and(eq(productsTable.companyId, company.id), eq(productsTable.active, true)));

  const certs = await db.select().from(certificationsTable)
    .where(eq(certificationsTable.companyId, company.id));

  const supplierProductIds = products.map(r => r.product.id);
  const reviews = supplierProductIds.length > 0
    ? await db
        .select({ review: reviewsTable, profile: profilesTable })
        .from(reviewsTable)
        .leftJoin(profilesTable, eq(reviewsTable.authorId, profilesTable.userId))
        .where(inArray(reviewsTable.productId, supplierProductIds))
    : [];

  const certDetails = certs.map(c => ({
    id: c.id,
    type: c.type,
    issuer: c.issuer,
    expiryDate: c.expiryDate?.toISOString() ?? null,
    documentUrl: c.documentUrl ?? null,
    verified: c.verified,
  }));

  const productList = products.map(r => ({
    id: r.product.id,
    companyId: r.product.companyId,
    supplierName: company.name,
    supplierVerified: company.verified,
    supplierLogoUrl: company.logoUrl ?? null,
    name: r.product.name,
    category: r.product.category,
    subCategory: r.product.subCategory ?? null,
    description: r.product.description,
    origin: r.product.origin,
    altitude: r.product.altitude ?? null,
    process: r.product.process ?? null,
    variety: r.product.variety ?? null,
    minOrderKg: r.product.minOrderKg,
    maxOrderKg: r.product.maxOrderKg ?? null,
    pricePerKgUSD: r.product.pricePerKgUSD,
    availableKg: r.product.availableKg,
    harvestSeason: r.product.harvestSeason ?? null,
    images: r.product.images ?? [],
    certifications: r.product.certifications ?? [],
    cupping: r.product.cupping ?? null,
    active: r.product.active,
    featured: r.product.featured,
    avgRating: null,
    reviewCount: 0,
    createdAt: r.product.createdAt.toISOString(),
  }));

  res.json({
    ...base,
    certificationDetails: certDetails,
    products: productList,
    reviews: [],
    originStory: company.originStory ?? null,
    farmerName: company.farmerName ?? null,
  });
});

router.get("/supplier/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) {
    res.status(404).json({ error: "Supplier profile not found" });
    return;
  }

  const base = await buildSupplierResponse(company);
  const certs = await db.select().from(certificationsTable).where(eq(certificationsTable.companyId, company.id));

  res.json({
    ...base,
    certificationDetails: certs.map(c => ({
      id: c.id, type: c.type, issuer: c.issuer,
      expiryDate: c.expiryDate?.toISOString() ?? null,
      documentUrl: c.documentUrl ?? null, verified: c.verified,
    })),
    products: [],
    reviews: [],
    originStory: company.originStory ?? null,
    farmerName: company.farmerName ?? null,
  });
});

router.patch("/supplier/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) {
    res.status(404).json({ error: "Supplier profile not found" });
    return;
  }

  const parsed = UpdateSupplierProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: any = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.country !== undefined) updateData.country = parsed.data.country;
  if (parsed.data.region !== undefined) updateData.region = parsed.data.region;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.logoUrl !== undefined) updateData.logoUrl = parsed.data.logoUrl;
  if (parsed.data.website !== undefined) updateData.website = parsed.data.website;
  if (parsed.data.originStory !== undefined) updateData.originStory = parsed.data.originStory;
  if (parsed.data.farmerName !== undefined) updateData.farmerName = parsed.data.farmerName;

  const [updated] = await db.update(companiesTable).set(updateData)
    .where(eq(companiesTable.id, company.id)).returning();

  const base = await buildSupplierResponse(updated);
  const certs = await db.select().from(certificationsTable).where(eq(certificationsTable.companyId, updated.id));

  res.json({
    ...base,
    certificationDetails: certs.map(c => ({
      id: c.id, type: c.type, issuer: c.issuer,
      expiryDate: c.expiryDate?.toISOString() ?? null,
      documentUrl: c.documentUrl ?? null, verified: c.verified,
    })),
    products: [],
    reviews: [],
    originStory: updated.originStory ?? null,
    farmerName: updated.farmerName ?? null,
  });
});

// Origin stories
router.get("/origin-stories", async (_req, res): Promise<void> => {
  const companies = await db.select().from(companiesTable)
    .where(eq(companiesTable.verified, true))
    .limit(6);

  const stories = companies
    .filter(c => c.farmerName || c.originStory)
    .map(c => ({
      id: c.id,
      supplierId: c.id,
      supplierName: c.name,
      farmerName: c.farmerName ?? c.name,
      region: c.region ?? c.country,
      product: "Coffee",
      elevation: null,
      story: c.originStory ?? `${c.name} is a ${c.type.toLowerCase()} based in ${c.region ?? c.country}, producing premium Colombian agricultural goods for international markets.`,
      imageUrl: c.logoUrl ?? null,
      logoUrl: c.logoUrl ?? null,
    }));

  res.json(stories);
});

export default router;
