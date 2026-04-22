/**
 * NEVER mutate an existing version.
 * Bump and add a new export.
 * Old versions remain so re-grading is replayable.
 */

type Thresholds = {
  version: string;
  updatedAt: string;
  note: string;
  commercial: {
    sellableMin: number;
    partialMin: number;
  };
  eligibility: {
    requiredFields: readonly string[];
  };
};

export const THRESHOLDS_V0: Thresholds = {
  version: "v0_pre_buyer_calls",
  updatedAt: "2026-04-21",
  note: "Pre-buyer-call assumptions. Loose by design (EP6). Revisit after 3 buyer conversations.",
  commercial: { sellableMin: 60, partialMin: 30 },
  eligibility: {
    requiredFields: [
      "rutDian",
      "icaRegistration",
      "fitosanitario",
      "consentGiven",
    ] as const,
  },
};

Object.freeze(THRESHOLDS_V0);

export const THRESHOLDS: Thresholds = THRESHOLDS_V0;
