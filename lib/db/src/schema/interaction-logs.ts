// interaction-logs.ts
// Generic, append-only event log for platform interaction signals.
//
// Design choices:
//   - No FK constraints → survives entity deletion, works across all actor types
//   - All columns nullable except eventType + createdAt → schema can evolve without migrations
//   - jsonb payload stores event-specific data; no fixed columns per event type

import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

// ── Canonical eventType constants ─────────────────────────────────────────────
// Store one of these string constants in the `eventType` column.
// Extending actors: add a new constant here + document the expected payload shape.
//
// Field-collected (existing):
//   "SUPPLIER_ONBOARDED"    — supplier created via WhatsApp field collection
//   "SUPPLIER_EVALUATED"    — scoring pipeline ran and updated state
//   "WHATSAPP_SENT"         — outbound WhatsApp message dispatched
//
// Ingestion pipeline (T0 → T5):
//   "INGESTION_BATCH_CREATED"   — admin opened a new ingestion batch (payload: { batchId, batchUuid })
//   "INGESTION_BATCH_SUBMITTED" — batch submitted for processing (payload: { batchId, supplierCount })
//   "INGESTION_BATCH_ROLLED_BACK" — batch rolled back (payload: { batchId, reason })
//   "SUPPLIER_INGESTED"         — supplier record created via ingestion pipeline
//                                 (payload: { batchId, source, fingerprint })
//   "SUPPLIER_ENRICHED"         — enrichment pass completed on ingested supplier
//                                 (payload: { batchId, supplierId, fieldsAdded })
//   "SUPPLIER_CLAIM_INITIATED"  — supplier clicked claim link (payload: { supplierId, token })
//   "SUPPLIER_CLAIMED"          — supplier completed claim flow (payload: { supplierId, userId })
// ─────────────────────────────────────────────────────────────────────────────

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
