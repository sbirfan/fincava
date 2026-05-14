import { Router, type IRouter } from "express";
import { eq, and, desc, inArray, count } from "drizzle-orm";
import {
  db, rfqsTable, rfqResponsesTable, companiesTable, profilesTable, trustScoresTable, usersTable, productsTable,
  farmsTable, suppliersTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { sendEmail, rfqResponseEmail, rfqAwardEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { sendError } from "../lib/response";
import { getAnthropicClient } from "../lib/anthropic";
import { RFQ_RESPONSE_DRAFT_PROMPT } from "../config/ai-prompts/rfq-response-prompt";

const router: IRouter = Router();

router.get("/rfqs", requireAuth, async (req, res): Promise<void> => {
  const { status, category } = req.query as any;
  let query = db.select().from(rfqsTable).$dynamic();

  const conditions: any[] = [];
  if (status) conditions.push(eq(rfqsTable.status, status));
  if (category) conditions.push(eq(rfqsTable.productCategory, category));
  if (conditions.length > 0) query = query.where(and(...conditions)) as any;
  query = query.orderBy(desc(rfqsTable.createdAt)) as any;

  const rfqs = await query;
  if (rfqs.length === 0) { res.json([]); return; }

  const buyerIds = [...new Set(rfqs.map(r => r.buyerId))];
  const rfqIds = rfqs.map(r => r.id);

  const [profiles, responseCounts] = await Promise.all([
    db.select({
      userId: profilesTable.userId,
      firstName: profilesTable.firstName,
      lastName: profilesTable.lastName,
      country: profilesTable.country,
    }).from(profilesTable).where(inArray(profilesTable.userId, buyerIds)),
    db.select({ rfqId: rfqResponsesTable.rfqId, cnt: count() })
      .from(rfqResponsesTable)
      .where(inArray(rfqResponsesTable.rfqId, rfqIds))
      .groupBy(rfqResponsesTable.rfqId),
  ]);

  const profileByUserId = new Map(profiles.map(p => [p.userId, p]));
  const countByRfqId = new Map(responseCounts.map(r => [r.rfqId, Number(r.cnt)]));

  const result = rfqs.map(rfq => {
    const profile = profileByUserId.get(rfq.buyerId);
    return {
      ...rfq,
      deadline: rfq.deadline.toISOString(),
      createdAt: rfq.createdAt.toISOString(),
      buyerName: profile ? `${profile.firstName} ${profile.lastName}` : "Buyer",
      buyerCountry: profile?.country ?? null,
      responseCount: countByRfqId.get(rfq.id) ?? 0,
    };
  });

  res.json(result);
});

router.get("/rfqs/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const userRole = req.userRole;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { sendError(res, 400, "Invalid id"); return; }

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, id));
  if (!rfq) { sendError(res, 404, "RFQ not found"); return; }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, rfq.buyerId));
  const allResponses = await db.select().from(rfqResponsesTable).where(eq(rfqResponsesTable.rfqId, id));

  // Determine which responses this caller is authorized to see:
  // - ADMIN or the RFQ owner (buyer) sees all responses with full detail
  // - A SUPPLIER sees only their own response
  // - Any other authenticated user sees no response details
  const isOwner = rfq.buyerId === userId;
  const isAdmin = userRole === "ADMIN";

  let visibleResponses: typeof allResponses = [];
  if (isAdmin || isOwner) {
    visibleResponses = allResponses;
  } else if (userRole === "SUPPLIER") {
    // Find which company this supplier belongs to
    const [company] = await db.select({ id: companiesTable.id })
      .from(companiesTable).where(eq(companiesTable.userId, userId));
    if (company) {
      visibleResponses = allResponses.filter(r => r.companyId === company.id);
    }
  }

  const responsesWithSupplier = await Promise.all(visibleResponses.map(async (r) => {
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, r.companyId));
    // ── Intelligence decoration (non-blocking) ────────────────────────────────
    // trustScoresTable is Layer II intelligence data. A read failure must not
    // fail the core RFQ detail response — fall back to the denormalised
    // company.trustScore column (or 0) and log the degradation.
    let trustScore: number = company?.trustScore ?? 0;
    try {
      const [trust] = await db.select().from(trustScoresTable).where(eq(trustScoresTable.companyId, r.companyId));
      trustScore = trust?.score ?? company?.trustScore ?? 0;
    } catch (trustErr) {
      logger.warn(
        { err: trustErr, companyId: r.companyId, rfqId: id },
        "rfqs: trust-score read failed — serving degraded response (trustScore fallback)",
      );
    }
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      supplierName: company?.name ?? "Supplier",
      supplierRegion: company?.region ?? null,
      supplierVerified: company?.verified ?? false,
      trustScore,
    };
  }));

  res.json({
    ...rfq,
    deadline: rfq.deadline.toISOString(),
    createdAt: rfq.createdAt.toISOString(),
    buyerName: profile ? `${profile.firstName} ${profile.lastName}` : "Buyer",
    buyerCountry: profile?.country ?? null,
    responseCount: allResponses.length,
    responses: responsesWithSupplier,
  });
});

