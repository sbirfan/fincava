import { pgTable, text, serial, integer, timestamp, boolean, real, pgEnum, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
// Note: retail column additions live here per additive-only constraint (TDD §2.2)
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { suppliersTable } from "./suppliers";

export const productCategoryEnum = pgEnum("product_category", [
  "COFFEE", "CACAO", "AVOCADO", "EXOTIC_FRUIT", "SUPERFOOD", "PROCESSED", "TEXTILE", "OTHER"
]);

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  name: text("name").notNull(),
  category: productCategoryEnum("category").notNull().default("COFFEE"),
  subCategory: text("sub_category"),
  description: text("description").notNull(),
  origin: text("origin").notNull(),
  altitude: text("altitude"),
  process: text("process"),
  variety: text("variety"),
  minOrderKg: real("min_order_kg").notNull().default(100),
  maxOrderKg: real("max_order_kg"),
  pricePerKgUSD: real("price_per_kg_usd").notNull(),
  availableKg: real("available_kg").notNull().default(0),
  harvestSeason: text("harvest_season"),
  images: text("images").array().notNull().default([]),
  certifications: text("certifications").array().notNull().default([]),
  cupping: real("cupping"),
  active: boolean("active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  originStory: text("origin_story"),
  farmerName: text("farmer_name"),
  farmName: text("farm_name"),
  farmLat: real("farm_lat"),
  farmLng: real("farm_lng"),
  harvestDate: timestamp("harvest_date", { withTimezone: true }),
  smallholder: boolean("smallholder").notNull().default(false),
  womenLed: boolean("women_led").notNull().default(false),
  directTrade: boolean("direct_trade").notNull().default(false),
  climateResilient: boolean("climate_resilient").notNull().default(false),
  organic: boolean("organic").notNull().default(false),
  familiesSupported: integer("families_supported"),
  supplierId: integer("supplier_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  // ── Retail SKU columns (TDD §2.2.1) — null = not retail-enabled; B2B queries ignore these ──
  retailEnabled:     boolean("retail_enabled").notNull().default(false),
  retailPriceCop:    integer("retail_price_cop"),        // centavos; null = not priced
  retailStockUnits:  integer("retail_stock_units"),       // unit count (bags, boxes)
  retailUnitWeightG: integer("retail_unit_weight_g"),     // grams per unit
  retailUnitLabel:   text("retail_unit_label"),           // e.g. "Bolsa 250g"
  retailMaxPerOrder: integer("retail_max_per_order"),     // buyer purchase cap per order
  lastReplenishedAt: timestamp("last_replenished_at", { withTimezone: true }),
  nextWindowStart:   timestamp("next_window_start", { withTimezone: true }),
  nextWindowEnd:     timestamp("next_window_end", { withTimezone: true }),
},
(t) => [
  index("products_company_id_idx").on(t.companyId),
  index("idx_products_retail_enabled").on(t.id).where(sql`retail_enabled = true AND active = true`),
],
);

export const originStoriesTable = pgTable("origin_stories", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => productsTable.id),
  // FK for ingestion-sourced suppliers published via the ingestion panel.
  // NULL for product-linked stories created before this column was added.
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  // Tracks content maturity of the story text.
  // SEED_DRAFT  — placeholder created by Prompt 4 at publish time (warm but provisional)
  // GENERATED   — full narrative from Prompt 2 (requires farm + economics data)
  // EDITED      — admin has manually edited the story via the origin stories panel
  // NULL        — legacy rows created before this column existed
  originStoryStatus: text("origin_story_status"),
  productCategory: text("product_category"),
  farmerName: text("farmer_name").notNull(),
  farmerPhoto: text("farmer_photo"),
  farmName: text("farm_name").notNull(),
  region: text("region").notNull(),
  elevation: text("elevation"),
  farmSizeHa: real("farm_size_ha"),
  yearsFarming: integer("years_farming"),
  story: text("story").notNull(),
  challenges: text("challenges").notNull(),
  impact: text("impact").notNull(),
  images: text("images").array().notNull().default([]),
  videoUrl: text("video_url"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  // ── Retail bilingual + farmer approval columns (TDD §2.2.2) ──────────────────
  farmerApprovedAt: timestamp("farmer_approved_at", { withTimezone: true }),
  farmerVoiceEs:    text("farmer_voice_es"),
  farmerVoiceEn:    text("farmer_voice_en"),
  buyerCopyEs:      text("buyer_copy_es"),
  buyerCopyEn:      text("buyer_copy_en"),
  translatedBy:     text("translated_by"),   // 'human' | 'sonnet_assisted' | null
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
