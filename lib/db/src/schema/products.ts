import { pgTable, text, serial, timestamp, boolean, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const productCategoryEnum = pgEnum("product_category", [
  "COFFEE", "CACAO", "AVOCADO", "EXOTIC_FRUIT", "SUPERFOOD", "PROCESSED", "TEXTILE", "OTHER"
]);

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  companyId: serial("company_id").notNull().references(() => companiesTable.id),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
