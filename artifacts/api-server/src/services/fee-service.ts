// fee-service.ts
// Platform fee computation for orders.
//
// Rules:
//   Rate:   4 % (FEE_RATE)
//   Waiver: first WAIVER_THRESHOLD completed (non-CANCELLED) orders per buyer
//           are free — feeStatus = "WAIVED", feeAmountUSD = 0.
//
// feeStatus values:
//   PENDING  — fee applies and has not yet been collected
//   WAIVED   — waived under the free-tier promotion
//   INVOICED — fee has been invoiced to the buyer (admin-settable)
//   PAID     — fee has been settled (admin-settable)
//
// Fail-safe: if totalUSD is 0 or negative the fee amount is 0 but feeStatus
// is still computed correctly (WAIVED or PENDING) so promotion tracking works.

import { db, ordersTable } from "@workspace/db";
import { and, eq, ne, count } from "drizzle-orm";
import { FeeStatus } from "../constants/fee-status";

export const FEE_RATE        = 0.04;   // 4 %
export const WAIVER_THRESHOLD = 10;    // first N orders are free

export type { FeeStatus };

export interface FeeResult {
  feePercentage: number;   // e.g. 4  (stored as the rate value, not a ratio)
  feeAmountUSD:  number;   // e.g. 3.20
  feeStatus:     FeeStatus;
}

/**
 * Compute the platform fee for a new order.
 *
 * @param buyerId  - The user placing the order.
 * @param totalUSD - The order value. Must be a finite number; pass 0 if unknown
 *                   (fee amount will be 0 but status is still determined).
 *
 * Counts all prior non-CANCELLED orders for this buyer.
 * If count < WAIVER_THRESHOLD → WAIVED; otherwise → PENDING.
 */
export async function computeFee(
  buyerId: number,
  totalUSD: number,
): Promise<FeeResult> {
  // Guard: treat non-finite values as 0 so we never store NaN/Infinity.
  const safeTotal = Number.isFinite(totalUSD) && totalUSD > 0 ? totalUSD : 0;

  // Count prior non-CANCELLED orders for this buyer.
  // Exclude CANCELLED orders — they don't consume a waiver slot.
  const [{ priorCount }] = await db
    .select({ priorCount: count() })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.buyerId, buyerId),
        ne(ordersTable.status, "CANCELLED"),
      ),
    );

  const isWaived = Number(priorCount) < WAIVER_THRESHOLD;

  const feeAmountUSD  = isWaived ? 0 : Math.round(safeTotal * FEE_RATE * 100) / 100;
  const feePercentage = FEE_RATE * 100; // store as 4, not 0.04

  return {
    feePercentage,
    feeAmountUSD,
    feeStatus: isWaived ? "WAIVED" : "PENDING",
  };
}
