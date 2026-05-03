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
  usersTable,
  profilesTable,
} from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { getAnthropicClient } from "../lib/anthropic";
import { logger } from "../lib/logger";
import { sendEmail, buyerMatchReadyEmail } from "../lib/email";
import { BUYER_MATCHING_SYSTEM_PROMPT } from "../config/buyer-matching-prompts";

const MATCHING_MODEL = "claude-sonnet-4-6";
const MAX_CANDIDATES = 50;

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export interface MatchRow {
  supplier_id: number;
  match_score: number;
  score_breakdown: Record<string, number>;
  disqualifiers: string[];
  match_notes: string;
}

interface MatchResponse {
  matches: MatchRow[];
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

  // Category overlap (SQL EXISTS — runs entirely server-side).
  if (targetProducts.length > 0) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${productsTable} p
        WHERE p.supplier_id = ${suppliersTable.id}
          AND p.active = true
          AND p.category::text = ANY(${sql`ARRAY[${sql.join(targetProducts.map((c) => sql`${c}`), sql`, `)}]::text[]`})
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
      sql`${suppliersTable.id} DESC`,
    )
    .limit(MAX_CANDIDATES);

  if (candidateRows.length === 0) return [];

  const supplierIds = candidateRows.map((r) => r.id);

  // Pull all active products for the (already filtered) candidate set.
  const productRows = await db
    .select({
      id: productsTable.id,
      supplierId: productsTable.supplierId,
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
  for (const p of productRows) {
    if (p.supplierId == null) continue;
    const list = productsBySupplier.get(p.supplierId) ?? [];
    list.push(p);
    productsBySupplier.set(p.supplierId, list);
  }

  return candidateRows.map((s) => {
    const products = productsBySupplier.get(s.id) ?? [];
    return {
      id: s.id,
      nombreCompleto: s.nombreCompleto,
      municipio: s.municipio,
      department: s.department,
      supplierType: s.supplierType,
      sellableStatus: s.sellableStatus,
      graduationPathway: s.graduationPathway,
      commercialScore: s.commercialScore,
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
  const candidates = await selectCandidates({
    targetProducts: (profile.targetProducts ?? []) as string[],
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
      const parsed = JSON.parse(jsonStr) as MatchResponse;
      if (!parsed?.matches || !Array.isArray(parsed.matches)) {
        throw new Error("Claude did not return a `matches` array");
      }

      // Validate + clamp scores; drop any supplier_id not in the candidate set.
      const validIds = new Set(candidates.map((c) => c.id));
      matchRows = parsed.matches
        .filter((m) => validIds.has(m.supplier_id))
        .map((m) => ({
          supplier_id: m.supplier_id,
          match_score: Math.max(0, Math.min(1, Number(m.match_score) || 0)),
          score_breakdown: m.score_breakdown ?? {},
          disqualifiers: Array.isArray(m.disqualifiers) ? m.disqualifiers : [],
          match_notes: typeof m.match_notes === "string" ? m.match_notes : "",
        }));
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
