import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { buyerProfilesTable } from "./buyer-profiles";

export const buyerAdminActionsTable = pgTable(
  "buyer_admin_actions",
  {
    id: serial("id").primaryKey(),
    actorAdminId: integer("actor_admin_id").notNull(),
    buyerProfileId: integer("buyer_profile_id")
      .notNull()
      .references(() => buyerProfilesTable.id, { onDelete: "cascade" }),
    actionType: varchar("action_type", { length: 50 }).notNull(),
    payload: jsonb("payload"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_buyer_admin_actions_profile").on(t.buyerProfileId, t.createdAt),
    index("idx_buyer_admin_actions_actor").on(t.actorAdminId),
  ],
);

export type BuyerAdminAction = typeof buyerAdminActionsTable.$inferSelect;
export type InsertBuyerAdminAction = typeof buyerAdminActionsTable.$inferInsert;
