import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { db, usersTable, profilesTable, companiesTable } from "@workspace/db";
import { loansTable, repaymentsTable } from "@workspace/db";
import { ordersTable, orderItemsTable, productsTable, staffRolesTable, suppliersTable, farmsTable } from "@workspace/db";
import { buyerProfilesTable, buyerMatchesTable, buyerGapBriefsTable, buyerAdminActionsTable } from "@workspace/db";
import { supplierIngestionBatchesTable, productPlaceholdersTable, INTERACTION_TYPES } from "@workspace/db";
import { escalateGap } from "../services/buyer-gap-service";
import { hashPassword } from "../lib/auth";
import { computeTrustScore } from "../services/trust-score-service";
import { adminOnly } from "../middleware/admin";
import { AdminUserEditBody, AdminResetPasswordBody, AdminCreateUserBody, AdminOrderStatusBody, AdminLoanStatusBody, AdminSupplierStatusBody, AdminSupplierEditBody, StaffRoleBody, parsePagination, STAFF_ROLE_VALUES, BatchCreateBody, IngestionSupplierBody, EnrichmentRequestBody, IngestionStatusUpdateBody, DuplicateCheckQuery, DiscoveryRequestBody, BatchConfirmBody } from "../schemas";
import { enrichSupplierWithAI } from "../services/ingestion-structuring-service";
import { checkDuplicate, computeSupplierFingerprint, logDuplicateOverride } from "../services/duplicate-detector";
import { discoverLeads } from "../services/discovery-engine";
import { randomUUID } from "crypto";
import { and, desc, eq, inArray, count, sum, sql, ilike, or, isNull, type SQL } from "drizzle-orm";
import { companyTypeEnum } from "@workspace/db";
import { sendEmail, supplierStatusChangeEmail, orderStatusEmail, loanStatusEmail, adminCreatedAccountEmail, adminPasswordResetEmail, adminRoleChangeEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { logInteraction } from "../lib/interaction-logger";
import { FEE_STATUSES } from "../constants/fee-status";
import { runBackup } from "../services/backup-service";
import { incrementAndMaybeLog } from "../lib/volumeCounters";

// ── Local typed helpers (avoid `any` in route bodies) ─────────────────────────
type AuthedRequest = Request & { userId: number };
const requesterIdOf = (req: Request): number => (req as AuthedRequest).userId;
const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : typeof err === "string" ? err : "Unexpected error";

type CompanyType = (typeof companyTypeEnum.enumValues)[number];
const COMPANY_TYPE_VALUES = companyTypeEnum.enumValues as readonly CompanyType[];
const isCompanyType = (v: string): v is CompanyType =>
  (COMPANY_TYPE_VALUES as readonly string[]).includes(v);

const router: IRouter = Router();

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get("/admin/stats", ...adminOnly, async (_req, res): Promise<void> => {
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [orderCount] = await db.select({ count: count() }).from(ordersTable);
  const [loanCount] = await db.select({ count: count() }).from(loansTable);

  const [loanTotals] = await db
    .select({
      totalPrincipal: sum(loansTable.principalUSD),
      totalOutstanding: sum(loansTable.totalRepaymentUSD),
    })
    .from(loansTable)
    .where(eq(loansTable.status, "ACTIVE"));

  const [orderTotals] = await db
    .select({ totalValue: sum(ordersTable.totalUSD) })
    .from(ordersTable);

  const [activeLoans] = await db
    .select({ count: count() })
    .from(loansTable)
    .where(eq(loansTable.status, "ACTIVE"));

  const [defaultedLoans] = await db
    .select({ count: count() })
    .from(loansTable)
    .where(eq(loansTable.status, "DEFAULTED"));

  res.json({
    users: Number(userCount.count),
    orders: Number(orderCount.count),
    loans: Number(loanCount.count),
    activeLoans: Number(activeLoans.count),
    defaultedLoans: Number(defaultedLoans.count),
    totalGMV: Number(orderTotals.totalValue ?? 0),
    totalLoanPrincipal: Number(loanTotals?.totalPrincipal ?? 0),
    totalOutstanding: Number(loanTotals?.totalOutstanding ?? 0),
  });
});

// ── GET /api/admin/users ─────────────────────────────────────────────────────
router.get("/admin/users", ...adminOnly, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query);

  const [{ total }] = await db.select({ total: count() }).from(usersTable);

  const data = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
      firstName: profilesTable.firstName,
      lastName: profilesTable.lastName,
      country: profilesTable.country,
      phone: profilesTable.phone,
      companyName: companiesTable.name,
      companyVerified: companiesTable.verified,
    })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .leftJoin(companiesTable, eq(companiesTable.userId, usersTable.id))
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ data, total: Number(total), page, limit, totalPages: Math.max(1, Math.ceil(Number(total) / limit)) });
});

// ── GET /api/admin/loans ─────────────────────────────────────────────────────
router.get("/admin/loans", ...adminOnly, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query);

  const [{ total }] = await db.select({ total: count() }).from(loansTable);

  const loans = await db
    .select({
      id: loansTable.id,
      buyerId: loansTable.buyerId,
      buyerEmail: usersTable.email,
      buyerFirstName: profilesTable.firstName,
      buyerLastName: profilesTable.lastName,
      principalUSD: loansTable.principalUSD,
      feeUSD: loansTable.feeUSD,
      totalRepaymentUSD: loansTable.totalRepaymentUSD,
      aprPercent: loansTable.aprPercent,
      termDays: loansTable.termDays,
      status: loansTable.status,
      dueAt: loansTable.dueAt,
      creditScoreAtIssuance: loansTable.creditScoreAtIssuance,
      createdAt: loansTable.createdAt,
    })
    .from(loansTable)
    .leftJoin(usersTable, eq(usersTable.id, loansTable.buyerId))
    .leftJoin(profilesTable, eq(profilesTable.userId, loansTable.buyerId))
    .orderBy(desc(loansTable.createdAt))
    .limit(limit)
    .offset(offset);

  const loanIds = loans.map((l) => l.id);
  const repayments =
    loanIds.length > 0
      ? await db
          .select({ loanId: repaymentsTable.loanId, amountUSD: repaymentsTable.amountUSD })
          .from(repaymentsTable)
          .where(inArray(repaymentsTable.loanId, loanIds))
      : [];

  const repaidByLoan: Record<number, number> = {};
  for (const r of repayments) {
    repaidByLoan[r.loanId] = (repaidByLoan[r.loanId] ?? 0) + r.amountUSD;
  }

  const data = loans.map((l) => ({ ...l, totalRepaid: repaidByLoan[l.id] ?? 0 }));
  res.json({ data, total: Number(total), page, limit, totalPages: Math.max(1, Math.ceil(Number(total) / limit)) });
});

// ── GET /api/admin/orders ────────────────────────────────────────────────────
router.get("/admin/orders", ...adminOnly, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query);

  const [{ total }] = await db.select({ total: count() }).from(ordersTable);

  const data = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      totalUSD: ordersTable.totalUSD,
      incoterm: ordersTable.incoterm,
      destinationPort: ordersTable.destinationPort,
      shippingMethod: ordersTable.shippingMethod,
      createdAt: ordersTable.createdAt,
      buyerId: ordersTable.buyerId,
      buyerEmail: usersTable.email,
      buyerFirstName: profilesTable.firstName,
      buyerLastName: profilesTable.lastName,
      feePercentage: ordersTable.feePercentage,
      feeAmountUSD:  ordersTable.feeAmountUSD,
      feeStatus:     ordersTable.feeStatus,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(usersTable.id, ordersTable.buyerId))
    .leftJoin(profilesTable, eq(profilesTable.userId, ordersTable.buyerId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ data, total: Number(total), page, limit, totalPages: Math.max(1, Math.ceil(Number(total) / limit)) });
});

