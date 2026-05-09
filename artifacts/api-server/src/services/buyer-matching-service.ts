// Buyer matching service — Phase 3
// Runs Claude Sonnet 4.6 over a pre-filtered supplier catalog and writes
// rows to `buyer_matches`, marking previous rows as `is_current = false`.
//
// Mirrors the structure of `supplier-graduation-service.ts`:
//   - Single exported entry point: `runMatching(buyerProfileId)`.
//   - Wraps the candidate selection + match insert + profile update in a tx.
//   - Fires the match-ready email at the end (fire-and-forget).
//   - Uses the existing `getAnthropicClient()`; model is overridden to
//     'claude-sonnet-4-6' on the call (no new env var, no new client).

import { db } from "@workspace/db";
import {
  buyerProfilesTable,
  buyerMatchesTable,
  suppliersTable,
  productsTable,
  trustScoresTable,
  usersTable,
  profilesTable,
} from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getAnthropicClient } from "../lib/anthropic";
import { logger } from "../lib/logger";
import { sendEmail, buyerMatchReadyEmail } from "../lib/email";
import { BUYER_MATCHING_SYSTEM_PROMPT } from "../config/buyer-matching-prompts";

const MATCHING_MODEL = "claude-sonnet-4-6";
const MAX_CANDIDATES = 50;
// G4.3: Over-fetch from SQL so the JS trust-score sort has a full pool to work
// with, then trim to MAX_CANDIDATES after sorting by [PUBLISHED, platformTrustScore
// DESC, commercialScore DESC]. This ensures high-trust suppliers are never excluded
// by SQL ordering before the trust scores are even known.
const SQL_CANDIDATE_POOL_SIZE = MAX_CANDIDATES * 2;

// ── Match freshness window ────────────────────────────────────────────────────
// Buyer-triggered re-runs skip Claude if the last run was within this window.
export const MATCH_FRESHNESS_DAYS = 30;

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// ── G3.4 — Zod output validation ─────────────────────────────────────────────
// Validates Claude's JSON response; rejects hallucinated fields or bad types
// rather than silently casting with `as MatchResponse`.
const MatchRowSchema = z.object({
  supplier_id: z.number().int().positive(),
  match_score: z.number().min(0).max(1),
  score_breakdown: z.object({
    product: z.number().min(0).max(1),
    certifications: z.number().min(0).max(1),
    origin: z.number().min(0).max(1),
    volume: z.number().min(0).max(1),
    supplier_type: z.number().min(0).max(1),
  }),
  disqualifiers: z.array(z.string()),
  match_notes: z.string(),
});

const MatchResponseSchema = z.object({
  matches: z.array(MatchRowSchema),
});

export type MatchRow = z.infer<typeof MatchRowSchema>;

// ── G3.3 — Category normalization ────────────────────────────────────────────
// Buyer targetProducts strings (free text from onboarding) often don't exactly
// match products.category values in the DB. This map normalizes common aliases
// to the canonical lowercase form used in products.category.
// SQL pre-filter uses lower(p.category) after normalization so both sides match.
const CATEGORY_ALIASES: Record<string, string> = {
  coffee: "coffee",
  cafe: "coffee",
  café: "coffee",
  "specialty coffee": "coffee",
  "green coffee": "coffee",
  cacao: "cacao",
  cocoa: "cacao",
  chocolate: "cacao",
  "fine cacao": "cacao",
  avocado: "avocado",
  aguacate: "avocado",
  hass: "avocado",
  "exotic fruit": "exotic_fruit",
  exotic_fruit: "exotic_fruit",
  "exotic fruits": "exotic_fruit",
  "tropical fruit": "exotic_fruit",
  "tropical fruits": "exotic_fruit",
  fruit: "exotic_fruit",
  uchuva: "exotic_fruit",
  granadilla: "exotic_fruit",
  maracuyá: "exotic_fruit",
  maracuya: "exotic_fruit",
  "passion fruit": "exotic_fruit",
  superfoods: "superfoods",
  superfood: "superfoods",
  panela: "panela",
  "raw cane sugar": "panela",
  sugarcane: "panela",
  "hearts of palm": "hearts_of_palm",
  hearts_of_palm: "hearts_of_palm",
  palm: "hearts_of_palm",
  palmito: "hearts_of_palm",
  plantain: "plantain",
  platano: "plantain",
  plátano: "plantain",
  banana: "plantain",
  yuca: "yuca",
  cassava: "yuca",
  manioc: "yuca",
  yucca: "yuca",
};

function normalizeLookupKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ");
}

