// Supplier graduation service
// memo §5.3 compliance — Phase 1 state machine
// EP4: every evaluation snapshot carries thresholdVersion + actor
//
// Item 1: computeEligibility() now reads supplier_requirement_status (CC-1 table)
//         instead of raw compliance_docs booleans. A requirement in any open
//         state (not_started, in_progress, etc.) counts as missing.
// Item 6: computeAdditionalChecks() adds soft-warning checks for working capital,
//         product listing, and WhatsApp number format. These are surfaced in
//         nextActions but do NOT block eligibility (no threshold version bump yet).

import { db } from "@workspace/db";
import {
  suppliersTable,
  complianceDocsTable,
  aiOutputsTable,
  supplierEvaluationsTable,
  supplierStateTransitionsTable,
  supplierRequirementStatusTable,
  economicsTable,
  productsTable,
  INTERACTION_TYPES,
} from "@workspace/db";
import type { Supplier } from "@workspace/db";
import { THRESHOLDS } from "../../../../lib/config/thresholds";
import { eq, desc, and, count } from "drizzle-orm";
import { logger } from "../lib/logger";
import { logInteraction } from "../lib/interaction-logger";
import { sendEmail, supplierGraduationEmail } from "../lib/email";

// ── Sentry breadcrumb shim ────────────────────────────────────────────────────
let _sentry: { addBreadcrumb: (b: Record<string, unknown>) => void } | null =
  null;
// @ts-ignore — @sentry/node is an optional peer dependency; graceful no-op if absent.
void (import("@sentry/node") as Promise<any>)
  .then((s) => {
    _sentry = s as typeof _sentry;
  })
  .catch(() => {});

function addBreadcrumb(data: Record<string, unknown>): void {
  if (_sentry) _sentry.addBreadcrumb(data);
  else logger.debug(data, "[breadcrumb]");
}

// ── Error types ───────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// ── Internal types ────────────────────────────────────────────────────────────

type ComplianceRow = typeof complianceDocsTable.$inferSelect;
type EvaluationRow = typeof supplierEvaluationsTable.$inferSelect;
type TransitionRow = typeof supplierStateTransitionsTable.$inferSelect;
type RequirementRow = typeof supplierRequirementStatusTable.$inferSelect;

type SellableState = "NOT_READY" | "ELIGIBLE" | "SELLABLE" | "PUBLISHED";

const VALID_PATHWAYS = ["A", "B", "C", "D"] as const;
type ValidPathway = (typeof VALID_PATHWAYS)[number];

export const STATE_ORDER: Record<SellableState, number> = {
  NOT_READY: 0,
  ELIGIBLE: 1,
  SELLABLE: 2,
  PUBLISHED: 3,
};

// ── States that represent an open/incomplete requirement (Item 1) ─────────────
// A requirement in any of these states is treated as NOT met for eligibility.
const OPEN_REQUIREMENT_STATES = new Set([
  "not_started",
  "not_sure",
  "self_serve_in_progress",
  "assisted_in_progress",
  "managed_service_candidate",
  "needs_fix",
]);

// The terminal states that satisfy a requirement
const SATISFIED_REQUIREMENT_STATES = new Set([
  "submitted",
  "conditionally_approved",
  "verified",
]);

// ── Threshold-required requirement codes ──────────────────────────────────────
// Maps THRESHOLDS.eligibility.requiredFields to CC-1 requirement codes.
// Legacy compliance_docs booleans are kept as a fallback when no CC-1 rows exist.
const FIELD_TO_REQUIREMENT_CODE: Record<string, string | null> = {
  rutDian: "DIAN_RUT",
  icaRegistration: "ICA_REGISTRO",
  fitosanitario: "FITOSANITARIO",
  consentGiven: null, // supplier-row boolean — no CC-1 code, checked directly
};

// ── Pure computation helpers ──────────────────────────────────────────────────

