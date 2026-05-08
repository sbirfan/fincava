// CC-1D: Officer DIAN RUT Compliance Flow
// Routes (all require auth; mounted under /api via index.ts):
//   GET  /officer/compliance/:supplierId                        — overview
//   GET  /officer/compliance/guidance/:requirementCode          — static steps
//   GET  /officer/compliance/:supplierId/documents              — doc list
//   POST /officer/compliance/:supplierId/mode                   — set selected mode
//   POST /officer/compliance/:supplierId/documents              — confirm doc upload
//   POST /officer/compliance/:supplierId/submit/:requirementCode — mark submitted
//   POST /officer/compliance/:supplierId/managed-service        — open managed case
//   GET  /officer/compliance/:supplierId/requirements/:code     — single requirement detail

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  suppliersTable,
  supplierRequirementStatusTable,
  complianceEnablementFlowsTable,
  complianceDocumentsV2Table,
  managedServiceCasesTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { sendError } from "../lib/response";
import { logger } from "../lib/logger";
import { and, eq, asc, desc } from "drizzle-orm";

type AuthedRequest = Request & { userId: number };
const requesterIdOf = (req: Request): number => (req as AuthedRequest).userId;

const router: IRouter = Router();

// Valid mode selections that a field officer can set
const VALID_MODES = [
  "has_rut_ready_to_upload",
  "no_rut_self_serve",
  "assisted",
  "managed",
] as const;
type SelectedMode = (typeof VALID_MODES)[number];

// Mode → new state mapping (officer sets mode before any admin review)
const MODE_TO_STATE: Record<SelectedMode, string> = {
  has_rut_ready_to_upload: "self_serve_in_progress",
  no_rut_self_serve: "self_serve_in_progress",
  assisted: "assisted_in_progress",
  managed: "managed_service_candidate",
};

// Helper: parse supplierId from route params safely
function parseId(raw: string | string[] | undefined): number | null {
  const n = parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

// ── GET /api/officer/compliance/:supplierId ───────────────────────────────────
// Returns supplier identity + all requirement rows for the officer tool.
router.get(
  "/officer/compliance/:supplierId",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseId(req.params.supplierId);
    if (!supplierId) { sendError(res, 400, "Invalid supplierId"); return; }

    const [supplier] = await db
      .select({
        id: suppliersTable.id,
        nombreCompleto: suppliersTable.nombreCompleto,
        municipio: suppliersTable.municipio,
        department: suppliersTable.department,
        sellableStatus: suppliersTable.sellableStatus,
      })
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId));

    if (!supplier) { sendError(res, 404, "Supplier not found"); return; }

    const requirements = await db
      .select()
      .from(supplierRequirementStatusTable)
      .where(eq(supplierRequirementStatusTable.supplierId, supplierId))
      .orderBy(asc(supplierRequirementStatusTable.requirementCode));

    res.json({ supplier, requirements });
  },
);

// ── GET /api/officer/compliance/guidance/:requirementCode ─────────────────────
// Returns ordered guidance steps from the enablement flows table.
// This route MUST be registered before /:supplierId to avoid param collision.
router.get(
  "/officer/compliance/guidance/:requirementCode",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const requirementCode = String(req.params.requirementCode ?? "").toUpperCase();
    const mode = String((req.query.mode as string) ?? "self_serve");

    const steps = await db
      .select()
      .from(complianceEnablementFlowsTable)
      .where(
        and(
          eq(complianceEnablementFlowsTable.requirementCode, requirementCode),
          eq(complianceEnablementFlowsTable.mode, mode),
          eq(complianceEnablementFlowsTable.active, true),
        ),
      )
      .orderBy(asc(complianceEnablementFlowsTable.stepOrder));

    res.json({ requirementCode, mode, steps });
  },
);

