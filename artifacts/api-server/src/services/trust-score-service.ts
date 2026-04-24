import { eq, count, sql } from "drizzle-orm";
import {
  db,
  companiesTable,
  trustScoresTable,
  productsTable,
  ordersTable,
  usersTable,
} from "@workspace/db";
import { logger } from "../lib/logger";

// ── Weights (must sum to 100) ─────────────────────────────────────────────────
// Trust score is a signal for BUYERS evaluating EXPORTER companies.
const WEIGHTS = {
  profileCompleteness: 30,  // how complete the company profile is
  ordersCompleted:     25,  // delivered orders builds track record
  productsCatalog:     20,  // having listed products shows active seller
  verified:            15,  // admin-verified company
  responseTime:        10,  // placeholder until messaging data is richer
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
      sql`order_items ON order_items.order_id = ${ordersTable.id}`,
      sql`true`
    )
    .innerJoin(
      productsTable,
      sql`${productsTable.id} = order_items.product_id AND ${productsTable.companyId} = ${companyId}`
    )
    .where(sql`${ordersTable.status} IN ('DELIVERED', 'COMPLETED')`);

  const completedOrders = Number(orderRow?.total ?? 0);
  // 5+ fulfilled orders = full score; scales linearly below
  const ordersScore = Math.min(completedOrders / 5, 1) * 100;

  // ── 3. Products catalog ────────────────────────────────────────────────────
  const [productRow] = await db
    .select({ total: count() })
    .from(productsTable)
    .where(eq(productsTable.companyId, companyId));

  const productCount = Number(productRow?.total ?? 0);
  // 3+ products = full score
  const productsScore = Math.min(productCount / 3, 1) * 100;

  // ── 4. Verified flag ───────────────────────────────────────────────────────
  const verifiedScore = company.verified ? 100 : 0;

  // ── 5. Response time (static placeholder) ─────────────────────────────────
  const responseScore = 50;

  // ── Weighted total ─────────────────────────────────────────────────────────
  const total =
    (profileScore  * WEIGHTS.profileCompleteness) / 100 +
    (ordersScore   * WEIGHTS.ordersCompleted)      / 100 +
    (productsScore * WEIGHTS.productsCatalog)      / 100 +
    (verifiedScore * WEIGHTS.verified)             / 100 +
    (responseScore * WEIGHTS.responseTime)         / 100;

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
