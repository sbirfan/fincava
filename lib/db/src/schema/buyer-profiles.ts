// buyer-profiles.ts
// One row per buyer user — UNIQUE(user_id) enforced at DB level.
// Created via POST /api/buyers/onboard (upsert).

import {
  pgTable,
  serial,
  integer,
  text,
  real,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const buyerProfilesTable = pgTable(
  "buyer_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    // Company info
    companyName: text("company_name"),
    country: text("country"),
    destinationPort: text("destination_port"),

    // Trade intent
    targetProducts: text("target_products").array().notNull().default([]),
    preferredIncoterm: text("preferred_incoterm"),
    intendedVolumeMt: real("intended_volume_mt"),
    importFrequency: text("import_frequency"),

    // Timestamps
    onboardedAt: timestamp("onboarded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("buyer_profiles_user_id_unique").on(t.userId),
  ],
);

export type BuyerProfile = typeof buyerProfilesTable.$inferSelect;
export type InsertBuyerProfile = typeof buyerProfilesTable.$inferInsert;