// ── GET /api/admin/buyers ─────────────────────────────────────────────────────
// Phase 5 — supports filters: state, min_completion, country, marketing_opt_in, q
// Returns each row enriched with match_count and gap_count derived sub-queries.
router.get("/admin/buyers", ...adminOnly, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query);

  const stateFilter = typeof req.query.state === "string" ? req.query.state : undefined;
  const countryFilter = typeof req.query.country === "string" ? req.query.country : undefined;
  const companyTypeFilter = typeof req.query.company_type === "string" ? req.query.company_type : undefined;
  const minCompletionRaw = typeof req.query.min_completion === "string" ? parseInt(req.query.min_completion, 10) : NaN;
  const minCompletion = !isNaN(minCompletionRaw) ? minCompletionRaw : undefined;
  const marketingOptInFilter =
    req.query.marketing_opt_in === "true"
      ? true
      : req.query.marketing_opt_in === "false"
        ? false
        : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;

  const conditions: SQL[] = [];
  if (stateFilter) conditions.push(eq(buyerProfilesTable.state, stateFilter));
  if (countryFilter) conditions.push(eq(buyerProfilesTable.country, countryFilter));
  if (companyTypeFilter && isCompanyType(companyTypeFilter)) {
    conditions.push(eq(companiesTable.type, companyTypeFilter));
  }
  if (minCompletion !== undefined) conditions.push(sql`${buyerProfilesTable.p2CompletionPct} >= ${minCompletion}`);
  if (marketingOptInFilter !== undefined) conditions.push(eq(buyerProfilesTable.marketingOptIn, marketingOptInFilter));
  if (q && q.length > 0) {
    const pattern = `%${q}%`;
    const search = or(
      ilike(buyerProfilesTable.companyName, pattern),
      ilike(companiesTable.name, pattern),
      ilike(usersTable.email, pattern),
      ilike(profilesTable.firstName, pattern),
      ilike(profilesTable.lastName, pattern),
    );
    if (search) conditions.push(search);
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(buyerProfilesTable)
    .innerJoin(usersTable, eq(usersTable.id, buyerProfilesTable.userId))
    .leftJoin(profilesTable, eq(profilesTable.userId, buyerProfilesTable.userId))
    .leftJoin(companiesTable, eq(companiesTable.userId, buyerProfilesTable.userId))
    .where(whereClause);

  const matchCountSq = db
    .select({
      buyerProfileId: buyerMatchesTable.buyerProfileId,
      matchCnt: count().as("match_cnt"),
    })
    .from(buyerMatchesTable)
    .where(eq(buyerMatchesTable.isCurrent, true))
    .groupBy(buyerMatchesTable.buyerProfileId)
    .as("mc");

  const gapCountSq = db
    .select({
      buyerProfileId: buyerGapBriefsTable.buyerProfileId,
      gapCnt: count().as("gap_cnt"),
    })
    .from(buyerGapBriefsTable)
    .where(and(eq(buyerGapBriefsTable.isRealGap, true), isNull(buyerGapBriefsTable.resolvedAt)))
    .groupBy(buyerGapBriefsTable.buyerProfileId)
    .as("gc");

  const data = await db
    .select({
      profileId:         buyerProfilesTable.id,
      userId:            buyerProfilesTable.userId,
      companyName:       buyerProfilesTable.companyName,
      country:           buyerProfilesTable.country,
      destinationPort:   buyerProfilesTable.destinationPort,
      targetProducts:    buyerProfilesTable.targetProducts,
      preferredIncoterm: buyerProfilesTable.preferredIncoterm,
      intendedVolumeMt:  buyerProfilesTable.intendedVolumeMt,
      importFrequency:   buyerProfilesTable.importFrequency,
      state:             buyerProfilesTable.state,
      p2CompletionPct:   buyerProfilesTable.p2CompletionPct,
      marketingOptIn:    buyerProfilesTable.marketingOptIn,
      marketingTopics:   buyerProfilesTable.marketingTopics,
      onboardedAt:       buyerProfilesTable.onboardedAt,
      updatedAt:         buyerProfilesTable.updatedAt,
      email:             usersTable.email,
      role:              usersTable.role,
      registeredAt:      usersTable.createdAt,
      firstName:         profilesTable.firstName,
      lastName:          profilesTable.lastName,
      phone:             profilesTable.phone,
      registeredCompany: companiesTable.name,
      companyType:       companiesTable.type,
      companyVerified:   companiesTable.verified,
      matchCount:        matchCountSq.matchCnt,
      gapCount:          gapCountSq.gapCnt,
    })
    .from(buyerProfilesTable)
    .innerJoin(usersTable, eq(usersTable.id, buyerProfilesTable.userId))
    .leftJoin(profilesTable, eq(profilesTable.userId, buyerProfilesTable.userId))
    .leftJoin(companiesTable, eq(companiesTable.userId, buyerProfilesTable.userId))
    .leftJoin(matchCountSq, eq(matchCountSq.buyerProfileId, buyerProfilesTable.id))
    .leftJoin(gapCountSq, eq(gapCountSq.buyerProfileId, buyerProfilesTable.id))
    .where(whereClause)
    .orderBy(desc(buyerProfilesTable.onboardedAt))
    .limit(limit)
    .offset(offset);

  res.json({
    success: true,
    data: {
      rows: data.map((r) => ({
        ...r,
        matchCount: Number(r.matchCount ?? 0),
        gapCount: Number(r.gapCount ?? 0),
      })),
      total: Number(total),
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(Number(total) / limit)),
    },
  });
});

// ── GET /api/admin/buyers/:id ────────────────────────────────────────────────
router.get("/admin/buyers/:id", ...adminOnly, async (req, res): Promise<void> => {
  const profileId = parseInt(req.params.id as string, 10);
  if (isNaN(profileId)) {
    res.status(400).json({ success: false, error: "Invalid buyer profile id" });
    return;
  }

  const [row] = await db
    .select({
      profile: buyerProfilesTable,
      email: usersTable.email,
      role: usersTable.role,
      registeredAt: usersTable.createdAt,
      firstName: profilesTable.firstName,
      lastName: profilesTable.lastName,
      phone: profilesTable.phone,
      registeredCompany: companiesTable.name,
      companyType: companiesTable.type,
      companyVerified: companiesTable.verified,
    })
    .from(buyerProfilesTable)
    .innerJoin(usersTable, eq(usersTable.id, buyerProfilesTable.userId))
    .leftJoin(profilesTable, eq(profilesTable.userId, buyerProfilesTable.userId))
    .leftJoin(companiesTable, eq(companiesTable.userId, buyerProfilesTable.userId))
    .where(eq(buyerProfilesTable.id, profileId));

  if (!row) {
    res.status(404).json({ success: false, error: "Buyer profile not found" });
    return;
  }

  const [{ matchCount }] = await db
    .select({ matchCount: count() })
    .from(buyerMatchesTable)
    .where(and(eq(buyerMatchesTable.buyerProfileId, profileId), eq(buyerMatchesTable.isCurrent, true)));

  const [{ gapCount }] = await db
    .select({ gapCount: count() })
    .from(buyerGapBriefsTable)
    .where(
      and(
        eq(buyerGapBriefsTable.buyerProfileId, profileId),
        eq(buyerGapBriefsTable.isRealGap, true),
        isNull(buyerGapBriefsTable.resolvedAt),
      ),
    );

  res.json({
    success: true,
    data: {
      ...row.profile,
      email: row.email,
      role: row.role,
      registeredAt: row.registeredAt,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      registeredCompany: row.registeredCompany,
      companyType: row.companyType,
      companyVerified: row.companyVerified,
      matchCount: Number(matchCount ?? 0),
      gapCount: Number(gapCount ?? 0),
    },
  });
});

// ── GET /api/admin/buyers/:id/matches ────────────────────────────────────────
router.get("/admin/buyers/:id/matches", ...adminOnly, async (req, res): Promise<void> => {
  const profileId = parseInt(req.params.id as string, 10);
  if (isNaN(profileId)) {
    res.status(400).json({ success: false, error: "Invalid buyer profile id" });
    return;
  }

  const includeAll = req.query.include === "all";

  const matchConditions: SQL[] = [eq(buyerMatchesTable.buyerProfileId, profileId)];
  if (!includeAll) matchConditions.push(eq(buyerMatchesTable.isCurrent, true));

  const rows = await db
    .select({
      id: buyerMatchesTable.id,
      buyerProfileId: buyerMatchesTable.buyerProfileId,
      supplierId: buyerMatchesTable.supplierId,
      matchScore: buyerMatchesTable.matchScore,
      scoreBreakdown: buyerMatchesTable.scoreBreakdown,
      disqualifiers: buyerMatchesTable.disqualifiers,
      matchNotes: buyerMatchesTable.matchNotes,
      sectionsAtRun: buyerMatchesTable.sectionsAtRun,
      isCurrent: buyerMatchesTable.isCurrent,
      createdAt: buyerMatchesTable.createdAt,
      supplierName: suppliersTable.nombreCompleto,
      supplierMunicipio: suppliersTable.municipio,
      supplierStatus: suppliersTable.status,
    })
    .from(buyerMatchesTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, buyerMatchesTable.supplierId))
    .where(and(...matchConditions))
    .orderBy(desc(buyerMatchesTable.matchScore), desc(buyerMatchesTable.createdAt));

  res.json({ success: true, data: rows });
});

