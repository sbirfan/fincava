import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const publicMetricsTable = pgTable(
  "public_metrics",
  {
    id:        serial("id").primaryKey(),
    metricKey: text("metric_key").notNull(),
    label:     text("label").notNull(),
    value:     text("value").notNull().default(""),
    isVisible: boolean("is_visible").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_public_metrics_key").on(t.metricKey)],
);

export type PublicMetric = typeof publicMetricsTable.$inferSelect;
export type InsertPublicMetric = typeof publicMetricsTable.$inferInsert;