// ── GET /api/officer/compliance/:supplierId/requirements/:code ────────────────
// Single requirement detail + matching guidance steps.
router.get(
  "/officer/compliance/:supplierId/requirements/:code",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseId(req.params.supplierId);
    if (!supplierId) { sendError(res, 400, "Invalid supplierId"); return; }
    const requirementCode = String(req.params.code ?? "").toUpperCase();

    const [requirement] = await db
      .select()
      .from(supplierRequirementStatusTable)
      .where(
        and(
          eq(supplierRequirementStatusTable.supplierId, supplierId),
          eq(supplierRequirementStatusTable.requirementCode, requirementCode),
        ),
      );

    if (!requirement) { sendError(res, 404, "Requirement row not found"); return; }

    const mode = requirement.selectedMode ?? "self_serve";
    const steps = await db
      .select()
      .from(complianceEnablementFlowsTable)
      .where(
        and(
          eq(complianceEnablementFlowsTable.requirementCode, requirementCode),
          eq(complianceEnablementFlowsTable.mode, mode),
          eq(complianceEnablementFlowsTable.active, true),
        ),
      )
      .orderBy(asc(complianceEnablementFlowsTable.stepOrder));

    res.json({ requirement, steps });
  },
);

// ── GET /api/officer/compliance/:supplierId/documents ────────────────────────
// Lists all compliance documents for the supplier.
router.get(
  "/officer/compliance/:supplierId/documents",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseId(req.params.supplierId);
    if (!supplierId) { sendError(res, 400, "Invalid supplierId"); return; }

    const docs = await db
      .select()
      .from(complianceDocumentsV2Table)
      .where(eq(complianceDocumentsV2Table.supplierId, supplierId))
      .orderBy(desc(complianceDocumentsV2Table.createdAt));

    res.json({ supplierId, documents: docs });
  },
);

// ── POST /api/officer/compliance/:supplierId/mode ────────────────────────────
// Officer sets the selected mode for a requirement (has RUT / needs self-serve / assisted / managed).
const ModeBody = z.object({
  requirementCode: z.string().min(1).max(50).toUpperCase(),
  mode: z.enum(VALID_MODES),
});

router.post(
  "/officer/compliance/:supplierId/mode",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseId(req.params.supplierId);
    if (!supplierId) { sendError(res, 400, "Invalid supplierId"); return; }

    const parsed = ModeBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? "Invalid body");
      return;
    }
    const { requirementCode, mode } = parsed.data;

    const [existing] = await db
      .select()
      .from(supplierRequirementStatusTable)
      .where(
        and(
          eq(supplierRequirementStatusTable.supplierId, supplierId),
          eq(supplierRequirementStatusTable.requirementCode, requirementCode),
        ),
      );

    if (!existing) {
      sendError(res, 404, "Requirement row not found — supplier must be scored first");
      return;
    }

    // Do not allow mode change once submitted/verified/rejected
    const terminalStates = new Set(["submitted", "verified", "rejected", "conditionally_approved"]);
    if (terminalStates.has(existing.state)) {
      sendError(res, 409, `Cannot change mode — requirement is already in state '${existing.state}'`);
      return;
    }

    const newState = MODE_TO_STATE[mode];
    await db
      .update(supplierRequirementStatusTable)
      .set({ selectedMode: mode, state: newState, updatedAt: new Date() })
      .where(eq(supplierRequirementStatusTable.id, existing.id));

    logger.info(
      { officerId: requesterIdOf(req), supplierId, requirementCode, mode, newState },
      "officer set compliance mode (CC-1D)",
    );

    res.json({ ok: true, requirementCode, mode, newState });
  },
);

// ── POST /api/officer/compliance/:supplierId/documents ───────────────────────
// Officer confirms a file has been uploaded to GCS via presigned URL.
// The file URL is provided by the client after the direct GCS upload.
const DocumentBody = z.object({
  requirementCode: z.string().min(1).max(50).toUpperCase(),
  documentType: z.string().min(1).max(100),
  evidenceType: z.string().max(100).optional(),
  fileUrl: z.string().url().max(2000),
});