// ── GET /api/admin/buyers/:id/gaps ───────────────────────────────────────────
router.get("/admin/buyers/:id/gaps", ...adminOnly, async (req, res): Promise<void> => {
  const profileId = parseInt(req.params.id as string, 10);
  if (isNaN(profileId)) {
    res.status(400).json({ success: false, error: "Invalid buyer profile id" });
    return;
  }

  const rows = await db
    .select()
    .from(buyerGapBriefsTable)
    .where(eq(buyerGapBriefsTable.buyerProfileId, profileId))
    .orderBy(desc(buyerGapBriefsTable.createdAt));

  res.json({ success: true, data: rows });
});

// ── POST /api/admin/buyers/:id/suppress-match ────────────────────────────────
const SuppressMatchBody = z.object({
  matchId: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

router.post("/admin/buyers/:id/suppress-match", ...adminOnly, async (req, res): Promise<void> => {
  const profileId = parseInt(req.params.id as string, 10);
  if (isNaN(profileId)) {
    res.status(400).json({ success: false, error: "Invalid buyer profile id" });
    return;
  }

  const parsed = SuppressMatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten().fieldErrors });
    return;
  }

  const adminId = requesterIdOf(req);

  const [match] = await db
    .select()
    .from(buyerMatchesTable)
    .where(and(eq(buyerMatchesTable.id, parsed.data.matchId), eq(buyerMatchesTable.buyerProfileId, profileId)));

  if (!match) {
    res.status(404).json({ success: false, error: "Match not found for this buyer" });
    return;
  }

  const stamp = new Date().toISOString();
  const tag = `[admin:${adminId}@${stamp}] ${parsed.data.reason}`;
  const newDisq = [...(match.disqualifiers ?? []), tag];

  const [updated] = await db
    .update(buyerMatchesTable)
    .set({ disqualifiers: newDisq, isCurrent: false })
    .where(eq(buyerMatchesTable.id, match.id))
    .returning();

  logInteraction({
    eventType: "buyer_match_suppressed",
    actorType: "admin",
    referenceId: match.id,
    referenceType: "buyer_match",
    payload: {
      adminId,
      buyerProfileId: profileId,
      supplierId: match.supplierId,
      reason: parsed.data.reason,
    },
  });

  db.insert(buyerAdminActionsTable).values({
    actorAdminId: adminId,
    buyerProfileId: profileId,
    actionType: "suppress_match",
    payload: { matchId: match.id, supplierId: match.supplierId },
    note: parsed.data.reason,
  }).catch((err: unknown) => {
    logger.warn({ err, matchId: match.id, adminId }, "suppress_match audit insert failed");
  });

  res.json({ success: true, data: updated });
});

// ── POST /api/admin/gaps/:id/escalate ────────────────────────────────────────
router.post("/admin/gaps/:id/escalate", ...adminOnly, async (req, res): Promise<void> => {
  const gapId = parseInt(req.params.id as string, 10);
  if (isNaN(gapId)) {
    res.status(400).json({ success: false, error: "Invalid gap id" });
    return;
  }

  const [brief] = await db
    .select()
    .from(buyerGapBriefsTable)
    .where(eq(buyerGapBriefsTable.id, gapId));

  if (!brief) {
    res.status(404).json({ success: false, error: "Gap brief not found" });
    return;
  }

  if (brief.ingestionBatchId != null) {
    res.status(409).json({ success: false, error: "Gap already escalated", data: { ingestionBatchId: brief.ingestionBatchId } });
    return;
  }

  if (!brief.isRealGap) {
    res.status(400).json({ success: false, error: "Cannot escalate a non-real gap" });
    return;
  }

  if (brief.priority !== "MEDIUM") {
    res.status(400).json({ success: false, error: `Manual escalation only allowed for MEDIUM gaps (this gap is ${brief.priority})` });
    return;
  }

  const [profile] = await db
    .select({ targetProducts: buyerProfilesTable.targetProducts })
    .from(buyerProfilesTable)
    .where(eq(buyerProfilesTable.id, brief.buyerProfileId));

  if (!profile) {
    res.status(404).json({ success: false, error: "Buyer profile not found" });
    return;
  }

  const adminId = requesterIdOf(req);

  try {
    const batchId = await escalateGap(
      gapId,
      { targetProducts: (profile.targetProducts ?? []) as string[] },
      { manual: true, actorAdminId: adminId },
    );

    if (batchId == null) {
      res.status(500).json({ success: false, error: "Escalation failed — no batch created" });
      return;
    }

    logInteraction({
      eventType: "buyer_gap_manually_escalated",
      actorType: "admin",
      referenceId: gapId,
      referenceType: "buyer_gap_brief",
      payload: { adminId, buyerProfileId: brief.buyerProfileId, batchId },
    });

    db.insert(buyerAdminActionsTable).values({
      actorAdminId: adminId,
      buyerProfileId: brief.buyerProfileId,
      actionType: "escalate_gap",
      payload: { gapId, ingestionBatchId: batchId },
      note: null,
    }).catch((err: unknown) => {
      logger.warn({ err, gapId, adminId }, "escalate_gap audit insert failed");
    });

    res.json({ success: true, data: { gapId, ingestionBatchId: batchId } });
  } catch (err: unknown) {
    logger.error({ err, gapId, adminId }, "Manual gap escalation failed");
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

// ── GET /api/admin/buyers/:id/activity ───────────────────────────────────────
router.get("/admin/buyers/:id/activity", ...adminOnly, async (req, res): Promise<void> => {
  const profileId = parseInt(req.params.id as string, 10);
  if (isNaN(profileId)) {
    res.status(400).json({ success: false, error: "Invalid buyer profile id" });
    return;
  }

  const rows = await db
    .select()
    .from(buyerAdminActionsTable)
    .where(eq(buyerAdminActionsTable.buyerProfileId, profileId))
    .orderBy(desc(buyerAdminActionsTable.createdAt))
    .limit(100);

  res.json({ success: true, data: rows });
});

// ── GET /api/admin/buyer-matches ─────────────────────────────────────────────
// Cross-buyer flat list of matches for the admin matches page.
router.get("/admin/buyer-matches", ...adminOnly, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query);

  const minScoreRaw = typeof req.query.min_score === "string" ? parseFloat(req.query.min_score) : NaN;
  const minScore = !isNaN(minScoreRaw) ? minScoreRaw : undefined;
  const supplierIdFilter = typeof req.query.supplier_id === "string" ? parseInt(req.query.supplier_id, 10) : NaN;
  const buyerProfileIdFilter = typeof req.query.buyer_profile_id === "string" ? parseInt(req.query.buyer_profile_id, 10) : NaN;
  const includeAll = req.query.include === "all";

  const conditions: SQL[] = [];
  if (!includeAll) conditions.push(eq(buyerMatchesTable.isCurrent, true));
  if (minScore !== undefined) conditions.push(sql`${buyerMatchesTable.matchScore} >= ${minScore}`);
  if (!isNaN(supplierIdFilter)) conditions.push(eq(buyerMatchesTable.supplierId, supplierIdFilter));
  if (!isNaN(buyerProfileIdFilter)) conditions.push(eq(buyerMatchesTable.buyerProfileId, buyerProfileIdFilter));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(buyerMatchesTable)
    .where(whereClause);

  const rows = await db
    .select({
      id: buyerMatchesTable.id,
      buyerProfileId: buyerMatchesTable.buyerProfileId,
      supplierId: buyerMatchesTable.supplierId,
      matchScore: buyerMatchesTable.matchScore,
      disqualifiers: buyerMatchesTable.disqualifiers,
      matchNotes: buyerMatchesTable.matchNotes,
      isCurrent: buyerMatchesTable.isCurrent,
      createdAt: buyerMatchesTable.createdAt,
      buyerCompany: buyerProfilesTable.companyName,
      buyerCountry: buyerProfilesTable.country,
      buyerEmail: usersTable.email,
      supplierName: suppliersTable.nombreCompleto,
      supplierMunicipio: suppliersTable.municipio,
      supplierStatus: suppliersTable.status,
    })
    .from(buyerMatchesTable)
    .leftJoin(buyerProfilesTable, eq(buyerProfilesTable.id, buyerMatchesTable.buyerProfileId))
    .leftJoin(usersTable, eq(usersTable.id, buyerProfilesTable.userId))
    .leftJoin(suppliersTable, eq(suppliersTable.id, buyerMatchesTable.supplierId))
    .where(whereClause)
    .orderBy(desc(buyerMatchesTable.matchScore), desc(buyerMatchesTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    success: true,
    data: {
      rows,
      total: Number(total),
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(Number(total) / limit)),
    },
  });
});

