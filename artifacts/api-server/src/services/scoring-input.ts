// scoring-input.ts — AI scoring input contract
// Epic 2 T2 — buildScoringInput abstraction layer
//
// Extracts the four DB reads used by scoreSupplier into a named, typed function.
// The return object is passed directly to JSON.stringify() as the Claude user message.
//
// RULES (enforced here):
//   - DB values only — no transformation, no coercion
//   - undefined preserved as-is (JSON.stringify omits undefined-valued keys — correct)
//   - Structure is flat { supplier, farm, economics, compliance }
//   - No validation (T3 scope)
//   - This function has no side effects and does not write to the DB

import { db } from "@workspace/db";
import {
  suppliersTable,
  farmsTable,
  economicsTable,
  complianceDocsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

// ── Return type ───────────────────────────────────────────────────────────────
// Each field is the full Drizzle-inferred row type, or undefined if no row exists.
// undefined is intentional — JSON.stringify omits undefined keys, which exactly
// matches the prior inline behaviour.

export type ScoringInput = {
  supplier:   typeof suppliersTable.$inferSelect   | undefined;
  farm:       typeof farmsTable.$inferSelect       | undefined;
  economics:  typeof economicsTable.$inferSelect   | undefined;
  compliance: typeof complianceDocsTable.$inferSelect | undefined;
};

// ── buildScoringInput ─────────────────────────────────────────────────────────
// Fetches the four tables required to construct the Claude scoring prompt.
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

  return { supplier, farm, economics, compliance };
}