router.post(
  "/officer/compliance/:supplierId/documents",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseId(req.params.supplierId);
    if (!supplierId) { sendError(res, 400, "Invalid supplierId"); return; }

    const parsed = DocumentBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? "Invalid body");
      return;
    }
    const { requirementCode, documentType, evidenceType, fileUrl } = parsed.data;

    const [doc] = await db
      .insert(complianceDocumentsV2Table)
      .values({
        supplierId,
        requirementCode,
        documentType,
        evidenceType: evidenceType ?? null,
        fileUrl,
        uploadedBy: "officer",
        reviewStatus: "pending",
      })
      .returning();

    logger.info(
      { officerId: requesterIdOf(req), supplierId, requirementCode, documentType },
      "officer uploaded compliance document (CC-1D)",
    );

    res.status(201).json({ ok: true, document: doc });
  },
);

// ── POST /api/officer/compliance/:supplierId/submit/:requirementCode ──────────
// Officer marks a requirement as submitted for admin review.
router.post(
  "/officer/compliance/:supplierId/submit/:requirementCode",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseId(req.params.supplierId);
    if (!supplierId) { sendError(res, 400, "Invalid supplierId"); return; }
    const requirementCode = String(req.params.requirementCode ?? "").toUpperCase();

    const [existing] = await db
      .select()
      .from(supplierRequirementStatusTable)
      .where(
        and(
          eq(supplierRequirementStatusTable.supplierId, supplierId),
          eq(supplierRequirementStatusTable.requirementCode, requirementCode),
        ),
      );

    if (!existing) { sendError(res, 404, "Requirement row not found"); return; }

    // Must be in an in-progress state to submit
    const submittableStates = new Set([
      "self_serve_in_progress",
      "assisted_in_progress",
      "needs_fix",
    ]);
    if (!submittableStates.has(existing.state)) {
      sendError(
        res,
        409,
        `Cannot submit from state '${existing.state}' — must be in progress or needs_fix`,
      );
      return;
    }

    await db
      .update(supplierRequirementStatusTable)
      .set({ state: "submitted", updatedAt: new Date() })
      .where(eq(supplierRequirementStatusTable.id, existing.id));

    logger.info(
      { officerId: requesterIdOf(req), supplierId, requirementCode },
      "officer submitted compliance requirement (CC-1D)",
    );

    res.json({ ok: true, requirementCode, newState: "submitted" });
  },
);

// ── POST /api/officer/compliance/:supplierId/managed-service ─────────────────
// Opens a managed service case for a supplier requirement.
// Phase I behaviour: creates the case record + logs; WhatsApp trigger is Phase II.
const ManagedServiceBody = z.object({
  requirementCode: z.string().min(1).max(50).toUpperCase(),
  packageType: z.enum(["rut_registration", "ica_preparation", "fnc_registration"]),
  consentRecord: z.string().max(2000).optional(),
});

router.post(
  "/officer/compliance/:supplierId/managed-service",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = parseId(req.params.supplierId);
    if (!supplierId) { sendError(res, 400, "Invalid supplierId"); return; }

    const parsed = ManagedServiceBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? "Invalid body");
      return;
    }
    const { requirementCode, packageType, consentRecord } = parsed.data;

    // Upsert requirement state to managed_service_candidate
    await db
      .update(supplierRequirementStatusTable)
      .set({
        state: "managed_service_candidate",
        selectedMode: "managed",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(supplierRequirementStatusTable.supplierId, supplierId),
          eq(supplierRequirementStatusTable.requirementCode, requirementCode),
        ),
      );

    const [caseRow] = await db
      .insert(managedServiceCasesTable)
      .values({
        supplierId,
        requirementCode,
        packageType,
        consentRecord: consentRecord ?? null,
        consentAt: consentRecord ? new Date() : null,
        feeStatus: "none",
        assignedStaffId: null,
        notes: `Opened by officer ${requesterIdOf(req)} via CC-1D flow`,
      })
      .returning();

    // TODO (Phase II): trigger WhatsApp notification to ops team
    logger.info(
      { officerId: requesterIdOf(req), supplierId, requirementCode, packageType, caseId: caseRow?.id },
      "managed service case opened (CC-1D)",
    );

    res.status(201).json({ ok: true, case: caseRow });
  },
);

export default router;
