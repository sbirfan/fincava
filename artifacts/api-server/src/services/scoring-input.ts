// scoring-input.ts — AI scoring input contract
// Epic 2 T2 — buildScoringInput abstraction layer
//
// Extracts the four DB reads used by scoreSupplier into a named, typed function.
// The return object is passed directly to JSON.stringify() as the Claude user message.
//
// RULES (enforced here):
//   - DB values only — no transformation, no coercion
//   - undefined preserved as-is (JSON.stringify omits undefined-valued keys — correct)
//   - Structure is flat { supplier, farm, economics, compliance, ingestion }
//   - No validation (T3 scope)
//   - This function has no side effects and does not write to the DB
//
// Phase 3 addition — ingestion block:
//   Ingested suppliers may have normalizedName / description / confidenceScore /
//   categoryHints that the field-collected form never captures.  Claude receives them
//   as a separate top-level key so the scoring prompt can weight them appropriately
//   without conflating them with the structured onboarding fields.

import { db } from "@workspace/db";
import {
  suppliersTable,
  farmsTable,
  economicsTable,
  complianceDocsTable,
  productPlaceholdersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

// ── Return type ───────────────────────────────────────────────────────────────
// Each field is the full Drizzle-inferred row type, or undefined if no row exists.
// undefined is intentional — JSON.stringify omits undefined keys, which exactly
// matches the prior inline behaviour.

export type IngestionBlock = {
  normalizedName:         string | null;
  description:            string | null;
  confidenceScore:        string | null;
  dataCompletenessScore:  string | null;
  ingestionSource:        string | null;
  ingestionStatus:        string | null;
  sourceType:             string | null;
  categoryHints:          string[];
} | undefined;

export type ScoringInput = {
  supplier:   typeof suppliersTable.$inferSelect   | undefined;
  farm:       typeof farmsTable.$inferSelect       | undefined;
  economics:  typeof economicsTable.$inferSelect   | undefined;
  compliance: typeof complianceDocsTable.$inferSelect | undefined;
  ingestion:  IngestionBlock;
};

// ── buildScoringInput ─────────────────────────────────────────────────────────
// Fetches the five tables required to construct the Claude scoring prompt.
// Must be called inside the retry loop (attemptScore) so each retry reads
// fresh data — identical to the prior inline behaviour.

export async function buildScoringInput(
  supplierId: number,
): Promise<ScoringInput> {
  const [supplier] = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId));

  const [farm] = await db
    .select()
    .from(farmsTable)
    .where(eq(farmsTable.supplierId, supplierId));

  const [economics] = await db
    .select()
    .from(economicsTable)
    .where(eq(economicsTable.supplierId, supplierId));

  const [compliance] = await db
    .select()
    .from(complianceDocsTable)
    .where(eq(complianceDocsTable.supplierId, supplierId));

  const placeholders = await db
    .select({ categoryHint: productPlaceholdersTable.categoryHint })
    .from(productPlaceholdersTable)
    .where(eq(productPlaceholdersTable.supplierId, supplierId));

  // Build ingestion block only when the supplier row carries ingestion data.
  // For fully field-collected suppliers all these fields are null, so the block
  // is still emitted but with null values — Claude can safely skip null keys.
  // categoryHints is an empty array when no product_placeholders rows exist.
  const ingestion: IngestionBlock = supplier
    ? {
        normalizedName:        supplier.normalizedName,
        description:           supplier.description,
        confidenceScore:       supplier.confidenceScore,
        dataCompletenessScore: supplier.dataCompletenessScore,
        ingestionSource:       supplier.ingestionSource ?? null,
        ingestionStatus:       supplier.ingestionStatus ?? null,
        sourceType:            supplier.sourceType,
        categoryHints:         placeholders
                                 .map((p) => p.categoryHint)
                                 .filter((h): h is string => h !== null),
      }
    : undefined;

  return { supplier, farm, economics, compliance, ingestion };
}
