import { pgTable, text, serial, timestamp, real, pgEnum, integer, decimal, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { companiesTable } from "./companies";

export const rfqStatusEnum = pgEnum("rfq_status", ["OPEN", "CLOSED", "AWARDED", "CANCELLED"]);

export const rfqsTable = pgTable("rfqs", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  productCategory: text("product_category").notNull(),
  quantityKg: real("quantity_kg").notNull(),
  targetPriceUSD: real("target_price_usd"),
  destination: text("destination").notNull(),
  destinationPort: text("destination_port"),
  incoterm: text("incoterm").notNull().default("FOB"),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  status: rfqStatusEnum("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  // ── Buyer-layer rich matching columns (BG3) ─────────────────────────────────
  // All nullable / defaulted — existing RFQ create/list endpoints unchanged.
  originRequirements: text("origin_requirements"),
  processingMethod: varchar("processing_method", { length: 50 }),
  qualityGrade: varchar("quality_grade", { length: 100 }),
  requiredCertifications: text("required_certifications").array().notNull().default([]),
  preferredCertifications: text("preferred_certifications").array().notNull().default([]),
  requiredDocuments: text("required_documents").array().notNull().default([]),
  importRegs: text("import_regs"),
  annualVolumeMt: decimal("annual_volume_mt", { precision: 10, scale: 2 }),
  moqMt: decimal("moq_mt", { precision: 10, scale: 2 }),
  orderFrequency: varchar("order_frequency", { length: 30 }),
  priceRangeMinUsdKg: decimal("price_range_min_usd_kg", { precision: 8, scale: 2 }),
  priceRangeMaxUsdKg: decimal("price_range_max_usd_kg", { precision: 8, scale: 2 }),
  incoterms: varchar("incoterms", { length: 10 }),
  leadTimeWeeks: integer("lead_time_weeks"),
  coldChainRequired: boolean("cold_chain_required").notNull().default(false),
  packagingRequirements: text("packaging_requirements").array().notNull().default([]),
});

export const rfqResponsesTable = pgTable("rfq_responses", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id").notNull().references(() => rfqsTable.id),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  pricePerKgUSD: real("price_per_kg_usd").notNull(),
  leadTimeDays: integer("lead_time_days").notNull(),
  message: text("message").notNull(),
  awarded: integer("awarded").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRfqSchema = createInsertSchema(rfqsTable).omit({ id: true, createdAt: true });
export const insertRfqResponseSchema = createInsertSchema(rfqResponsesTable).omit({ id: true, createdAt: true });

export type InsertRfq = z.infer<typeof insertRfqSchema>;
export type Rfq = typeof rfqsTable.$inferSelect;
export type InsertRfqResponse = z.infer<typeof insertRfqResponseSchema>;
export type RfqResponse = typeof rfqResponsesTable.$inferSelect;
