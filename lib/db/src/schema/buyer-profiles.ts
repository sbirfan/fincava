// buyer-profiles.ts
// One row per buyer user — UNIQUE(user_id) enforced at DB level.
// Created via POST /api/buyers/onboard (legacy upsert) or POST /api/buyers/register (new Phase 1 flow).
//
// Phase 1 columns: state, volume_band, required_certs_p1, time_to_first_order
// Phase 2 columns: p2_completion_pct, p2_sections_done, traceability_level, etc.
// All Phase 1/2 columns are nullable or defaulted — fully backward compatible
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
