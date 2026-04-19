import { pgTable, bigserial, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const registrationEventsTable = pgTable(
  "registration_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    whatsappNumber: text("whatsapp_number").notNull(),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("registration_events_whatsapp_idx").on(t.whatsappNumber),
    index("registration_events_type_idx").on(t.eventType),
    index("registration_events_created_at_idx").on(t.createdAt),
  ],
);

export type RegistrationEvent = typeof registrationEventsTable.$inferSelect;
export type InsertRegistrationEvent = typeof registrationEventsTable.$inferInsert;

export const REGISTRATION_EVENT_TYPES = [
  "duplicate_attempt",
  "whatsapp_support_click",
  "step_completed",
  "draft_resumed",
] as const;

export type RegistrationEventType = typeof REGISTRATION_EVENT_TYPES[number];