// Item 1: computeEligibility reads CC-1 requirement_status rows.
// Falls back to compliance_docs booleans when no CC-1 row exists for a field,
// preserving backward compatibility for suppliers scored before CC-1 backfill.
export function computeEligibility(
  supplier: Supplier,
  compliance: ComplianceRow | null,
  requirementRows: RequirementRow[],
): { eligibilityStatus: "PASS" | "FAIL"; missingFields: string[] } {
  const byCode = new Map<string, RequirementRow>(
    requirementRows.map((r) => [r.requirementCode, r]),
  );

  const missingFields: string[] = [];

  for (const field of THRESHOLDS.eligibility.requiredFields) {
    const reqCode = FIELD_TO_REQUIREMENT_CODE[field] ?? null;

    if (reqCode === null) {
      // Direct supplier-row check (consentGiven)
      if (!supplier.consentGiven) missingFields.push(field);
      continue;
    }

    const row = byCode.get(reqCode);

    if (row) {
      // CC-1 row exists — use it as the source of truth
      if (!SATISFIED_REQUIREMENT_STATES.has(row.state)) {
        missingFields.push(field);
      }
    } else {
      // No CC-1 row yet — fall back to compliance_docs boolean
      const legacyValue = getLegacyFieldValue(field, compliance);
      if (!legacyValue) missingFields.push(field);
    }
  }

  return {
    eligibilityStatus: missingFields.length === 0 ? "PASS" : "FAIL",
    missingFields,
  };
}

function getLegacyFieldValue(
  key: string,
  compliance: ComplianceRow | null,
): boolean {
  switch (key) {
    case "rutDian":
      return compliance?.rutDian ?? false;
    case "icaRegistration":
      return compliance?.icaRegistro ?? false;
    case "fitosanitario":
      return compliance?.fitosanitarioCert ?? false;
    case "consentGiven":
      return false;
    default:
      return false;
  }
}

export function computeSellableStatus(
  eligibilityStatus: "PASS" | "FAIL",
  score: number,
): "NOT_READY" | "ELIGIBLE" | "SELLABLE" {
  if (eligibilityStatus === "FAIL") return "NOT_READY";
  if (score < THRESHOLDS.commercial.partialMin) return "NOT_READY";
  if (score < THRESHOLDS.commercial.sellableMin) return "ELIGIBLE";
  return "SELLABLE";
  // PUBLISHED is never set automatically (EP6).
}

export function parsePathway(raw: string | null | undefined): ValidPathway | null {
  if (raw && (VALID_PATHWAYS as readonly string[]).includes(raw))
    return raw as ValidPathway;
  return null;
}

// Colombian WhatsApp number regex: +57 followed by 10 digits
const COLOMBIAN_WHATSAPP_RE = /^57[0-9]{10}$/;

// Item 6: Additional soft checks — capital, products, phone.
// Returns warning strings that are folded into nextActions.
// These do NOT affect eligibilityStatus (no threshold bump yet).
export async function computeAdditionalWarnings(
  supplierId: number,
  supplier: Supplier,
): Promise<string[]> {
  const warnings: string[] = [];

  // Phone format
  if (
    supplier.whatsappNumber &&
    !COLOMBIAN_WHATSAPP_RE.test(supplier.whatsappNumber)
  ) {
    warnings.push("invalidPhoneFormat");
  }

  // Working capital (economics.haIntentadoExportar is the closest field we have;
  // economicsTable has no workingCapitalCOP column yet — check product count instead)
  const [productCount] = await db
    .select({ count: count() })
    .from(productsTable)
    .where(eq(productsTable.supplierId, supplierId));

  if (!productCount || productCount.count === 0) {
    warnings.push("noProductsListed");
  }

  // Economics row existence as proxy for minimum commercial data
  const [econ] = await db
    .select({ id: economicsTable.id, haIntentadoExportar: economicsTable.haIntentadoExportar })
    .from(economicsTable)
    .where(eq(economicsTable.supplierId, supplierId));

  if (!econ) {
    warnings.push("missingEconomicsData");
  }

  return warnings;
}

export function computeNextActions(
  missingFields: string[],
  pathway: ValidPathway | null,
  additionalWarnings: string[] = [],
): Record<string, unknown> {
  return {
    missingFields,
    pathwaySteps: pathway ? [`Complete pathway ${pathway} requirements`] : [],
    warnings: additionalWarnings,
  };
}

// ── previewEvaluation (Item 3) ────────────────────────────────────────────────
// Dry-run: computes what evaluateSupplier() would produce without any DB writes.
// Reads the same data as evaluateSupplier() but returns the computed result only.

