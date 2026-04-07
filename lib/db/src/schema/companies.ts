import { pgTable, text, serial, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const companyTypeEnum = pgEnum("company_type", [
  "COOPERATIVE", "EXPORTER", "SMALLHOLDER", "IMPORTER", "DISTRIBUTOR", "ROASTER", "MANUFACTURER"
]);

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  type: companyTypeEnum("type").notNull().default("EXPORTER"),
  country: text("country").notNull(),
  region: text("region"),
  description: text("description").notNull().default(""),
  logoUrl: text("logo_url"),
  website: text("website"),
  verified: boolean("verified").notNull().default(false),
  originStory: text("origin_story"),
  farmerName: text("farmer_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const certificationsTable = pgTable("certifications", {
  id: serial("id").primaryKey(),
  companyId: serial("company_id").notNull().references(() => companiesTable.id),
  type: text("type").notNull(),
  issuer: text("issuer").notNull(),
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  documentUrl: text("document_url"),
  verified: boolean("verified").notNull().default(false),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true });
export const insertCertificationSchema = createInsertSchema(certificationsTable).omit({ id: true });

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
export type InsertCertification = z.infer<typeof insertCertificationSchema>;
export type Certification = typeof certificationsTable.$inferSelect;
