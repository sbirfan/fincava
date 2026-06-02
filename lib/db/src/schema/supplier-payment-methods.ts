import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { suppliersTable } from "./suppliers";

export const supplierPaymentMethodsTable = pgTable("supplier_payment_methods", {
  id:                 serial("id").primaryKey(),
  supplierId:         integer("supplier_id").notNull().unique().references(() => suppliersTable.id),

  // Which method the supplier prefers to receive payment
  preferred:          text("preferred").notNull().default("NEQUI"), // 'NEQUI' | 'BANK_TRANSFER'

  // Nequi — just a phone number; platform pushes via Wompi Third-Party Payments API
  nequiPhone:         text("nequi_phone"),

  // Bank transfer fields (used when preferred = 'BANK_TRANSFER')
  bankName:           text("bank_name"),
  bankAccountNumber:  text("bank_account_number"),
  bankAccountType:    text("bank_account_type"),   // 'AHORROS' | 'CORRIENTE'
  bankHolderName:     text("bank_holder_name"),
  bankHolderIdType:   text("bank_holder_id_type"), // 'CC' | 'NIT' | 'CE'
  bankHolderId:       text("bank_holder_id"),

  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SupplierPaymentMethod = typeof supplierPaymentMethodsTable.$inferSelect;
export type InsertSupplierPaymentMethod = typeof supplierPaymentMethodsTable.$inferInsert;
