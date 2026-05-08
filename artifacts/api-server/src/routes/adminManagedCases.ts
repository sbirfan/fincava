// CC-4: Admin Managed Service Case Management
// Routes (all require ADMIN auth; mounted under /api via index.ts):
//   GET   /admin/managed-cases                   — paginated list with filters
//   GET   /admin/managed-cases/:id               — single case detail
//   PATCH /admin/managed-cases/:id               — assign staff / update status / add notes

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { managedServiceCasesTable, suppliersTable, usersTable, profilesTable } from "@workspace/db";
import { adminOnly } from "../middleware/admin";
import { sendError } from "../lib/response";
import { parsePagination } from "../schemas";
import { logger } from "../lib/logger";
import { and, eq, desc, asc, count, isNull, isNotNull } from "drizzle-orm";

type AuthedRequest = Request & { userId: number };
const requesterIdOf = (req: Request): number => (req as AuthedRequest).userId;

const router: IRouter = Router();

// Valid fee statuses
const VALID_FEE_STATUSES = ["none", "quoted", "invoiced", "paid"] as const;
type FeeStatus = (typeof VALID_FEE_STATUSES)[number];

// Valid case statuses (derived field — open vs closed)
const VALID_CASE_STATUSES = ["open", "closed"] as const;

// ── GET /api/admin/managed-cases ─────────────────────────────────────────────
// Returns managed service cases with optional filters:
//   ?status=open|closed    (open = no closedAt, closed = closedAt set)
//   ?requirementCode=X     filter by specific requirement code
//   ?feeStatus=none|quoted|invoiced|paid
//   ?page=1&pageSize=20
router.get(
  "/admin/managed-cases",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const { page, limit, offset } = parsePagination(req.query);

    const statusFilter = req.query.status as string | undefined;
    const requirementCodeFilter = req.query.requirementCode as string | undefined;
    const feeStatusFilter = req.query.feeStatus as string | undefined;

    const conditions = [];

    if (statusFilter === "open") {
      conditions.push(isNull(managedServiceCasesTable.updatedAt));
    }
    if (requirementCodeFilter) {
      conditions.push(eq(managedServiceCasesTable.requirementCode, requirementCodeFilter.toUpperCase()));
    }
    if (feeStatusFilter && VALID_FEE_STATUSES.includes(feeStatusFilter as FeeStatus)) {
      conditions.push(eq(managedServiceCasesTable.feeStatus, feeStatusFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [cases, [{ total }]] = await Promise.all([
      db
        .select({
          id: managedServiceCasesTable.id,
          supplierId: managedServiceCasesTable.supplierId,
          supplierName: suppliersTable.nombreCompleto,
          municipio: suppliersTable.municipio,
          requirementCode: managedServiceCasesTable.requirementCode,
          packageType: managedServiceCasesTable.packageType,
          feeStatus: managedServiceCasesTable.feeStatus,
          assignedStaffId: managedServiceCasesTable.assignedStaffId,
          consentAt: managedServiceCasesTable.consentAt,
          notes: managedServiceCasesTable.notes,
          createdAt: managedServiceCasesTable.createdAt,
          updatedAt: managedServiceCasesTable.updatedAt,
        })
        .from(managedServiceCasesTable)
        .innerJoin(suppliersTable, eq(suppliersTable.id, managedServiceCasesTable.supplierId))
        .where(whereClause)
        .orderBy(desc(managedServiceCasesTable.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ total: count() })
        .from(managedServiceCasesTable)
        .where(whereClause),
    ]);

    res.json({ page, pageSize: limit, total: total ?? 0, items: cases });
  },
);

// ── GET /api/admin/managed-cases/:id ─────────────────────────────────────────
// Returns full detail for a single managed service case.
router.get(
  "/admin/managed-cases/:id",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const caseId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(caseId)) {
      sendError(res, 400, "Invalid case id");
      return;
    }

    const [row] = await db
      .select({
        id: managedServiceCasesTable.id,
        supplierId: managedServiceCasesTable.supplierId,
        supplierName: suppliersTable.nombreCompleto,
        municipio: suppliersTable.municipio,
        department: suppliersTable.department,
        requirementCode: managedServiceCasesTable.requirementCode,
        packageType: managedServiceCasesTable.packageType,
        consentRecord: managedServiceCasesTable.consentRecord,
        consentAt: managedServiceCasesTable.consentAt,
        feeStatus: managedServiceCasesTable.feeStatus,
        assignedStaffId: managedServiceCasesTable.assignedStaffId,
        notes: managedServiceCasesTable.notes,
        createdAt: managedServiceCasesTable.createdAt,
        updatedAt: managedServiceCasesTable.updatedAt,
      })
      .from(managedServiceCasesTable)
      .innerJoin(suppliersTable, eq(suppliersTable.id, managedServiceCasesTable.supplierId))
      .where(eq(managedServiceCasesTable.id, caseId));

    if (!row) {
      sendError(res, 404, "Managed service case not found");
      return;
    }

    // Resolve assigned staff name if set (join profiles for display name, fall back to email)
    let assignedStaffName: string | null = null;
    if (row.assignedStaffId) {
      const [staff] = await db
        .select({
          email: usersTable.email,
          firstName: profilesTable.firstName,
          lastName: profilesTable.lastName,
        })
        .from(usersTable)
        .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
        .where(eq(usersTable.id, row.assignedStaffId));
      if (staff) {
        const full = [staff.firstName, staff.lastName].filter(Boolean).join(" ");
        assignedStaffName = full || staff.email;
      }
    }

    res.json({ ...row, assignedStaffName });
  },
);

