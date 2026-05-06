import { pgTable, text, serial, integer, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  receiverId: integer("receiver_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Translation fields — populated lazily on first translate request
  translatedContent: text("translated_content"),
  detectedLang: varchar("detected_lang", { length: 5 }),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
