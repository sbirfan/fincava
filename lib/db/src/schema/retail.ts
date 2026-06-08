// Retail storefront schema — Phase I (Colombian domestic retail launch).
// All tables prefixed retail_* per spin-off readiness contract (TDD §1.4).
// No reverse FKs from B2B tables into these tables.

import { pgTable, serial, integer, text, boolean, jsonb, timestamp, uniqueIndex, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { productsTable } from "./products";
import { suppliersTable } from "./suppliers";
import { ordersTable } from "./orders";

// ── retail_buyer_profiles ──────────────────────────────────────────────────────

export const retailBuyerProfilesTable = pgTable("retail_buyer_profiles", {
  id:                     serial("id").primaryKey(),
  userId:                 integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),

  firstName:              text("first_name").notNull(),
  lastName:               text("last_name"),
  phone:                  text("phone"),

  defaultAddressLine1:    text("default_address_line1"),
  defaultAddressLine2:    text("default_address_line2"),
  defaultCity:            text("default_city"),
  defaultDepartment:      text("default_department"),
  defaultCountryCode:     text("default_country_code").notNull().default("CO"),
  defaultPostalCode:      text("default_postal_code"),

  filterPreferences:      jsonb("filter_preferences"),
  notificationChannel:    text("notification_channel").notNull().default("EMAIL"),
  languagePref:           text("language_pref").notNull().default("es"),
  marketingOptIn:         boolean("marketing_opt_in").notNull().default(false),

  deletedAt:              timestamp("deleted_at", { withTimezone: true }),
  createdAt:              timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:              timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("retail_buyer_profiles_user_id_uidx").on(t.userId),
]);

export type RetailBuyerProfile = typeof retailBuyerProfilesTable.$inferSelect;
export type InsertRetailBuyerProfile = typeof retailBuyerProfilesTable.$inferInsert;

// ── retail_auth_tokens ─────────────────────────────────────────────────────────

export const retailAuthTokensTable = pgTable("retail_auth_tokens", {
  id:         serial("id").primaryKey(),
  userId:     integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  email:      text("email"),
  phone:      text("phone"),
  tokenHash:  text("token_hash").notNull(),
  tokenType:  text("token_type").notNull(),   // MAGIC_LINK | SMS_OTP
  expiresAt:  timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt:     timestamp("used_at", { withTimezone: true }),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("retail_auth_tokens_hash_uidx").on(t.tokenHash),
  index("retail_auth_tokens_email_idx").on(t.email),
  index("retail_auth_tokens_phone_idx").on(t.phone),
]);

export type RetailAuthToken = typeof retailAuthTokensTable.$inferSelect;

// ── retail_order_details ───────────────────────────────────────────────────────

export const retailOrderDetailsTable = pgTable("retail_order_details", {
  id:                         serial("id").primaryKey(),
  orderId:                    integer("order_id").notNull().unique().references(() => ordersTable.id, { onDelete: "cascade" }),
  retailBuyerProfileId:       integer("retail_buyer_profile_id").references(() => retailBuyerProfilesTable.id, { onDelete: "set null" }),

  // Product snapshot (denormalised at order time)
  productId:                  integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  unitQuantity:               integer("unit_quantity").notNull().default(1),
  unitLabel:                  text("unit_label"),           // e.g. "Bolsa 250g"
  productPriceCents:          integer("product_price_cents"), // retailPriceCop at order time

  // Guest order access token (SHA-256 hash; raw token emailed to buyer)
  orderAccessTokenHash:       text("order_access_token_hash"),

  shippingName:               text("shipping_name").notNull(),
  shippingAddressLine1:       text("shipping_address_line1").notNull(),
  shippingAddressLine2:       text("shipping_address_line2"),
  shippingCity:               text("shipping_city").notNull(),
  shippingDepartment:         text("shipping_department").notNull(),
  shippingCountryCode:        text("shipping_country_code").notNull().default("CO"),
  shippingPostalCode:         text("shipping_postal_code"),

  shippingRateCents:          integer("shipping_rate_cents"),
  currency:                   text("currency").notNull().default("COP"),

  carrier:                    text("carrier"),
  trackingNumber:             text("tracking_number"),
  parcelWeightG:              integer("parcel_weight_g"),
  labelGeneratedAt:           timestamp("label_generated_at", { withTimezone: true }),
  deliveredAt:                timestamp("delivered_at", { withTimezone: true }),

  farmerPaidAt:               timestamp("farmer_paid_at", { withTimezone: true }),
  farmerPaymentRef:           text("farmer_payment_ref"),
  farmerPaymentAmountCents:   integer("farmer_payment_amount_cents"),

  reviewRequestedAt:          timestamp("review_requested_at", { withTimezone: true }),

  // FIN-114: Nequi interim payment — buyer submits their Nequi transaction ID
  // after manually transferring. Admin cross-checks before marking AUTHORIZED.
  buyerPaymentRef:            text("buyer_payment_ref"),

  createdAt:                  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:                  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("retail_order_details_buyer_profile_idx").on(t.retailBuyerProfileId),
]);

