import { pgTable, text, serial, timestamp, real, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { companiesTable } from "./companies";
import { usersTable } from "./users";

export const productAnalyticsTable = pgTable("product_analytics", {
  id: serial("id").primaryKey(),
  productId: serial("product_id").notNull().references(() => productsTable.id),
  views: integer("views").notNull().default(0),
  inquiries: integer("inquiries").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  rfqCount: integer("rfq_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tradeHistoryTable = pgTable("trade_history", {
  id: serial("id").primaryKey(),
  companyId: serial("company_id").notNull().references(() => companiesTable.id),
  product: text("product").notNull(),
  volumeKg: real("volume_kg").notNull(),
  destination: text("destination").notNull(),
  year: integer("year").notNull(),
  valueUSD: real("value_usd"),
});

export const complianceRequirementsTable = pgTable("compliance_requirements", {
  id: serial("id").primaryKey(),
  country: text("country").notNull(),
  productType: text("product_type").notNull(),
  requirement: text("requirement").notNull(),
  description: text("description").notNull().default(""),
  mandatory: integer("mandatory").notNull().default(1),
  category: text("category").notNull().default("DOCUMENT"),
});

export const subscriptionTierEnum = pgEnum("subscription_tier", ["FREE", "PRO", "PREMIUM"]);

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  companyId: serial("company_id").notNull().references(() => companiesTable.id),
  tier: subscriptionTierEnum("tier").notNull().default("FREE"),
  active: integer("active").notNull().default(1),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trustScoresTable = pgTable("trust_scores", {
  id: serial("id").primaryKey(),
  companyId: serial("company_id").notNull().references(() => companiesTable.id),
  score: real("score").notNull().default(0),
  ordersCompleted: real("orders_completed").notNull().default(0),
  certificationsCount: real("certifications_count").notNull().default(0),
  responseTime: real("response_time").notNull().default(0),
  profileCompleteness: real("profile_completeness").notNull().default(0),
  tradeVolume: real("trade_volume").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProductAnalytics = typeof productAnalyticsTable.$inferSelect;
export type TradeHistory = typeof tradeHistoryTable.$inferSelect;
export type ComplianceRequirement = typeof complianceRequirementsTable.$inferSelect;
export type Subscription = typeof subscriptionsTable.$inferSelect;
export type TrustScore = typeof trustScoresTable.$inferSelect;
