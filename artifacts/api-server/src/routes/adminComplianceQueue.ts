// CC-1C: Admin Compliance Queue
// Routes (mounted under /api via index.ts):
//   GET  /admin/compliance-queue                       ranked supplier list
//   GET  /admin/compliance-queue/:supplierId           supplier detail
//   POST /admin/compliance/review/:requirementId       admin decision

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, aiOutputsTable } from "@workspace/db";
import {
  suppliersTable,
  supplierRequirementStatusTable,
  complianceDocumentsV2Table,
  adminComplianceReviewsTable,
} from "@workspace/db";
import { adminOnly } from "../middleware/admin";
import { sendError } from "../lib/response";
import { parsePagination } from "../schemas";
import { logger } from "../lib/logger";
import { and, eq, desc, asc, count, inArray, isNotNull, lte, notInArray, sql, gt } from "drizzle-orm";
import { evaluateRiskPatterns, type RequirementSnapshot, type SupplierContext } from "../services/risk-pattern-service";
import { scoreSupplier } from "../services/scoring-service";

type AuthedRequest = Request & { userId: number };
const requesterIdOf = (req: Request): number => (req as AuthedRequest).userId;

const router: IRouter = Router();

// Valid review decisions and the resulting requirement state
const VALID_DECISIONS = [
  "verified",
  "needs_fix",
  "conditionally_approved",
  "rejected",
  "escalated",
] as const;
type ReviewDecision = (typeof VALID_DECISIONS)[number];

const DECISION_TO_STATE: Record<ReviewDecision, string> = {
  verified: "verified",
  needs_fix: "needs_fix",
  conditionally_approved: "conditionally_approved",
  rejected: "rejected",
  escalated: "assisted_in_progress", // escalated = hand to assisted track
};

// Valid state transitions: current state → allowed target states
const ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  not_started: new Set(["not_sure", "self_serve_in_progress", "assisted_in_progress", "managed_service_candidate"]),
  not_sure: new Set(["self_serve_in_progress", "assisted_in_progress", "managed_service_candidate"]),
  self_serve_in_progress: new Set(["submitted", "assisted_in_progress", "needs_fix"]),
  assisted_in_progress: new Set(["submitted", "managed_service_candidate", "needs_fix"]),
  managed_service_candidate: new Set(["assisted_in_progress", "submitted"]),
  submitted: new Set(["needs_fix", "conditionally_approved", "verified", "rejected"]),
  needs_fix: new Set(["submitted", "assisted_in_progress"]),
  conditionally_approved: new Set(["verified", "rejected"]),
  verified: new Set([]),
  rejected: new Set([]),
};

