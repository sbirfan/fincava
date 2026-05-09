import { eq, count, inArray, and, sql } from "drizzle-orm";
import {
  db,
  companiesTable,
  trustScoresTable,
  productsTable,
  ordersTable,
  orderItemsTable,
  usersTable,
} from "@workspace/db";
import { logger } from "../lib/logger";

// ── Weights (must sum to 100) ─────────────────────────────────────────────────
// Trust score is a signal for BUYERS evaluating EXPORTER companies.
// This is the PLATFORM TRACK RECORD signal — distinct from profile_completeness_score
// (confidence-scorer.ts) which measures profile quality. A new supplier with a
// perfect profile scores zero here; a veteran with 10+ delivered orders scores high.
//
// Weight key `catalogActivity` maps to DB column `response_time` (no migration; the
// column was originally reserved for messaging latency but is repurposed here).
const WEIGHTS = {
  profileCompleteness: 30,  // company profile field coverage
  ordersCompleted:     25,  // DELIVERED/COMPLETED orders — temporal track record
  productsCatalog:     20,  // breadth of active listings
  verified:            15,  // admin-verified badge
  catalogActivity:     10,  // active-product ratio: maintained catalog = engaged seller
};

export function getTrustTier(score: number): string {
  if (score >= 80) return "PLATINUM";
  if (score >= 65) return "GOLD";
  if (score >= 45) return "SILVER";
  return "BASIC";
}

export async function computeTrustScore(companyId: number): Promise<number> {
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId));

  if (!company) return 0;

  // ── 1. Profile completeness ────────────────────────────────────────────────
  const fields = [company.name, company.country, company.description, company.region, company.type];
  const profileScore = (fields.filter(Boolean).length / fields.length) * 100;

  // ── 2. Orders completed ────────────────────────────────────────────────────
  // Orders belong to buyers (buyerId), but exporter trust = orders fulfilled
  // on their products. Count COMPLETED orders on products owned by this company.
  const [orderRow] = await db
    .select({ total: count() })
    .from(ordersTable)
    .innerJoin(
      orderItemsTable,
      eq(orderItemsTable.orderId, ordersTable.id)
    )
    .innerJoin(
      productsTable,
      and(
        eq(productsTable.id, orderItemsTable.productId),
        eq(productsTable.companyId, companyId)
      )
    )
    .where(inArray(ordersTable.status, ["DELIVERED", "COMPLETED"]));

  const completedOrders = Number(orderRow?.total ?? 0);
  // 5+ fulfilled orders = full score; scales linearly below
  const ordersScore = Math.min(completedOrders / 5, 1) * 100;

  // ── 3. Products catalog + catalog activity ────────────────────────────────
  // Single query: total count + conditional count of active products.
  // G4.2: `catalogActivity` replaces the static responseTime=50 placeholder.
  // It measures the active-product ratio — a maintained catalog signals an
  // engaged seller. DB column retains the name `response_time`; no migration needed.
  const [catalogRow] = await db
    .select({
      total: count(),
      active: sql<string>`count(*) filter (where ${productsTable.active} = true)`,
    })
    .from(productsTable)
    .where(eq(productsTable.companyId, companyId));

  const productCount = Number(catalogRow?.total ?? 0);
  const activeProductCount = Number(catalogRow?.active ?? 0);
  // 3+ listed products = full catalog breadth score
  const productsScore = Math.min(productCount / 3, 1) * 100;
  // Active ratio: 0 if no products, 100 if all products active
  const catalogActivityScore = productCount > 0 ? (activeProductCount / productCount) * 100 : 0;

  // ── 4. Verified flag ───────────────────────────────────────────────────────
  const verifiedScore = company.verified ? 100 : 0;

  // ── Weighted total ─────────────────────────────────────────────────────────
  const total =
    (profileScore        * WEIGHTS.profileCompleteness) / 100 +
    (ordersScore         * WEIGHTS.ordersCompleted)      / 100 +
    (productsScore       * WEIGHTS.productsCatalog)      / 100 +
    (verifiedScore       * WEIGHTS.verified)             / 100 +
    (catalogActivityScore * WEIGHTS.catalogActivity)     / 100;

  const finalScore = Math.round(Math.min(total, 100));

  // ── Upsert trust_scores ────────────────────────────────────────────────────
  const [existing] = await db
    .select({ id: trustScoresTable.id })
    .from(trustScoresTable)
    .where(eq(trustScoresTable.companyId, companyId));

  if (existing) {
    await db
      .update(trustScoresTable)
      .set({
        score: finalScore,
        ordersCompleted: ordersScore,
        certificationsCount: verifiedScore,
        profileCompleteness: profileScore,
        tradeVolume: productsScore,
        responseTime: catalogActivityScore,   // DB col retains old name; value is now catalogActivity
        updatedAt: new Date(),
      })
      .where(eq(trustScoresTable.companyId, companyId));
  } else {
    await db.insert(trustScoresTable).values({
      companyId,
      score: finalScore,
      ordersCompleted: ordersScore,
      certificationsCount: verifiedScore,
      profileCompleteness: profileScore,
      tradeVolume: productsScore,
      responseTime: catalogActivityScore,     // DB col retains old name; value is now catalogActivity
    });
  }

  // Keep companies.trustScore in sync for fast lookups
  await db
    .update(companiesTable)
    .set({ trustScore: finalScore })
    .where(eq(companiesTable.id, companyId));

  logger.info(
    { companyId, score: finalScore, tier: getTrustTier(finalScore) },
    "Trust score computed"
  );

  return finalScore;
}

/**
 * Canonical alias for {@link computeTrustScore}.
 *
 * Prefer this name in new code to make the two-score distinction explicit:
 *   - `computePlatformTrustScore` — company-level track record (this file)
 *   - `computeProfileCompletenessScore` — supplier-level profile quality (confidence-scorer.ts)
 */
export const computePlatformTrustScore = computeTrustScore;
