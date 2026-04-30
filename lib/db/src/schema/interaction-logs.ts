// interaction-logs.ts
// Generic, append-only event log for platform interaction signals.
//
// Design choices:
//   - No FK constraints → survives entity deletion, works across all actor types
//   - All columns nullable except eventType + createdAt → schema can evolve without migrations
//   - jsonb payload stores event-specific data; no fixed columns per event type

import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

// ── Canonical eventType constants ─────────────────────────────────────────────
// Import and use these constants to write `eventType` values — never use raw strings.
// Extending actors: add a new constant here + document the expected payload shape.
//
// Field-collected (existing):
//   INTERACTION_TYPES.SUPPLIER_ONBOARDED  — supplier created via WhatsApp field collection
//   INTERACTION_TYPES.SUPPLIER_EVALUATED  — scoring pipeline ran and updated state
//   INTERACTION_TYPES.WHATSAPP_SENT       — outbound WhatsApp message dispatched
//
// Ingestion pipeline (T0 → T5):
//   INTERACTION_TYPES.INGESTION_BATCH_CREATED    — admin opened a new batch
//                                                  payload: { batchId, batchUuid }
//   INTERACTION_TYPES.INGESTION_BATCH_SUBMITTED  — batch submitted for processing
//                                                  payload: { batchId, supplierCount }
//   INTERACTION_TYPES.INGESTION_BATCH_ROLLED_BACK — batch rolled back
//                                                   payload: { batchId, reason }
//   INTERACTION_TYPES.SUPPLIER_INGESTED          — supplier record created via pipeline
//                                                  payload: { batchId, source, fingerprint }
//   INTERACTION_TYPES.SUPPLIER_ENRICHED          — enrichment pass completed
//                                                  payload: { batchId, supplierId, fieldsAdded }
//   INTERACTION_TYPES.SUPPLIER_CLAIM_INITIATED   — supplier clicked claim link
//                                                  payload: { supplierId, token }
//   INTERACTION_TYPES.SUPPLIER_CLAIMED           — supplier completed claim flow
//                                                  payload: { supplierId, userId }
// ─────────────────────────────────────────────────────────────────────────────

export const INTERACTION_TYPES = {
  // Field-collected
  SUPPLIER_ONBOARDED: "SUPPLIER_ONBOARDED",
  SUPPLIER_EVALUATED: "SUPPLIER_EVALUATED",
  WHATSAPP_SENT: "WHATSAPP_SENT",
  // Ingestion pipeline
  INGESTION_BATCH_CREATED: "INGESTION_BATCH_CREATED",
  INGESTION_BATCH_SUBMITTED: "INGESTION_BATCH_SUBMITTED",
  INGESTION_BATCH_ROLLED_BACK: "INGESTION_BATCH_ROLLED_BACK",
  SUPPLIER_INGESTED: "SUPPLIER_INGESTED",
  SUPPLIER_ENRICHED: "SUPPLIER_ENRICHED",
  SUPPLIER_CLAIM_INITIATED: "SUPPLIER_CLAIM_INITIATED",
  SUPPLIER_CLAIMED: "SUPPLIER_CLAIMED",
} as const;

export type InteractionType = (typeof INTERACTION_TYPES)[keyof typeof INTERACTION_TYPES];

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