// ── GET /api/admin/compliance-queue ──────────────────────────────────────────
// Returns suppliers ranked by pending compliance requirements (most gaps first).
// Suppliers with no requirement rows are excluded — they have not been scored.
// Layer C: each item is enriched with riskFlags from the risk-pattern-service.
router.get(
  "/admin/compliance-queue",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const { page, limit, offset } = parsePagination(req.query);

    // Count pending/needs_fix requirements per supplier for ranking
    const ranked = await db
      .select({
        supplierId: supplierRequirementStatusTable.supplierId,
        nombreCompleto: suppliersTable.nombreCompleto,
        municipio: suppliersTable.municipio,
        department: suppliersTable.department,
        sellableStatus: suppliersTable.sellableStatus,
        supplierType: suppliersTable.supplierType,
        commercialScore: suppliersTable.commercialScore,
        eligibilityStatus: suppliersTable.eligibilityStatus,
        totalRequirements: count(supplierRequirementStatusTable.id),
        pendingCount: sql<number>`
          COUNT(*) FILTER (WHERE ${supplierRequirementStatusTable.state} IN (
            'not_started','not_sure','self_serve_in_progress',
            'assisted_in_progress','managed_service_candidate','submitted','needs_fix'
          ))
        `.mapWith(Number),
        verifiedCount: sql<number>`
          COUNT(*) FILTER (WHERE ${supplierRequirementStatusTable.state} = 'verified')
        `.mapWith(Number),
      })
      .from(supplierRequirementStatusTable)
      .innerJoin(suppliersTable, eq(suppliersTable.id, supplierRequirementStatusTable.supplierId))
      .groupBy(
        supplierRequirementStatusTable.supplierId,
        suppliersTable.nombreCompleto,
        suppliersTable.municipio,
        suppliersTable.department,
        suppliersTable.sellableStatus,
        suppliersTable.supplierType,
        suppliersTable.commercialScore,
        suppliersTable.eligibilityStatus,
      )
      .orderBy(
        desc(sql`COUNT(*) FILTER (WHERE ${supplierRequirementStatusTable.state} IN (
          'not_started','not_sure','self_serve_in_progress',
          'assisted_in_progress','managed_service_candidate','submitted','needs_fix'
        ))`),
        asc(suppliersTable.sellableStatus),
      )
      .limit(limit)
      .offset(offset);

    // Layer C: batch-fetch all requirement rows for this page of suppliers,
    // then evaluate risk patterns per supplier inline.
    const supplierIds = ranked.map((r) => r.supplierId);
    let requirementRows: { supplierId: number; requirementCode: string; state: string; agency: string; updatedAt: Date }[] = [];
    if (supplierIds.length > 0) {
      requirementRows = await db
        .select({
          supplierId: supplierRequirementStatusTable.supplierId,
          requirementCode: supplierRequirementStatusTable.requirementCode,
          state: supplierRequirementStatusTable.state,
          agency: supplierRequirementStatusTable.agency,
          updatedAt: supplierRequirementStatusTable.updatedAt,
        })
        .from(supplierRequirementStatusTable)
        .where(inArray(supplierRequirementStatusTable.supplierId, supplierIds));
    }

    const reqBySupplier = new Map<number, RequirementSnapshot[]>();
    for (const row of requirementRows) {
      const list = reqBySupplier.get(row.supplierId) ?? [];
      list.push(row);
      reqBySupplier.set(row.supplierId, list);
    }

    const items = ranked.map((r) => {
      const supplierContext: SupplierContext = {
        commercialScore: r.commercialScore ?? null,
        eligibilityStatus: r.eligibilityStatus ?? null,
      };
      const riskFlags = evaluateRiskPatterns(
        reqBySupplier.get(r.supplierId) ?? [],
        supplierContext,
      );
      return { ...r, riskFlags };
    });

    res.json({ page, pageSize: limit, items });
  },
);

// ── GET /api/admin/compliance-queue/:supplierId ───────────────────────────────
// Full compliance detail for a single supplier: all requirements + documents.
router.get(
  "/admin/compliance-queue/:supplierId",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseInt(String(req.params.supplierId), 10);
    if (!Number.isFinite(supplierId)) {
      sendError(res, 400, "Invalid supplierId");
      return;
    }

    const [supplier] = await db
      .select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId));

    if (!supplier) {
      sendError(res, 404, "Supplier not found");
      return;
    }

    const requirements = await db
      .select()
      .from(supplierRequirementStatusTable)
      .where(eq(supplierRequirementStatusTable.supplierId, supplierId))
      .orderBy(asc(supplierRequirementStatusTable.requirementCode));

    const documents = await db
      .select()
      .from(complianceDocumentsV2Table)
      .where(eq(complianceDocumentsV2Table.supplierId, supplierId))
      .orderBy(desc(complianceDocumentsV2Table.createdAt));

    const reviews = await db
      .select()
      .from(adminComplianceReviewsTable)
      .where(eq(adminComplianceReviewsTable.supplierId, supplierId))
      .orderBy(desc(adminComplianceReviewsTable.reviewedAt));

    // Layer C: inject riskFlags into the detail response
    const requirementSnapshots: RequirementSnapshot[] = requirements.map((r) => ({
      requirementCode: r.requirementCode,
      state: r.state,
      agency: r.agency,
      updatedAt: r.updatedAt,
    }));
    const supplierContext: SupplierContext = {
      commercialScore: supplier.commercialScore ?? null,
      eligibilityStatus: supplier.eligibilityStatus ?? null,
    };
    const riskFlags = evaluateRiskPatterns(requirementSnapshots, supplierContext);

    res.json({ supplier, requirements, documents, reviews, riskFlags });
  },
);

