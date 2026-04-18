import { pgTable, text, uuid, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const suppliersTable = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    nombreCompleto: text("nombre_completo").notNull(),
    whatsappNumber: text("whatsapp_number").notNull().unique(),
    municipio: text("municipio"),
    vereda: text("vereda"),
    supplierType: text("supplier_type"),
    registeredBy: text("registered_by"),
    status: text("status").notNull().default("active"),
    consentGiven: boolean("consent_given").notNull().default(false),
    consentDate: timestamp("consent_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("suppliers_whatsapp_number_idx").on(t.whatsappNumber)]
);

export type Supplier = typeof suppliersTable.$inferSelect;
export type InsertSupplier = typeof suppliersTable.$inferInsert;
