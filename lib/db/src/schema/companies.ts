import { pgTable, text, serial, timestamp, boolean, pgEnum, real, index, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { suppliersTable } from "./suppliers";

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

// ── FIN-001: company_supplier_links ───────────────────────────────────────────
//
// Join table bridging the two supplier identity graphs:
//   Graph A (graduation): suppliers table — WhatsApp-onboarded farmers
//   Graph B (marketplace): companies table — web-registered B2B accounts
//
// Supports cooperatives natively: one cooperative company → many farmer suppliers.
// link_type='MEMBER'     — farmer member of a cooperative (most common)
// link_type='OWNER'      — sole-trader who owns the company (1:1 case)
// link_type='CONTRACTED' — independent supplier under a supply agreement
//
// is_primary=true marks the supplier's canonical selling channel.
// Application layer ensures only one is_primary=true per supplier at a time.
//
// Rollback: DROP TABLE company_supplier_links; DROP TYPE company_supplier_link_type;

export const linkTypeEnum = pgEnum("company_supplier_link_type", [
  "MEMBER",
  "OWNER",
  "CONTRACTED",
]);

export const companySupplierLinksTable = pgTable(
  "company_supplier_links",
  {
    id:              serial("id").primaryKey(),
    companyId:       integer("company_id").notNull().references(() => companiesTable.id),
    supplierId:      integer("supplier_id").notNull().references(() => suppliersTable.id),
    linkType:        linkTypeEnum("link_type").notNull().default("MEMBER"),
    isPrimary:       boolean("is_primary").notNull().default(true),
    linkedByAdminId: integer("linked_by_admin_id").references(() => usersTable.id),
    linkedAt:        timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
    notes:           text("notes"),
  },
  (t) => [
    // Prevent duplicate links of the same type between the same company and supplier
    uniqueIndex("csl_company_supplier_type_uidx").on(t.companyId, t.supplierId, t.linkType),
    index("csl_company_idx").on(t.companyId),
    index("csl_supplier_idx").on(t.supplierId),
  ],
);

export type CompanySupplierLink = typeof companySupplierLinksTable.$inferSelect;
export type InsertCompanySupplierLink = typeof companySupplierLinksTable.$inferInsert;
