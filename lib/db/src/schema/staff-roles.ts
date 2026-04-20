import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export type StaffRoleValue = "employee" | "field_officer" | "admin";

export const STAFF_ROLES: StaffRoleValue[] = ["employee", "field_officer", "admin"];

export const staffRolesTable = pgTable(
  "staff_roles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: text("role").notNull().$type<StaffRoleValue>(),
    assignedBy: integer("assigned_by")
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("staff_roles_user_role_uniq").on(t.userId, t.role)],
);

export type StaffRole = typeof staffRolesTable.$inferSelect;
