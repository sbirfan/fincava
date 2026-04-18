import { pgTable, uuid, boolean, smallint, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { suppliersTable } from "./suppliers";

export const complianceDocsTable = pgTable(
  "compliance_docs",
  {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliersTable.id),
    rutDian: boolean("rut_dian").notNull().default(false),
    icaRegistro: boolean("ica_registro").notNull().default(false),
    fitosanitarioCert: boolean("fitosanitario_cert").notNull().default(false),
    dianExportador: boolean("dian_exportador").notNull().default(false),
    complianceScore: smallint("compliance_score"),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  },
  (t) => [index("compliance_docs_supplier_id_idx").on(t.supplierId)]
);

export type ComplianceDoc = typeof complianceDocsTable.$inferSelect;
export type InsertComplianceDoc = typeof complianceDocsTable.$inferInsert;