router.post("/rfqs", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const userRole = req.userRole;
  if (userRole !== "BUYER" && userRole !== "ADMIN") {
    sendError(res, 403, "Only buyer accounts can create RFQs");
    return;
  }
  const { title, description, productCategory, quantityKg, targetPriceUSD, destination, destinationPort, incoterm, deadline } = req.body;

  if (!title || !description || !productCategory || !quantityKg || !destination || !deadline) {
    sendError(res, 400, "Missing required fields"); return;
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
  const userId = req.userId;
  const userRole = req.userRole;
  if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
    sendError(res, 403, "Only supplier accounts can respond to RFQs");
    return;
  }
  const rfqId = parseInt(req.params.id as string);
  if (isNaN(rfqId)) { sendError(res, 400, "Invalid id"); return; }

  // Primary lookup: company owned directly by this user (self-registered supplier)
  let [company] = await db.select().from(companiesTable)
    .where(eq(companiesTable.userId, userId));

  // Fallback: for field-collected suppliers or legacy auto-created companies,
  // resolve via suppliersTable → productsTable → companiesTable.
  // This handles the case where the company was created under admin userId.
  if (!company) {
    const [supplierRow] = await db
      .select({ id: suppliersTable.id })
      .from(suppliersTable)
      .where(eq(suppliersTable.userId, userId))
      .limit(1);

    if (supplierRow) {
      const [firstProduct] = await db
        .select({ companyId: productsTable.companyId })
        .from(productsTable)
        .where(
          and(
            eq(productsTable.supplierId, supplierRow.id),
            eq(productsTable.active, true),
          ),
        )
        .limit(1);

      if (firstProduct?.companyId != null) {
        const [resolvedCompany] = await db
          .select()
          .from(companiesTable)
          .where(eq(companiesTable.id, firstProduct.companyId));
        company = resolvedCompany;
      }
    }
  }

  if (!company) {
    sendError(res, 403, "No company found for this supplier — contact your Fincava field officer");
    return;
  }

  const { pricePerKgUSD, leadTimeDays, message } = req.body;
  if (!pricePerKgUSD || !leadTimeDays || !message) {
    sendError(res, 400, "Missing required fields"); return;
  }

  const [response] = await db.insert(rfqResponsesTable).values({
    rfqId,
    companyId: company.id,
    pricePerKgUSD: parseFloat(pricePerKgUSD),
    leadTimeDays: parseInt(leadTimeDays),
    message,
    awarded: 0,
  }).returning();

  res.status(201).json({ ...response, createdAt: response.createdAt.toISOString() });

  // Fire-and-forget: notify buyer of new RFQ response
  void Promise.resolve().then(async () => {
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
      logger.warn({ err, rfqId, companyId: company.id }, "RFQ response email failed");
    }
  });
});

