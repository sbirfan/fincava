// Append-only. One row per officer registration submission.
// Written by POST /api/officers/register (raw SQL route in officers.ts).
// Columns mirror the exact INSERT statement — do NOT rename or reorder.

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const officerApplicationsTable = pgTable("officer_applications", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  department: text("department").notNull(),
  municipio: text("municipio").notNull(),
  // Stored as a JSON.stringify'd string (e.g. '["Spanish","English"]')
  languages: text("languages"),
  experienceYears: integer("experience_years"),
  hasMotorcycle: boolean("has_motorcycle"),
  // Stored as a PostgreSQL text array (node-postgres serialises JS arrays directly)
  availableDays: text("available_days").array(),
  motivation: text("motivation"),
  referralCode: text("referral_code"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OfficerApplication = typeof officerApplicationsTable.$inferSelect;
export type NewOfficerApplication = typeof officerApplicationsTable.$inferInsert;