/** Maps a raw buyer targetProducts entry to a canonical lowercase category.
 *  Falls back to lowercased + trimmed input if no alias matches. */
export function normalizeCategoryInput(raw: string): string {
  const key = normalizeLookupKey(raw);
  return CATEGORY_ALIASES[key] ?? key;
}

/** Normalizes an array of targetProducts strings for use in the SQL pre-filter. */
export function normalizeTargetProducts(products: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of products) {
    const norm = normalizeCategoryInput(p);
    if (!seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
}

// ── Candidate pre-filter ──────────────────────────────────────────────────────
// SQL pre-filter — keep token cost bounded. All filtering happens in SQL via
// EXISTS subqueries against `products`, no post-query JS gating.
//   * sellable_status IN ('SELLABLE','PUBLISHED')
//   * EXISTS active product whose category is in buyer.targetProducts
//     (when buyer specified categories)
//   * For every required cert C: EXISTS active product carrying C.
//     Coverage is supplier-level — different products can carry different
//     certs (e.g. one product Organic, another product Fairtrade). The LLM
//     applies the strict per-product disqualifier downstream.
//   * cap to MAX_CANDIDATES — PUBLISHED first, then most recently onboarded.
async function selectCandidates(opts: {
  targetProducts: string[];
  requiredCerts: string[];
}): Promise<
  Array<{
    id: number;
    nombreCompleto: string;
    municipio: string;
    department: string | null;
    supplierType: string;
    sellableStatus: string | null;
    graduationPathway: string | null;
    commercialScore: number | null;
    // G4.3: platform trust score from trust_scores table (company-level).
    // Null when the supplier has no products with a companyId (no FK bridge yet)
    // or when no trust score row exists for their company.
    platformTrustScore: number | null;
    products: Array<{
      id: number;
      name: string;
      category: string;
      subCategory: string | null;
      origin: string;
      altitude: string | null;
      process: string | null;
      variety: string | null;
      cupping: number | null;
      availableKg: number;
      certifications: string[];
    }>;
  }>
> {
  const { targetProducts, requiredCerts } = opts;

  // Base supplier set: SELLABLE or PUBLISHED only.
  const conditions = [
    inArray(suppliersTable.sellableStatus, ["SELLABLE", "PUBLISHED"]),
  ];

  // Category overlap (SQL EXISTS — case-insensitive via lower() on both sides).
  // G3.3: targetProducts are normalized to lowercase canonical forms before
  // entering SQL so "Coffee", "COFFEE", "cafe" all match products.category = "coffee".
  if (targetProducts.length > 0) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${productsTable} p
        WHERE p.supplier_id = ${suppliersTable.id}
          AND p.active = true
          AND lower(p.category::text) = ANY(${sql`ARRAY[${sql.join(targetProducts.map((c) => sql`${c}`), sql`, `)}]::text[]`})
      )`,
    );
  }

  // Required-cert coverage at the supplier level: for each required cert C,
  // there must exist some active product on this supplier carrying C.
  // ILIKE-via-lower would over-match; we compare case-insensitively by lowering
  // both sides through unnest + lower().
  for (const cert of requiredCerts) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${productsTable} p
        WHERE p.supplier_id = ${suppliersTable.id}
          AND p.active = true
          AND EXISTS (
            SELECT 1 FROM unnest(p.certifications) AS c
            WHERE lower(c) = lower(${cert})
          )
      )`,
    );
  }

  // Drop suppliers with zero active products outright.
  conditions.push(
    sql`EXISTS (
      SELECT 1 FROM ${productsTable} p
      WHERE p.supplier_id = ${suppliersTable.id} AND p.active = true
    )`,
  );

  // G4.3: Fetch SQL_CANDIDATE_POOL_SIZE rows (2× MAX_CANDIDATES) so the
  // JavaScript trust-score re-sort has a full pool. Primary sort: PUBLISHED
  // first. Secondary sort: commercialScore DESC (AI quality signal, already
  // on suppliersTable — no extra join). The JS step below re-sorts by
  // platformTrustScore and trims to MAX_CANDIDATES.
  const candidateRows = await db
    .select({
      id: suppliersTable.id,
      nombreCompleto: suppliersTable.nombreCompleto,
      municipio: suppliersTable.municipio,
      department: suppliersTable.department,
      supplierType: suppliersTable.supplierType,
      sellableStatus: suppliersTable.sellableStatus,
      graduationPathway: suppliersTable.graduationPathway,
      commercialScore: suppliersTable.commercialScore,
    })
    .from(suppliersTable)
    .where(and(...conditions))
    .orderBy(
      sql`CASE WHEN ${suppliersTable.sellableStatus} = 'PUBLISHED' THEN 0 ELSE 1 END`,
      sql`${suppliersTable.commercialScore} DESC NULLS LAST`,
      sql`${suppliersTable.id} DESC`,
    )
    .limit(SQL_CANDIDATE_POOL_SIZE);

  if (candidateRows.length === 0) return [];

  const supplierIds = candidateRows.map((r) => r.id);

  // Pull all active products for the (already filtered) candidate set.
  // G4.3: also fetch companyId so we can resolve platformTrustScore.
  const productRows = await db
    .select({
      id: productsTable.id,
      supplierId: productsTable.supplierId,
      companyId: productsTable.companyId,
      name: productsTable.name,
      category: productsTable.category,
      subCategory: productsTable.subCategory,
      origin: productsTable.origin,
      altitude: productsTable.altitude,
      process: productsTable.process,
      variety: productsTable.variety,
      cupping: productsTable.cupping,
      availableKg: productsTable.availableKg,
      certifications: productsTable.certifications,
    })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.active, true),
        inArray(productsTable.supplierId, supplierIds),
      ),
    );

  const productsBySupplier = new Map<number, typeof productRows>();
  // G4.3: supplierId → first non-null companyId seen on any of their products.
  // This is the indirect supplier→company path until the direct FK bridge is added.
  const companyIdBySupplier = new Map<number, number>();
  for (const p of productRows) {
    if (p.supplierId == null) continue;
    const list = productsBySupplier.get(p.supplierId) ?? [];
    list.push(p);
    productsBySupplier.set(p.supplierId, list);
    if (p.companyId != null && !companyIdBySupplier.has(p.supplierId)) {
      companyIdBySupplier.set(p.supplierId, p.companyId);
    }
  }

  // G4.3: Batch-fetch platform trust scores for all resolved company IDs.
  const companyIds = [...new Set(companyIdBySupplier.values())];
  const trustScoreByCompanyId = new Map<number, number>();
  if (companyIds.length > 0) {
    const trustRows = await db
      .select({ companyId: trustScoresTable.companyId, score: trustScoresTable.score })
      .from(trustScoresTable)
      .where(inArray(trustScoresTable.companyId, companyIds));
    for (const t of trustRows) {
      trustScoreByCompanyId.set(t.companyId, t.score ?? 0);
    }
  }

  // Build enriched candidate objects.
  const enriched = candidateRows.map((s) => {
    const products = productsBySupplier.get(s.id) ?? [];
    const companyId = companyIdBySupplier.get(s.id);
    const platformTrustScore =
      companyId != null ? (trustScoreByCompanyId.get(companyId) ?? null) : null;
    return {
      id: s.id,
      nombreCompleto: s.nombreCompleto,
      municipio: s.municipio,
      department: s.department,
      supplierType: s.supplierType,
      sellableStatus: s.sellableStatus,
      graduationPathway: s.graduationPathway,
      commercialScore: s.commercialScore,
      platformTrustScore,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        subCategory: p.subCategory,
        origin: p.origin,
        altitude: p.altitude,
        process: p.process,
        variety: p.variety,
        cupping: p.cupping,
        availableKg: p.availableKg,
        certifications: p.certifications ?? [],
      })),
    };
  });

  // G4.3: Re-sort enriched pool by [PUBLISHED first, platformTrustScore DESC,
  // commercialScore DESC] and trim to MAX_CANDIDATES.
  // This ensures high-trust veterans surface before low-trust newcomers
  // even if they ranked lower on commercialScore in the SQL pre-filter.
  enriched.sort((a, b) => {
    const pubA = a.sellableStatus === "PUBLISHED" ? 0 : 1;
    const pubB = b.sellableStatus === "PUBLISHED" ? 0 : 1;
    if (pubA !== pubB) return pubA - pubB;
    const tA = a.platformTrustScore ?? -1;
    const tB = b.platformTrustScore ?? -1;
    if (tB !== tA) return tB - tA;
    return (b.commercialScore ?? 0) - (a.commercialScore ?? 0);
  });

  return enriched.slice(0, MAX_CANDIDATES);
}

