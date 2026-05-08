// complianceEvaluator.ts — Items 2 & 3
// Admin-only routes for triggering supplier re-evaluation and previewing
// evaluation results without committing DB changes.
//
// Routes (mounted under /api via index.ts):
//   POST /admin/suppliers/:id/evaluate         → score + evaluate + commit (Item 2)
//   POST /admin/suppliers/:id/evaluate/preview → dry-run, no DB writes (Item 3)
//   POST /admin/suppliers/:id/compliance-document → generate document (Item 5)
//   GET  /admin/suppliers/:id/compliance-document → get latest document (Item 5)
//   GET  /admin/suppliers/:id/evaluation-history  → list past evaluations

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, supplierEvaluationsTable, supplierStateTransitionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { adminOnly } from "../middleware/admin";
import { sendError } from "../lib/response";
import { logger } from "../lib/logger";
import { scoreSupplier } from "../services/scoring-service";
import {
  evaluateSupplier,
  previewEvaluation,
  NotFoundError,
} from "../services/supplier-graduation-service";
import {
  generateComplianceDocument,
  getLatestComplianceDocument,
} from "../services/document-generator";

type AuthedRequest = Request & { userId: number };

const router: IRouter = Router();

// ── POST /admin/suppliers/:id/evaluate ───────────────────────────────────────
// Item 2: Re-score + re-evaluate and commit. Triggers the full pipeline.

router.post(
  "/admin/suppliers/:id/evaluate",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseInt(String(req.params.id), 10);
    if (isNaN(supplierId)) {
      sendError(res, 400, "Invalid supplier ID");
      return;
    }

    const bodySchema = z.object({
      forceRescore: z.boolean().optional().default(false),
      notes: z.string().max(500).optional(),
    });
    const body = bodySchema.safeParse(req.body);
    if (!body.success) {
      sendError(res, 400, "Invalid request body");
      return;
    }

    try {
      logger.info(
        { supplierId, forceRescore: body.data.forceRescore, notes: body.data.notes },
        "compliance-evaluator: admin triggered re-evaluation",
      );

      // Step 1: Re-score with Claude (always re-scores — fresh AI call)
      if (body.data.forceRescore !== false) {
        await scoreSupplier(supplierId);
      }

      // Step 2: Evaluate and commit
      const { supplier, evaluation, transition } = await evaluateSupplier(supplierId);

      res.json({
        supplierId,
        evaluation: {
          id: evaluation.id,
          eligibilityStatus: evaluation.eligibilityStatus,
          commercialScore: evaluation.commercialScore,
          sellableStatus: evaluation.sellableStatus,
          pathway: evaluation.pathway,
          thresholdVersion: evaluation.thresholdVersion,
          evaluatedAt: evaluation.evaluatedAt,
        },
        transition: transition
          ? {
              id: transition.id,
              fromState: transition.fromState,
              toState: transition.toState,
              actor: transition.actor,
              createdAt: transition.createdAt,
            }
          : null,
        supplier: {
          id: supplier.id,
          nombreCompleto: supplier.nombreCompleto,
          sellableStatus: supplier.sellableStatus,
          eligibilityStatus: supplier.eligibilityStatus,
          commercialScore: supplier.commercialScore,
          graduationPathway: supplier.graduationPathway,
          nextActions: supplier.nextActions,
          lastEvaluatedAt: supplier.lastEvaluatedAt,
        },
      });
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendError(res, 404, err.message);
        return;
      }
      logger.error({ supplierId, err }, "compliance-evaluator: evaluate failed");
      sendError(res, 500, "Evaluation failed");
    }
  },
);

// ── POST /admin/suppliers/:id/evaluate/preview ────────────────────────────────
// Item 3: Dry-run — compute what evaluation would produce without any DB writes.

router.post(
  "/admin/suppliers/:id/evaluate/preview",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseInt(String(req.params.id), 10);
    if (isNaN(supplierId)) {
      sendError(res, 400, "Invalid supplier ID");
      return;
    }

    try {
      const preview = await previewEvaluation(supplierId);
      res.json({ preview });
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendError(res, 404, err.message);
        return;
      }
      logger.error({ supplierId, err }, "compliance-evaluator: preview failed");
      sendError(res, 500, "Preview failed");
    }
  },
);

// ── POST /admin/suppliers/:id/compliance-document ─────────────────────────────
// Item 5: Generate and store a compliance document via Claude Sonnet.

router.post(
  "/admin/suppliers/:id/compliance-document",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseInt(String(req.params.id), 10);
    if (isNaN(supplierId)) {
      sendError(res, 400, "Invalid supplier ID");
      return;
    }

    try {
      const doc = await generateComplianceDocument(supplierId);
      res.json({
        id: doc.id,
        supplierId: doc.supplierId,
        documentContent: doc.documentContent,
        gapSummary: {
          totalGaps: doc.gapSummary.totalGaps,
          criticalGaps: doc.gapSummary.criticalGaps,
          highGaps: doc.gapSummary.highGaps,
          mediumGaps: doc.gapSummary.mediumGaps,
          overallTimeline: doc.gapSummary.overallTimeline,
          estimatedTotalCostCOP: doc.gapSummary.estimatedTotalCostCOP,
        },
        generatedAt: doc.generatedAt,
        aiModel: doc.aiModel,
      });
    } catch (err) {
      logger.error({ supplierId, err }, "compliance-evaluator: document generation failed");
      sendError(res, 500, "Document generation failed");
    }
  },
);

// ── GET /admin/suppliers/:id/compliance-document ──────────────────────────────
// Item 5: Retrieve the most recently generated compliance document.

router.get(
  "/admin/suppliers/:id/compliance-document",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseInt(String(req.params.id), 10);
    if (isNaN(supplierId)) {
      sendError(res, 400, "Invalid supplier ID");
      return;
    }

    try {
      const doc = await getLatestComplianceDocument(supplierId);
      if (!doc) {
        sendError(res, 404, "No compliance document found for this supplier");
        return;
      }
      res.json({ supplierId, ...doc });
    } catch (err) {
      logger.error({ supplierId, err }, "compliance-evaluator: get document failed");
      sendError(res, 500, "Failed to retrieve document");
    }
  },
);

// ── GET /admin/suppliers/:id/evaluation-history ───────────────────────────────
// Returns the evaluation history for a supplier (most recent first).

router.get(
  "/admin/suppliers/:id/evaluation-history",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseInt(String(req.params.id), 10);
    if (isNaN(supplierId)) {
      sendError(res, 400, "Invalid supplier ID");
      return;
    }

    const limitRaw = parseInt(String(req.query.limit ?? "20"), 10);
    const limit = isNaN(limitRaw) || limitRaw < 1 ? 20 : Math.min(limitRaw, 100);

    try {
      const evaluations = await db
        .select()
        .from(supplierEvaluationsTable)
        .where(eq(supplierEvaluationsTable.supplierId, supplierId))
        .orderBy(desc(supplierEvaluationsTable.evaluatedAt))
        .limit(limit);

      const transitions = await db
        .select()
        .from(supplierStateTransitionsTable)
        .where(eq(supplierStateTransitionsTable.supplierId, supplierId))
        .orderBy(desc(supplierStateTransitionsTable.createdAt))
        .limit(limit);

      res.json({ supplierId, evaluations, transitions });
    } catch (err) {
      logger.error({ supplierId, err }, "compliance-evaluator: history query failed");
      sendError(res, 500, "Failed to retrieve evaluation history");
    }
  },
);

export default router;
