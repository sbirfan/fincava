import { pgTable, text, serial, timestamp, boolean, pgEnum, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const companyTypeEnum = pgEnum("company_type", [
  "COOPERATIVE", "EXPORTER", "SMALLHOLDER", "IMPORTER", "DISTRIBUTOR", "ROASTER", "MANUFACTURER"
]);

// ARCHITECTURE NOTE: companies belongs to the auth/marketplace graph (user_id FK → users).
// companies has no supplier_id. It is NOT connected to the supplier graduation graph.
// See suppliersTable note for Phase 2 bridge plan.
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
  trustScore: real("trust_score").notNull().default(0),
  subscriptionTier: text("subscription_tier").notNull().default("FREE"),
  responseTimeHours: real("response_time_hours"),
  exportDestinations: text("export_destinations").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
},
(t) => [index("companies_user_id_idx").on(t.userId)],
);

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