// ── POST /api/admin/compliance/review/:requirementId ─────────────────────────
// Admin submits a review decision for a specific requirement row.
const ReviewBody = z.object({
  decision: z.enum(VALID_DECISIONS),
  visibleNote: z.string().max(1000).optional(),
  internalNote: z.string().max(2000).optional(),
  reasonCode: z.string().max(100).optional(),
  documentId: z.number().int().positive().optional(),
  // Optional expiry date (ISO string) — only meaningful for verified/conditionally_approved
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

router.post(
  "/admin/compliance/review/:requirementId",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const requirementId = parseInt(String(req.params.requirementId), 10);
    if (!Number.isFinite(requirementId)) {
      sendError(res, 400, "Invalid requirementId");
      return;
    }

    const parsed = ReviewBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? "Invalid body");
      return;
    }
    const { decision, visibleNote, internalNote, reasonCode, documentId, expiresAt } = parsed.data;

    // Check row exists
    const [requirement] = await db
      .select()
      .from(supplierRequirementStatusTable)
      .where(eq(supplierRequirementStatusTable.id, requirementId));

    if (!requirement) {
      sendError(res, 404, "Requirement row not found");
      return;
    }

    // Validate state transition
    const targetState = DECISION_TO_STATE[decision];
    const allowed = ALLOWED_TRANSITIONS[requirement.state] ?? new Set();
    if (!allowed.has(targetState)) {
      sendError(
        res,
        409,
        `Cannot transition from '${requirement.state}' to '${targetState}' (decision: ${decision})`,
      );
      return;
    }

    const reviewerId = requesterIdOf(req);
    const now = new Date();

    // Write append-only review record
    await db.insert(adminComplianceReviewsTable).values({
      supplierId: requirement.supplierId,
      requirementCode: requirement.requirementCode,
      documentId: documentId ?? null,
      decision,
      reasonCode: reasonCode ?? null,
      visibleNote: visibleNote ?? null,
      internalNote: internalNote ?? null,
      reviewerId,
    });

    // Compute verifiedAt and expiresAt updates:
    // - verifiedAt: set on first verification (verified / conditionally_approved), preserved thereafter
    // - expiresAt:  set when admin provides an explicit expiry; also cleared on rejection
    const isVerifyingDecision = targetState === "verified" || targetState === "conditionally_approved";
    const isRejectingDecision = targetState === "rejected";

    const reqStatusUpdates: Record<string, unknown> = {
      state: targetState,
      adminRequired: decision === "escalated" ? true : requirement.adminRequired,
      updatedAt: now,
    };

    if (isVerifyingDecision) {
      // Only stamp verifiedAt on the first verification (don't overwrite historical stamp)
      if (!requirement.verifiedAt) {
        reqStatusUpdates.verifiedAt = now;
      }
      if (expiresAt !== undefined) {
        reqStatusUpdates.expiresAt = new Date(expiresAt);
      }
    }

    if (isRejectingDecision) {
      // Rejected requirements have no valid expiry
      reqStatusUpdates.expiresAt = null;
    }

    // Advance requirement state
    await db
      .update(supplierRequirementStatusTable)
      .set(reqStatusUpdates)
      .where(eq(supplierRequirementStatusTable.id, requirementId));

    // OD-5: Event-driven re-score when a requirement moves to 'verified'.
    // 5-minute debounce guard prevents a scoring storm when an admin verifies
    // multiple requirements in quick succession.
    if (targetState === "verified") {
      const supplierIdToRescore = requirement.supplierId;
      setImmediate(async () => {
        try {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const [recentScore] = await db
            .select({ id: aiOutputsTable.id })
            .from(aiOutputsTable)
            .where(
              and(
                eq(aiOutputsTable.supplierId, supplierIdToRescore),
                eq(aiOutputsTable.callType, "ONBOARD_SCORE"),
                gt(aiOutputsTable.createdAt, fiveMinutesAgo),
              ),
            )
            .limit(1);

          if (recentScore) {
            logger.info(
              { supplierId: supplierIdToRescore },
              "compliance-review: skipping auto-rescore — scored within last 5 min (OD-5)",
            );
            return;
          }

          logger.info(
            { supplierId: supplierIdToRescore, requirementId },
            "compliance-review: triggering auto-rescore after verified transition (OD-5)",
          );
          await scoreSupplier(supplierIdToRescore);
        } catch (rescoreErr) {
          logger.warn(
            { supplierId: supplierIdToRescore, err: rescoreErr },
            "compliance-review: auto-rescore failed (non-fatal, OD-5)",
          );
        }
      });
    }

    logger.info(
      {
        reviewerId,
        requirementId,
        supplierId: requirement.supplierId,
        decision,
        targetState,
        verifiedAt: reqStatusUpdates.verifiedAt ?? requirement.verifiedAt ?? null,
        expiresAt: reqStatusUpdates.expiresAt ?? requirement.expiresAt ?? null,
      },
      "admin compliance review submitted (CC-1C/CC-4)",
    );

    res.json({
      ok: true,
      requirementId,
      decision,
      newState: targetState,
      verifiedAt: (reqStatusUpdates.verifiedAt as Date | undefined)?.toISOString()
        ?? requirement.verifiedAt?.toISOString()
        ?? null,
      expiresAt: isRejectingDecision
        ? null
        : (reqStatusUpdates.expiresAt as Date | undefined)?.toISOString()
          ?? requirement.expiresAt?.toISOString()
          ?? null,
    });
  },
);