// ── GET /api/admin/buyer-gaps ────────────────────────────────────────────────
// Cross-buyer flat list of gap briefs for the admin gaps page.
router.get("/admin/buyer-gaps", ...adminOnly, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query);

  const priorityFilter = typeof req.query.priority === "string" ? req.query.priority : undefined;
  const pipelineActionFilter = typeof req.query.pipeline_action === "string" ? req.query.pipeline_action : undefined;
  const onlyUnresolved = req.query.only_unresolved !== "false";
  const onlyReal = req.query.only_real !== "false";

  const conditions: SQL[] = [];
  if (priorityFilter) conditions.push(eq(buyerGapBriefsTable.priority, priorityFilter));
  if (pipelineActionFilter) conditions.push(eq(buyerGapBriefsTable.pipelineAction, pipelineActionFilter));
  if (onlyUnresolved) conditions.push(isNull(buyerGapBriefsTable.resolvedAt));
  if (onlyReal) conditions.push(eq(buyerGapBriefsTable.isRealGap, true));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(buyerGapBriefsTable)
    .where(whereClause);

  const rows = await db
    .select({
      id: buyerGapBriefsTable.id,
      buyerProfileId: buyerGapBriefsTable.buyerProfileId,
      gapType: buyerGapBriefsTable.gapType,
      priority: buyerGapBriefsTable.priority,
      pipelineAction: buyerGapBriefsTable.pipelineAction,
      isRealGap: buyerGapBriefsTable.isRealGap,
      searchCategory: buyerGapBriefsTable.searchCategory,
      searchRegion: buyerGapBriefsTable.searchRegion,
      requiredAttributes: buyerGapBriefsTable.requiredAttributes,
      volumeTargetMt: buyerGapBriefsTable.volumeTargetMt,
      buyerUrgencyNote: buyerGapBriefsTable.buyerUrgencyNote,
      ingestionBatchId: buyerGapBriefsTable.ingestionBatchId,
      resolvedAt: buyerGapBriefsTable.resolvedAt,
      createdAt: buyerGapBriefsTable.createdAt,
      buyerCompany: buyerProfilesTable.companyName,
      buyerCountry: buyerProfilesTable.country,
      buyerEmail: usersTable.email,
    })
    .from(buyerGapBriefsTable)
    .leftJoin(buyerProfilesTable, eq(buyerProfilesTable.id, buyerGapBriefsTable.buyerProfileId))
    .leftJoin(usersTable, eq(usersTable.id, buyerProfilesTable.userId))
    .where(whereClause)
    .orderBy(
      sql`CASE ${buyerGapBriefsTable.priority} WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 WHEN 'LOW' THEN 2 ELSE 3 END`,
      desc(buyerGapBriefsTable.createdAt),
    )
    .limit(limit)
    .offset(offset);

  res.json({
    success: true,
    data: {
      rows,
      total: Number(total),
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(Number(total) / limit)),
    },
  });
});

// ── POST /api/admin/buyers/marketing-send ────────────────────────────────────
// Targets only buyers with marketing_opt_in = true and (optionally) a topic
// in marketing_topics. Sends in-process via the existing sendEmail helper.
const MarketingSendBody = z.object({
  subject: z.string().min(3).max(200),
  html: z.string().min(10).max(50_000),
  text: z.string().min(3).max(50_000).optional(),
  topic: z.string().min(1).max(80).optional(),
  country: z.string().min(2).max(80).optional(),
  state: z.string().min(2).max(40).optional(),
  dryRun: z.boolean().optional(),
});

router.post("/admin/buyers/marketing-send", ...adminOnly, async (req, res): Promise<void> => {
  const parsed = MarketingSendBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { subject, html, text, topic, country, state, dryRun } = parsed.data;
  const adminId = requesterIdOf(req);

  const conditions: SQL[] = [eq(buyerProfilesTable.marketingOptIn, true)];
  if (country) conditions.push(eq(buyerProfilesTable.country, country));
  if (state) conditions.push(eq(buyerProfilesTable.state, state));
  if (topic) conditions.push(sql`${topic} = ANY(${buyerProfilesTable.marketingTopics})`);

  const recipients = await db
    .select({
      profileId: buyerProfilesTable.id,
      email: usersTable.email,
      companyName: buyerProfilesTable.companyName,
    })
    .from(buyerProfilesTable)
    .innerJoin(usersTable, eq(usersTable.id, buyerProfilesTable.userId))
    .where(and(...conditions));

  if (dryRun) {
    res.json({
      success: true,
      data: {
        dryRun: true,
        recipients: recipients.length,
        sample: recipients.slice(0, 10).map((r) => ({ email: r.email, companyName: r.companyName })),
      },
    });
    return;
  }

  let sent = 0;
  let failed = 0;
  const failures: { email: string; error: string }[] = [];

  for (const r of recipients) {
    try {
      const result = await sendEmail({
        to: r.email,
        subject,
        html,
        text: text ?? html.replace(/<[^>]+>/g, ""),
      });
      if (result.ok) {
        sent += 1;
      } else {
        failed += 1;
        const errMsg =
          "detail" in result && result.detail
            ? `${result.reason}: ${result.detail}`
            : result.reason;
        failures.push({ email: r.email, error: errMsg });
        logger.warn(
          { reason: result.reason, email: r.email, profileId: r.profileId },
          "Marketing send: per-recipient failure",
        );
      }
    } catch (err: unknown) {
      failed += 1;
      failures.push({ email: r.email, error: errorMessage(err) });
      logger.warn(
        { err, email: r.email, profileId: r.profileId },
        "Marketing send: per-recipient exception",
      );
    }
  }

  logInteraction({
    eventType: "buyer_marketing_send",
    actorType: "admin",
    referenceId: adminId,
    referenceType: "user",
    payload: {
      adminId,
      subject,
      topic: topic ?? null,
      country: country ?? null,
      state: state ?? null,
      attempted: recipients.length,
      sent,
      failed,
    },
  });

  logger.info(
    { adminId, subject, attempted: recipients.length, sent, failed },
    "Buyer marketing send complete",
  );

  res.json({
    success: true,
    data: { attempted: recipients.length, sent, failed, failures: failures.slice(0, 20) },
  });
});

