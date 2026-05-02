import { pgTable, text, serial, integer, timestamp, boolean, real, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

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
},
(t) => [index("products_company_id_idx").on(t.companyId)],
);

export const originStoriesTable = pgTable("origin_stories", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
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
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