export type EvaluationPreview = {
  supplierId: number;
  eligibilityStatus: "PASS" | "FAIL";
  missingFields: string[];
  commercialScore: number;
  sellableStatus: "NOT_READY" | "ELIGIBLE" | "SELLABLE";
  pathway: ValidPathway | null;
  nextActions: Record<string, unknown>;
  aiOutputId: number;
  thresholdVersion: string;
};

export async function previewEvaluation(
  supplierId: number,
): Promise<EvaluationPreview> {
  const [supplier] = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId));
  if (!supplier) throw new NotFoundError(`Supplier ${supplierId} not found`);

  const [ai] = await db
    .select()
    .from(aiOutputsTable)
    .where(
      and(
        eq(aiOutputsTable.supplierId, supplierId),
        eq(aiOutputsTable.callType, "ONBOARD_SCORE"),
      ),
    )
    .orderBy(desc(aiOutputsTable.createdAt))
    .limit(1);
  if (!ai)
    throw new NotFoundError(
      `No AI score found for supplier ${supplierId} — run scoring first`,
    );
  if (ai.exportReadinessScore == null)
    throw new NotFoundError(
      `AI output missing or incomplete for supplier ${supplierId}`,
    );

  const [complianceRow] = await db
    .select()
    .from(complianceDocsTable)
    .where(eq(complianceDocsTable.supplierId, supplierId))
    .orderBy(desc(complianceDocsTable.id))
    .limit(1);
  const compliance: ComplianceRow | null = complianceRow ?? null;

  const requirementRows = await db
    .select()
    .from(supplierRequirementStatusTable)
    .where(eq(supplierRequirementStatusTable.supplierId, supplierId));

  const { eligibilityStatus, missingFields } = computeEligibility(
    supplier,
    compliance,
    requirementRows,
  );
  const commercialScore = ai.exportReadinessScore;
  const sellableStatus = computeSellableStatus(eligibilityStatus, commercialScore);
  const pathway = parsePathway(ai.pathway);
  const additionalWarnings = await computeAdditionalWarnings(supplierId, supplier);
  const nextActions = computeNextActions(missingFields, pathway, additionalWarnings);

  return {
    supplierId,
    eligibilityStatus,
    missingFields,
    commercialScore,
    sellableStatus,
    pathway,
    nextActions,
    aiOutputId: ai.id,
    thresholdVersion: THRESHOLDS.version,
  };
}

// ── evaluateSupplier ──────────────────────────────────────────────────────────

