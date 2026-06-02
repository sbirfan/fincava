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

/** Layer II — buyer-supplier matching endpoints. Fine-grained gate so matching
 *  can be opened to buyers before the full intelligence layer is public. */
export const ENABLE_MATCHING = boolFlag("ENABLE_MATCHING", false);

/** Layer III — transactional endpoints (inquiries, orders, RFQs). */
export const ENABLE_TRANSACTIONS = boolFlag("ENABLE_TRANSACTIONS", false);

/** Layer III — trade finance endpoints (credit, loans, repayments). */
export const ENABLE_FINANCE = boolFlag("ENABLE_FINANCE", false);

/** Layer III — logistics/shipment and payment milestone endpoints. */
export const ENABLE_LOGISTICS = boolFlag("ENABLE_LOGISTICS", false);

// ── Deploy-time flag validation (FIN-096) ────────────────────────────────────
// Expected flag states for each platform phase. Any deviation is logged as a
// structured warning at startup — never a hard failure, so staging/preview
// environments can legitimately differ from the production baseline.

type FlagName = "ENABLE_INTELLIGENCE_PUBLIC" | "ENABLE_MATCHING" | "ENABLE_TRANSACTIONS" | "ENABLE_FINANCE" | "ENABLE_LOGISTICS";

interface PhaseBaseline {
  phase: string;
  expected: Record<FlagName, boolean>;
}

const PHASE_BASELINES: Record<string, PhaseBaseline> = {
  "3": {
    phase: "Phase 3 — Revenue Loop + Concierge Ops",
    expected: {
      ENABLE_INTELLIGENCE_PUBLIC: false,
      ENABLE_MATCHING:            false,
      ENABLE_TRANSACTIONS:        false,
      ENABLE_FINANCE:             false,
      ENABLE_LOGISTICS:           false,
    },
  },
  "4": {
    phase: "Phase 4 — Pre-Retail Setup",
    expected: {
      ENABLE_INTELLIGENCE_PUBLIC: false,
      ENABLE_MATCHING:            true,
      ENABLE_TRANSACTIONS:        false,
      ENABLE_FINANCE:             false,
      ENABLE_LOGISTICS:           false,
    },
  },
  "5": {
    phase: "Phase 5 — Retail Storefront",
    expected: {
      ENABLE_INTELLIGENCE_PUBLIC: false,
      ENABLE_MATCHING:            true,
      ENABLE_TRANSACTIONS:        true,
      ENABLE_FINANCE:             false,
      ENABLE_LOGISTICS:           false,
    },
  },
};

const LIVE_FLAGS: Record<FlagName, boolean> = {
  ENABLE_INTELLIGENCE_PUBLIC,
  ENABLE_MATCHING,
  ENABLE_TRANSACTIONS,
  ENABLE_FINANCE,
  ENABLE_LOGISTICS,
};

/**
 * Call once at startup. Reads FINCAVA_PHASE from env (defaults to "3") and
 * compares every feature flag against the expected baseline for that phase.
 * Logs a structured warning for each deviation so ops can catch misconfiguration
 * before it affects users.
 */
export function validateFlagsForPhase(log: { warn: (obj: object, msg: string) => void; info: (obj: object, msg: string) => void }): void {
  const phaseKey = (process.env["FINCAVA_PHASE"] ?? "3").trim();
  const baseline = PHASE_BASELINES[phaseKey];

  if (!baseline) {
    log.warn({ event: "FLAG_VALIDATION_UNKNOWN_PHASE", phase: phaseKey },
      `FIN-096: unknown FINCAVA_PHASE="${phaseKey}" — skipping flag validation`);
    return;
  }

  const deviations: string[] = [];
  for (const [flag, expected] of Object.entries(baseline.expected) as [FlagName, boolean][]) {
    const actual = LIVE_FLAGS[flag];
    if (actual !== expected) {
      deviations.push(`${flag}: expected=${expected} actual=${actual}`);
    }
  }

  if (deviations.length > 0) {
    log.warn(
      { event: "FLAG_VALIDATION_DEVIATION", phase: baseline.phase, deviations },
      `FIN-096: feature flag deviation detected for ${baseline.phase} — review before serving traffic`,
    );
  } else {
    log.info(
      { event: "FLAG_VALIDATION_OK", phase: baseline.phase },
      `FIN-096: all feature flags match expected baseline for ${baseline.phase}`,
    );
  }
}
