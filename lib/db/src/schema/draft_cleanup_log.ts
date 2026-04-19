import { pgTable, bigserial, integer, timestamp, index } from "drizzle-orm/pg-core";

export const draftCleanupLogTable = pgTable(
  "draft_cleanup_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sweptAt: timestamp("swept_at", { withTimezone: true }).notNull().defaultNow(),
    deletedCount: integer("deleted_count").notNull().default(0),
  },
  (t) => [
    index("draft_cleanup_log_swept_at_idx").on(t.sweptAt),
  ],
);

export type DraftCleanupLog = typeof draftCleanupLogTable.$inferSelect;
export type InsertDraftCleanupLog = typeof draftCleanupLogTable.$inferInsert;