// ── Coarse Phase 1 preview (no LLM call) ──────────────────────────────────────
// Used by the dashboard teaser banner before sections A+B are complete.
export async function countCoarseMatches(buyerProfileId: number): Promise<number> {
  const [profile] = await db
    .select({
      targetProducts: buyerProfilesTable.targetProducts,
      requiredCertsP1: buyerProfilesTable.requiredCertsP1,
    })
    .from(buyerProfilesTable)
    .where(eq(buyerProfilesTable.id, buyerProfileId));

  if (!profile) return 0;

  const candidates = await selectCandidates({
    targetProducts: (profile.targetProducts ?? []) as string[],
    requiredCerts: (profile.requiredCertsP1 ?? []) as string[],
  });
  return candidates.length;
}

// ── Compute "fields_that_improve_match" (no LLM, no DB writes) ───────────────
// Surfaces buyer profile fields that the matching prompt weights heavily but
// the buyer has not yet filled. Used by GET /api/buyers/:id/matches.
export function computeFieldsThatImproveMatch(
  profile: typeof buyerProfilesTable.$inferSelect,
): string[] {
  const missing: string[] = [];

  // Product fit (30%) — already required at registration; flag only if empty.
  if (!profile.targetProducts || profile.targetProducts.length === 0) {
    missing.push("targetProducts");
  }

  // Certifications (25%).
  if (!profile.requiredCertsP1 || profile.requiredCertsP1.length === 0) {
    missing.push("requiredCertsP1");
  }

  // Origin / region — Section A signals.
  if (profile.traceabilityLevel == null) missing.push("traceabilityLevel");

  // Volume (15%) — Section B signals.
  if (profile.intendedVolumeMt == null) missing.push("intendedVolumeMt");
  if (profile.preferredIncoterm == null) missing.push("preferredIncoterm");
  if (profile.importFrequency == null) missing.push("importFrequency");

  // Supplier type (10%).
  if (!profile.supplierTypePref || profile.supplierTypePref.length === 0) {
    missing.push("supplierTypePref");
  }

  // Quality & compliance (Section C) — sharpens cert dimension.
  if (profile.auditStandard == null) missing.push("auditStandard");

  return missing;
}

