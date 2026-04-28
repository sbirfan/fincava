// fee-status.ts
// Single source of truth for the platform fee status enum.
// Import FEE_STATUSES and FeeStatus from here — do not redeclare elsewhere.

export const FEE_STATUSES = ["PENDING", "WAIVED", "INVOICED", "PAID"] as const;

export type FeeStatus = typeof FEE_STATUSES[number];

// Non-breaking runtime guard.
// Use for warn-only logging where fee_status is read from the DB as a plain string.
// Do NOT throw — this is observability only.
export const isValidFeeStatus = (value: string): value is FeeStatus =>
  (FEE_STATUSES as readonly string[]).includes(value);
