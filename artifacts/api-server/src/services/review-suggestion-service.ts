// review-suggestion-service.ts — Layer B
// Produces an AI-powered review recommendation for a specific compliance requirement.
// Called by GET /api/admin/compliance/requirements/:id/ai-suggestion.
// Caches result in ai_outputs keyed by (requirementId, latestDocumentId).
// Cache is invalidated when a newer document is uploaded for the same requirement.

import { db, aiOutputsTable, suppliersTable, complianceDocumentsV2Table, adminComplianceReviewsTable } from "@workspace/db";
import { supplierRequirementStatusTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getAnthropicClient, DOCUMENT_MODEL } from "../lib/anthropic";
import { REVIEW_SUGGESTION_PROMPT } from "../config/ai-prompts/review-suggestion-prompt";
import { logger } from "../lib/logger";

export interface ReviewSuggestion {
  recommendation: "verified" | "needs_fix" | "escalate";
  rationale: string;
  confidence: number;
  key_signals: string[];
  fromCache: boolean;
}

const ALLOWED_RECOMMENDATIONS = new Set(["verified", "needs_fix", "escalate"]);

function validateSuggestion(raw: unknown): ReviewSuggestion {
  if (typeof raw !== "object" || raw === null) throw new Error("Claude returned non-object");
  const r = raw as Record<string, unknown>;

  const recommendation = ALLOWED_RECOMMENDATIONS.has(r.recommendation as string)
    ? (r.recommendation as "verified" | "needs_fix" | "escalate")
    : "needs_fix";

  return {
    recommendation,
    rationale: typeof r.rationale === "string" ? r.rationale.slice(0, 200) : "Unable to determine recommendation.",
    confidence: typeof r.confidence === "number" ? Math.max(0, Math.min(1, r.confidence)) : 0.5,
    key_signals: Array.isArray(r.key_signals)
      ? (r.key_signals as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 3)
      : [],
    fromCache: false,
  };
}

export async function getReviewSuggestion(requirementId: number): Promise<ReviewSuggestion> {
  // 1. Load the requirement row
  const [requirement] = await db
    .select()
    .from(supplierRequirementStatusTable)
    .where(eq(supplierRequirementStatusTable.id, requirementId));

  if (!requirement) {
    throw new Error(`Requirement ${requirementId} not found`);
  }

  const { supplierId, requirementCode } = requirement;

  // 2. Find the most recent document for this requirement
  const [latestDoc] = await db
    .select({ id: complianceDocumentsV2Table.id, createdAt: complianceDocumentsV2Table.createdAt })
    .from(complianceDocumentsV2Table)
    .where(
      and(
        eq(complianceDocumentsV2Table.supplierId, supplierId),
        eq(complianceDocumentsV2Table.requirementCode, requirementCode),
      ),
    )
    .orderBy(desc(complianceDocumentsV2Table.createdAt))
    .limit(1);

  const latestDocumentId = latestDoc?.id ?? null;

  // 3. Check cache: look for an ai_outputs row with callType=REVIEW_SUGGESTION
  //    and gapAnalysis containing matching requirementId + latestDocumentId
  const cachedRows = await db
    .select()
    .from(aiOutputsTable)
    .where(
      and(
        eq(aiOutputsTable.supplierId, supplierId),
        eq(aiOutputsTable.callType, "REVIEW_SUGGESTION"),
      ),
    )
    .orderBy(desc(aiOutputsTable.createdAt))
    .limit(10);

  for (const row of cachedRows) {
    try {
      const meta = typeof row.gapAnalysis === "string"
        ? JSON.parse(row.gapAnalysis)
        : row.gapAnalysis;
      if (
        meta?.requirementId === requirementId &&
        meta?.documentId === latestDocumentId
      ) {
        // Cache hit — parse and return stored result
        const stored = typeof row.documentContent === "string"
          ? JSON.parse(row.documentContent)
          : null;
        if (stored) {
          logger.info({ requirementId, latestDocumentId }, "review-suggestion: CACHE_HIT (Layer B)");
          return { ...validateSuggestion(stored), fromCache: true };
        }
      }
    } catch {
      // malformed cache row — skip
    }
  }

  // 4. Build context for Claude
  const [supplier] = await db
    .select({
      nombreCompleto: suppliersTable.nombreCompleto,
      municipio: suppliersTable.municipio,
      commercialScore: suppliersTable.commercialScore,
      sellableStatus: suppliersTable.sellableStatus,
    })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  // Latest prescreening result for the document
  let prescreeningResult: unknown = null;
  if (latestDoc) {
    const [prescreenRow] = await db
      .select({ documentContent: aiOutputsTable.documentContent })
      .from(aiOutputsTable)
      .where(
        and(
          eq(aiOutputsTable.supplierId, supplierId),
          eq(aiOutputsTable.callType, "DOC_PRESCREENING"),
        ),
      )
      .orderBy(desc(aiOutputsTable.createdAt))
      .limit(1);

    if (prescreenRow?.documentContent) {
      try {
        prescreeningResult = JSON.parse(prescreenRow.documentContent);
      } catch {
        // ignore parse error
      }
    }
  }

  // Last 5 admin review decisions for this requirement
  const reviewHistory = await db
    .select({
      decision: adminComplianceReviewsTable.decision,
      reasonCode: adminComplianceReviewsTable.reasonCode,
      visibleNote: adminComplianceReviewsTable.visibleNote,
      reviewedAt: adminComplianceReviewsTable.reviewedAt,
    })
    .from(adminComplianceReviewsTable)
    .where(
      and(
        eq(adminComplianceReviewsTable.supplierId, supplierId),
        eq(adminComplianceReviewsTable.requirementCode, requirementCode),
      ),
    )
    .orderBy(desc(adminComplianceReviewsTable.reviewedAt))
    .limit(5);

  const context = {
    requirement: {
      id: requirementId,
      requirementCode,
      agency: requirement.agency,
      state: requirement.state,
      visibleNote: requirement.visibleNote,
    },
    supplier: supplier ?? null,
    latestDocumentId,
    prescreeningResult,
    reviewHistory,
  };

  // 5. Call Claude
  logger.info({ requirementId, supplierId, latestDocumentId }, "review-suggestion: calling Claude (Layer B)");
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: DOCUMENT_MODEL,
    max_tokens: 256,
    system: [{ type: "text", text: REVIEW_SUGGESTION_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: JSON.stringify(context) }],
  });

  const rawText = (message.content[0] as { type: string; text: string }).text ?? "";
  const jsonStr = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const parsed = JSON.parse(jsonStr) as unknown;
  const result = validateSuggestion(parsed);

  // 6. Store in ai_outputs as cache
  await db.insert(aiOutputsTable).values({
    supplierId,
    aiModel: DOCUMENT_MODEL,
    callType: "REVIEW_SUGGESTION",
    documentContent: JSON.stringify(result),
    gapAnalysis: JSON.stringify({ requirementId, documentId: latestDocumentId }),
  });

  logger.info(
    { requirementId, supplierId, recommendation: result.recommendation, confidence: result.confidence },
    "review-suggestion: completed (Layer B)",
  );

  return result;
}
