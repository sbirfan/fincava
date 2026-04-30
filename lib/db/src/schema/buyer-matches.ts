import {
  pgTable,
  serial,
  integer,
  text,
  decimal,
  boolean,
  jsonb,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { buyerProfilesTable } from "./buyer-profiles";
import { suppliersTable } from "./suppliers";

export const buyerMatchesTable = pgTable(
  "buyer_matches",
  {
    id: serial("id").primaryKey(),
    buyerProfileId: integer("buyer_profile_id")
      .notNull()
      .references(() => buyerProfilesTable.id, { onDelete: "cascade" }),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    matchScore: decimal("match_score", { precision: 3, scale: 2 }).notNull(),
    scoreBreakdown: jsonb("score_breakdown").notNull(),
    disqualifiers: text("disqualifiers").array(),
    matchNotes: text("match_notes"),
    sectionsAtRun: text("sections_at_run").array().notNull(),
    isCurrent: boolean("is_current").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_buyer_matches_profile").on(t.buyerProfileId, t.isCurrent),
    index("idx_buyer_matches_supplier").on(t.supplierId),
    index("idx_buyer_matches_score").on(t.buyerProfileId, t.matchScore),
    check("buyer_matches_score_range", sql`${t.matchScore} >= 0.00 AND ${t.matchScore} <= 1.00`),
  ],
);

export type BuyerMatch = typeof buyerMatchesTable.$inferSelect;
export type InsertBuyerMatch = typeof buyerMatchesTable.$inferInsert;
