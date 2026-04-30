import {
  pgTable,
  serial,
  integer,
  text,
  decimal,
  boolean,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { buyerProfilesTable } from "./buyer-profiles";
import { supplierIngestionBatchesTable } from "./suppliers";

export const buyerGapBriefsTable = pgTable(
  "buyer_gap_briefs",
  {
    id: serial("id").primaryKey(),
    buyerProfileId: integer("buyer_profile_id")
      .notNull()
      .references(() => buyerProfilesTable.id, { onDelete: "cascade" }),
    gapType: varchar("gap_type", { length: 30 }).notNull(),
    priority: varchar("priority", { length: 10 }).notNull(),
    pipelineAction: varchar("pipeline_action", { length: 30 }).notNull(),
    isRealGap: boolean("is_real_gap").notNull().default(true),
    searchCategory: varchar("search_category", { length: 50 }),
    searchRegion: text("search_region"),
    requiredAttributes: text("required_attributes").array(),
    volumeTargetMt: decimal("volume_target_mt", { precision: 10, scale: 2 }),
    buyerUrgencyNote: text("buyer_urgency_note"),
    discoverySearchTerms: text("discovery_search_terms").array(),
    ingestionBatchId: integer("ingestion_batch_id").references(
      () => supplierIngestionBatchesTable.id,
    ),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_buyer_gaps_profile").on(t.buyerProfileId),
    index("idx_buyer_gaps_priority").on(t.priority, t.pipelineAction),
    index("idx_buyer_gaps_unresolved")
      .on(t.resolvedAt)
      .where(sql`${t.resolvedAt} IS NULL`),
  ],
);

export type BuyerGapBrief = typeof buyerGapBriefsTable.$inferSelect;
export type InsertBuyerGapBrief = typeof buyerGapBriefsTable.$inferInsert;