// ── PATCH /api/admin/users/:id ───────────────────────────────────────────────
router.patch("/admin/users/:id", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const parsed = AdminUserEditBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, role, firstName, lastName, country, phone, companyName } = parsed.data;

  // Fetch current user state before applying changes so we can detect a role change
  const [currentUser] = await db
    .select({ email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!currentUser) { res.status(404).json({ error: "User not found" }); return; }

  // Record whether a role change is happening before we apply the update
  const roleChanged = role !== undefined && role !== currentUser.role;
  const oldRole = currentUser.role;

  if (email || role) {
    const updates: Record<string, any> = {};
    if (email) updates.email = email;
    if (role) updates.role = role;
    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
  }

  if (firstName !== undefined || lastName !== undefined || country !== undefined || phone !== undefined) {
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
    const profileUpdates: Record<string, any> = {};
    if (firstName !== undefined) profileUpdates.firstName = firstName;
    if (lastName !== undefined) profileUpdates.lastName = lastName;
    if (country !== undefined) profileUpdates.country = country;
    if (phone !== undefined) profileUpdates.phone = phone;
    if (existing) {
      await db.update(profilesTable).set(profileUpdates).where(eq(profilesTable.userId, userId));
    } else {
      await db.insert(profilesTable).values({ userId, firstName: firstName ?? "", lastName: lastName ?? "", ...profileUpdates });
    }
  }

  if (companyName !== undefined) {
    const [existingCo] = await db.select({ id: companiesTable.id }).from(companiesTable).where(eq(companiesTable.userId, userId));
    if (existingCo) {
      await db.update(companiesTable).set({ name: companyName }).where(eq(companiesTable.userId, userId));
    } else {
      // Need a country for the NOT NULL column — fall back to profile country or empty string
      const [profile] = await db.select({ country: profilesTable.country }).from(profilesTable).where(eq(profilesTable.userId, userId));
      await db.insert(companiesTable).values({
        userId,
        name: companyName,
        country: profile?.country ?? "",
        type: "EXPORTER",
        description: "",
      });
    }
  }

  res.json({ success: true });

  // Fire-and-forget: notify the affected user if their role was changed
  if (roleChanged && role) {
    Promise.resolve().then(async () => {
      try {
        const recipientEmail = email ?? currentUser.email;
        if (!recipientEmail) return;
        const [profile] = await db
          .select({ firstName: profilesTable.firstName, lastName: profilesTable.lastName })
          .from(profilesTable)
          .where(eq(profilesTable.userId, userId));
        const name = profile?.firstName
          ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ""}`
          : recipientEmail;
        const appBaseUrl = process.env["FRONTEND_URL"]
          ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");
        const emailContent = adminRoleChangeEmail({
          name,
          oldRole,
          newRole: role,
          loginUrl: `${appBaseUrl}/login`,
        });
        await sendEmail({ to: recipientEmail, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
      } catch (err) {
        logger.error({ err, userId }, "Failed to send role-change email");
      }
    });
  }
});

// ── POST /api/admin/users/:id/reset-password ─────────────────────────────────
router.post("/admin/users/:id/reset-password", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const parsed = AdminResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  await db.update(usersTable).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(usersTable.id, userId));
  res.json({ success: true });

  // Fire-and-forget: security notice to the user whose password was reset
  Promise.resolve().then(async () => {
    try {
      const [targetUser] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
      if (!targetUser?.email) return;
      const [targetProfile] = await db.select({ firstName: profilesTable.firstName }).from(profilesTable).where(eq(profilesTable.userId, userId));
      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");
      const emailContent = adminPasswordResetEmail({
        firstName: targetProfile?.firstName || "there",
        loginUrl: `${appBaseUrl}/login`,
      });
      await sendEmail({ to: targetUser.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
    } catch (err) {
      logger.warn({ err, userId }, "Admin password reset security email failed");
    }
  });
});

// ── POST /api/admin/users ─────────────────────────────────────────────────────
router.post("/admin/users", ...adminOnly, async (req, res): Promise<void> => {
  const parsed = AdminCreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password, role, firstName, lastName, country, phone, companyName } = parsed.data;

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash: await hashPassword(password), role })
    .returning();

  if (firstName || lastName || country || phone) {
    await db.insert(profilesTable).values({
      userId: user.id,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      country: country ?? null,
      phone: phone ?? null,
      language: "en",
    });
  }

  if (companyName) {
    await db.insert(companiesTable).values({
      userId: user.id,
      name: companyName,
      country: country ?? "",
      type: "EXPORTER",
      description: "",
    });
  }

  res.status(201).json({ success: true, id: user.id });

  // Fire-and-forget: tell the new user their account was created
  Promise.resolve().then(async () => {
    try {
      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");
      const emailContent = adminCreatedAccountEmail({
        firstName: firstName || "there",
        email,
        forgotPasswordUrl: `${appBaseUrl}/forgot-password`,
      });
      await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
    } catch (err) {
      logger.warn({ err, userId: user.id }, "Admin-created account email failed");
    }
  });
});

// ── DELETE /api/admin/users/:id ──────────────────────────────────────────────
router.delete("/admin/users/:id", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const requesterId = (req as any).userId;
  if (userId === requesterId) {
    res.status(400).json({ error: "You cannot delete your own account" });
    return;
  }

  try {
    await db.delete(staffRolesTable).where(eq(staffRolesTable.userId, userId));
    await db.delete(profilesTable).where(eq(profilesTable.userId, userId));
    await db.delete(companiesTable).where(eq(companiesTable.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch (err: any) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === "23503") {
      res.status(409).json({
        error:
          "Cannot delete user: they have associated orders, RFQs, messages, or other records. Deactivate the account instead.",
      });
    } else {
      throw err;
    }
  }
});

// ── PATCH /api/admin/orders/:id/status ───────────────────────────────────────
router.patch("/admin/orders/:id/status", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const parsed = AdminOrderStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return; }

  const [updated] = await db.update(ordersTable).set({ status: parsed.data.status as any }).where(eq(ordersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }
  res.json({ success: true, status: updated.status });

  // Fire-and-forget: notify buyer of order status change
  Promise.resolve().then(async () => {
    try {
      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");

      const [buyerUser] = await db.select({ email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, updated.buyerId));
      if (!buyerUser?.email) return;

      const [buyerProfile] = await db.select({ firstName: profilesTable.firstName, lastName: profilesTable.lastName })
        .from(profilesTable).where(eq(profilesTable.userId, updated.buyerId));
      const buyerName = buyerProfile
        ? `${buyerProfile.firstName} ${buyerProfile.lastName}`.trim()
        : "Customer";

      const emailContent = orderStatusEmail({
        buyerName,
        orderId: updated.id,
        newStatus: updated.status,
        totalUSD: updated.totalUSD,
        incoterm: updated.incoterm ?? null,
        destinationPort: updated.destinationPort ?? null,
        orderUrl: `${appBaseUrl}/dashboard/orders/${updated.id}`,
      });

      if (emailContent) {
        await sendEmail({ to: buyerUser.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
      }
    } catch (err) {
      logger.warn({ err, orderId: id }, "Admin order status email failed");
    }
  });
});

// ── PATCH /api/admin/orders/:id/fee-status ───────────────────────────────────
const AdminOrderFeeStatusBody = z.object({
  feeStatus: z.enum(FEE_STATUSES),
});

router.patch("/admin/orders/:id/fee-status", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const parsed = AdminOrderFeeStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return; }

  const [updated] = await db
    .update(ordersTable)
    .set({ feeStatus: parsed.data.feeStatus, updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }

  logInteraction({
    eventType:     "fee_status_updated",
    actorType:     "admin",
    referenceId:   updated.id,
    referenceType: "order",
    payload:       { newStatus: parsed.data.feeStatus },
  });

  res.json({ success: true, id: updated.id, feeStatus: updated.feeStatus });
});

// ── PATCH /api/admin/loans/:id/status ────────────────────────────────────────
router.patch("/admin/loans/:id/status", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid loan id" }); return; }

  const parsed = AdminLoanStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return; }

  const [updated] = await db.update(loansTable).set({ status: parsed.data.status as any }).where(eq(loansTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Loan not found" }); return; }
  res.json({ success: true, status: updated.status });

  // Fire-and-forget: notify supplier(s) of loan status change via linked order
  Promise.resolve().then(async () => {
    try {
      if (!updated.orderId) {
        logger.info({ loanId: id }, "Loan status changed but no linked order — skipping supplier notification");
        return;
      }

      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");

      const orderRef = `ORD-${String(updated.orderId).padStart(4, "0")}`;

      // Resolve supplier(s) from order items → products → companies → users
      const items = await db.select({ productId: orderItemsTable.productId })
        .from(orderItemsTable).where(eq(orderItemsTable.orderId, updated.orderId));
      if (items.length === 0) return;

      const productIds = items.map(i => i.productId);
      const supplierCompanies = await db
        .selectDistinct({ companyId: productsTable.companyId })
        .from(productsTable)
        .where(inArray(productsTable.id, productIds));

      for (const { companyId } of supplierCompanies) {
        const [company] = await db.select({ name: companiesTable.name, userId: companiesTable.userId })
          .from(companiesTable).where(eq(companiesTable.id, companyId));
        if (!company) continue;

        const [supplierUser] = await db.select({ email: usersTable.email })
          .from(usersTable).where(eq(usersTable.id, company.userId));
        if (!supplierUser?.email) continue;

        const emailContent = loanStatusEmail({
          supplierName: company.name,
          orderId: updated.orderId,
          orderRef,
          newStatus: updated.status,
          principalUSD: updated.principalUSD,
          orderUrl: `${appBaseUrl}/supplier-dashboard/orders`,
        });

        if (emailContent) {
          await sendEmail({ to: supplierUser.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
        }
      }
    } catch (err) {
      logger.warn({ err, loanId: id }, "Admin loan status supplier email failed");
    }
  });
});

// ── PATCH /api/admin/suppliers/:id/status ────────────────────────────────────
router.patch("/admin/suppliers/:id/status", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid supplier id" }); return; }

  const parsed = AdminSupplierStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return; }

  const [updated] = await db
    .update(suppliersTable)
    .set({ status: parsed.data.status as any })
    .where(eq(suppliersTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Supplier not found" }); return; }

  res.json({ success: true, status: updated.status });

  // Fire status-change email if supplier has an email address (fire-and-forget)
  if (updated.email) {
    const appBaseUrl = process.env["FRONTEND_URL"]
      ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");
    const emailContent = supplierStatusChangeEmail({
      name: updated.nombreCompleto,
      newStatus: updated.status,
      reason: parsed.data.reason ?? null,
      appUrl: appBaseUrl,
    });
    if (emailContent) {
      sendEmail({
        to: updated.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }).catch((err) => logger.warn({ err, supplierId: id }, "Supplier status-change email failed"));
    }
  }
});

// ── PATCH /api/admin/suppliers/:id ───────────────────────────────────────────
// Edit supplier profile fields (basic info + farm primary product).
// Status is intentionally NOT editable here — use /admin/suppliers/:id/status.
router.patch("/admin/suppliers/:id", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid supplier id" }); return; }

  const parsed = AdminSupplierEditBody.safeParse(req.body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    res.status(400).json({
      error: flat.fieldErrors,
      formErrors: flat.formErrors,
    });
    return;
  }
  const data = parsed.data;

  // Build the supplier update set — only include fields that were provided.
  const supplierSet: Record<string, unknown> = {};
  if (data.nombreCompleto !== undefined) supplierSet["nombreCompleto"] = data.nombreCompleto;
  if (data.whatsappNumber !== undefined) supplierSet["whatsappNumber"] = data.whatsappNumber;
  if (data.email !== undefined) supplierSet["email"] = data.email;
  if (data.municipio !== undefined) supplierSet["municipio"] = data.municipio;
  if (data.department !== undefined) supplierSet["department"] = data.department;
  if (data.vereda !== undefined) supplierSet["vereda"] = data.vereda;
  if (data.supplierType !== undefined) supplierSet["supplierType"] = data.supplierType;
  if (data.registeredBy !== undefined) supplierSet["registeredBy"] = data.registeredBy;

  const hasSupplierUpdate = Object.keys(supplierSet).length > 0;

  // Wrap supplier + farm writes in a single transaction so a failure on either
  // side never leaves the supplier and its farm row in inconsistent state.
  let updated: typeof suppliersTable.$inferSelect | undefined;
  try {
    updated = await db.transaction(async (tx) => {
      let row: typeof suppliersTable.$inferSelect | undefined;
      if (hasSupplierUpdate) {
        [row] = await tx
          .update(suppliersTable)
          .set({ ...supplierSet, updatedAt: new Date() } as any)
          .where(eq(suppliersTable.id, id))
          .returning();
      } else {
        [row] = await tx
          .select()
          .from(suppliersTable)
          .where(eq(suppliersTable.id, id))
          .limit(1);
      }
      if (!row) {
        // Throw a sentinel so we can map to 404 outside the transaction.
        throw new Error("__SUPPLIER_NOT_FOUND__");
      }

      // Primary product → farms.cultivoPrincipal (upsert).
      if (data.primaryProduct !== undefined) {
        const [existingFarm] = await tx
          .select({ id: farmsTable.id })
          .from(farmsTable)
          .where(eq(farmsTable.supplierId, id))
          .limit(1);
        if (existingFarm) {
          await tx
            .update(farmsTable)
            .set({ cultivoPrincipal: data.primaryProduct })
            .where(eq(farmsTable.supplierId, id));
        } else {
          await tx.insert(farmsTable).values({
            supplierId: id,
            cultivoPrincipal: data.primaryProduct,
          });
        }
      }
      return row;
    });
  } catch (err: any) {
    if (err?.message === "__SUPPLIER_NOT_FOUND__") {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }
    // Partial-unique whatsapp index rejecting a duplicate.
    if (err?.code === "23505") {
      res.status(409).json({
        error: { whatsappNumber: ["Another supplier already uses this WhatsApp number"] },
      });
      return;
    }
    throw err;
  }

  // Audit trail — record who changed what (fire-and-forget).
  const actorId = (req as any).userId as number | undefined;
  logInteraction({
    eventType: "supplier_profile_updated",
    actorId: actorId ?? null,
    actorType: "admin",
    referenceId: id,
    referenceType: "supplier",
    payload: { updatedFields: Object.keys(data) },
  });

  res.json({
    success: true,
    supplier: updated,
    primaryProduct: data.primaryProduct,
  });
});

// ── GET /api/admin/team ───────────────────────────────────────────────────────
router.get("/admin/team", ...adminOnly, async (_req, res): Promise<void> => {
  const allRoles = await db
    .select({
      userId: staffRolesTable.userId,
      role: staffRolesTable.role,
      createdAt: staffRolesTable.createdAt,
      assignedByEmail: usersTable.email,
    })
    .from(staffRolesTable)
    .leftJoin(usersTable, eq(usersTable.id, staffRolesTable.assignedBy));

  const rolesByUser: Record<number, { role: string; assignedByEmail: string | null; createdAt: Date }[]> = {};
  for (const r of allRoles) {
    if (!rolesByUser[r.userId]) rolesByUser[r.userId] = [];
    rolesByUser[r.userId].push({ role: r.role, assignedByEmail: r.assignedByEmail, createdAt: r.createdAt });
  }

  const userIds = Object.keys(rolesByUser).map(Number);
  if (userIds.length === 0) {
    res.json([]);
    return;
  }

  const members = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
      firstName: profilesTable.firstName,
      lastName: profilesTable.lastName,
    })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .where(inArray(usersTable.id, userIds))
    .orderBy(desc(usersTable.createdAt));

  res.json(members.map((m) => ({ ...m, staffRoles: rolesByUser[m.id] ?? [] })));
});

// ── GET /api/admin/team/users ─────────────────────────────────────────────────
// Returns all users (for the assignment dropdown)
router.get("/admin/team/users", ...adminOnly, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query);
  const [{ total }] = await db.select({ total: count() }).from(usersTable);

  const data = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      firstName: profilesTable.firstName,
      lastName: profilesTable.lastName,
    })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .orderBy(usersTable.email)
    .limit(limit)
    .offset(offset);

  const existingRoles = await db
    .select({ userId: staffRolesTable.userId, role: staffRolesTable.role })
    .from(staffRolesTable)
    .where(inArray(staffRolesTable.userId, data.map((u) => u.id)));

  const roleMap: Record<number, string[]> = {};
  for (const r of existingRoles) {
    if (!roleMap[r.userId]) roleMap[r.userId] = [];
    roleMap[r.userId].push(r.role);
  }

  res.json({
    data: data.map((u) => ({ ...u, staffRoles: roleMap[u.id] ?? [] })),
    total: Number(total),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(Number(total) / limit)),
  });
});

// ── POST /api/admin/team/:userId/roles ─────────────────────────────────────────
router.post("/admin/team/:userId/roles", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const parsed = StaffRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const adminId = (req as any).userId;

  await db
    .insert(staffRolesTable)
    .values({ userId, role: parsed.data.role, assignedBy: adminId })
    .onConflictDoNothing();

  res.json({ success: true });
});

// ── DELETE /api/admin/team/:userId/roles/:role ────────────────────────────────
router.delete("/admin/team/:userId/roles/:role", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId as string, 10);
  const role = req.params.role as string;

  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }
  if (!(STAFF_ROLE_VALUES as readonly string[]).includes(role)) {
    res.status(400).json({ error: `Invalid role. Must be one of: ${STAFF_ROLE_VALUES.join(", ")}` });
    return;
  }

  await db
    .delete(staffRolesTable)
    .where(and(eq(staffRolesTable.userId, userId), eq(staffRolesTable.role, role as any)));

  res.json({ success: true });
});

// ── POST /api/admin/suppliers/:companyId/recompute-trust ─────────────────────
router.post("/admin/suppliers/:companyId/recompute-trust", ...adminOnly, async (req, res): Promise<void> => {
  const companyId = parseInt(req.params.companyId as string, 10);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid company id" }); return; }

  const score = await computeTrustScore(companyId);
  res.json({ companyId, score });
});

// ── POST /api/admin/suppliers/:id/create-product ─────────────────────────────
const AdminCreateProductBody = z.object({
  name:          z.string().min(1),
  pricePerKgUSD: z.number().positive(),
});

router.post("/admin/suppliers/:id/create-product", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const supplierId = parseInt(req.params.id as string, 10);
  if (isNaN(supplierId)) {
    res.status(400).json({ error: "Invalid supplier id" });
    return;
  }

  const parsed = AdminCreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const [supplier] = await db
    .select({ id: suppliersTable.id, municipio: suppliersTable.municipio })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!supplier) {
    logger.error({ event: "PRODUCT_CREATE_SUPPLIER_MISSING", supplierId },
      "Supplier not found during product creation");
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  // Derive companyId: env-var override takes priority; falls through to strict
  // fail-fast name lookup if the var is absent. Both paths abort on any
  // ambiguity or missing row — no silent fallbacks.
  let companyId: number;

  const envCompanyId = process.env.FINCAVA_COMPANY_ID;

  if (envCompanyId !== undefined) {
    const parsed = parseInt(envCompanyId, 10);
    if (isNaN(parsed)) {
      logger.error({ event: "COMPANY_RESOLUTION_FAILED", supplierId,
        envCompanyId }, "Company resolution failed");
      res.status(500).json({ error: "Configured FINCAVA_COMPANY_ID not found" });
      return;
    }

    const [envRow] = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.id, parsed))
      .limit(1);

    if (!envRow) {
      logger.error({ event: "COMPANY_RESOLUTION_FAILED", supplierId,
        envCompanyId }, "Company resolution failed");
      res.status(500).json({ error: "Configured FINCAVA_COMPANY_ID not found" });
      return;
    }

    logger.info({ event: "COMPANY_RESOLUTION_ENV", companyId: envCompanyId });
    companyId = envRow.id;
  } else {
    // Strict fail-fast name lookup — requires exactly one match.
    const fincavaRows = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.name, "FINCAVA"));

    const matchCount = fincavaRows.length;

    if (matchCount === 0) {
      logger.error({ event: "COMPANY_RESOLUTION_FAILED", supplierId, matchCount },
        "Company resolution failed");
      res.status(500).json({ error: "FINCAVA company not found — cannot create product" });
      return;
    }

    if (matchCount > 1) {
      logger.error({ event: "COMPANY_RESOLUTION_FAILED", supplierId, matchCount },
        "Company resolution failed");
      res.status(500).json({ error: "Ambiguous company match — aborting product creation" });
      return;
    }

    companyId = fincavaRows[0].id;
  }

  const origin = supplier.municipio?.trim() || "Colombia";

  const [product] = await db
    .insert(productsTable)
    .values({
      companyId,
      supplierId,
      name:          parsed.data.name,
      pricePerKgUSD: parsed.data.pricePerKgUSD,
      description:   "Initial product",
      origin,
      certifications: [],
      organic:        false,
      directTrade:    false,
    })
    .returning();

  logInteraction({
    eventType:     "product_created",
    actorType:     "admin",
    referenceType: "product",
    referenceId:   product.id,
    payload:       { supplierId },
  });

  logger.info({ event: "PRODUCT_CREATED", supplierId, productId: product.id },
    "Admin created product for supplier");
  incrementAndMaybeLog(logger, "products", { supplierId, productId: product.id });

  res.status(201).json({
    id:            product.id,
    name:          product.name,
    pricePerKgUSD: product.pricePerKgUSD,
    supplierId:    product.supplierId,
  });
});

// ── POST /api/admin/backup/run ────────────────────────────────────────────────
// Two valid auth paths:
//   1. X-Backup-Token: <BACKUP_SECRET_V2>  — external cron caller (cron-job.org)
//   2. Standard admin JWT                  — manual trigger by admin user
// ── INGESTION ROUTES ─────────────────────────────────────────────────────────

// POST /api/admin/ingestion/batches — create a new ingestion batch
router.post("/admin/ingestion/batches", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const body = BatchCreateBody.safeParse(req.body);
  if (!body.success) {
    res.status(422).json({ error: "Invalid batch data", issues: body.error.issues });
    return;
  }
  const adminId = (req as any).userId as number;
  const batchUuid = randomUUID();

  const [batch] = await db
    .insert(supplierIngestionBatchesTable)
    .values({
      batchUuid,
      createdByAdminId: adminId,
      status: "DRAFT",
      batchSize: body.data.batchSize ?? null,
      notes: body.data.notes ?? null,
    })
    .returning();

  logInteraction({
    eventType: INTERACTION_TYPES.INGESTION_BATCH_CREATED,
    actorId: adminId,
    actorType: "admin",
    referenceId: batch.id,
    referenceType: "ingestion_batch",
    payload: { batchId: batch.id, batchUuid },
  });

  res.status(201).json(batch);
});

// GET /api/admin/ingestion/batches — list ingestion batches
router.get("/admin/ingestion/batches", ...adminOnly, async (_req: Request, res: Response): Promise<void> => {
  const batches = await db
    .select()
    .from(supplierIngestionBatchesTable)
    .orderBy(desc(supplierIngestionBatchesTable.createdAt))
    .limit(100);
  res.json(batches);
});

// GET /api/admin/ingestion/duplicate-check — check for duplicate supplier
router.get("/admin/ingestion/duplicate-check", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const query = DuplicateCheckQuery.safeParse(req.query);
  if (!query.success) {
    res.status(422).json({ error: "Missing nombre query param", issues: query.error.issues });
    return;
  }
  const result = await checkDuplicate(query.data.nombre, query.data.country);
  res.json(result);
});

// POST /api/admin/ingestion/enrich — call Claude Sonnet enrichment (does NOT save to DB)
router.post("/admin/ingestion/enrich", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const body = EnrichmentRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(422).json({ error: "Invalid enrichment request", issues: body.error.issues });
    return;
  }
  const adminId = (req as any).userId as number;

  let enriched;
  try {
    enriched = await enrichSupplierWithAI(body.data.input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI enrichment failed";
    res.status(502).json({ error: msg });
    return;
  }

  logInteraction({
    eventType: INTERACTION_TYPES.SUPPLIER_ENRICHED,
    actorId: adminId,
    actorType: "admin",
    referenceId: body.data.supplierId ?? null,
    referenceType: "supplier",
    payload: { supplierId: body.data.supplierId, fieldsAdded: Object.keys(enriched), confidenceScore: enriched.confidenceScore },
  });

  // T5: Persist confidence score to the supplier record when supplierId is provided.
  if (body.data.supplierId) {
    await db
      .update(suppliersTable)
      .set({ confidenceScore: enriched.confidenceScore.toString(), updatedAt: new Date() })
      .where(eq(suppliersTable.id, body.data.supplierId));
  }

  res.json(enriched);
});

// POST /api/admin/ingestion/suppliers — create an ingested supplier
router.post("/admin/ingestion/suppliers", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const body = IngestionSupplierBody.safeParse(req.body);
  if (!body.success) {
    res.status(422).json({ error: "Invalid supplier data", issues: body.error.issues });
    return;
  }
  const adminId = (req as any).userId as number;
  const { nombreCompleto, municipio, department, vereda, whatsappNumber, email, supplierType,
          description, normalizedName, sourceUrl, country, categoryHint, batchId,
          overrideDuplicateId, overrideJustification } = body.data;

  // Duplicate check — block save unless admin explicitly overrides
  const dupResult = await checkDuplicate(nombreCompleto, country);
  if (dupResult.hasDuplicate && !overrideDuplicateId) {
    res.status(409).json({
      error: "Potential duplicate supplier detected",
      duplicate: dupResult,
    });
    return;
  }
  if (dupResult.hasDuplicate && overrideDuplicateId && !overrideJustification?.trim()) {
    res.status(422).json({ error: "overrideJustification is required when overriding a duplicate and must not be empty" });
    return;
  }

  const fingerprint = computeSupplierFingerprint(nombreCompleto, country);

  const [supplier] = await db
    .insert(suppliersTable)
    .values({
      nombreCompleto,
      whatsappNumber: whatsappNumber ?? null,
      email: email ?? null,
      municipio,
      department: department ?? null,
      vereda: vereda ?? null,
      supplierType: supplierType ?? "FARMER",
      status: "ACTIVE",
      consentGiven: false,
      normalizedName: normalizedName ?? null,
      description: description ?? null,
      sourceUrl: sourceUrl ?? null,
      country: country ?? "Colombia",
      supplierFingerprint: fingerprint,
      ingestionSource: "ADMIN_ENTRY",
      ingestionStatus: "DRAFT",
      claimStatus: "UNCLAIMED",
      createdByAdminId: adminId,
      batchId: batchId ?? null,
    })
    .returning();

  // Create product placeholder if a category hint was supplied
  if (categoryHint) {
    await db.insert(productPlaceholdersTable).values({
      supplierId: supplier.id,
      categoryHint,
      dataOrigin: "inferred",
      verificationStatus: "unverified",
    });
  }

  logInteraction({
    eventType: INTERACTION_TYPES.SUPPLIER_INGESTED,
    actorId: adminId,
    actorType: "admin",
    referenceId: supplier.id,
    referenceType: "supplier",
    payload: {
      batchId: batchId ?? null,
      source: "ADMIN_ENTRY",
      fingerprint,
      overriddenDuplicateId: overrideDuplicateId ?? null,
    },
  });

  // T5: Audit log for duplicate override.
  if (dupResult.hasDuplicate && overrideDuplicateId && overrideJustification && dupResult.matchedSupplierId) {
    logDuplicateOverride(supplier.id, dupResult.matchedSupplierId, overrideJustification, adminId);
  }

  res.status(201).json(supplier);
});

// ── Shared helper: setIngestionStatus ────────────────────────────────────────
// Single source of truth for the ingestionStatus DB write used by both the T1
// PATCH route and batch-confirm. Logs INGESTION_BATCH_SUBMITTED on every call.
// Returns the updated row, or null if the supplier was not found.

type IngestionStatus = "DRAFT" | "ENRICHED" | "READY" | "REJECTED";

async function setIngestionStatus(
  supplierId: number,
  newStatus: IngestionStatus,
  adminId: number,
): Promise<{ id: number; ingestionStatus: IngestionStatus | null } | null> {
  const [updated] = await db
    .update(suppliersTable)
    .set({ ingestionStatus: newStatus, updatedAt: new Date() })
    .where(eq(suppliersTable.id, supplierId))
    .returning({ id: suppliersTable.id, ingestionStatus: suppliersTable.ingestionStatus });

  if (!updated) {
    return null;
  }

  logInteraction({
    eventType: INTERACTION_TYPES.INGESTION_BATCH_SUBMITTED,
    actorId: adminId,
    actorType: "admin",
    referenceId: supplierId,
    referenceType: "supplier",
    payload: { newStatus },
  });

  return updated;
}

// PATCH /api/admin/ingestion/suppliers/:id/ingestion-status — update ingestion status
router.patch("/admin/ingestion/suppliers/:id/ingestion-status", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const supplierId = Number(req.params.id);
  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    res.status(400).json({ error: "Invalid supplier id" });
    return;
  }
  const body = IngestionStatusUpdateBody.safeParse(req.body);
  if (!body.success) {
    res.status(422).json({ error: "Invalid status", issues: body.error.issues });
    return;
  }
  const adminId = (req as any).userId as number;

  const updated = await setIngestionStatus(supplierId, body.data.ingestionStatus, adminId);
  if (!updated) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  res.json(updated);
});

// POST /api/admin/ingestion/batches/:id/submit — submit an ingestion batch
router.post("/admin/ingestion/batches/:id/submit", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const batchId = Number(req.params.id);
  if (!Number.isInteger(batchId) || batchId <= 0) {
    res.status(400).json({ error: "Invalid batch id" });
    return;
  }
  const adminId = (req as any).userId as number;

  const [batch] = await db
    .update(supplierIngestionBatchesTable)
    .set({ status: "SUBMITTED", submittedAt: new Date() })
    .where(eq(supplierIngestionBatchesTable.id, batchId))
    .returning();

  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }

  logInteraction({
    eventType: INTERACTION_TYPES.INGESTION_BATCH_SUBMITTED,
    actorId: adminId,
    actorType: "admin",
    referenceId: batchId,
    referenceType: "ingestion_batch",
    payload: { batchId, batchUuid: batch.batchUuid },
  });

  res.json(batch);
});

// ── POST /api/admin/ingestion/discover — ephemeral lead discovery via Claude Haiku ──
router.post("/admin/ingestion/discover", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const parsed = DiscoveryRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const adminId = (req as any).userId as number;
  const { category, region, maxResults } = parsed.data;

  try {
    const leads = await discoverLeads({ category, region, maxResults });
    logInteraction({
      eventType: INTERACTION_TYPES.SUPPLIER_DISCOVERED,
      actorId: adminId,
      actorType: "admin",
      payload: { category, region, maxResults, count: leads.length },
    });
    res.json({ leads, count: leads.length });
  } catch (err) {
    req.log.warn({ err, category, region }, "admin/ingestion/discover: discovery failed");
    const message = err instanceof Error ? err.message : "Discovery failed — please try again.";
    res.status(502).json({ error: message });
  }
});

// ── Helper: confirmSingleIngestion ────────────────────────────────────────────
// Extracted T1 confirm logic — transitions DRAFT or ENRICHED suppliers to READY.
// Idempotent: if already READY, returns the supplierId without error.
// Throws for NOT_FOUND or REJECTED (rejected suppliers require manual admin action).
// All throws are caught by the batch-confirm loop; failures never abort siblings.

async function confirmSingleIngestion(supplierId: number, adminId: number): Promise<number> {
  const [existing] = await db
    .select({ id: suppliersTable.id, ingestionStatus: suppliersTable.ingestionStatus })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId));

  if (!existing) {
    throw new Error(`Supplier ${supplierId} not found`);
  }

  // Idempotent: already at terminal confirmed state — skip silently
  if (existing.ingestionStatus === "READY") {
    return existing.id;
  }

  // REJECTED suppliers are not auto-promoted — admin must manually update status
  if (existing.ingestionStatus === "REJECTED") {
    throw new Error(`Supplier ${supplierId} is REJECTED and cannot be batch-confirmed`);
  }

  // DRAFT and ENRICHED are both promotable → READY.
  // Delegate to setIngestionStatus — the canonical T1 status-update path (shared with
  // PATCH /admin/ingestion/suppliers/:id/ingestion-status). This keeps all DB writes
  // and INGESTION_BATCH_SUBMITTED logging in one place.
  const updated = await setIngestionStatus(supplierId, "READY", adminId);
  if (!updated) {
    throw new Error(`Failed to confirm supplier ${supplierId}`);
  }

  // Funnel event: per-lead submission confirmed (distinct from the generic
  // INGESTION_BATCH_SUBMITTED emitted by setIngestionStatus on every status write).
  logInteraction({
    eventType: INTERACTION_TYPES.INGESTION_SUBMITTED,
    actorId: adminId,
    actorType: "admin",
    referenceId: updated.id,
    referenceType: "supplier",
    payload: { supplierId: updated.id, source: "BATCH_CONFIRM", fromStatus: existing.ingestionStatus },
  });

  return updated.id;
}

// ── POST /api/admin/ingestion/batch-confirm ────────────────────────────────────
// Accepts supplier IDs (DRAFT suppliers created via T1 form or quick-create) and
// transitions each to ingestionStatus = READY via the extracted T1 confirm logic.
// One failing lead does not abort others — always returns partial success.
router.post("/admin/ingestion/batch-confirm", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const parsed = BatchConfirmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Invalid batch-confirm request", issues: parsed.error.issues });
    return;
  }

  const adminId = (req as any).userId as number;
  const { leadIds } = parsed.data;

  const successIds: number[] = [];
  const failed: { leadId: number; error: string }[] = [];

  for (const leadId of leadIds) {
    try {
      const confirmedId = await confirmSingleIngestion(leadId, adminId);
      successIds.push(confirmedId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      req.log.warn({ err, leadId }, "admin/ingestion/batch-confirm: lead confirmation failed");
      failed.push({ leadId, error: message });
    }
  }

  logInteraction({
    eventType: INTERACTION_TYPES.BATCH_CONFIRM_EXECUTED,
    actorId: adminId,
    actorType: "admin",
    payload: {
      total: leadIds.length,
      successCount: successIds.length,
      failureCount: failed.length,
    },
  });

  // Always 201 — 4xx is reserved for invalid request shape (handled above).
  // Callers inspect { success, failed } to determine per-item outcomes.
  res.status(201).json({
    success: successIds,
    failed,
  });
});

// ─────────────────────────────────────────────────────────────────────────────

router.post("/admin/backup/run", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const backupSecret = process.env.BACKUP_SECRET_V2;
  const tokenHeader  = req.headers["x-backup-token"];

  if (backupSecret && tokenHeader === backupSecret) {
    // Cron path — bypass JWT middleware
    try {
      const result = await runBackup();
      res.json({ success: true, file: result.filename, fileSizeBytes: result.fileSizeBytes });
    } catch (err) {
      logger.error({ err }, "Backup failed (cron path)");
      res.status(500).json({ error: "Backup failed" });
    }
    return;
  }

  // Admin JWT path — run adminOnly middleware chain then execute backup
  adminOnly[0](req, res, () => {
    adminOnly[1](req, res, async () => {
      try {
        const result = await runBackup();
        res.json({ success: true, file: result.filename, fileSizeBytes: result.fileSizeBytes });
      } catch (err) {
        logger.error({ err }, "Backup failed (admin path)");
        res.status(500).json({ error: "Backup failed" });
      }
    });
  });
});

export default router;