router.post("/rfqs/:id/award/:responseId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const rfqId = parseInt(req.params.id as string);
  const responseId = parseInt(req.params.responseId as string);
  if (isNaN(rfqId) || isNaN(responseId)) { sendError(res, 400, "Invalid id"); return; }

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, rfqId));
  if (!rfq) { sendError(res, 404, "RFQ not found"); return; }
  if (rfq.buyerId !== userId) { sendError(res, 403, "Only the RFQ creator can award bids"); return; }
  if (rfq.status !== "OPEN") { sendError(res, 409, `RFQ is already ${rfq.status.toLowerCase()} — cannot award`); return; }

  await db.update(rfqResponsesTable).set({ awarded: 1 }).where(eq(rfqResponsesTable.id, responseId));
  await db.update(rfqsTable).set({ status: "AWARDED" }).where(eq(rfqsTable.id, rfqId));

  res.json({ success: true });

  // Fire-and-forget: notify winning supplier
  try {
    const [[response], [rfq]] = await Promise.all([
      db.select().from(rfqResponsesTable).where(eq(rfqResponsesTable.id, responseId)),
      db.select().from(rfqsTable).where(eq(rfqsTable.id, rfqId)),
    ]);
    if (!response || !rfq) return;

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, response.companyId));
    if (!company) return;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, company.userId));
    if (!user?.email) return;

    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, company.userId));
    const supplierName = profile
      ? `${profile.firstName} ${profile.lastName}`
      : company.name;

    const appBaseUrl = process.env["FRONTEND_URL"]
      ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");

    const emailContent = rfqAwardEmail({
      supplierName,
      rfqTitle: rfq.title,
      pricePerKgUSD: response.pricePerKgUSD,
      leadTimeDays: response.leadTimeDays,
      rfqUrl: `${appBaseUrl}/rfqs/${rfqId}`,
    });

    await sendEmail({ to: user.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
  } catch (err) {
    logger.warn({ err, rfqId, responseId }, "RFQ award supplier email failed");
  }
});

router.get("/supplier/rfqs", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) { sendError(res, 403, "Supplier only"); return; }

  const [myResponses, myProducts] = await Promise.all([
    db.select({ rfqId: rfqResponsesTable.rfqId }).from(rfqResponsesTable).where(eq(rfqResponsesTable.companyId, company.id)),
    db.select({ category: productsTable.category }).from(productsTable).where(eq(productsTable.supplierId, company.id)),
  ]);
  const respondedRfqIds = myResponses.map(r => r.rfqId);
  const supplierCategories = [...new Set(myProducts.map(p => p.category))];

  let rfqQuery = db.select().from(rfqsTable).where(eq(rfqsTable.status, "OPEN")).$dynamic();
  if (supplierCategories.length > 0) {
    rfqQuery = rfqQuery.where(and(eq(rfqsTable.status, "OPEN"), inArray(rfqsTable.productCategory, supplierCategories))) as any;
  }
  const openRfqs = await rfqQuery.orderBy(desc(rfqsTable.createdAt));

  const result = openRfqs.map(rfq => ({
    ...rfq,
    deadline: rfq.deadline.toISOString(),
    createdAt: rfq.createdAt.toISOString(),
    hasResponded: respondedRfqIds.includes(rfq.id),
  }));

  res.json(result);
});

router.get("/buyer/rfqs", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const rfqs = await db.select().from(rfqsTable).where(eq(rfqsTable.buyerId, userId)).orderBy(desc(rfqsTable.createdAt));

  if (rfqs.length === 0) { res.json([]); return; }

  const rfqIds = rfqs.map(r => r.id);
  const responseCounts = await db
    .select({ rfqId: rfqResponsesTable.rfqId, cnt: count() })
    .from(rfqResponsesTable)
    .where(inArray(rfqResponsesTable.rfqId, rfqIds))
    .groupBy(rfqResponsesTable.rfqId);

  const countByRfqId = new Map(responseCounts.map(r => [r.rfqId, Number(r.cnt)]));

  const result = rfqs.map(rfq => ({
    ...rfq,
    deadline: rfq.deadline.toISOString(),
    createdAt: rfq.createdAt.toISOString(),
    responseCount: countByRfqId.get(rfq.id) ?? 0,
  }));

  res.json(result);
});

