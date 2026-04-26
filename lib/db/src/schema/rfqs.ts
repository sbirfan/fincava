import { pgTable, text, serial, timestamp, real, pgEnum, integer } from "drizzle-orm/pg-core";
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