export type RetailOrderDetail = typeof retailOrderDetailsTable.$inferSelect;
export type InsertRetailOrderDetail = typeof retailOrderDetailsTable.$inferInsert;

// ── retail_payment_transactions ────────────────────────────────────────────────

export const retailPaymentTransactionsTable = pgTable("retail_payment_transactions", {
  id:                 serial("id").primaryKey(),
  orderId:            integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "restrict" }),

  gateway:            text("gateway").notNull(),          // WOMPI | STRIPE
  externalId:         text("external_id"),
  instrumentType:     text("instrument_type"),             // NEQUI | PSE | CARD
  settlesImmediately: boolean("settles_immediately"),

  status:             text("status").notNull().default("PENDING"),
  // PENDING → AUTHORIZED → CAPTURED → REFUNDED
  // PENDING → FAILED
  // AUTHORIZED → VOIDED

  amountCents:        integer("amount_cents").notNull(),
  currency:           text("currency").notNull().default("COP"),

  idempotencyKey:     text("idempotency_key"),
  slaVoidDeadline:    timestamp("sla_void_deadline", { withTimezone: true }),
  authorizationRef:   text("authorization_ref"),

  initiatedBy:        text("initiated_by").notNull(),     // BUYER | ADMIN | SYSTEM
  gatewayPayload:     jsonb("gateway_payload"),
  notes:              text("notes"),

  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("rpt_order_id_idx").on(t.orderId),
  index("rpt_status_idx").on(t.status),
  uniqueIndex("rpt_idempotency_uidx").on(t.idempotencyKey).where(sql`idempotency_key IS NOT NULL`),
  index("rpt_sla_sweep_idx").on(t.slaVoidDeadline).where(sql`status = 'AUTHORIZED'`),
]);

export type RetailPaymentTransaction = typeof retailPaymentTransactionsTable.$inferSelect;
export type InsertRetailPaymentTransaction = typeof retailPaymentTransactionsTable.$inferInsert;

// ── retail_waitlists ──────────────────────────────────────────────────────────

export const retailWaitlistsTable = pgTable("retail_waitlists", {
  id:                     serial("id").primaryKey(),
  productId:              integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  retailBuyerProfileId:   integer("retail_buyer_profile_id").references(() => retailBuyerProfilesTable.id, { onDelete: "set null" }),
  email:                  text("email"),
  phone:                  text("phone"),
  notificationChannel:    text("notification_channel").notNull(),
  unsubscribeToken:       text("unsubscribe_token").notNull(),
  joinedAt:               timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  convertedAt:            timestamp("converted_at", { withTimezone: true }),
  exitedAt:               timestamp("exited_at", { withTimezone: true }),
}, (t) => [
  index("retail_waitlists_product_idx").on(t.productId),
  index("retail_waitlists_profile_idx").on(t.retailBuyerProfileId),
  uniqueIndex("retail_waitlists_unsubscribe_uidx").on(t.unsubscribeToken),
]);

export type RetailWaitlist = typeof retailWaitlistsTable.$inferSelect;
export type InsertRetailWaitlist = typeof retailWaitlistsTable.$inferInsert;

// ── retail_shipping_zones ──────────────────────────────────────────────────────

