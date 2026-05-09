import { pgTable, text, serial, timestamp, pgEnum, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", ["BUYER", "SUPPLIER", "ADMIN", "FIELD_OFFICER", "EMPLOYEE"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("BUYER"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  mustResetPassword: boolean("must_reset_password").notNull().default(false),
  tokenVersion: integer("token_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").notNull().references(() => usersTable.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  phone: text("phone"),
  country: text("country"),
  language: text("language").notNull().default("en"),
  avatarUrl: text("avatar_url"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
