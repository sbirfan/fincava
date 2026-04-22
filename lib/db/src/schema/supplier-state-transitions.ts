// Append-only audit log. One row per state transition.
// Required for memo §5.3 compliance.
// EP4: thresholdVersion + actor are mandatory.

import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sellableStatusEnum, suppliersTable } from "./suppliers";
import { supplierEvaluationsTable } from "./supplier-evaluations";

export const actorEnum = pgEnum("actor", ["SYSTEM", "ADMIN", "FOUNDER"]);

export const supplierStateTransitionsTable = pgTable(
  "supplier_state_transitions",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    fromState: sellableStatusEnum("from_state"),
    toState: sellableStatusEnum("to_state").notNull(),
    thresholdVersion: varchar("threshold_version", { length: 64 }).notNull(),
    commercialScoreAtTransition: integer("commercial_score_at_transition"),
    actor: actorEnum("actor").notNull(),
    justification: text("justification"),
    evaluationId: integer("evaluation_id").references(
      () => supplierEvaluationsTable.id,
      { onDelete: "cascade" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("supplier_state_transitions_supplier_created_idx").on(
      t.supplierId,
      t.createdAt.desc(),
    ),
  ],
);

export type SupplierStateTransition =
  typeof supplierStateTransitionsTable.$inferSelect;
export type InsertSupplierStateTransition =
  typeof supplierStateTransitionsTable.$inferInsert;
