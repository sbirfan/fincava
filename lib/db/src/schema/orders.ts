import { pgTable, text, serial, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { productsTable } from "./products";

export const orderStatusEnum = pgEnum("order_status", [
  "INQUIRY", "SAMPLE_REQUESTED", "QUOTED", "CONFIRMED", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: serial("buyer_id").notNull().references(() => usersTable.id),
  status: orderStatusEnum("status").notNull().default("INQUIRY"),
  totalUSD: real("total_usd").notNull().default(0),
  incoterm: text("incoterm").notNull().default("FOB"),
  destinationPort: text("destination_port"),
  shippingMethod: text("shipping_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: serial("order_id").notNull().references(() => ordersTable.id),
  productId: serial("product_id").notNull().references(() => productsTable.id),
  quantityKg: real("quantity_kg").notNull(),
  pricePerKg: real("price_per_kg").notNull(),
  totalUSD: real("total_usd").notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true });

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItemsTable.$inferSelect;
