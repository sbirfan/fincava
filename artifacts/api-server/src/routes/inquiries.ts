import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, inquiriesTable, productsTable, companiesTable, usersTable, profilesTable } from "@workspace/db";
import {
  CreateInquiryBody,
  UpdateInquiryStatusParams,
  UpdateInquiryStatusBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { sendEmail, newInquiryEmail, newInquiryAdminAlertEmail, getAdminEmails } from "../lib/email";
import { logger } from "../lib/logger";
import { sendError } from "../lib/response";

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
    sendError(res, 400, parsed.error.message);
    return;
  }

  // Override buyerEmail and buyerName from the authenticated session — do not trust body values.
  // email lives on usersTable; firstName/lastName live on profilesTable (two indexed point-lookups, no joins).
  const userId = req.userId;
  const [sessionUser] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!sessionUser) {
    sendError(res, 401, "Session user not found");
    return;
  }
  const [sessionProfile] = await db
    .select({ firstName: profilesTable.firstName, lastName: profilesTable.lastName })
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  const buyerEmail = sessionUser.email;
  const buyerName = sessionProfile
    ? [sessionProfile.firstName, sessionProfile.lastName].filter(Boolean).join(" ")
    : sessionUser.email.split("@")[0];

  const [inquiry] = await db.insert(inquiriesTable).values({
    productId: parsed.data.productId,
    buyerEmail,
    buyerName,
    company: parsed.data.company,
    country: parsed.data.country,
    message: parsed.data.message,
    quantityKg: parsed.data.quantityKg ?? null,
    status: "PENDING",
  }).returning();

  const result = await buildInquiryResponse(inquiry);
  res.status(201).json(result);

  // Fire-and-forget: notify supplier of new inquiry
  void Promise.resolve().then(async () => {
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

      // FIN-009: also alert the operator so they can triage the introduction.
      const adminEmails = await getAdminEmails();
      if (adminEmails.length > 0) {
        const adminAlert = newInquiryAdminAlertEmail({
          buyerName: inquiry.buyerName,
          buyerEmail: inquiry.buyerEmail,
          buyerCompany: inquiry.company ?? null,
          buyerCountry: inquiry.country ?? null,
          productName: product.name,
          supplierName: company.name,
          messagePreview: inquiry.message,
          quantityKg: inquiry.quantityKg ?? null,
          adminUrl: `${appBaseUrl}/admin/inquiries`,
        });
        await sendEmail({ to: adminEmails, subject: adminAlert.subject, html: adminAlert.html, text: adminAlert.text });
      }
    } catch (err) {
      logger.warn({ err, inquiryId: inquiry.id }, "New inquiry email failed");
    }
  });
});

router.get("/buyer/inquiries", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { sendError(res, 404, "User not found"); return; }

  const inquiries = await db.select().from(inquiriesTable)
    .where(eq(inquiriesTable.buyerEmail, user.email))
    .orderBy(inquiriesTable.createdAt);

  const results = await Promise.all(inquiries.map(buildInquiryResponse));
  res.json(results);
});

router.get("/supplier/inquiries", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
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
  const userId = req.userId;

  const params = UpdateInquiryStatusParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.message);
    return;
  }

  const parsed = UpdateInquiryStatusBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.message);
    return;
  }

  // Ownership check: inquiry's product must belong to the authenticated supplier
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) { sendError(res, 403, "Only suppliers can update inquiries"); return; }

  const [existingInquiry] = await db.select().from(inquiriesTable).where(eq(inquiriesTable.id, params.data.id));
  if (!existingInquiry) { sendError(res, 404, "Inquiry not found"); return; }

  const [product] = await db.select({ companyId: productsTable.companyId }).from(productsTable).where(eq(productsTable.id, existingInquiry.productId));
  if (!product || product.companyId !== company.id) {
    sendError(res, 403, "Not authorized to update this inquiry"); return;
  }

  const [inquiry] = await db.update(inquiriesTable)
    .set({ status: parsed.data.status })
    .where(eq(inquiriesTable.id, params.data.id))
    .returning();

  const result = await buildInquiryResponse(inquiry);
  res.json(result);
});

export default router;
