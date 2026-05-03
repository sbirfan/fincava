// buyer-profiles.ts
// One row per buyer user — UNIQUE(user_id) enforced at DB level.
// Created via POST /api/buyers/onboard (legacy upsert) or POST /api/buyers/register (new Phase 1 flow).
//
// Phase 1 columns: state, volume_band, required_certs_p1, time_to_first_order
// Phase 2 columns: p2_completion_pct, p2_sections_done, traceability_level, etc.
// Phase 1.5 extended onboarding columns: buyer_segment, coffee_quality_tier, price_sensitivity, etc.
// All Phase 1/2/1.5 columns are nullable or defaulted — fully backward compatible
// with existing buyer_profiles rows created via /api/buyers/onboard.

import {
  pgTable,
  serial,
  integer,
  text,
  real,
  boolean,
  varchar,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const buyerProfilesTable = pgTable(
  "buyer_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    // Company info (existing — used by /api/buyers/onboard)
    companyName: text("company_name"),
    country: text("country"),
    destinationPort: text("destination_port"),

    // Trade intent (existing — used by /api/buyers/onboard)
    targetProducts: text("target_products").array().notNull().default([]),
    preferredIncoterm: text("preferred_incoterm"),
    intendedVolumeMt: real("intended_volume_mt"),
    importFrequency: text("import_frequency"),

    // ── Phase 1 enrichment (new — used by /api/buyers/register) ───────────────
    state: varchar("state", { length: 20 }).notNull().default("REGISTERED"),
    volumeBand: varchar("volume_band", { length: 20 }),
    requiredCertsP1: text("required_certs_p1").array().notNull().default([]),
    timeToFirstOrder: varchar("time_to_first_order", { length: 20 }),

    // ── Phase 2 progress tracking ─────────────────────────────────────────────
    p2CompletionPct: integer("p2_completion_pct").notNull().default(0),
    p2SectionsDone: text("p2_sections_done").array().notNull().default([]),
    matchingRunCount: integer("matching_run_count").notNull().default(0),
    lastMatchedAt: timestamp("last_matched_at", { withTimezone: true }),
    gapFlagCount: integer("gap_flag_count").notNull().default(0),
    subscriptionRecommendation: varchar("subscription_recommendation", { length: 10 }),

    // ── Phase 2 Section A — Product Detail ────────────────────────────────────
    traceabilityLevel: varchar("traceability_level", { length: 20 }),
    existingColombiaRel: boolean("existing_colombia_rel"),

    // ── Phase 2 Section B — Commercial Terms ──────────────────────────────────
    tradeFinanceOpen: boolean("trade_finance_open").notNull().default(false),

    // ── Phase 2 Section C — Quality & Compliance ──────────────────────────────
    auditStandard: varchar("audit_standard", { length: 50 }),

    // ── Phase 2 Section D — Logistics ─────────────────────────────────────────
    logisticsPartner: text("logistics_partner"),

    // ── Phase 2 Section F — Platform Intent ───────────────────────────────────
    platformIntent: text("platform_intent").array().notNull().default([]),
    sampleReady: boolean("sample_ready").notNull().default(false),
    prevSourcingChannel: varchar("prev_sourcing_channel", { length: 100 }),
    discoveryBudgetBand: varchar("discovery_budget_band", { length: 20 }),
    supplierDevOpen: boolean("supplier_dev_open").notNull().default(false),
    supplierTypePref: text("supplier_type_pref").array().notNull().default([]),
    socialImpactReqs: text("social_impact_reqs").array().notNull().default([]),
    earlyStageSupplierOpen: boolean("early_stage_supplier_open").notNull().default(false),
    languagePreference: text("language_preference").array().notNull().default([]),

    // ── Marketing opt-in (admin-driven sends respect this) ────────────────────
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    marketingTopics: text("marketing_topics").array().notNull().default([]),

    // ── Phase 1.5 Extended Onboarding — Section 1: Company Profile ───────────
    // Q2: buyer segment (finer-grained than companyType)
    buyerSegment: text("buyer_segment"),
    // Q3: number of locations / roasting sites / distribution points
    locationCount: text("location_count"),
    // Q4: annual purchasing budget band
    annualBudgetUsd: text("annual_budget_usd"),

    // ── Phase 1.5 Extended Onboarding — Section 2: Product Interests ─────────
    // Q6: coffee quality tier (conditional: shown when COFFEE in targetProducts)
    coffeeQualityTier: text("coffee_quality_tier"),
    // Q7: preferred coffee flavor profiles (multi-select, conditional: coffee)
    coffeeFlavorProfile: text("coffee_flavor_profile").array(),
    // Q8: cacao flavor profile (conditional: CACAO in targetProducts)
    cacaoFlavorProfile: text("cacao_flavor_profile"),
    // Q9: exotic fruit preferred forms (multi-select, conditional: EXOTIC_FRUIT)
    fruitForm: text("fruit_form").array(),
    // Q10: availability / seasonality requirement
    availabilityRequirement: text("availability_requirement"),
    // Q11: preferred order cadence
    orderFrequency: text("order_frequency"),

    // ── Phase 1.5 Extended Onboarding — Section 3: Volume & Pricing ──────────
    // Q12: per-order coffee volume band in kg (conditional: coffee)
    coffeeOrderSizeKg: text("coffee_order_size_kg"),
    // Q13: per-order cacao volume band in kg (conditional: cacao)
    cacaoOrderSizeKg: text("cacao_order_size_kg"),
    // Q14: per-order fruit volume band in kg (conditional: fruits)
    fruitOrderSizeKg: text("fruit_order_size_kg"),
    // Q15: price/quality trade-off preference
    priceSensitivity: text("price_sensitivity"),
    // Q16: price transparency requirements (multi-select)
    priceTransparency: text("price_transparency").array(),

    // ── Phase 1.5 Extended Onboarding — Section 4: Quality & Certifications ──
    // Q18: nice-to-have certifications (vs hard-required in requiredCertsP1)
    certsNiceToHave: text("certs_nice_to_have").array(),
    // Q19: traceability level — already present as Phase 2 Section A field
    //      (traceabilityLevel / traceability_level — reused here, no new column)
    // Q20: quality documentation required (multi-select)
    qualityDocRequired: text("quality_doc_required").array(),
    // Q21: acceptable coffee defect rate (conditional: coffee)
    coffeeDefectRate: text("coffee_defect_rate"),
    // Q22: acceptable cacao mold percentage (conditional: cacao)
    cacaoMoldPct: text("cacao_mold_pct"),
    // Q23: single-source vs pool sourcing preference
    sourceConsistency: text("source_consistency"),
    // Q24: quality verification method (multi-select, conditional: specialty segments)
    qualityVerification: text("quality_verification").array(),

    // ── Phase 1.5 Extended Onboarding — Section 6: Sustainability ────────────
    // Q31: how central sustainability is to the buyer's brand/sourcing strategy
    sustainabilityImportance: text("sustainability_importance"),
    // Q32: specific sustainability dimensions required (multi-select)
    sustainabilityDimensions: text("sustainability_dimensions").array(),

    // ── Timestamps ────────────────────────────────────────────────────────────
    onboardedAt: timestamp("onboarded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("buyer_profiles_user_id_unique").on(t.userId),
    index("idx_buyer_profiles_state").on(t.state),
    index("idx_buyer_profiles_completion").on(t.p2CompletionPct),
  ],
);

export type BuyerProfile = typeof buyerProfilesTable.$inferSelect;
export type InsertBuyerProfile = typeof buyerProfilesTable.$inferInsert;
