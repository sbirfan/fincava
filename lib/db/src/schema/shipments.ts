import { pgTable, text, serial, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "BOOKED", "PICKUP", "IN_TRANSIT", "CUSTOMS", "DELIVERED", "DELAYED"
]);

export const shipmentsTable = pgTable("shipments", {
  id: serial("id").primaryKey(),
  orderId: serial("order_id").notNull().references(() => ordersTable.id),
  status: shipmentStatusEnum("status").notNull().default("BOOKED"),
  originPort: text("origin_port").notNull(),
  destinationPort: text("destination_port").notNull(),
  carrier: text("carrier"),
  trackingNumber: text("tracking_number"),
  containerNumber: text("container_number"),
  eta: timestamp("eta", { withTimezone: true }),
  departedAt: timestamp("departed_at", { withTimezone: true }),
  arrivedAt: timestamp("arrived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentMilestonesTable = pgTable("payment_milestones", {
  id: serial("id").primaryKey(),
  orderId: serial("order_id").notNull().references(() => ordersTable.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  amountUSD: real("amount_usd").notNull(),
  percentage: real("percentage").notNull(),
  status: text("status").notNull().default("PENDING"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  releasedAt: timestamp("released_at", { withTimezone: true }),
});

export const insertShipmentSchema = createInsertSchema(shipmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentMilestoneSchema = createInsertSchema(paymentMilestonesTable).omit({ id: true });

export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipmentsTable.$inferSelect;
export type InsertPaymentMilestone = z.infer<typeof insertPaymentMilestoneSchema>;
export type PaymentMilestone = typeof paymentMilestonesTable.$inferSelect;
