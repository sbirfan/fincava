// Append-only. One row per evaluateSupplier() call.
// Source of truth for re-grading on threshold change.
// EP4: thresholdVersion is mandatory — never nullable.

import {
  pgTable,
  serial,
  integer,
  jsonb,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import {
  eligibilityStatusEnum,
  sellableStatusEnum,
  graduationPathwayEnum,
  suppliersTable,
} from "./suppliers";

export const supplierEvaluationsTable = pgTable(
  "supplier_evaluations",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    eligibilityStatus: eligibilityStatusEnum("eligibility_status"),
    commercialScore: integer("commercial_score"),
    sellableStatus: sellableStatusEnum("sellable_status"),
    pathway: graduationPathwayEnum("pathway"),
    scoreSnapshot: jsonb("score_snapshot"),
    thresholdVersion: varchar("threshold_version", { length: 64 }).notNull(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("supplier_evaluations_supplier_evaluated_idx").on(
      t.supplierId,
      t.evaluatedAt.desc(),
    ),
  ],
);

export type SupplierEvaluation = typeof supplierEvaluationsTable.$inferSelect;
export type InsertSupplierEvaluation =
  typeof supplierEvaluationsTable.$inferInsert;