// ── GET /api/admin/compliance/expiring ────────────────────────────────────────
// Returns requirement rows where expiresAt is set and falls within ?days (default 30).
// Excludes already-rejected requirements. Ordered by soonest expiry first.
router.get(
  "/admin/compliance/expiring",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const daysRaw = parseInt(String(req.query.days ?? "30"), 10);
    const days = isNaN(daysRaw) || daysRaw < 1 ? 30 : Math.min(daysRaw, 365);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const expiring = await db
      .select({
        id: supplierRequirementStatusTable.id,
        supplierId: supplierRequirementStatusTable.supplierId,
        nombreCompleto: suppliersTable.nombreCompleto,
        requirementCode: supplierRequirementStatusTable.requirementCode,
        agency: supplierRequirementStatusTable.agency,
        state: supplierRequirementStatusTable.state,
        verifiedAt: supplierRequirementStatusTable.verifiedAt,
        expiresAt: supplierRequirementStatusTable.expiresAt,
      })
      .from(supplierRequirementStatusTable)
      .innerJoin(suppliersTable, eq(suppliersTable.id, supplierRequirementStatusTable.supplierId))
      .where(
        and(
          isNotNull(supplierRequirementStatusTable.expiresAt),
          lte(supplierRequirementStatusTable.expiresAt, cutoff),
          notInArray(supplierRequirementStatusTable.state, ["rejected"]),
        ),
      )
      .orderBy(asc(supplierRequirementStatusTable.expiresAt));

    res.json({ cutoffDays: days, cutoffDate: cutoff.toISOString(), count: expiring.length, expiring });
  },
);

// ── GET /api/admin/compliance/report ──────────────────────────────────────────
// Aggregate compliance report: suppliers by status, requirements by state, suppliers by pathway.
// All queries are read-only and run concurrently.
router.get(
  "/admin/compliance/report",
  ...adminOnly,
  async (_req: Request, res: Response): Promise<void> => {
    const [suppliersByStatus, requirementsByState, suppliersByPathway] = await Promise.all([
      db
        .select({
          sellableStatus: suppliersTable.sellableStatus,
          count: count(),
        })
        .from(suppliersTable)
        .groupBy(suppliersTable.sellableStatus)
        .orderBy(suppliersTable.sellableStatus),

      db
        .select({
          requirementCode: supplierRequirementStatusTable.requirementCode,
          agency: supplierRequirementStatusTable.agency,
          state: supplierRequirementStatusTable.state,
          count: count(),
        })
        .from(supplierRequirementStatusTable)
        .groupBy(
          supplierRequirementStatusTable.requirementCode,
          supplierRequirementStatusTable.agency,
          supplierRequirementStatusTable.state,
        )
        .orderBy(
          asc(supplierRequirementStatusTable.requirementCode),
          asc(supplierRequirementStatusTable.state),
        ),

      db
        .select({
          graduationPathway: suppliersTable.graduationPathway,
          count: count(),
        })
        .from(suppliersTable)
        .where(isNotNull(suppliersTable.graduationPathway))
        .groupBy(suppliersTable.graduationPathway)
        .orderBy(suppliersTable.graduationPathway),
    ]);

    res.json({
      generatedAt: new Date().toISOString(),
      suppliersByStatus,
      requirementsByState,
      suppliersByPathway,
    });
  },
);

export default router;