export const retailShippingZonesTable = pgTable("retail_shipping_zones", {
  id:                     serial("id").primaryKey(),
  originDepartment:       text("origin_department").notNull(),
  destinationDepartment:  text("destination_department").notNull(),
  weightClass:            text("weight_class").notNull().default("SMALL"), // SMALL | MEDIUM | LARGE
  rateCents:              integer("rate_cents").notNull(),
  currency:               text("currency").notNull().default("COP"),
  carrierHint:            text("carrier_hint"),
  active:                 boolean("active").notNull().default(true),
  effectiveFrom:          timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
  createdAt:              timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("retail_shipping_zones_uidx")
    .on(t.originDepartment, t.destinationDepartment, t.weightClass)
    .where(sql`active = true`),
]);

export type RetailShippingZone = typeof retailShippingZonesTable.$inferSelect;

// ── retail_harvest_updates ─────────────────────────────────────────────────────

export const retailHarvestUpdatesTable = pgTable("retail_harvest_updates", {
  id:               serial("id").primaryKey(),
  productId:        integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  supplierId:       integer("supplier_id").notNull().references(() => suppliersTable.id, { onDelete: "cascade" }),
  body:             text("body").notNull(),
  photoUrl:         text("photo_url"),
  postedAt:         timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
  postedByUserId:   integer("posted_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
}, (t) => [
  index("idx_retail_harvest_updates_product_id").on(t.productId),
]);

export type RetailHarvestUpdate = typeof retailHarvestUpdatesTable.$inferSelect;
export type InsertRetailHarvestUpdate = typeof retailHarvestUpdatesTable.$inferInsert;

// ── retail_carts ──────────────────────────────────────────────────────────────

export const retailCartsTable = pgTable("retail_carts", {
  id:                   serial("id").primaryKey(),
  sessionId:            text("session_id"),
  retailBuyerProfileId: integer("retail_buyer_profile_id").references(() => retailBuyerProfilesTable.id, { onDelete: "cascade" }),
  expiresAt:            timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("retail_carts_session_id_uidx").on(t.sessionId).where(sql`session_id IS NOT NULL`),
  uniqueIndex("retail_carts_buyer_profile_uidx").on(t.retailBuyerProfileId).where(sql`retail_buyer_profile_id IS NOT NULL`),
  check("retail_carts_has_identity", sql`session_id IS NOT NULL OR retail_buyer_profile_id IS NOT NULL`),
]);

export type RetailCart = typeof retailCartsTable.$inferSelect;
export type InsertRetailCart = typeof retailCartsTable.$inferInsert;

// ── retail_cart_items ─────────────────────────────────────────────────────────

export const retailCartItemsTable = pgTable("retail_cart_items", {
  id:                   serial("id").primaryKey(),
  cartId:               integer("cart_id").notNull().references(() => retailCartsTable.id, { onDelete: "cascade" }),
  productId:            integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  quantity:             integer("quantity").notNull(),
  unitLabelSnapshot:    text("unit_label_snapshot").notNull(),
  priceCopSnapshot:     integer("price_cop_snapshot").notNull(),
  maxPerOrderSnapshot:  integer("max_per_order_snapshot").notNull(),
  addedAt:              timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("retail_cart_items_cart_id_idx").on(t.cartId),
  uniqueIndex("retail_cart_items_cart_product_uidx").on(t.cartId, t.productId),
]);

export type RetailCartItem = typeof retailCartItemsTable.$inferSelect;
export type InsertRetailCartItem = typeof retailCartItemsTable.$inferInsert;

// ── retail_order_items ────────────────────────────────────────────────────────

export const retailOrderItemsTable = pgTable("retail_order_items", {
  id:                          serial("id").primaryKey(),
  orderId:                     integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "restrict" }),
  productId:                   integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  supplierId:                  integer("supplier_id").references(() => suppliersTable.id, { onDelete: "set null" }),
  unitQuantity:                integer("unit_quantity").notNull(),
  unitLabelSnapshot:           text("unit_label_snapshot"),
  productPriceCentsSnapshot:   integer("product_price_cents_snapshot"),
  nequiPhoneSnapshot:          text("nequi_phone_snapshot"),
  createdAt:                   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("retail_order_items_order_id_idx").on(t.orderId),
]);

export type RetailOrderItem = typeof retailOrderItemsTable.$inferSelect;
export type InsertRetailOrderItem = typeof retailOrderItemsTable.$inferInsert;
