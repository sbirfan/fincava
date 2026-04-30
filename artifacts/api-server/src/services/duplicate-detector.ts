// duplicate-detector.ts
// Computes a SHA-256 supplier fingerprint and runs a two-pass duplicate check:
//   Pass 1 — exact fingerprint match (very fast, index scan)
//   Pass 2 — fuzzy word-overlap match via ILIKE (fallback)
//
// No external libraries needed — uses Node's built-in crypto module.

import { createHash } from "crypto";
import { db, suppliersTable, INTERACTION_TYPES } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { logger } from "../lib/logger";
import { logInteraction } from "../lib/interaction-logger";

export type MatchType = "EXACT_FINGERPRINT" | "FUZZY_NAME" | "NONE";

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  matchedSupplierId: number | null;
  matchedName: string | null;
  similarityScore: number;
  matchType: MatchType;
}

// Stop words excluded from the fuzzy word-overlap calculation.
const STOP_WORDS = new Set([
  "the", "and", "for", "del", "los", "las", "una", "para", "con", "por",
  "que", "colombia", "farmer", "cooperative", "coop", "agro", "finca",
  "hacienda", "empresa", "asociacion", "asociación",
]);

// ── Public API ────────────────────────────────────────────────────────────────

export function computeSupplierFingerprint(name: string, country: string): string {
  const key = `${normaliseName(name)}|${country.trim().toLowerCase()}`;
  return createHash("sha256").update(key).digest("hex");
}

export async function checkDuplicate(
  name: string,
  country: string = "Colombia",
  excludeSupplierId?: number,
): Promise<DuplicateCheckResult> {
  const fingerprint = computeSupplierFingerprint(name, country);

  // Pass 1 — exact fingerprint match
  try {
    const exactRows = await db
      .select({ id: suppliersTable.id, nombreCompleto: suppliersTable.nombreCompleto })
      .from(suppliersTable)
      .where(eq(suppliersTable.supplierFingerprint, fingerprint))
      .limit(5);

    const match = exactRows.find((r) => r.id !== excludeSupplierId);
    if (match) {
      return {
        hasDuplicate: true,
        matchedSupplierId: match.id,
        matchedName: match.nombreCompleto,
        similarityScore: 1.0,
        matchType: "EXACT_FINGERPRINT",
      };
    }
  } catch (err) {
    logger.error({ err }, "duplicate-detector: exact fingerprint query failed");
  }

  // Pass 2 — fuzzy word-overlap via ILIKE
  const significantWords = normaliseName(name)
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  if (significantWords.length === 0) {
    return noMatch();
  }

  const conditions = significantWords.map((word) =>
    or(
      ilike(suppliersTable.nombreCompleto, `%${word}%`),
      ilike(suppliersTable.normalizedName, `%${word}%`),
    ),
  );

  try {
    const fuzzyRows = await db
      .select({ id: suppliersTable.id, nombreCompleto: suppliersTable.nombreCompleto })
      .from(suppliersTable)
      .where(or(...conditions))
      .limit(10);

    const candidates = fuzzyRows.filter((r) => r.id !== excludeSupplierId);

    for (const candidate of candidates) {
      const score = wordOverlapScore(name, candidate.nombreCompleto ?? "");
      if (score >= 0.6) {
        return {
          hasDuplicate: true,
          matchedSupplierId: candidate.id,
          matchedName: candidate.nombreCompleto,
          similarityScore: score,
          matchType: "FUZZY_NAME",
        };
      }
    }
  } catch (err) {
    logger.error({ err }, "duplicate-detector: fuzzy name query failed");
  }

  return noMatch();
}

// ── Duplicate override audit log ──────────────────────────────────────────────

// logDuplicateOverride fires a DUPLICATE_OVERRIDE interaction event (fire-and-forget).
// Validates that override_reason is non-empty before logging.
export function logDuplicateOverride(
  supplierId: number,
  matchedSupplierId: number,
  overrideReason: string,
  adminId: number,
): void {
  const reason = overrideReason.trim();
  if (!reason) {
    logger.warn(
      { supplierId, matchedSupplierId, adminId },
      "duplicate-detector: logDuplicateOverride called with empty override_reason — event skipped",
    );
    return;
  }

  logInteraction({
    eventType: INTERACTION_TYPES.DUPLICATE_OVERRIDE,
    actorId: adminId,
    actorType: "admin",
    referenceId: supplierId,
    referenceType: "supplier",
    payload: {
      override_reason: reason,
      admin_id: adminId,
      matched_supplier_id: matchedSupplierId,
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normaliseName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function wordOverlapScore(a: string, b: string): number {
  const wordsA = new Set(normaliseName(a).split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(normaliseName(b).split(/\s+/).filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

function noMatch(): DuplicateCheckResult {
  return {
    hasDuplicate: false,
    matchedSupplierId: null,
    matchedName: null,
    similarityScore: 0,
    matchType: "NONE",
  };
}
