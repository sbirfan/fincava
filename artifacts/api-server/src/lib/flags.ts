/**
 * Canonical phase-gate feature flags.
 *
 * All flags are evaluated once at process start from environment variables.
 * Default: false (all gates closed until explicitly enabled).
 *
 * Accepted truthy values: "1" or "true" (case-insensitive).
 * Any other value, or absence of the variable, is treated as false.
 *
 * Usage:
 *   import { ENABLE_TRANSACTIONS } from "../lib/flags";
 *   if (!ENABLE_TRANSACTIONS) { res.status(503).json({ error: "Not available" }); return; }
 */

function boolFlag(name: string, defaultValue: boolean): boolean {
  const val = process.env[name];
  if (val === undefined || val === "") return defaultValue;
  return val === "1" || val.toLowerCase() === "true";
}

/** Layer II — public intelligence endpoints (analytics, market intel, trust scores, compliance). */
export const ENABLE_INTELLIGENCE_PUBLIC = boolFlag("ENABLE_INTELLIGENCE_PUBLIC", false);

/** Layer III — transactional endpoints (inquiries, orders, RFQs). */
export const ENABLE_TRANSACTIONS = boolFlag("ENABLE_TRANSACTIONS", false);

/** Layer III — trade finance endpoints (credit, loans, repayments). */
export const ENABLE_FINANCE = boolFlag("ENABLE_FINANCE", false);

/** Layer III — logistics/shipment and payment milestone endpoints. */
export const ENABLE_LOGISTICS = boolFlag("ENABLE_LOGISTICS", false);
