import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { suppliersTable } from "./suppliers";
import { usersTable } from "./users";

export const supplierAuthContactTypeEnum = pgEnum("supplier_auth_contact_type", [
  "whatsapp",
  "email",
]);

// ── supplier_auth_tokens ──────────────────────────────────────────────────────
// Short-lived tokens for FIN-002 WhatsApp OTP and magic-link email auth.
// Farmers who were onboarded via WhatsApp/field officer use this table to
// claim a web account without a password.
//
// Security contract:
//   - token_hash stores SHA-256(rawToken). Raw token is never persisted.
//   - Compare with timingSafeEqual only.
//   - used_at is set on first successful verify — prevents replay.
//   - expires_at: OTP = 10 min, magic link = 24 hr.
//   - contact_value stores the channel that was messaged (phone or email).

export const supplierAuthTokensTable = pgTable(
  "supplier_auth_tokens",
  {
    id:                 serial("id").primaryKey(),
    supplierId:         integer("supplier_id").notNull().references(() => suppliersTable.id),
    tokenHash:          text("token_hash").notNull(),
    contactType:        supplierAuthContactTypeEnum("contact_type").notNull(),
    contactValue:       text("contact_value").notNull(),
    expiresAt:          timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt:             timestamp("used_at",    { withTimezone: true }),
    createdByAdminId:   integer("created_by_admin_id").references(() => usersTable.id),
    createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("supplier_auth_tokens_supplier_idx").on(t.supplierId),
  ],
);

export type SupplierAuthToken = typeof supplierAuthTokensTable.$inferSelect;
