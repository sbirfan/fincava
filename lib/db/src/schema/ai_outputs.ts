import { pgTable, text, uuid, smallint, integer, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { suppliersTable } from "./suppliers";

export const aiOutputsTable = pgTable(
  "ai_outputs",
  {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    aiModel: text("ai_model"),
    callType: text("call_type"),
    exportReadinessScore: smallint("export_readiness_score"),
    pathway: varchar("pathway", { length: 80 }),
    capitalCapacityCop: integer("capital_capacity_cop"),
    complianceGaps: text("compliance_gaps"),
    gapAnalysis: text("gap_analysis"),
    documentContent: text("document_content"),
    whatsappMessageSent: text("whatsapp_message_sent"),
  },
  (t) => [index("ai_outputs_supplier_id_idx").on(t.supplierId)]
);

export type AiOutput = typeof aiOutputsTable.$inferSelect;
export type InsertAiOutput = typeof aiOutputsTable.$inferInsert;
