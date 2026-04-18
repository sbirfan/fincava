import { pgTable, text, uuid, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { suppliersTable } from "./suppliers";

export const interactionsTable = pgTable(
  "interactions",
  {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    interactionType: text("interaction_type"),
    actor: text("actor"),
    notes: text("notes"),
    metadata: jsonb("metadata"),
  },
  (t) => [index("interactions_supplier_id_idx").on(t.supplierId)]
);

export type Interaction = typeof interactionsTable.$inferSelect;
export type InsertInteraction = typeof interactionsTable.$inferInsert;
