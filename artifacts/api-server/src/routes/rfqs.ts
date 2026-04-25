import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  db, rfqsTable, rfqResponsesTable, companiesTable, profilesTable, trustScoresTable, usersTable
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { sendEmail, rfqResponseEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/rfqs", async (req, res): Promise<void> => {
  const { status, category } = req.query as any;
  let query = db.select().from(rfqsTable).$dynamic();

  const conditions: any[] = [];
  if (status) conditions.push(eq(rfqsTable.status, status));
  if (category) conditions.push(eq(rfqsTable.productCategory, category));
  if (conditions.length > 0) query = query.where(and(...conditions)) as any;
  query = query.orderBy(desc(rfqsTable.createdAt)) as any;

  const rfqs = await query;

  const result = await Promise.all(rfqs.map(async (rfq) => {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, rfq.buyerId));
    const responses = await db.select().from(rfqResponsesTable).where(eq(rfqResponsesTable.rfqId, rfq.id));
    return {
      ...rfq,
      deadline: rfq.deadline.toISOString(),
      createdAt: rfq.createdAt.toISOString(),
      buyerName: profile ? `${profile.firstName} ${profile.lastName}` : "Buyer",
      buyerCountry: profile?.country ?? null,
      responseCount: responses.length,
    };
  }));

  res.json(result);
});

router.get("/rfqs/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, id));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, rfq.buyerId));
  const responses = await db.select().from(rfqResponsesTable).where(eq(rfqResponsesTable.rfqId, id));

  const responsesWithSupplier = await Promise.all(responses.map(async (r) => {
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, r.supplierId));
    const [trust] = await db.select().from(trustScoresTable).where(eq(trustScoresTable.companyId, r.supplierId));
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      supplierName: company?.name ?? "Supplier",
      supplierRegion: company?.region ?? null,
      supplierVerified: company?.verified ?? false,
      trustScore: trust?.score ?? company?.trustScore ?? 0,
    };
  }));

  res.json({
    ...rfq,
    deadline: rfq.deadline.toISOString(),
    createdAt: rfq.createdAt.toISOString(),
    buyerName: profile ? `${profile.firstName} ${profile.lastName}` : "Buyer",
    buyerCountry: profile?.country ?? null,
    responses: responsesWithSupplier,
  });
});

router.post("/rfqs", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { title, description, productCategory, quantityKg, targetPriceUSD, destination, destinationPort, incoterm, deadline } = req.body;

  if (!title || !description || !productCategory || !quantityKg || !destination || !deadline) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const [rfq] = await db.insert(rfqsTable).values({
    buyerId: userId,
    title,
    description,
    productCategory,
    quantityKg: parseFloat(quantityKg),
    targetPriceUSD: targetPriceUSD ? parseFloat(targetPriceUSD) : null,
    destination,
    destinationPort: destinationPort ?? null,
    incoterm: incoterm ?? "FOB",
    deadline: new Date(deadline),
    status: "OPEN",
  }).returning();

  res.status(201).json({ ...rfq, deadline: rfq.deadline.toISOString(), createdAt: rfq.createdAt.toISOString() });
});

router.post("/rfqs/:id/respond", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const rfqId = parseInt(req.params.id as string);
  if (isNaN(rfqId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) { res.status(403).json({ error: "Only suppliers can respond to RFQs" }); return; }

  const { pricePerKgUSD, leadTimeDays, message } = req.body;
  if (!pricePerKgUSD || !leadTimeDays || !message) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const [response] = await db.insert(rfqResponsesTable).values({
    rfqId,
    supplierId: company.id,
    pricePerKgUSD: parseFloat(pricePerKgUSD),
    leadTimeDays: parseInt(leadTimeDays),
    message,
    awarded: 0,
  }).returning();

  res.status(201).json({ ...response, createdAt: response.createdAt.toISOString() });

  // Fire-and-forget: notify buyer of new RFQ response
  Promise.resolve().then(async () => {
    try {
      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");

      const [rfq] = await db.select({ buyerId: rfqsTable.buyerId, title: rfqsTable.title })
        .from(rfqsTable).where(eq(rfqsTable.id, rfqId));
      if (!rfq) return;

      const [buyerUser] = await db.select({ email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, rfq.buyerId));
      if (!buyerUser?.email) return;

      const [buyerProfile] = await db.select({ firstName: profilesTable.firstName, lastName: profilesTable.lastName })
        .from(profilesTable).where(eq(profilesTable.userId, rfq.buyerId));
      const buyerName = buyerProfile
        ? `${buyerProfile.firstName} ${buyerProfile.lastName}`.trim()
        : "Buyer";

      const emailContent = rfqResponseEmail({
        buyerName,
        supplierName: company.name,
        rfqTitle: rfq.title,
        pricePerKgUSD: parseFloat(pricePerKgUSD),
        leadTimeDays: parseInt(leadTimeDays),
        rfqUrl: `${appBaseUrl}/rfq/${rfqId}`,
      });

      await sendEmail({ to: buyerUser.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
    } catch (err) {
      logger.warn({ err, rfqId, supplierId: company.id }, "RFQ response email failed");
    }
  });
});

router.post("/rfqs/:id/award/:responseId", requireAuth, async (req, res): Promise<void> => {
  const rfqId = parseInt(req.params.id as string);
  const responseId = parseInt(req.params.responseId as string);

  await db.update(rfqResponsesTable).set({ awarded: 1 }).where(eq(rfqResponsesTable.id, responseId));
  await db.update(rfqsTable).set({ status: "AWARDED" }).where(eq(rfqsTable.id, rfqId));

  res.json({ success: true });
});

router.get("/supplier/rfqs", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) { res.status(403).json({ error: "Supplier only" }); return; }

  const myResponses = await db.select().from(rfqResponsesTable).where(eq(rfqResponsesTable.supplierId, company.id));
  const respondedRfqIds = myResponses.map(r => r.rfqId);

  const openRfqs = await db.select().from(rfqsTable).where(eq(rfqsTable.status, "OPEN")).orderBy(desc(rfqsTable.createdAt));

  const result = openRfqs.map(rfq => ({
    ...rfq,
    deadline: rfq.deadline.toISOString(),
    createdAt: rfq.createdAt.toISOString(),
    hasResponded: respondedRfqIds.includes(rfq.id),
  }));

  res.json(result);
});

router.get("/buyer/rfqs", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const rfqs = await db.select().from(rfqsTable).where(eq(rfqsTable.buyerId, userId)).orderBy(desc(rfqsTable.createdAt));

  const result = await Promise.all(rfqs.map(async (rfq) => {
    const responses = await db.select().from(rfqResponsesTable).where(eq(rfqResponsesTable.rfqId, rfq.id));
    return {
      ...rfq,
      deadline: rfq.deadline.toISOString(),
      createdAt: rfq.createdAt.toISOString(),
      responseCount: responses.length,
    };
  }));

  res.json(result);
});

export default router;