router.get(
  "/rfqs/:id/draft-response",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId;
    const userRole = req.userRole;

    if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
      sendError(res, 403, "Only suppliers can request a draft response");
      return;
    }

    const rfqId = parseInt(req.params.id as string);
    if (isNaN(rfqId)) { sendError(res, 400, "Invalid id"); return; }

    const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, rfqId));
    if (!rfq) { sendError(res, 404, "RFQ not found"); return; }
    if (rfq.status !== "OPEN") { sendError(res, 409, "RFQ is no longer open"); return; }

    // Find supplier's company and products
    const [company] = await db.select().from(companiesTable)
      .where(eq(companiesTable.userId, userId));

    // For admin acting on behalf: accept ?supplierId= query param
    let resolvedSupplierId: number | null = null;
    if (userRole === "ADMIN" && req.query["supplierId"]) {
      resolvedSupplierId = parseInt(req.query["supplierId"] as string);
    } else if (company) {
      // Try to find supplierId from products linked to this company
      const [firstProduct] = await db.select({ supplierId: productsTable.supplierId })
        .from(productsTable)
        .where(eq(productsTable.companyId, company.id))
        .limit(1);
      resolvedSupplierId = firstProduct?.supplierId ?? null;
    }

    const supplierProducts = company
      ? await db.select({
          name: productsTable.name,
          category: productsTable.category,
          altitude: productsTable.altitude,
          process: productsTable.process,
          variety: productsTable.variety,
          cupping: productsTable.cupping,
          availableKg: productsTable.availableKg,
          certifications: productsTable.certifications,
        }).from(productsTable)
          .where(eq(productsTable.companyId, company.id))
      : [];

    // Optionally enrich with farm data if supplierId resolved
    let farmData = null;
    if (resolvedSupplierId) {
      const [farm] = await db.select({
        cultivoPrincipal: farmsTable.cultivoPrincipal,
        altitudeMeters: farmsTable.altitudeMeters,
        hectareasProduccion: farmsTable.hectareasProduccion,
        metodoSecado: farmsTable.metodoSecado,
        harvestMonths: farmsTable.harvestMonths,
        tenenciaTierra: farmsTable.tenenciaTierra,
      }).from(farmsTable)
        .where(eq(farmsTable.supplierId, resolvedSupplierId));
      farmData = farm ?? null;
    }

    const supplierPayload = {
      companyName: company?.name ?? "Supplier",
      region: company?.region ?? null,
      products: supplierProducts,
      farm: farmData,
    };

    const rfqPayload = {
      productCategory: rfq.productCategory,
      quantityKg: rfq.quantityKg,
      destination: rfq.destination,
      incoterm: rfq.incoterm,
      deadline: rfq.deadline,
      qualityGrade: rfq.qualityGrade,
      requiredCertifications: rfq.requiredCertifications,
      preferredCertifications: rfq.preferredCertifications,
      requiredDocuments: rfq.requiredDocuments,
      packagingRequirements: rfq.packagingRequirements,
      coldChainRequired: rfq.coldChainRequired,
      moqMt: rfq.moqMt,
      orderFrequency: rfq.orderFrequency,
      priceRangeMinUsdKg: rfq.priceRangeMinUsdKg,
      priceRangeMaxUsdKg: rfq.priceRangeMaxUsdKg,
    };

    try {
      const client = getAnthropicClient();
      const message = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: RFQ_RESPONSE_DRAFT_PROMPT,
        messages: [{ role: "user", content: JSON.stringify({ rfq: rfqPayload, supplier: supplierPayload }) }],
      });

      const raw = (message.content[0] as any).text as string;
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      const draft = JSON.parse(jsonStr);

      res.json({ rfqId, draft });
    } catch (err: any) {
      logger.error({ err, rfqId, userId }, "rfq draft-response: Claude call failed");
      sendError(res, 500, "Draft generation failed — please try again");
    }
  },
);

export default router;
