import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const publicMetricsTable = pgTable(
  "public_metrics",
  {
    id:             serial("id").primaryKey(),
    metricKey:      text("metric_key").notNull(),
    page:           text("page").notNull(),
    section:        text("section").notNull(),
    label:          text("label").notNull(),
    value:          text("value").notNull().default(""),
    sourceType:     text("source_type").notNull().default("manual_verified"),
    sourceNote:     text("source_note"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    sortOrder:      integer("sort_order").notNull().default(0),
    isVisible:      boolean("is_visible").notNull().default(false),
    updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_public_metrics_key").on(t.metricKey),
    index("idx_public_metrics_page_section").on(t.page, t.section),
    index("idx_public_metrics_visible").on(t.isVisible),
  ],
);

export type PublicMetric = typeof publicMetricsTable.$inferSelect;
export type InsertPublicMetric = typeof publicMetricsTable.$inferInsert;
