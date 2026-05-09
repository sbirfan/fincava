import { eq, count, inArray, and } from "drizzle-orm";
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
const WEIGHTS = {
  profileCompleteness: 30,  // company profile field coverage
  ordersCompleted:     25,  // DELIVERED/COMPLETED orders — temporal track record
  productsCatalog:     20,  // breadth of active listings
  verified:            15,  // admin-verified badge
  responseTime:        10,  // messaging response latency via companiesTable.responseTimeHours
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

  // ── 3. Products catalog ────────────────────────────────────────────────────
  const [productRow] = await db
    .select({ total: count() })
    .from(productsTable)
    .where(eq(productsTable.companyId, companyId));

  const productCount = Number(productRow?.total ?? 0);
  // 3+ listed products = full catalog breadth score; scales linearly below
  const productsScore = Math.min(productCount / 3, 1) * 100;

  // ── 4. Verified flag ───────────────────────────────────────────────────────
  const verifiedScore = company.verified ? 100 : 0;

  // ── 5. Response time — uses responseTimeHours from companiesTable
  //    when populated by the messaging layer.
  //    0 hours → 100 (instant). 72 hours (3 days) → 0 (unresponsive).
  //    Falls back to 50 (neutral) when no messaging data is recorded.
  const responseScore = company.responseTimeHours != null
    ? Math.max(0, Math.round(100 - (company.responseTimeHours / 72) * 100))
    : 50;

  // ── Weighted total ─────────────────────────────────────────────────────────
  const total =
    (profileScore        * WEIGHTS.profileCompleteness) / 100 +
    (ordersScore         * WEIGHTS.ordersCompleted)      / 100 +
    (productsScore       * WEIGHTS.productsCatalog)      / 100 +
    (verifiedScore       * WEIGHTS.verified)             / 100 +
    (responseScore        * WEIGHTS.responseTime)         / 100;

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
        responseTime: responseScore,
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
      responseTime: responseScore,
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