// ── runMatching ───────────────────────────────────────────────────────────────

export async function runMatching(buyerProfileId: number): Promise<{
  matchesInserted: number;
  candidatesEvaluated: number;
}> {
  // 1. Load buyer profile.
  const [profile] = await db
    .select()
    .from(buyerProfilesTable)
    .where(eq(buyerProfilesTable.id, buyerProfileId));

  if (!profile) {
    throw new NotFoundError(`Buyer profile ${buyerProfileId} not found`);
  }

  // 2. SQL pre-filter candidates.
  // G3.3: normalize buyer's free-text targetProducts to canonical lowercase forms
  // so "Coffee", "COFFEE", "cafe" all hit products.category = "coffee" in the SQL.
  const candidates = await selectCandidates({
    targetProducts: normalizeTargetProducts((profile.targetProducts ?? []) as string[]),
    requiredCerts: (profile.requiredCertsP1 ?? []) as string[],
  });

  logger.info(
    { buyerProfileId, candidateCount: candidates.length },
    "buyer-matching: candidates selected",
  );

  // 3. Build the LLM payload and call Claude Sonnet 4.6.
  let matchRows: MatchRow[] = [];
  if (candidates.length > 0) {
    const buyerPayload = {
      id: profile.id,
      companyName: profile.companyName,
      country: profile.country,
      destinationPort: profile.destinationPort,
      targetProducts: profile.targetProducts,
      preferredIncoterm: profile.preferredIncoterm,
      intendedVolumeMt: profile.intendedVolumeMt,
      importFrequency: profile.importFrequency,
      volumeBand: profile.volumeBand,
      requiredCertsP1: profile.requiredCertsP1,
      timeToFirstOrder: profile.timeToFirstOrder,
      traceabilityLevel: profile.traceabilityLevel,
      existingColombiaRel: profile.existingColombiaRel,
      tradeFinanceOpen: profile.tradeFinanceOpen,
      auditStandard: profile.auditStandard,
      logisticsPartner: profile.logisticsPartner,
      supplierTypePref: profile.supplierTypePref,
      socialImpactReqs: profile.socialImpactReqs,
      earlyStageSupplierOpen: profile.earlyStageSupplierOpen,
      languagePreference: profile.languagePreference,
      // ── Phase 1.5 extended onboarding signals ──────────────────────────────
      // Included only when non-null; Claude's qualitative routing block uses
      // these to adjust scores within each dimension band (weights unchanged).
      ...(profile.buyerSegment != null && { buyerSegment: profile.buyerSegment }),
      ...(profile.coffeeQualityTier != null && { coffeeQualityTier: profile.coffeeQualityTier }),
      ...(profile.coffeeFlavorProfile != null &&
        (profile.coffeeFlavorProfile as string[]).length > 0 && {
          coffeeFlavorProfile: profile.coffeeFlavorProfile,
        }),
      ...(profile.cacaoFlavorProfile != null && { cacaoFlavorProfile: profile.cacaoFlavorProfile }),
      ...(profile.priceSensitivity != null && { priceSensitivity: profile.priceSensitivity }),
      ...(profile.sustainabilityImportance != null && {
        sustainabilityImportance: profile.sustainabilityImportance,
      }),
      ...(profile.sustainabilityDimensions != null &&
        (profile.sustainabilityDimensions as string[]).length > 0 && {
          sustainabilityDimensions: profile.sustainabilityDimensions,
        }),
    };

    try {
      const client = getAnthropicClient();
      const start = Date.now();
      const message = await client.messages.create({
        model: MATCHING_MODEL,
        max_tokens: 4096,
        system: BUYER_MATCHING_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: JSON.stringify({ buyer: buyerPayload, candidates }),
          },
        ],
      });
      const duration = Date.now() - start;
      logger.info(
        { buyerProfileId, duration, candidateCount: candidates.length },
        "buyer-matching: Claude latency",
      );

      const firstBlock = message.content[0];
      if (!firstBlock || firstBlock.type !== "text") {
        throw new Error(
          `Claude returned non-text content block: ${firstBlock?.type ?? "none"}`,
        );
      }
      const raw = firstBlock.text;
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

      // G3.4 — Zod validation replaces raw JSON.parse cast.
      // ZodError is thrown on schema mismatch, caught below, logged, and re-thrown.
      const parsed = MatchResponseSchema.parse(JSON.parse(jsonStr));

      // Drop any supplier_id not in the candidate set (hallucination guard).
      const validIds = new Set(candidates.map((c) => c.id));
      matchRows = parsed.matches.filter((m) => validIds.has(m.supplier_id));
    } catch (err) {
      logger.error({ err, buyerProfileId }, "buyer-matching: Claude call failed");
      throw err;
    }
  }

  // 4. Persist: stale previous matches, insert new, update profile.
  const sectionsAtRun = ((profile.p2SectionsDone ?? []) as string[]).slice();

  await db.transaction(async (tx) => {
    // Mark previous current matches as stale.
    await tx
      .update(buyerMatchesTable)
      .set({ isCurrent: false })
      .where(
        and(
          eq(buyerMatchesTable.buyerProfileId, buyerProfileId),
          eq(buyerMatchesTable.isCurrent, true),
        ),
      );

    // Insert new match rows.
    if (matchRows.length > 0) {
      await tx.insert(buyerMatchesTable).values(
        matchRows.map((m) => ({
          buyerProfileId,
          supplierId: m.supplier_id,
          matchScore: m.match_score.toFixed(2),
          scoreBreakdown: m.score_breakdown,
          disqualifiers: m.disqualifiers,
          matchNotes: m.match_notes,
          sectionsAtRun,
          isCurrent: true,
        })),
      );
    }

    // Update buyer profile counters + state.
    await tx
      .update(buyerProfilesTable)
      .set({
        matchingRunCount: sql`${buyerProfilesTable.matchingRunCount} + 1`,
        lastMatchedAt: new Date(),
        state: "MATCHED",
        updatedAt: new Date(),
      })
      .where(eq(buyerProfilesTable.id, buyerProfileId));
  });

  logger.info(
    {
      buyerProfileId,
      matchesInserted: matchRows.length,
      candidatesEvaluated: candidates.length,
    },
    "buyer-matching: run complete",
  );

  // 5. Match-ready email — fire-and-forget.
  void (async () => {
    try {
      const [user] = await db
        .select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, profile.userId));
      const [userProfile] = await db
        .select({ firstName: profilesTable.firstName })
        .from(profilesTable)
        .where(eq(profilesTable.userId, profile.userId));

      if (!user?.email) {
        logger.warn({ buyerProfileId }, "buyer-matching: no email for buyer, skip notification");
        return;
      }

      const appUrl =
        process.env["FRONTEND_URL"] ??
        (process.env["REPLIT_DOMAINS"]
          ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}`
          : "https://fincava.com");
      const tpl = buyerMatchReadyEmail({
        firstName: userProfile?.firstName ?? "there",
        matchCount: matchRows.length,
        dashboardUrl: `${appUrl}/dashboard/matches`,
      });
      const result = await sendEmail({
        to: user.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
      if (!result.ok) {
        logger.warn(
          { buyerProfileId, reason: result.reason },
          "buyer-matching: match-ready email skipped",
        );
      }
    } catch (err) {
      logger.warn(
        { err, buyerProfileId },
        "buyer-matching: match-ready email failed (non-fatal)",
      );
    }
  })();

  return {
    matchesInserted: matchRows.length,
    candidatesEvaluated: candidates.length,
  };
}