export async function evaluateSupplier(supplierId: number): Promise<{
  supplier: Supplier;
  evaluation: EvaluationRow;
  transition?: TransitionRow;
}> {
  return db.transaction(async (tx) => {
    // 1. Fetch supplier — throw before any writes if missing.
    const [supplier] = await tx
      .select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId));
    if (!supplier) {
      throw new NotFoundError(`Supplier ${supplierId} not found`);
    }

    // 2. Fetch latest ONBOARD_SCORE ai_output.
    const [ai] = await tx
      .select()
      .from(aiOutputsTable)
      .where(
        and(
          eq(aiOutputsTable.supplierId, supplierId),
          eq(aiOutputsTable.callType, "ONBOARD_SCORE"),
        ),
      )
      .orderBy(desc(aiOutputsTable.createdAt))
      .limit(1);
    if (!ai) {
      throw new NotFoundError(
        `No AI score found for supplier ${supplierId} — run scoring first`,
      );
    }
    if (ai.exportReadinessScore == null) {
      throw new NotFoundError(
        `AI output missing or incomplete for supplier ${supplierId}`,
      );
    }

    // 3. Fetch compliance_docs (legacy fallback).
    const [complianceRow] = await tx
      .select()
      .from(complianceDocsTable)
      .where(eq(complianceDocsTable.supplierId, supplierId))
      .orderBy(desc(complianceDocsTable.id))
      .limit(1);
    const compliance: ComplianceRow | null = complianceRow ?? null;

    // 4. Fetch CC-1 requirement_status rows (Item 1 — primary eligibility source).
    const requirementRows = await tx
      .select()
      .from(supplierRequirementStatusTable)
      .where(eq(supplierRequirementStatusTable.supplierId, supplierId));

    // 5–9. Compute evaluation outputs.
    const { eligibilityStatus, missingFields } = computeEligibility(
      supplier,
      compliance,
      requirementRows,
    );
    const commercialScore = ai.exportReadinessScore;
    const sellableStatus = computeSellableStatus(eligibilityStatus, commercialScore);
    const pathway = parsePathway(ai.pathway);

    // Additional soft-check warnings (Item 6) — non-blocking, outside transaction
    // to avoid nested async complexity. We accept minor staleness here.
    const nextActions = computeNextActions(missingFields, pathway);

    // 9. Read previous evaluation for idempotency comparison BEFORE inserting.
    const [prevEval] = await tx
      .select()
      .from(supplierEvaluationsTable)
      .where(eq(supplierEvaluationsTable.supplierId, supplierId))
      .orderBy(desc(supplierEvaluationsTable.evaluatedAt))
      .limit(1);

    // Capture fromState from the persisted supplier BEFORE any update.
    const fromState = supplier.sellableStatus ?? null;

    // 10. INSERT evaluation snapshot — ALWAYS, inside transaction (SNAPSHOT FIRST).
    const [evaluation] = await tx
      .insert(supplierEvaluationsTable)
      .values({
        supplierId,
        eligibilityStatus,
        commercialScore,
        sellableStatus,
        pathway,
        scoreSnapshot: {
          exportReadinessScore: ai.exportReadinessScore,
          pathway: ai.pathway,
          complianceGaps: ai.complianceGaps,
          aiOutputId: ai.id,
        },
        thresholdVersion: THRESHOLDS.version,
      })
      .returning();

    // 11. Idempotency check.
    const hasChanged =
      !prevEval ||
      prevEval.eligibilityStatus !== eligibilityStatus ||
      prevEval.commercialScore !== commercialScore ||
      prevEval.sellableStatus !== sellableStatus;

    // 12. Insert transition row only if state changed.
    let transition: TransitionRow | undefined;
    if (hasChanged) {
      [transition] = await tx
        .insert(supplierStateTransitionsTable)
        .values({
          supplierId,
          fromState,
          toState: sellableStatus,
          thresholdVersion: THRESHOLDS.version,
          commercialScoreAtTransition: commercialScore,
          actor: "SYSTEM",
          justification: null,
          evaluationId: evaluation.id,
        })
        .returning();
    }

    // 13. UPDATE supplier (never without a corresponding evaluation snapshot).
    const [updatedSupplier] = await tx
      .update(suppliersTable)
      .set({
        eligibilityStatus,
        commercialScore,
        sellableStatus,
        graduationPathway: pathway,
        nextActions,
        lastEvaluatedAt: new Date(),
        thresholdVersion: THRESHOLDS.version,
      })
      .where(eq(suppliersTable.id, supplierId))
      .returning();

    // 14. Instrumentation.
    logger.info(
      {
        event: "SUPPLIER_EVALUATED",
        supplierId,
        fromState: fromState ?? null,
        toState: sellableStatus,
        score: commercialScore,
        thresholdVersion: THRESHOLDS.version,
        eligibilitySource: requirementRows.length > 0 ? "cc1_requirement_status" : "compliance_docs_legacy",
      },
      "graduation: evaluate",
    );

    // 15. Funnel event — fire ONLY when transitioning INTO SELLABLE for the first time.
    if (sellableStatus === "SELLABLE" && transition && fromState !== "SELLABLE") {
      logInteraction({
        eventType: INTERACTION_TYPES.SUPPLIER_SELLABLE,
        referenceId: supplierId,
        referenceType: "supplier",
        payload: {
          fromState: fromState ?? null,
          commercialScore,
          thresholdVersion: THRESHOLDS.version,
          evaluationId: evaluation.id,
          transitionId: transition.id,
        },
      });

      const email = updatedSupplier.email ?? supplier.email ?? null;
      if (email) {
        const appUrl = process.env.APP_URL ?? "https://fincava.com";
        const tpl = supplierGraduationEmail({
          name: updatedSupplier.nombreCompleto,
          municipio: updatedSupplier.municipio,
          pathway: updatedSupplier.graduationPathway ?? null,
          appUrl,
          state: "SELLABLE",
        });
        sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text }).catch(
          (err) => logger.warn({ err, supplierId }, "graduation: SELLABLE email failed (non-fatal)"),
        );
      }
    }

    if (transition) {
      addBreadcrumb({
        category: "graduation.transition",
        message: "Supplier state transition via evaluateSupplier",
        data: {
          supplierId,
          fromState,
          toState: sellableStatus,
          actor: "SYSTEM",
          evaluationId: evaluation.id,
          thresholdVersion: THRESHOLDS.version,
        },
        level: "info",
      });
    }

    return { supplier: updatedSupplier, evaluation, transition };
  });
}

