// Supplier graduation service
// memo §5.3 compliance — Phase 1 state machine
// EP4: every evaluation snapshot carries thresholdVersion + actor

import { db } from "@workspace/db";
import {
  suppliersTable,
  complianceDocsTable,
  aiOutputsTable,
  supplierEvaluationsTable,
  supplierStateTransitionsTable,
  INTERACTION_TYPES,
} from "@workspace/db";
import type { Supplier } from "@workspace/db";
import { THRESHOLDS } from "../../../../lib/config/thresholds";
import { eq, desc, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { logInteraction } from "../lib/interaction-logger";
import { sendEmail, supplierGraduationEmail } from "../lib/email";

// ── Sentry breadcrumb shim ────────────────────────────────────────────────────
// Optional integration — MUST NOT throw if @sentry/node is not installed.
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

type SellableState = "NOT_READY" | "ELIGIBLE" | "SELLABLE" | "PUBLISHED";

const VALID_PATHWAYS = ["A", "B", "C", "D"] as const;
type ValidPathway = (typeof VALID_PATHWAYS)[number];

const STATE_ORDER: Record<SellableState, number> = {
  NOT_READY: 0,
  ELIGIBLE: 1,
  SELLABLE: 2,
  PUBLISHED: 3,
};

// ── Compliance field mapping ──────────────────────────────────────────────────
// Threshold key names do not all match DB column names (icaRegistration,
// fitosanitario differ). Centralised here so the mismatch is explicit.

function getFieldValue(
  key: string,
  supplier: Supplier,
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
      return supplier.consentGiven;
    default:
      return false;
  }
}

// ── Pure computation helpers ──────────────────────────────────────────────────

function computeEligibility(
  supplier: Supplier,
  compliance: ComplianceRow | null,
): { eligibilityStatus: "PASS" | "FAIL"; missingFields: string[] } {
  const missingFields: string[] = [];
  for (const field of THRESHOLDS.eligibility.requiredFields) {
    if (!getFieldValue(field, supplier, compliance)) missingFields.push(field);
  }
  return {
    eligibilityStatus: missingFields.length === 0 ? "PASS" : "FAIL",
    missingFields,
  };
}

function computeSellableStatus(
  eligibilityStatus: "PASS" | "FAIL",
  score: number,
): "NOT_READY" | "ELIGIBLE" | "SELLABLE" {
  if (eligibilityStatus === "FAIL") return "NOT_READY";
  if (score < THRESHOLDS.commercial.partialMin) return "NOT_READY";
  if (score < THRESHOLDS.commercial.sellableMin) return "ELIGIBLE";
  return "SELLABLE";
  // PUBLISHED is never set automatically (EP6).
}

function parsePathway(raw: string | null | undefined): ValidPathway | null {
  if (raw && (VALID_PATHWAYS as readonly string[]).includes(raw))
    return raw as ValidPathway;
  return null;
}

function computeNextActions(
  missingFields: string[],
  pathway: ValidPathway | null,
): Record<string, unknown> {
  return {
    missingFields,
    pathwaySteps: pathway ? [`Complete pathway ${pathway} requirements`] : [],
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
    //    If missing → throw NotFoundError. No evaluation row is inserted,
    //    no supplier update is performed.
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

    // 3. Fetch compliance_docs (latest row by id — defensive against legacy duplicates).
    //    If row is missing → treat all required fields as absent (eligibility FAIL).
    const [complianceRow] = await tx
      .select()
      .from(complianceDocsTable)
      .where(eq(complianceDocsTable.supplierId, supplierId))
      .orderBy(desc(complianceDocsTable.id))
      .limit(1);
    const compliance: ComplianceRow | null = complianceRow ?? null;

    // 4–8. Compute evaluation outputs.
    const { eligibilityStatus, missingFields } = computeEligibility(
      supplier,
      compliance,
    );
    const commercialScore = ai.exportReadinessScore;
    const sellableStatus = computeSellableStatus(eligibilityStatus, commercialScore);
    const pathway = parsePathway(ai.pathway);
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
    //     No previous evaluation → treat as changed (first time).
    //     Previous evaluation exists → only transition if any output changed.
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
          evaluationId: evaluation.id, // SYSTEM transitions MUST link evaluation.
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
      },
      "graduation: evaluate",
    );

    // 15. Funnel event — fire ONLY when transitioning INTO SELLABLE for the first time.
    // Guard: fromState !== "SELLABLE" prevents duplicate events on re-evaluation of
    // an already-sellable supplier. transition existence confirms a real state change.
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

      // G7: Notify supplier by email when they first reach SELLABLE state.
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
  // Pre-condition check BEFORE any DB write.
  // ADMIN and FOUNDER ALWAYS require justification — no exceptions.
  if (actor !== "SYSTEM" && !opts?.justification) {
    throw new TypeError(
      `justification is required for actor=${actor} — no exceptions`,
    );
  }

  return db.transaction(async (tx) => {
    // Fetch supplier — fromState must be read from persisted row before any update.
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

    // Insert transition row.
    const [transition] = await tx
      .insert(supplierStateTransitionsTable)
      .values({
        supplierId,
        fromState,
        toState,
        thresholdVersion: THRESHOLDS.version,
        actor,
        justification: opts?.justification ?? null,
        // SYSTEM: evaluationId MUST be supplied by caller (from same transaction).
        // ADMIN/FOUNDER: evaluationId is optional (null for manual overrides).
        evaluationId: opts?.evaluationId ?? null,
      })
      .returning();

    // Update supplier sellableStatus.
    await tx
      .update(suppliersTable)
      .set({ sellableStatus: toState })
      .where(eq(suppliersTable.id, supplierId));

    // Instrumentation.
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
// Only ADMIN or FOUNDER may publish. justification is non-optional by design.

export async function markPublished(
  supplierId: number,
  actor: "ADMIN" | "FOUNDER",
  justification: string,
): Promise<{ transition: TransitionRow }> {
  return transitionTo(supplierId, "PUBLISHED", actor, { justification });
}
