// CC-1E: Compliance Widget
// Routes (mounted under /api via index.ts):
//   GET   /suppliers/:id/compliance-signals   — public, buyer-facing badges
//   GET   /supplier/compliance-progress        — authenticated supplier, own progress
//   PUT   /admin/compliance/visibility         — admin upsert buyer visibility signal

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  suppliersTable,
  usersTable,
  supplierRequirementStatusTable,
  buyerVisibilitySignalsTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { adminOnly } from "../middleware/admin";
import { sendError } from "../lib/response";
import { logger } from "../lib/logger";
import { and, eq } from "drizzle-orm";

type AuthedRequest = Request & { userId: number };
const requesterIdOf = (req: Request): number => (req as AuthedRequest).userId;

function parseId(raw: string | string[] | undefined): number | null {
  const n = parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

const router: IRouter = Router();

// ── GET /api/suppliers/:id/compliance-signals ─────────────────────────────────
// Public — returns only buyer-visible compliance badges for a supplier.
// Joined with requirement_status so the caller gets state + badge label.
router.get(
  "/suppliers/:id/compliance-signals",
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseId(req.params.id);
    if (!supplierId) { sendError(res, 400, "Invalid supplier id"); return; }

    const signals = await db
      .select({
        requirementCode: buyerVisibilitySignalsTable.requirementCode,
        badgeLabel: buyerVisibilitySignalsTable.badgeLabel,
        disclaimer: buyerVisibilitySignalsTable.disclaimer,
        state: supplierRequirementStatusTable.state,
        agency: supplierRequirementStatusTable.agency,
      })
      .from(buyerVisibilitySignalsTable)
      .leftJoin(
        supplierRequirementStatusTable,
        and(
          eq(supplierRequirementStatusTable.supplierId, buyerVisibilitySignalsTable.supplierId),
          eq(supplierRequirementStatusTable.requirementCode, buyerVisibilitySignalsTable.requirementCode),
        ),
      )
      .where(
        and(
          eq(buyerVisibilitySignalsTable.supplierId, supplierId),
          eq(buyerVisibilitySignalsTable.visible, true),
        ),
      );

    // Only surface verified/conditionally_approved requirements to buyers
    const verifiedSignals = signals.filter(
      (s) => s.state === "verified" || s.state === "conditionally_approved",
    );

    res.json({ supplierId, signals: verifiedSignals });
  },
);

// ── GET /api/supplier/compliance-progress ─────────────────────────────────────
// Authenticated supplier — returns their own compliance requirement rows.
// Resolves supplierId via the my-profile lookup (email → supplier link).
router.get(
  "/supplier/compliance-progress",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = requesterIdOf(req);

    // Resolve supplier via email match (same bridge as my-profile)
    const [user] = await db
      .select({ email: usersTable.email, emailVerifiedAt: usersTable.emailVerifiedAt })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user?.email || !user.emailVerifiedAt) {
      res.json({ found: false, requirements: [] });
      return;
    }

    const [supplier] = await db
      .select({ id: suppliersTable.id, nombreCompleto: suppliersTable.nombreCompleto })
      .from(suppliersTable)
      .where(eq(suppliersTable.email, user.email));

    if (!supplier) {
      res.json({ found: false, requirements: [] });
      return;
    }

    const requirements = await db
      .select({
        id: supplierRequirementStatusTable.id,
        requirementCode: supplierRequirementStatusTable.requirementCode,
        agency: supplierRequirementStatusTable.agency,
        state: supplierRequirementStatusTable.state,
        selectedMode: supplierRequirementStatusTable.selectedMode,
        visibleNote: supplierRequirementStatusTable.visibleNote,
        verifiedAt: supplierRequirementStatusTable.verifiedAt,
        expiresAt: supplierRequirementStatusTable.expiresAt,
        updatedAt: supplierRequirementStatusTable.updatedAt,
      })
      .from(supplierRequirementStatusTable)
      .where(eq(supplierRequirementStatusTable.supplierId, supplier.id));

    res.json({ found: true, supplierId: supplier.id, supplierName: supplier.nombreCompleto, requirements });
  },
);

// ── PUT /api/admin/compliance/visibility ──────────────────────────────────────
// Admin upserts a buyer_visibility_signal row for a supplier + requirement.
const VisibilityBody = z.object({
  supplierId: z.number().int().positive(),
  requirementCode: z.string().min(1).max(50).toUpperCase(),
  visible: z.boolean(),
  badgeLabel: z.string().max(120).optional(),
  disclaimer: z.string().max(500).optional(),
});

router.put(
  "/admin/compliance/visibility",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = VisibilityBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? "Invalid body");
      return;
    }
    const { supplierId, requirementCode, visible, badgeLabel, disclaimer } = parsed.data;
    const adminId = requesterIdOf(req);

    const [upserted] = await db
      .insert(buyerVisibilitySignalsTable)
      .values({
        supplierId,
        requirementCode,
        visible,
        badgeLabel: badgeLabel ?? null,
        disclaimer: disclaimer ?? null,
        enabledBy: visible ? adminId : null,
        enabledAt: visible ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [buyerVisibilitySignalsTable.supplierId, buyerVisibilitySignalsTable.requirementCode],
        set: {
          visible,
          badgeLabel: badgeLabel ?? null,
          disclaimer: disclaimer ?? null,
          enabledBy: visible ? adminId : null,
          enabledAt: visible ? new Date() : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    logger.info(
      { adminId, supplierId, requirementCode, visible },
      "admin updated compliance visibility signal (CC-1E)",
    );

    res.json({ ok: true, signal: upserted });
  },
);

export default router;