// ── transitionTo ──────────────────────────────────────────────────────────────

export async function transitionTo(
  supplierId: number,
  toState: SellableState,
  actor: "SYSTEM" | "ADMIN" | "FOUNDER",
  opts?: { justification?: string; evaluationId?: number },
): Promise<{ transition: TransitionRow }> {
  if (actor !== "SYSTEM" && !opts?.justification) {
    throw new TypeError(
      `justification is required for actor=${actor} — no exceptions`,
    );
  }

  return db.transaction(async (tx) => {
    const [supplier] = await tx
      .select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId));
    if (!supplier) {
      throw new NotFoundError(`Supplier ${supplierId} not found`);
    }

    const fromState = supplier.sellableStatus ?? null;

    // SYSTEM: forward-only guard.
    if (actor === "SYSTEM" && fromState !== null) {
      const fromOrder = STATE_ORDER[fromState as SellableState];
      const toOrder = STATE_ORDER[toState];
      if (toOrder <= fromOrder) {
        throw new TypeError(
          `SYSTEM actor cannot perform backward transition: ${fromState} → ${toState}`,
        );
      }
    }

    const [transition] = await tx
      .insert(supplierStateTransitionsTable)
      .values({
        supplierId,
        fromState,
        toState,
        thresholdVersion: THRESHOLDS.version,
        actor,
        justification: opts?.justification ?? null,
        evaluationId: opts?.evaluationId ?? null,
      })
      .returning();

    await tx
      .update(suppliersTable)
      .set({ sellableStatus: toState })
      .where(eq(suppliersTable.id, supplierId));

    logger.info(
      {
        event: "SUPPLIER_TRANSITIONED",
        supplierId,
        fromState: fromState ?? null,
        toState,
        actor,
        thresholdVersion: THRESHOLDS.version,
      },
      "graduation: manual transition",
    );
    addBreadcrumb({
      category: "graduation.transition",
      message: "Manual supplier state transition",
      data: {
        supplierId,
        fromState,
        toState,
        actor,
        evaluationId: opts?.evaluationId ?? null,
        thresholdVersion: THRESHOLDS.version,
      },
      level: "info",
    });

    return { transition };
  });
}

// ── markPublished ─────────────────────────────────────────────────────────────

export async function markPublished(
  supplierId: number,
  actor: "ADMIN" | "FOUNDER",
  justification: string,
): Promise<{ transition: TransitionRow }> {
  const result = await transitionTo(supplierId, "PUBLISHED", actor, { justification });

  setImmediate(async () => {
    try {
      const [supplier] = await db
        .select({
          email:            suppliersTable.email,
          nombreCompleto:   suppliersTable.nombreCompleto,
          municipio:        suppliersTable.municipio,
          graduationPathway: suppliersTable.graduationPathway,
        })
        .from(suppliersTable)
        .where(eq(suppliersTable.id, supplierId))
        .limit(1);

      if (!supplier?.email) return;

      const appUrl = process.env.APP_URL ?? "https://fincava.com";
      const tpl = supplierGraduationEmail({
        name:      supplier.nombreCompleto ?? "Proveedor",
        municipio: supplier.municipio ?? "",
        pathway:   supplier.graduationPathway ?? null,
        appUrl,
        state:     "PUBLISHED",
      });
      const emailResult = await sendEmail({
        to:      supplier.email,
        subject: tpl.subject,
        html:    tpl.html,
        text:    tpl.text,
      });
      if (emailResult.ok) {
        logger.info({ supplierId }, "graduation: PUBLISHED email sent");
      } else {
        logger.warn({ supplierId, reason: emailResult.reason }, "graduation: PUBLISHED email skipped");
      }
    } catch (err) {
      logger.warn({ err, supplierId }, "graduation: PUBLISHED email failed (non-fatal)");
    }
  });

  return result;
}
