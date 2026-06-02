// Canonical interactionType string constants.
// Import from here — never use bare strings in interactionType writes.
// Free-text PostgreSQL column by design (no enum migration needed to extend).

export const INTERACTION_TYPES = {
  FORM_SUBMISSION: "FORM_SUBMISSION",   // pre-existing
  FARM_VISIT: "FARM_VISIT",             // Phase I: field officer farm visit
  STOCK_UPDATE: "STOCK_UPDATE",         // Phase I: admin stock confirmation
  HARVEST_UPDATE: "HARVEST_UPDATE",     // Phase I: harvest update post
  CLAIM_INITIATED: "CLAIM_INITIATED",   // Phase I: farmer claim invitation
} as const;

export type InteractionType = typeof INTERACTION_TYPES[keyof typeof INTERACTION_TYPES];