// ── PATCH /api/admin/managed-cases/:id ───────────────────────────────────────
// Update a managed service case: assign staff, change fee status, append notes.
// All fields are optional — only supplied fields are updated.
const PatchCaseBody = z.object({
  assignedStaffId: z.number().int().positive().nullable().optional(),
  feeStatus: z.enum(VALID_FEE_STATUSES).optional(),
  notes: z.string().max(3000).optional(),
  // Append a timestamped note entry rather than overwriting — pass appendNote instead of notes
  appendNote: z.string().max(1000).optional(),
});

router.patch(
  "/admin/managed-cases/:id",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const caseId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(caseId)) {
      sendError(res, 400, "Invalid case id");
      return;
    }

    const parsed = PatchCaseBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? "Invalid body");
      return;
    }
    const { assignedStaffId, feeStatus, notes, appendNote } = parsed.data;

    if (assignedStaffId === undefined && feeStatus === undefined && notes === undefined && appendNote === undefined) {
      sendError(res, 400, "No fields provided to update");
      return;
    }

    // Fetch current case
    const [existing] = await db
      .select()
      .from(managedServiceCasesTable)
      .where(eq(managedServiceCasesTable.id, caseId));

    if (!existing) {
      sendError(res, 404, "Managed service case not found");
      return;
    }

    const adminId = requesterIdOf(req);
    const updates: Partial<typeof managedServiceCasesTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (assignedStaffId !== undefined) {
      // Verify staff user exists if non-null
      if (assignedStaffId !== null) {
        const [staff] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.id, assignedStaffId));
        if (!staff) {
          sendError(res, 422, `User ${assignedStaffId} not found — cannot assign as staff`);
          return;
        }
      }
      updates.assignedStaffId = assignedStaffId;
    }

    if (feeStatus !== undefined) {
      updates.feeStatus = feeStatus;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (appendNote !== undefined) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp} admin#${adminId}] `;
      const newEntry = prefix + appendNote.trim();
      updates.notes = existing.notes ? `${existing.notes}\n${newEntry}` : newEntry;
    }

    const [updated] = await db
      .update(managedServiceCasesTable)
      .set(updates)
      .where(eq(managedServiceCasesTable.id, caseId))
      .returning();

    logger.info(
      { adminId, caseId, supplierId: existing.supplierId, updates: Object.keys(updates) },
      "admin updated managed service case (CC-4)",
    );

    res.json({ ok: true, case: updated });
  },
);

export default router;
