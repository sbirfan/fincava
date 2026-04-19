import { pgTable, text, uuid, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const onboardingDraftsTable = pgTable(
  "onboarding_drafts",
  {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    whatsappNumber: text("whatsapp_number").notNull().unique(),
    data: jsonb("data").notNull(),
    restoreToken: uuid("restore_token").notNull().default(sql`uuid_generate_v4()`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("onboarding_drafts_whatsapp_idx").on(t.whatsappNumber)]
);

export type OnboardingDraft = typeof onboardingDraftsTable.$inferSelect;
export type InsertOnboardingDraft = typeof onboardingDraftsTable.$inferInsert;
