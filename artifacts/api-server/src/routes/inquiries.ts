import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, inquiriesTable, productsTable, companiesTable, usersTable } from "@workspace/db";
import {
  CreateInquiryBody,
  UpdateInquiryStatusParams,
  UpdateInquiryStatusBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { sendEmail, newInquiryEmail } from "../lib/email";
import { logger } from "../lib/logger";

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

router.post("/inquiries", requireAuth, async (req, res): Promise<void> => {
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

  // Fire-and-forget: notify supplier of new inquiry
  Promise.resolve().then(async () => {
    try {
      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");

      const [product] = await db.select({ companyId: productsTable.companyId, name: productsTable.name })
        .from(productsTable).where(eq(productsTable.id, inquiry.productId));
      if (!product) return;

      const [company] = await db.select({ userId: companiesTable.userId, name: companiesTable.name })
        .from(companiesTable).where(eq(companiesTable.id, product.companyId));
      if (!company) return;

      const [user] = await db.select({ email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, company.userId));
      if (!user?.email) return;

      const emailContent = newInquiryEmail({
        supplierName: company.name,
        buyerName: inquiry.buyerName,
        buyerCompany: inquiry.company ?? null,
        buyerCountry: inquiry.country ?? null,
        productName: product.name,
        messagePreview: inquiry.message,
        quantityKg: inquiry.quantityKg ?? null,
        inquiriesUrl: `${appBaseUrl}/supplier-dashboard/inquiries`,
      });

      await sendEmail({ to: user.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
    } catch (err) {
      logger.warn({ err, inquiryId: inquiry.id }, "New inquiry email failed");
    }
  });
});

router.get("/buyer/inquiries", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const inquiries = await db.select().from(inquiriesTable)
    .where(eq(inquiriesTable.buyerEmail, user.email))
    .orderBy(inquiriesTable.createdAt);

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
  const userId = (req as any).userId;

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

  // Ownership check: inquiry's product must belong to the authenticated supplier
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) { res.status(403).json({ error: "Only suppliers can update inquiries" }); return; }

  const [existingInquiry] = await db.select().from(inquiriesTable).where(eq(inquiriesTable.id, params.data.id));
  if (!existingInquiry) { res.status(404).json({ error: "Inquiry not found" }); return; }

  const [product] = await db.select({ companyId: productsTable.companyId }).from(productsTable).where(eq(productsTable.id, existingInquiry.productId));
  if (!product || product.companyId !== company.id) {
    res.status(403).json({ error: "Not authorized to update this inquiry" }); return;
  }

  const [inquiry] = await db.update(inquiriesTable)
    .set({ status: parsed.data.status })
    .where(eq(inquiriesTable.id, params.data.id))
    .returning();

  const result = await buildInquiryResponse(inquiry);
  res.json(result);
});

export default router;
