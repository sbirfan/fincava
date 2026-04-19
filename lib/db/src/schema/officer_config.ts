import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const officerConfigTable = pgTable("officer_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OfficerConfig = typeof officerConfigTable.$inferSelect;
export type InsertOfficerConfig = typeof officerConfigTable.$inferInsert;
