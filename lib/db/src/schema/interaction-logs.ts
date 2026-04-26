// interaction-logs.ts
// Generic, append-only event log for platform interaction signals.
//
// Design choices:
//   - No FK constraints → survives entity deletion, works across all actor types
//   - All columns nullable except eventType + createdAt → schema can evolve without migrations
//   - jsonb payload stores event-specific data; no fixed columns per event type

import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const interactionLogsTable = pgTable("interaction_logs", {
  id:            serial("id").primaryKey(),
  eventType:     text("event_type").notNull(),       // e.g. "supplier_onboarding"
  actorId:       integer("actor_id"),                // nullable — user/supplier id
  actorType:     text("actor_type"),                 // nullable — "buyer" | "supplier" | "system"
  referenceId:   integer("reference_id"),            // nullable — order_id, profile_id, etc.
  referenceType: text("reference_type"),             // nullable — "order" | "buyer_profile" | "supplier"
  payload:       jsonb("payload"),                   // nullable — event-specific metadata
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InteractionLog = typeof interactionLogsTable.$inferSelect;
export type InsertInteractionLog = typeof interactionLogsTable.$inferInsert;
