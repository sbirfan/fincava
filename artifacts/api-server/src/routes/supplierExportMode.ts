// CC-5: Supplier Export Mode
// Routes (mounted under /api via index.ts):
//   GET  /supplier/export-mode                    — own export mode (SUPPLIER auth)
//   POST /supplier/export-mode                    — create/update own mode (SUPPLIER auth)
//   GET  /admin/suppliers/:id/export-mode         — admin view (ADMIN auth)
//   PATCH /admin/suppliers/:id/export-mode        — admin confirm / override (ADMIN auth)

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  suppliersTable,
  usersTable,
  supplierExportModeTable,
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

const VALID_MODES = ["direct", "intermediary", "not_sure"] as const;

// ── Helper: resolve supplierId from authenticated user email ──────────────────
async function resolveSupplierForUser(userId: number): Promise<number | null> {
  const [user] = await db
    .select({ email: usersTable.email, emailVerifiedAt: usersTable.emailVerifiedAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user?.email || !user.emailVerifiedAt) return null;

  const [supplier] = await db
    .select({ id: suppliersTable.id })
    .from(suppliersTable)
    .where(eq(suppliersTable.email, user.email));

  return supplier?.id ?? null;
}

// ── GET /api/supplier/export-mode ─────────────────────────────────────────────
// Authenticated supplier — return own export mode declaration.
router.get(
  "/supplier/export-mode",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = requesterIdOf(req);
    const supplierId = await resolveSupplierForUser(userId);

    if (!supplierId) {
      res.json({ found: false });
      return;
    }

    const [row] = await db
      .select()
      .from(supplierExportModeTable)
      .where(
        and(
          eq(supplierExportModeTable.supplierId, supplierId),
          eq(supplierExportModeTable.productCategory, "coffee"),
        ),
      );

    if (!row) {
      res.json({ found: false, supplierId });
      return;
    }

    res.json({ found: true, supplierId, exportMode: row });
  },
);

// ── POST /api/supplier/export-mode ────────────────────────────────────────────
// Create or update own export mode declaration.
const SupplierExportModeBody = z.object({
  mode: z.enum(VALID_MODES),
  productCategory: z.string().max(50).optional().default("coffee"),
  partnerName: z.string().max(200).optional(),
  partnerRole: z.string().max(200).optional(),
});

router.post(
  "/supplier/export-mode",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = requesterIdOf(req);
    const supplierId = await resolveSupplierForUser(userId);

    if (!supplierId) {
      sendError(res, 404, "No linked supplier record found for this account");
      return;
    }

    const parsed = SupplierExportModeBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? "Invalid body");
      return;
    }

    const { mode, productCategory, partnerName, partnerRole } = parsed.data;

    const [upserted] = await db
      .insert(supplierExportModeTable)
      .values({
        supplierId,
        productCategory,
        mode,
        confidence: "self_declared",
        partnerName: mode === "intermediary" ? (partnerName ?? null) : null,
        partnerRole: mode === "intermediary" ? (partnerRole ?? null) : null,
        evidenceStatus: "none",
      })
      .onConflictDoUpdate({
        target: [supplierExportModeTable.supplierId, supplierExportModeTable.productCategory],
        set: {
          mode,
          confidence: "self_declared",
          partnerName: mode === "intermediary" ? (partnerName ?? null) : null,
          partnerRole: mode === "intermediary" ? (partnerRole ?? null) : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    logger.info({ userId, supplierId, mode, productCategory }, "supplier export mode saved (CC-5)");

    res.json({ ok: true, exportMode: upserted });
  },
);

// ── GET /api/admin/suppliers/:id/export-mode ──────────────────────────────────
// Admin view of a supplier's export mode declaration.
router.get(
  "/admin/suppliers/:id/export-mode",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseId(req.params.id);
    if (!supplierId) { sendError(res, 400, "Invalid supplier id"); return; }

    const [supplier] = await db
      .select({ id: suppliersTable.id, nombreCompleto: suppliersTable.nombreCompleto })
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId));

    if (!supplier) { sendError(res, 404, "Supplier not found"); return; }

    const rows = await db
      .select()
      .from(supplierExportModeTable)
      .where(eq(supplierExportModeTable.supplierId, supplierId));

    res.json({ supplierId, supplierName: supplier.nombreCompleto, exportModes: rows });
  },
);

// ── PATCH /api/admin/suppliers/:id/export-mode ────────────────────────────────
// Admin confirms or overrides a supplier's export mode.
const AdminExportModeBody = z.object({
  productCategory: z.string().max(50).optional().default("coffee"),
  mode: z.enum(VALID_MODES),
  confidence: z.enum(["admin_confirmed", "admin_overridden"]),
  evidenceStatus: z.enum(["none", "uploaded", "verified"]).optional(),
  partnerName: z.string().max(200).optional().nullable(),
  partnerRole: z.string().max(200).optional().nullable(),
});

router.patch(
  "/admin/suppliers/:id/export-mode",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseId(req.params.id);
    if (!supplierId) { sendError(res, 400, "Invalid supplier id"); return; }

    const parsed = AdminExportModeBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? "Invalid body");
      return;
    }

    const adminId = requesterIdOf(req);
    const { productCategory, mode, confidence, evidenceStatus, partnerName, partnerRole } = parsed.data;

    const [upserted] = await db
      .insert(supplierExportModeTable)
      .values({
        supplierId,
        productCategory,
        mode,
        confidence,
        verifiedBy: adminId,
        partnerName: partnerName ?? null,
        partnerRole: partnerRole ?? null,
        evidenceStatus: evidenceStatus ?? "none",
      })
      .onConflictDoUpdate({
        target: [supplierExportModeTable.supplierId, supplierExportModeTable.productCategory],
        set: {
          mode,
          confidence,
          verifiedBy: adminId,
          partnerName: partnerName ?? null,
          partnerRole: partnerRole ?? null,
          evidenceStatus: evidenceStatus ?? "none",
          updatedAt: new Date(),
        },
      })
      .returning();

    logger.info({ adminId, supplierId, mode, confidence }, "admin confirmed supplier export mode (CC-5)");

    res.json({ ok: true, exportMode: upserted });
  },
);

export default router;
