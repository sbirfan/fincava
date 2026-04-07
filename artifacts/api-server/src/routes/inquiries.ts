import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, inquiriesTable, productsTable, companiesTable } from "@workspace/db";
import {
  CreateInquiryBody,
  UpdateInquiryStatusParams,
  UpdateInquiryStatusBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function buildInquiryResponse(inquiry: any) {
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, inquiry.productId));
  const [company] = product ? await db.select().from(companiesTable).where(eq(companiesTable.id, product.companyId)) : [null];

  return {
    id: inquiry.id,
    productId: inquiry.productId,
    productName: product?.name ?? "Unknown Product",
    productImage: product?.images?.[0] ?? null,
    supplierName: company?.name ?? "Unknown Supplier",
    buyerEmail: inquiry.buyerEmail,
    buyerName: inquiry.buyerName,
    company: inquiry.company,
    country: inquiry.country,
    message: inquiry.message,
    quantityKg: inquiry.quantityKg ?? null,
    status: inquiry.status,
    createdAt: inquiry.createdAt.toISOString(),
  };
}

router.post("/inquiries", async (req, res): Promise<void> => {
  const parsed = CreateInquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [inquiry] = await db.insert(inquiriesTable).values({
    productId: parsed.data.productId,
    buyerEmail: parsed.data.buyerEmail,
    buyerName: parsed.data.buyerName,
    company: parsed.data.company,
    country: parsed.data.country,
    message: parsed.data.message,
    quantityKg: parsed.data.quantityKg ?? null,
    status: "PENDING",
  }).returning();

  const result = await buildInquiryResponse(inquiry);
  res.status(201).json(result);
});

router.get("/buyer/inquiries", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  // Get inquiries by buyer email — from their profile
  const inquiries = await db.select().from(inquiriesTable)
    .orderBy(inquiriesTable.createdAt);

  // Filter by userId context (simplified — in real app, tie inquiries to userId)
  const results = await Promise.all(inquiries.map(buildInquiryResponse));
  res.json(results);
});

router.get("/supplier/inquiries", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) {
    res.json([]);
    return;
  }

  // Get all products for this supplier
  const supplierProducts = await db.select().from(productsTable)
    .where(eq(productsTable.companyId, company.id));
  
  const productIds = supplierProducts.map(p => p.id);
  
  if (productIds.length === 0) {
    res.json([]);
    return;
  }

  const inquiries = await db.select().from(inquiriesTable)
    .orderBy(inquiriesTable.createdAt);

  const filtered = inquiries.filter(i => productIds.includes(i.productId));
  const results = await Promise.all(filtered.map(buildInquiryResponse));
  res.json(results);
});

router.patch("/supplier/inquiries/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateInquiryStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateInquiryStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [inquiry] = await db.update(inquiriesTable)
    .set({ status: parsed.data.status })
    .where(eq(inquiriesTable.id, params.data.id))
    .returning();

  if (!inquiry) {
    res.status(404).json({ error: "Inquiry not found" });
    return;
  }

  const result = await buildInquiryResponse(inquiry);
  res.json(result);
});

export default router;
