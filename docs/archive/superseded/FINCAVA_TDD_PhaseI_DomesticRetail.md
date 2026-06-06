# FINCAVA Trust Commerce — Technical Design Document
## Phase I: Colombian Domestic Retail Launch

**Document Status:** Approved for engineering implementation.
**Date:** May 2026.
**Scope:** Phase I only — Colombian domestic retail. Phase II–IV topics are listed in Section 12.
**Implements:** `FINCAVA_DesignThinking_Phase1_EmpathyDefine.md` and `FINCAVA_DesignThinking_Phase2_IdeatePrototypeTest_v2.md`.
**Platform:** Replit, pnpm monorepo, React + Vite, Express, PostgreSQL 16, Drizzle ORM.

---

## 0. Pre-Implementation Notes

### 0.1 V1 Manual-First Posture

Per Phase 2 v2 Section 5.8 and Finding 12 (zero live transactions), every transactional workflow in Phase I distinguishes:

- **V1 manual workflow** — admin-triggered, founder-operated. Specified as "V1: admin clicks X in screen Y." This is the launch posture.
- **V2+ automated workflow** — system-triggered after the manual workflow has been observed across 10–25 live orders. Noted where applicable but not implemented in Phase I.

Engineering must build the V1 manual fallback UI for every transactional step. Automating before the failure modes are catalogued contradicts Phase 2 v2 explicitly.

### 0.2 Additive-Only Constraint

No existing table, column, route, or enum value is removed or renamed. All changes are additive. Existing B2B flows must pass all existing tests after every Phase I migration lands.

### 0.3 Monetary Type Rule

New retail tables use **integer centavos (COP)** for all monetary columns, with an explicit `currency` text column (default `'COP'`) alongside every monetary amount. Existing B2B tables (`orders.totalUSD`, `order_items.pricePerKg`, `order_items.totalUSD`, `lib/fee-service.ts` return values) remain as PostgreSQL `real` and are **not changed** by Phase I migrations.

### 0.4 Document Conventions

When this document references a Phase 1 or Phase 2 problem number (e.g., "implementing Problem 2.1.2 Approach C"), the reference is to the Design Thinking documents listed above.

---

## 1. System Architecture

### 1.1 Preservation Strategy

The existing platform is a single Express backend (monolith) with Drizzle ORM over PostgreSQL, serving a React + Vite frontend. The supplier → product → marketplace pipeline, the CC-1 compliance family, the AI evaluation pipeline, and the sellable_status state machine are **read-only to retail surfaces**. The retail layer does not write to any of these systems except through the existing admin endpoints already authorized to do so.

All retail surfaces filter by `sellable_status = PUBLISHED`. The legacy `supplier_status` enum (`ACTIVE | INACTIVE | PENDING`) is never referenced in retail code.

### 1.2 Module Structure

Retail code is organized into dedicated subdirectories within the existing monolith. No new service process is introduced. The module boundary is enforced by file and directory organization, not by network separation.

```
artifacts/api-server/src/
  routes/
    retail/
      auth.ts          — magic link + SMS OTP endpoints
      catalog.ts       — browse, filter, product detail, shipping estimate
      checkout.ts      — order creation
      webhooks.ts      — Wompi webhook receiver
      waitlist.ts      — waitlist CRUD
      field-officer.ts — farm visit recording
    admin/
      retail.ts        — admin order management, manual triggers
                         (appended to existing admin router namespace)

  services/
    retail/
      payment-service.ts      — WompiAdapter + StripeAdapter interface
      shipping-service.ts     — zone-rate lookup
      waitlist-service.ts     — signup, conversion trigger, harvest-failure exit
      retail-order-service.ts — order creation, state transitions

  lib/
    sms.ts                — NEW: Twilio SMS wrapper (separate from whatsapp.ts)
    cron.ts               — NEW: node-cron scheduled tasks
    interaction-types.ts  — NEW: canonical interactionType string constants

artifacts/fincava/src/pages/
  retail/
    index.tsx             — marketplace browse
    [productId]/index.tsx — product detail (in-stock and harvest-wait variants)
    checkout.tsx          — checkout flow
    orders/[id].tsx       — order status
  admin/
    retail/
      orders.tsx          — order queue + V1 manual triggers
      stock.tsx           — stock management
      harvest.tsx         — harvest update publish

lib/db/src/schema/
  retail.ts               — NEW: all retail_* tables (imported by schema/index.ts)
```

### 1.3 Integration Points with Existing Systems

| Integration | Direction | Mechanism |
|---|---|---|
| `suppliers` table | Read-only (retail) | Direct DB query; filter `sellable_status = PUBLISHED` |
| `products` table | Read + additive column writes | Retail SKU columns added; existing B2B columns untouched |
| `orders` table | Write new retail rows | Existing B2B orders unaffected; retail rows identified by child `retail_order_details` presence |
| `origin_stories` table | Read (retail); additive column write (admin) | `farmerApprovedAt` column added |
| `interactions` table | Write (field-officer visits) | Free-text `interactionType = 'FARM_VISIT'` per `lib/interaction-types.ts` |
| `buyer_visibility_signals` | Read-only (retail catalog) | "Visitada por FINCAVA" verification signal |
| `users` + `profiles` | Read (auth) | Retail buyer auth creates `users` rows; retail profile in separate `retail_buyer_profiles` |
| `lib/whatsapp.ts` | Reuse as-is | Farmer WhatsApp notifications |
| `lib/email.ts` (Resend) | Reuse as-is | Buyer email notifications |
| `lib/anthropic.ts` | Reuse as-is | `ORIGIN_STORY_PROMPT`, `TRANSLATION_MODEL` |
| `lib/fee-service.ts` | No change | B2B fee only; retail has its own commission logic |

### 1.4 Spin-Off Readiness

Phase I does not physically separate the retail database. Spin-off readiness is achieved through:

- All retail tables prefixed `retail_*` and defined in `lib/db/src/schema/retail.ts`
- No reverse FKs from existing B2B tables to retail tables
- All retail routes under `/api/retail/*` and `/api/admin/retail/*`
- All retail services isolated under `services/retail/`
- Retail authentication is additive (new token table, new magic-link flow) with no changes to existing session/cookie infrastructure

When a spin-off is needed, the `retail_*` tables, `retail/` route directories, and `services/retail/` are the extraction surface.

---

## 2. Database Architecture

### 2.1 lib/interaction-types.ts — Canonical Constants

Deliberate architectural choice (per Finding 4 refinement): `interactions.interactionType` remains a free-text PostgreSQL column. TypeScript-level enforcement is achieved through a constants file. This avoids a forward-only enum commitment and does not require backfilling existing rows.

```typescript
// lib/db/src/lib/interaction-types.ts
export const INTERACTION_TYPES = {
  FORM_SUBMISSION: "FORM_SUBMISSION",   // pre-existing
  FARM_VISIT: "FARM_VISIT",             // Phase I: field officer farm visit
  WHATSAPP_SENT: "WHATSAPP_SENT",       // Phase I: outbound WhatsApp logged
  STOCK_UPDATE: "STOCK_UPDATE",         // Phase I: admin stock confirmation
  HARVEST_UPDATE: "HARVEST_UPDATE",     // Phase I: harvest update post
} as const;

export type InteractionType = typeof INTERACTION_TYPES[keyof typeof INTERACTION_TYPES];
```

All new code that writes to `interactions.interactionType` imports from this file. Linter rule or PR convention enforces no bare strings.

### 2.2 New Column Additions to Existing Tables

#### 2.2.1 `products` — Retail SKU Columns (Problem 2.2.4, Approach A) + Harvest Window (Problem 2.1.4, Approach A)

All new columns are nullable with no default restriction — existing product rows are unaffected.

```typescript
// Additions to productsTable in lib/db/src/schema/products.ts

retailEnabled: boolean("retail_enabled").notNull().default(false),
retailPriceCop: integer("retail_price_cop"),            // centavos; null = not priced
retailStockUnits: integer("retail_stock_units"),         // unit count (bags, boxes)
retailUnitWeightG: integer("retail_unit_weight_g"),      // grams per unit
retailUnitLabel: text("retail_unit_label"),              // e.g. "Bolsa 250g"
retailMaxPerOrder: integer("retail_max_per_order"),      // buyer purchase cap
nextWindowStart: timestamp("next_window_start", { withTimezone: true }),
nextWindowEnd: timestamp("next_window_end", { withTimezone: true }),
```

Migration SQL:
```sql
ALTER TABLE products
  ADD COLUMN retail_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN retail_price_cop integer,
  ADD COLUMN retail_stock_units integer,
  ADD COLUMN retail_unit_weight_g integer,
  ADD COLUMN retail_unit_label text,
  ADD COLUMN retail_max_per_order integer,
  ADD COLUMN next_window_start timestamptz,
  ADD COLUMN next_window_end timestamptz;
```

Rollback SQL:
```sql
ALTER TABLE products
  DROP COLUMN IF EXISTS retail_enabled,
  DROP COLUMN IF EXISTS retail_price_cop,
  DROP COLUMN IF EXISTS retail_stock_units,
  DROP COLUMN IF EXISTS retail_unit_weight_g,
  DROP COLUMN IF EXISTS retail_unit_label,
  DROP COLUMN IF EXISTS retail_max_per_order,
  DROP COLUMN IF EXISTS next_window_start,
  DROP COLUMN IF EXISTS next_window_end;
```

Partial index (retail catalog query):
```sql
CREATE INDEX idx_products_retail_enabled
  ON products (id)
  WHERE retail_enabled = true AND active = true;
```

#### 2.2.2 `origin_stories` — Farmer Approval Gate (Section 3.18)

```typescript
// Addition to originStoriesTable
farmerApprovedAt: timestamp("farmer_approved_at", { withTimezone: true }),
```

Migration SQL:
```sql
ALTER TABLE origin_stories ADD COLUMN farmer_approved_at timestamptz;
```

Rollback SQL:
```sql
ALTER TABLE origin_stories DROP COLUMN IF EXISTS farmer_approved_at;
```

Publishing gate: `published` may only be set to `true` when `farmer_approved_at IS NOT NULL`. Enforced in the admin origin-story publish endpoint.

#### 2.2.3 `order_status` Enum — Retail Statuses (Problem 2.1.2, Approach C)

**Forward-only migration. PostgreSQL does not support removing enum values. Rollback strategy: leave enum values in place; drop `retail_order_details` table only if rolling back the hybrid schema.**

```sql
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'AUTHORIZED';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'READY_TO_SHIP';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'CAPTURED';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'IN_TRANSIT';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'DELIVERED_RETAIL';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'REFUNDED';
```

These six values must be added before `retail_order_details` is created, as any code that writes retail orders will use them.

Retail order status flow: `INQUIRY → AUTHORIZED → READY_TO_SHIP → CAPTURED → IN_TRANSIT → DELIVERED_RETAIL`. Terminal states: `REFUNDED`, `CANCELLED`. For Nequi/PSE (immediate settlement): `INQUIRY → CAPTURED` (skips AUTHORIZED).

### 2.3 New Tables

All new tables live in `lib/db/src/schema/retail.ts` and are exported into `lib/db/src/schema/index.ts`.

#### 2.3.1 `retail_buyer_profiles` (Problem 2.1.1, Approach A)

```typescript
import { pgTable, serial, integer, text, boolean, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const retailBuyerProfilesTable = pgTable("retail_buyer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),

  // Identity
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  phone: text("phone"),                        // for WhatsApp / SMS OTP

  // Default shipping address (Colombian format; portable per Phase II flag-plant)
  defaultAddressLine1: text("default_address_line1"),
  defaultAddressLine2: text("default_address_line2"),
  defaultCity: text("default_city"),
  defaultDepartment: text("default_department"),
  defaultCountryCode: text("default_country_code").notNull().default("CO"),
  defaultPostalCode: text("default_postal_code"),

  // Preferences
  filterPreferences: jsonb("filter_preferences"),  // {womenLed, organic, smallholder, regions[], certifications[]}
  notificationChannel: text("notification_channel").notNull().default("EMAIL"), // EMAIL | WHATSAPP
  language: text("language").notNull().default("es"),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),

  // Lifecycle
  deletedAt: timestamp("deleted_at", { withTimezone: true }),  // set on deletion request; hard-deleted after 7 days
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
},
(t) => [
  uniqueIndex("retail_buyer_profiles_user_id_uidx").on(t.userId),
]);
```

Migration SQL:
```sql
CREATE TABLE retail_buyer_profiles (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text,
  phone text,
  default_address_line1 text,
  default_address_line2 text,
  default_city text,
  default_department text,
  default_country_code text NOT NULL DEFAULT 'CO',
  default_postal_code text,
  filter_preferences jsonb,
  notification_channel text NOT NULL DEFAULT 'EMAIL',
  language text NOT NULL DEFAULT 'es',
  marketing_opt_in boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX retail_buyer_profiles_user_id_uidx ON retail_buyer_profiles (user_id);
```

Rollback SQL:
```sql
DROP TABLE IF EXISTS retail_buyer_profiles;
```

#### 2.3.2 `retail_auth_tokens` (Section 4 — Authentication)

Stores magic-link and SMS OTP tokens. Tokens are hashed before storage; the raw value is sent to the user.

```typescript
export const retailAuthTokensTable = pgTable("retail_auth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  email: text("email"),
  phone: text("phone"),
  tokenHash: text("token_hash").notNull(),       // SHA-256 of the raw token
  tokenType: text("token_type").notNull(),        // MAGIC_LINK | SMS_OTP
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
},
(t) => [
  uniqueIndex("retail_auth_tokens_hash_uidx").on(t.tokenHash),
  // Rate-limit queries: count by email or phone in last hour
  index("retail_auth_tokens_email_idx").on(t.email),
  index("retail_auth_tokens_phone_idx").on(t.phone),
]);
```

Migration SQL:
```sql
CREATE TABLE retail_auth_tokens (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  email text,
  phone text,
  token_hash text NOT NULL,
  token_type text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX retail_auth_tokens_hash_uidx ON retail_auth_tokens (token_hash);
CREATE INDEX retail_auth_tokens_email_idx ON retail_auth_tokens (email);
CREATE INDEX retail_auth_tokens_phone_idx ON retail_auth_tokens (phone);
```

Rollback: `DROP TABLE IF EXISTS retail_auth_tokens;`

#### 2.3.3 `retail_order_details` (Problem 2.1.2, Approach C)

Child table to `orders`. A retail order is any `orders` row with a matching `retail_order_details` row.

```typescript
import { ordersTable } from "./orders";

export const retailOrderDetailsTable = pgTable("retail_order_details", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().unique()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  retailBuyerProfileId: integer("retail_buyer_profile_id")
    .references(() => retailBuyerProfilesTable.id, { onDelete: "set null" }),

  // Shipping address (snapshot at order time; portable per Section 9 flag-plant)
  shippingName: text("shipping_name").notNull(),
  shippingAddressLine1: text("shipping_address_line1").notNull(),
  shippingAddressLine2: text("shipping_address_line2"),
  shippingCity: text("shipping_city").notNull(),
  shippingDepartment: text("shipping_department").notNull(),
  shippingCountryCode: text("shipping_country_code").notNull().default("CO"),
  shippingPostalCode: text("shipping_postal_code"),

  // Shipping financials (snapshot at order time)
  shippingRateCents: integer("shipping_rate_cents"),  // from retail_shipping_zones at order creation
  currency: text("currency").notNull().default("COP"),

  // Fulfillment
  carrier: text("carrier"),                           // e.g. "Servientrega"
  trackingNumber: text("tracking_number"),
  parcelWeightG: integer("parcel_weight_g"),
  labelGeneratedAt: timestamp("label_generated_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),

  // Farmer payment recording (V1 manual)
  farmerPaidAt: timestamp("farmer_paid_at", { withTimezone: true }),
  farmerPaymentRef: text("farmer_payment_ref"),       // Nequi transfer reference
  farmerPaymentAmountCents: integer("farmer_payment_amount_cents"),

  // Buyer review
  reviewRequestedAt: timestamp("review_requested_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
},
(t) => [
  uniqueIndex("retail_order_details_tracking_uidx").on(t.trackingNumber),
  index("retail_order_details_buyer_profile_idx").on(t.retailBuyerProfileId),
]);
```

Rollback: `DROP TABLE IF EXISTS retail_order_details;` (enum values remain — forward-only per Finding 6).

#### 2.3.4 `retail_payment_transactions` (Payment ledger)

Gateway-agnostic. Every state transition of a payment creates a new row or updates `status` + `updatedAt`. The row is append-friendly for audit; V2 may move to an append-only event table.

```typescript
export const retailPaymentTransactionsTable = pgTable("retail_payment_transactions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull()
    .references(() => ordersTable.id, { onDelete: "restrict" }),

  // Gateway
  gateway: text("gateway").notNull(),             // WOMPI | STRIPE
  externalId: text("external_id"),                // Wompi transaction/reference ID
  instrumentType: text("instrument_type"),         // NEQUI | PSE | CARD
  settlesImmediately: boolean("settles_immediately"), // true for Nequi/PSE instruments

  // Payment state
  status: text("status").notNull().default("PENDING"),
  // PENDING → AUTHORIZED → CAPTURED → REFUNDED
  // PENDING → FAILED
  // AUTHORIZED → VOIDED (SLA breach or cancellation)

  // Amounts
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("COP"),

  // Idempotency (capture + refund)
  idempotencyKey: text("idempotency_key"),

  // SLA breach
  slaVoidDeadline: timestamp("sla_void_deadline", { withTimezone: true }),

  // Authorization hold reference
  authorizationRef: text("authorization_ref"),

  // Audit
  initiatedBy: text("initiated_by").notNull(),    // BUYER | ADMIN | SYSTEM
  gatewayPayload: jsonb("gateway_payload"),         // raw Wompi response/webhook
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
},
(t) => [
  index("rpt_order_id_idx").on(t.orderId),
  index("rpt_status_idx").on(t.status),
  uniqueIndex("rpt_idempotency_uidx").on(t.idempotencyKey),
  // Partial index for SLA breach sweep (daily cron queries this)
  index("rpt_sla_sweep_idx").on(t.slaVoidDeadline).where(sql`status = 'AUTHORIZED'`),
]);
```

Migration SQL:
```sql
CREATE TABLE retail_payment_transactions (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  gateway text NOT NULL,
  external_id text,
  instrument_type text,
  settles_immediately boolean,
  status text NOT NULL DEFAULT 'PENDING',
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'COP',
  idempotency_key text,
  sla_void_deadline timestamptz,
  authorization_ref text,
  initiated_by text NOT NULL,
  gateway_payload jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rpt_order_id_idx ON retail_payment_transactions (order_id);
CREATE INDEX rpt_status_idx ON retail_payment_transactions (status);
CREATE UNIQUE INDEX rpt_idempotency_uidx ON retail_payment_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX rpt_sla_sweep_idx ON retail_payment_transactions (sla_void_deadline)
  WHERE status = 'AUTHORIZED';
```

Rollback: `DROP TABLE IF EXISTS retail_payment_transactions;`

#### 2.3.5 `retail_waitlists` (Approved schema)

```typescript
export const retailWaitlistsTable = pgTable("retail_waitlists", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  retailBuyerProfileId: integer("retail_buyer_profile_id")
    .references(() => retailBuyerProfilesTable.id, { onDelete: "set null" }),
  email: text("email"),
  phone: text("phone"),
  notificationChannel: text("notification_channel").notNull(),  // EMAIL | WHATSAPP
  unsubscribeToken: text("unsubscribe_token").notNull(),         // opaque; used in one-click link
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  exitedAt: timestamp("exited_at", { withTimezone: true }),
},
(t) => [
  index("retail_waitlists_product_idx").on(t.productId),
  index("retail_waitlists_profile_idx").on(t.retailBuyerProfileId),
  uniqueIndex("retail_waitlists_unsubscribe_uidx").on(t.unsubscribeToken),
  // Deduplication across authenticated and guest modes
  uniqueIndex("retail_waitlists_dedup_uidx").on(
    t.productId,
    sql`COALESCE(retail_buyer_profile_id, 0)`,
    sql`COALESCE(email, '')`,
    sql`COALESCE(phone, '')`
  ),
]);
```

CHECK constraint (applied in migration SQL):
```sql
CREATE TABLE retail_waitlists (
  id serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  retail_buyer_profile_id integer REFERENCES retail_buyer_profiles(id) ON DELETE SET NULL,
  email text,
  phone text,
  notification_channel text NOT NULL,
  unsubscribe_token text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  converted_at timestamptz,
  exited_at timestamptz,
  CONSTRAINT retail_waitlists_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
CREATE INDEX retail_waitlists_product_idx ON retail_waitlists (product_id);
CREATE INDEX retail_waitlists_profile_idx ON retail_waitlists (retail_buyer_profile_id);
CREATE UNIQUE INDEX retail_waitlists_unsubscribe_uidx ON retail_waitlists (unsubscribe_token);
CREATE UNIQUE INDEX retail_waitlists_dedup_uidx ON retail_waitlists (
  product_id,
  COALESCE(retail_buyer_profile_id, 0),
  COALESCE(email, ''),
  COALESCE(phone, '')
);
```

Rollback: `DROP TABLE IF EXISTS retail_waitlists;`

#### 2.3.6 `retail_shipping_zones` (Problems 2.2.3 and 2.8.1)

```typescript
export const retailShippingZonesTable = pgTable("retail_shipping_zones", {
  id: serial("id").primaryKey(),
  originDepartment: text("origin_department").notNull(),
  destinationDepartment: text("destination_department").notNull(),
  weightClass: text("weight_class").notNull().default("SMALL"),
  // SMALL ≤500g | MEDIUM ≤2000g | LARGE >2000g
  rateCents: integer("rate_cents").notNull(),
  currency: text("currency").notNull().default("COP"),
  carrierHint: text("carrier_hint"),
  active: boolean("active").notNull().default(true),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
},
(t) => [
  uniqueIndex("retail_shipping_zones_uidx").on(
    t.originDepartment, t.destinationDepartment, t.weightClass
  ).where(sql`active = true`),
]);
```

Migration SQL:
```sql
CREATE TABLE retail_shipping_zones (
  id serial PRIMARY KEY,
  origin_department text NOT NULL,
  destination_department text NOT NULL,
  weight_class text NOT NULL DEFAULT 'SMALL',
  rate_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'COP',
  carrier_hint text,
  active boolean NOT NULL DEFAULT true,
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX retail_shipping_zones_uidx
  ON retail_shipping_zones (origin_department, destination_department, weight_class)
  WHERE active = true;
```

Seeded with a starter zone table covering the 32 Colombian departments × 32 destinations at three weight classes. Admin UI allows updating rates quarterly without a migration.

Rollback: `DROP TABLE IF EXISTS retail_shipping_zones;`

### 2.4 Migration Sequencing

Migrations are generated by `drizzle-kit generate` and applied by `tsx migrate.ts`. Each migration has a paired hand-authored rollback SQL file.

```
Migration order (must respect FK dependencies):

0015_retail_interaction_types_constants.ts  (no SQL; constants file only)
0016_retail_products_columns.sql            — ALTER TABLE products ADD COLUMN ...
0017_retail_origin_stories_columns.sql      — ALTER TABLE origin_stories ADD COLUMN ...
0018_retail_order_status_enum.sql           — ALTER TYPE order_status ADD VALUE ... (forward-only)
0019_retail_buyer_profiles.sql              — CREATE TABLE retail_buyer_profiles
0020_retail_auth_tokens.sql                 — CREATE TABLE retail_auth_tokens
0021_retail_order_details.sql               — CREATE TABLE retail_order_details (FK to orders + retail_buyer_profiles)
0022_retail_payment_transactions.sql        — CREATE TABLE retail_payment_transactions (FK to orders)
0023_retail_waitlists.sql                   — CREATE TABLE retail_waitlists (FK to products + retail_buyer_profiles)
0024_retail_shipping_zones.sql              — CREATE TABLE retail_shipping_zones
0025_retail_shipping_zones_seed.sql         — INSERT initial zone rates
```

Migrations 0016 and 0017 are safe column additions (all new columns are nullable or have defaults). Migration 0018 is forward-only. Migrations 0019–0024 create independent tables and can be rolled back individually by dropping the table. The drop order is the reverse of creation.

---

## 3. API Architecture

All retail endpoints are mounted under `/api/retail/` (public) and `/api/admin/retail/` (admin). They share the existing Express app instance and middleware stack.

Standard response shapes:

```typescript
// Success
{ data: T }
// Error
{ error: { code: string; message: string; } }
```

### 3.1 Retail Buyer Authentication

#### POST /api/retail/auth/request
Requests a magic link (email) or SMS OTP (phone). Issues both if `bothChannels = true`.

- **Auth:** none
- **Body:** `{ email?: string; phone?: string; bothChannels?: boolean }`
- **Validation:** at least one of email or phone; phone normalized to E.164 Colombian (+57) via same logic as `lib/whatsapp.ts`
- **Rate limit:** 5 tokens per email per hour; 5 tokens per phone per hour (counted against `retail_auth_tokens` rows with `created_at > now() - interval '1 hour'`)
- **Behavior:**
  1. Look up `users` by email. If not found, create a `users` row with `role = 'BUYER'` and a placeholder `passwordHash` (never used for retail login).
  2. Generate a 32-byte cryptographically random token. Hash with SHA-256. Insert `retail_auth_tokens` row (type MAGIC_LINK or SMS_OTP, expires 15 minutes).
  3. If email: send magic-link email via Resend. If phone: send OTP via `lib/sms.ts`.
- **Response 200:** `{ data: { channel: "EMAIL" | "SMS"; sent: true } }`
- **Response 429:** rate limit exceeded

#### POST /api/retail/auth/verify-magic
Verifies a magic-link token from the URL query parameter.

- **Auth:** none
- **Query:** `?token=<raw_token>`
- **Behavior:**
  1. Hash the raw token. Look up in `retail_auth_tokens` where `token_hash = hash AND used_at IS NULL AND expires_at > now() AND token_type = 'MAGIC_LINK'`.
  2. Mark `used_at = now()`.
  3. Ensure `retail_buyer_profiles` row exists for the user (create if first login).
  4. Create session (set-cookie, same mechanism as existing auth).
- **Response 200:** `{ data: { userId: number; isNewAccount: boolean } }`
- **Response 400:** token invalid or expired

#### POST /api/retail/auth/verify-otp
Verifies an SMS OTP entered by the buyer.

- **Auth:** none
- **Body:** `{ phone: string; otp: string }`
- **Behavior:** same as verify-magic but token_type = 'SMS_OTP'; OTP is stored as the token itself (6-digit numeric, hashed).
- **Response 200 / 400:** same shape

#### DELETE /api/retail/auth/session
Logout. Clears session cookie.

#### DELETE /api/retail/account
Queues account deletion. Sets `retail_buyer_profiles.deleted_at = now()`. A daily cron job in `lib/cron.ts` hard-deletes profiles where `deleted_at < now() - interval '7 days'`, cascading to `retail_auth_tokens` (via FK), setting `retail_waitlists.retail_buyer_profile_id = NULL` (via ON DELETE SET NULL), setting `retail_order_details.retail_buyer_profile_id = NULL` (same). `users` row is preserved for order history audit.

- **Auth:** retail buyer session
- **Response 200:** `{ data: { scheduledDeletionAt: string } }`

### 3.2 Retail Catalog

#### GET /api/retail/products
Returns published, retail-enabled products with optional filters.

- **Auth:** none
- **Query:** `?womenLed=true&organic=true&region=Huila&category=COFFEE&inStock=true&page=1&limit=20`
- **Query logic:**
  ```sql
  SELECT p.*, s.nombreCompleto, s.municipio, s.department, os.story, os.farmerPhoto
  FROM products p
  JOIN suppliers s ON s.id = p.supplier_id
  LEFT JOIN origin_stories os ON os.supplier_id = s.id AND os.published = true
  WHERE p.retail_enabled = true
    AND p.active = true
    AND s.sellable_status = 'PUBLISHED'
    AND (? OR p.retail_stock_units > 0)  -- inStock filter
    AND (? OR s.department = ?)           -- region filter
    AND (? OR p.category = ?)             -- category filter
    AND (? OR s.women_led = true)         -- womenLed filter (suppliers column)
    AND (? OR s.organic = true)           -- organic filter
  ORDER BY p.retail_stock_units DESC NULLS LAST, p.id DESC
  ```
- **Response 200:** paginated list with `stockState: 'IN_STOCK' | 'HARVEST_WAIT'`, `nextWindowStart`, `nextWindowEnd`, `retailPriceCop`, `retailStockUnits`, `retailUnitLabel`, origin story fragment.

#### GET /api/retail/products/:id
Full product detail including verification signal.

- **Auth:** none
- **Returns:**
  - Product fields + supplier fields
  - `originStory` from `origin_stories` (supplierId FK, published = true)
  - `verificationSignal`: most recent `interactions` row where `supplier_id = s.id AND interaction_type = 'FARM_VISIT'` and the associated user has `role = 'FIELD_OFFICER'`. Returns `{ visitedAt, officerName }` or null.
  - `complianceBadges`: `buyer_visibility_signals` rows where `supplier_id = s.id AND visible = true`. Returns array of `{ requirementCode, badgeLabel }`.
  - `stockState`, `waitlistCount` (count of active waitlist rows where `exited_at IS NULL`)
- **Response 200:** full product object

#### GET /api/retail/products/:id/shipping-estimate
Returns zone rate for a given destination.

- **Auth:** none
- **Query:** `?department=<Colombian department name>&weightClass=SMALL`
- **Logic:** look up `retail_shipping_zones` by (supplier's department as origin, buyer's department as destination, weightClass). If not found, return a conservative national estimate.
- **Response 200:** `{ data: { rateCents: number; currency: "COP"; estimated: boolean } }`

#### GET /api/retail/products/:id/similar
Returns similar PUBLISHED, retail-enabled, in-stock products (Problem 2.4.1, Approach C; filter-based SQL, not AI).

- **Auth:** none
- **Query:** `?womenLed=true&organic=true&region=Huila&category=COFFEE` (buyer's current filter selections)
- **Logic:** same filter query as catalog but excludes the current product; limit 5; ranks by matched filter count descending.
- **Response 200:** array of up to 5 product cards with `matchReason` (e.g., "También orgánica, de Huila")

### 3.3 Checkout

#### POST /api/retail/orders
Creates a retail order (Problem 2.1.2 Approach C). V1: creates order, sends admin alert. Payment authorization happens manually in Wompi dashboard (V1) or via Wompi hosted checkout redirect (V2).

- **Auth:** retail buyer session OR guest (identified by email in body)
- **Body:**
  ```typescript
  {
    productId: number;
    quantity: number;
    shippingName: string;
    shippingAddressLine1: string;
    shippingAddressLine2?: string;
    shippingCity: string;
    shippingDepartment: string;
    shippingPostalCode?: string;
    email: string;          // required for guest or to confirm for authenticated
    phone?: string;
    paymentInstrument: "NEQUI" | "PSE" | "CARD";
    notificationChannel: "EMAIL" | "WHATSAPP";
  }
  ```
- **Validation:**
  - Product must have `retail_enabled = true`, supplier `sellable_status = PUBLISHED`
  - `quantity ≤ products.retailMaxPerOrder` (if set)
  - `quantity ≤ products.retailStockUnits` (prevents oversell)
  - Stock check is done inside a DB transaction with a SELECT FOR UPDATE on the product row
- **Transaction:**
  1. `BEGIN`
  2. `SELECT ... FOR UPDATE` on product row
  3. Validate stock
  4. Create `orders` row: `status = 'INQUIRY'`, `totalUSD = 0`, `incoterm = 'FOB'` (legacy default, ignored for retail), `supplierId`, `buyerId`
  5. Compute shipping: look up `retail_shipping_zones`
  6. Create `retail_order_details` row
  7. Create `retail_payment_transactions` row: `status = 'PENDING'`, `amountCents = (retailPriceCop * quantity) + shippingRateCents`, `initiatedBy = 'BUYER'`, `slaVoidDeadline = now() + interval '14 days'`
  8. Decrement `products.retailStockUnits` by quantity (reserve stock)
  9. `COMMIT`
  10. Send admin alert email (non-blocking, outside transaction)
  11. Send buyer order confirmation email
- **Response 201:** `{ data: { orderId: number; totalCents: number; currency: "COP"; status: "INQUIRY" } }`
- **Idempotency:** the product stock SELECT FOR UPDATE prevents duplicate fulfillment. The buyer should not submit twice; no idempotency key required at this endpoint (orders are one-time).

**V1 manual fallback:** after order creation, founder receives admin alert email. Founder opens Wompi dashboard, authorizes payment manually, then clicks "Mark Authorized" in Admin > Retail > Orders > [Order]. The `PATCH /api/admin/retail/orders/:id/mark-authorized` endpoint updates `retail_payment_transactions.status = 'AUTHORIZED'` and `orders.status = 'AUTHORIZED'`.

#### GET /api/retail/orders/:id
Order status for authenticated buyer or by order token (emailed to guest).

- **Auth:** retail buyer session OR `?token=<order_access_token>` (a separate short-lived token emailed to guest at confirmation)
- **Response 200:** order status, payment status, tracking number (if set), estimated delivery

### 3.4 Wompi Webhooks

#### POST /api/retail/webhooks/wompi
Receives Wompi payment event notifications.

- **Auth:** Wompi HMAC-SHA256 signature in `X-Event-Checksum` header. Verified before any processing.
- **Signature verification:** `HMAC-SHA256(payload + WOMPI_EVENTS_SECRET)` compared in constant time.
- **Body:** Wompi event envelope with `event` type and `data.transaction` or `data.payment_intent`.
- **Idempotency:** look up `external_id` in `retail_payment_transactions`. If found and already in terminal state, return 200 immediately.
- **Event handling:**
  - `transaction.updated` with `status = APPROVED`: update `retail_payment_transactions` to AUTHORIZED (for card) or CAPTURED (for Nequi/PSE immediate settlement). Update `orders.status` accordingly.
  - `transaction.updated` with `status = DECLINED` / `ERROR`: update to FAILED. Restore `products.retailStockUnits` (compensating transaction).
  - `transaction.updated` with `status = VOIDED`: update to VOIDED.
- **Response:** always 200 (Wompi retries on non-200; idempotency prevents double-processing).
- **Audit:** every webhook call is logged to `retail_payment_transactions.gatewayPayload`.

### 3.5 Waitlist

#### POST /api/retail/waitlist
Signs up for a product waitlist.

- **Auth:** optional (retail buyer session or guest)
- **Body:** `{ productId: number; email?: string; phone?: string; notificationChannel: "EMAIL" | "WHATSAPP" }`
- **Validation:** product must exist, `retail_enabled = true`; CHECK constraint ensures email or phone present
- **Generates:** cryptographically random `unsubscribeToken`
- **Response 200:** `{ data: { waitlistId: number; unsubscribeToken: string } }` — unsubscribe link embedded in confirmation message

#### DELETE /api/retail/waitlist/unsubscribe
One-click exit via unsubscribe token (no session required). Sets `exited_at = now()`.

- **Query:** `?token=<unsubscribeToken>`
- **Response 200:** no-content; renders a "You've been removed" page

#### GET /api/retail/waitlist/status
Checks if a signed-in buyer is on the waitlist for a product.

- **Auth:** retail buyer session
- **Query:** `?productId=<id>`
- **Response 200:** `{ data: { onWaitlist: boolean; joinedAt?: string } }`

### 3.6 Field Officer Farm Visit

#### POST /api/field-officer/visits
Records a farm visit. Writes to `interactions` table with `interactionType = INTERACTION_TYPES.FARM_VISIT`.

- **Auth:** `role = FIELD_OFFICER` or `ADMIN`
- **Body:** `{ supplierId: number; visitedAt: string; notes?: string }`
- **Response 201:** `{ data: { interactionId: number } }`

### 3.7 Admin Retail Endpoints

All under `/api/admin/retail/`. All require `role = ADMIN`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/orders` | List retail orders (all statuses); paginated; filter by status |
| GET | `/orders/:id` | Full order detail including payment status |
| PATCH | `/orders/:id/mark-authorized` | V1: mark payment authorized after manual Wompi step |
| PATCH | `/orders/:id/capture` | Trigger Wompi capture call (V1: manual; V2: automated on farmer-ready) |
| PATCH | `/orders/:id/void` | Trigger Wompi void |
| PATCH | `/orders/:id/refund` | Trigger Wompi refund (full or partial) |
| PATCH | `/orders/:id/tracking` | Enter carrier + tracking number; triggers buyer notification |
| PATCH | `/orders/:id/notify-buyer` | Resend buyer notification email |
| PATCH | `/orders/:id/pay-farmer` | Record farmer Nequi payment (manual) |
| PATCH | `/stock` | Approve farmer stock update: update products.retailStockUnits + check waitlist trigger |
| POST | `/harvest-update` | Publish harvest update post to waitlist members |
| POST | `/harvest-failure` | Trigger harvest-failure dual-option exit for a product |
| POST | `/origin-stories/:id/farmer-review` | Send WhatsApp preview link to farmer |
| PATCH | `/origin-stories/:id/approve` | Record farmer approval (sets farmerApprovedAt) |
| GET | `/delayed-orders` | Orders in IN_TRANSIT past expected delivery window |
| GET | `/unresponsive-farmers` | Orders in AUTHORIZED for >48h with no farmer LISTO reply |

---

## 4. Authentication Architecture

### 4.1 lib/sms.ts — New Twilio SMS Wrapper

`lib/whatsapp.ts` wraps WhatsApp only (Finding 1). SMS OTP requires a separate wrapper using the Twilio SMS API.

```typescript
// artifacts/api-server/src/lib/sms.ts
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const smsSenderNumber = process.env.TWILIO_SMS_FROM!; // standard Twilio number, NOT the WhatsApp channel

let _client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!_client) _client = twilio(accountSid, authToken);
  return _client;
}

export async function sendSms(to: string, body: string): Promise<string> {
  const msg = await getClient().messages.create({ to, from: smsSenderNumber, body });
  return msg.sid;
}
```

New environment variables required: `TWILIO_SMS_FROM` (Colombian or international Twilio number approved for SMS). `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are shared with the WhatsApp channel.

### 4.2 Magic Link Flow

1. Buyer enters email at checkout or waitlist signup.
2. Server generates 32-byte random token (crypto.randomBytes(32).toString('hex')).
3. Token hashed with SHA-256; stored in `retail_auth_tokens` with `expires_at = now() + 15 minutes`.
4. Raw token sent as query parameter in the magic-link email: `https://fincava.co/retail/auth/verify?token=<raw>`.
5. Buyer taps link. Server hashes raw token, looks up in table. If valid and unexpired: marks `used_at`, creates session, redirects to order confirmation.
6. If expired: returns 400; buyer is offered a new link.

### 4.3 SMS OTP Flow

Triggered when: buyer is on mobile (heuristic: User-Agent contains "Mobile" OR buyer selects "phone" channel) or email link fails (buyer taps "Send me a code instead").

1. Server generates a 6-digit numeric OTP: `Math.floor(100000 + Math.random() * 900000).toString()`.
2. OTP hashed with SHA-256; stored as `retail_auth_tokens` with `token_type = 'SMS_OTP'`, `expires_at = now() + 15 minutes`.
3. Raw OTP sent via `lib/sms.ts` to buyer's phone.
4. Buyer enters OTP in form. Server hashes, looks up, validates.
5. Rate limit: 5 OTP requests per phone number per hour.

**Default behavior:** always offer both channels if buyer provides both email and phone. Email magic link is the primary flow; SMS OTP is always available as fallback via "Send me a code instead" link.

### 4.4 Session

Retail buyer sessions follow the existing session pattern in the codebase (set-cookie with httpOnly, sameSite=lax, signed cookie or JWT — match existing implementation). A retail buyer session carries `userId` and `retailBuyerProfileId`.

### 4.5 Account Deletion (Problem 2.4.3 Approach A)

- `DELETE /api/retail/account` sets `retail_buyer_profiles.deleted_at = now()`
- Buyer receives confirmation email ("Your account will be deleted within 7 days")
- Daily cron (Section 5.4) hard-deletes profiles where `deleted_at < now() - interval '7 days'`
- Marketing permissions revoked immediately (set `marketingOptIn = false` at deletion request time)
- Order history preserved on `orders` / `retail_order_details` (no cascade to orders; buyer identity NULLed on `retail_order_details`)

---

## 5. Payment Architecture

### 5.1 Gateway Abstraction

```typescript
// artifacts/api-server/src/services/retail/payment-service.ts

interface AuthorizeParams {
  amountCents: number;
  currency: string;
  instrument: "NEQUI" | "PSE" | "CARD";
  reference: string;       // orderId as string
  buyerEmail: string;
  idempotencyKey: string;
}

interface PaymentResult {
  externalId: string;
  status: "AUTHORIZED" | "CAPTURED" | "FAILED";
  settlesImmediately: boolean;
  authorizationRef?: string;
  rawPayload: unknown;
}

interface PaymentAdapter {
  authorize(params: AuthorizeParams): Promise<PaymentResult>;
  capture(externalId: string, idempotencyKey: string): Promise<PaymentResult>;
  refund(externalId: string, amountCents: number, idempotencyKey: string): Promise<PaymentResult>;
  void(externalId: string): Promise<PaymentResult>;
  verifyWebhookSignature(rawPayload: string, signature: string, secret: string): boolean;
}

// Phase I implementation
class WompiAdapter implements PaymentAdapter { /* ... */ }

// Phase II interface (defined but not implemented; returning void ensures compile-time completeness check)
class StripeAdapter implements PaymentAdapter {
  async authorize(): Promise<PaymentResult> { throw new Error("StripeAdapter not implemented in Phase I"); }
  async capture(): Promise<PaymentResult> { throw new Error("StripeAdapter not implemented in Phase I"); }
  async refund(): Promise<PaymentResult> { throw new Error("StripeAdapter not implemented in Phase I"); }
  async void(): Promise<PaymentResult> { throw new Error("StripeAdapter not implemented in Phase I"); }
  verifyWebhookSignature(): boolean { throw new Error("StripeAdapter not implemented in Phase I"); }
}

export function getPaymentAdapter(gateway: "WOMPI" | "STRIPE"): PaymentAdapter {
  if (gateway === "WOMPI") return new WompiAdapter();
  if (gateway === "STRIPE") return new StripeAdapter();
  throw new Error(`Unknown payment gateway: ${gateway}`);
}
```

### 5.2 Per-Instrument Behavior

| Instrument | Authorization model | Phase I behavior | Failure path |
|---|---|---|---|
| CARD (Bancolombia, Visa, MC) | True authorize/capture | Authorize at checkout; capture on READY_TO_SHIP | Void if SLA breach; refund if post-capture |
| NEQUI | Settles immediately on approval | Treat APPROVED webhook as CAPTURED; `settlesImmediately = true` | Refund (cannot void settled) |
| PSE | Bank redirect; settles immediately | Same as Nequi: APPROVED = CAPTURED | Refund |

Implication: for Nequi/PSE, the order transitions `INQUIRY → CAPTURED` (not through AUTHORIZED). The buyer UI must explain: "Con Nequi, el pago se cobra inmediatamente. Si el pedido no es enviado en 14 días, te reembolsamos." This is the honest instrument-specific disclosure per Phase 2 v2 Section 8.

### 5.3 Payment State Machine

```
PENDING
  ├─ [Wompi APPROVED + card]   → AUTHORIZED
  │    ├─ [farmer LISTO + capture call] → CAPTURED
  │    │    └─ [quality dispute / lost package] → REFUNDED
  │    └─ [SLA breach or buyer cancel] → VOIDED
  ├─ [Wompi APPROVED + Nequi/PSE] → CAPTURED (settlesImmediately)
  │    └─ [quality dispute / lost package] → REFUNDED
  └─ [Wompi DECLINED / ERROR]  → FAILED
```

Every state transition writes an updated `retail_payment_transactions` row (update `status`, `updatedAt`, `gatewayPayload`).

### 5.4 SLA Breach Sweep — lib/cron.ts

```typescript
// artifacts/api-server/src/lib/cron.ts
import cron from "node-cron";
import { db, retailPaymentTransactionsTable, ordersTable } from "@workspace/db";
import { and, eq, lt, sql } from "drizzle-orm";
import { getPaymentAdapter } from "../services/retail/payment-service";

export function registerCronJobs(): void {
  // Daily at 02:00 Bogotá time (UTC-5 = 07:00 UTC)
  cron.schedule("0 7 * * *", async () => {
    const overdueAuthorizations = await db
      .select()
      .from(retailPaymentTransactionsTable)
      .where(and(
        eq(retailPaymentTransactionsTable.status, "AUTHORIZED"),
        lt(retailPaymentTransactionsTable.slaVoidDeadline, sql`now()`)
      ));

    for (const txn of overdueAuthorizations) {
      try {
        const adapter = getPaymentAdapter(txn.gateway as "WOMPI" | "STRIPE");
        await adapter.void(txn.externalId!);
        await db.update(retailPaymentTransactionsTable)
          .set({ status: "VOIDED", updatedAt: new Date(), initiatedBy: "SYSTEM" })
          .where(eq(retailPaymentTransactionsTable.id, txn.id));
        await db.update(ordersTable)
          .set({ status: "CANCELLED" })
          .where(eq(ordersTable.id, txn.orderId));
        // Restore stock units (compensating update)
        // Notify buyer of void
      } catch (err) {
        logger.error({ txnId: txn.id, err }, "SLA void failed");
      }
    }
  });

  // Daily at 03:00 UTC: hard-delete retail buyer profiles queued >7 days ago
  cron.schedule("0 3 * * *", async () => {
    await db.delete(retailBuyerProfilesTable)
      .where(lt(retailBuyerProfilesTable.deletedAt, sql`now() - interval '7 days'`));
  });
}
```

`registerCronJobs()` is called once at server startup in `artifacts/api-server/src/index.ts`. `node-cron` is added as a dependency in `artifacts/api-server/package.json`.

### 5.5 V1 Manual Payment Triggers

Admin screen: **Admin > Retail > Orders > [Order detail]**.

Buttons present for V1:
- **Mark Payment Authorized** (visible when status = INQUIRY and payment = PENDING): calls `PATCH /api/admin/retail/orders/:id/mark-authorized`. No Wompi API call — records that the admin confirmed authorization in the Wompi dashboard manually.
- **Capture Payment**: calls `PATCH /api/admin/retail/orders/:id/capture`. Calls `WompiAdapter.capture()`. Shows spinner while API call is in flight.
- **Void Payment**: calls `PATCH /api/admin/retail/orders/:id/void`. Available when status = AUTHORIZED.
- **Issue Refund**: calls `PATCH /api/admin/retail/orders/:id/refund` with `amountCents` input.

Each button is hidden if the payment is in an incompatible state (e.g., cannot void a CAPTURED payment).

### 5.6 Wompi Environment Variables

```
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=   # for webhook signature verification
WOMPI_SANDBOX=true     # set to false for production
```

---

## 6. Shipping Architecture

### 6.1 Zone Rate Lookup

`GET /api/retail/products/:id/shipping-estimate?department=:dept&weightClass=SMALL`

Logic in `services/retail/shipping-service.ts`:

```typescript
export async function getShippingRate(
  originDepartment: string,
  destinationDepartment: string,
  weightClass: "SMALL" | "MEDIUM" | "LARGE" = "SMALL"
): Promise<{ rateCents: number; currency: string; estimated: boolean }> {
  const [zone] = await db.select()
    .from(retailShippingZonesTable)
    .where(and(
      eq(retailShippingZonesTable.originDepartment, originDepartment),
      eq(retailShippingZonesTable.destinationDepartment, destinationDepartment),
      eq(retailShippingZonesTable.weightClass, weightClass),
      eq(retailShippingZonesTable.active, true)
    )).limit(1);

  if (zone) return { rateCents: zone.rateCents, currency: zone.currency, estimated: false };

  // Fallback: national flat rate (conservative)
  return { rateCents: 1800_00, currency: "COP", estimated: true }; // COP 18,000
}
```

Shipping rate is snapshotted into `retail_order_details.shippingRateCents` at order creation. FINCAVA absorbs variance between the zone rate and the actual carrier invoice (per Phase 2 v2 Section 2.2.3).

### 6.2 V1 Manual Label Generation

Admin screen: **Admin > Retail > Orders > [Order] > Fulfillment**.

Fields:
- **Carrier** (text input, e.g., "Servientrega")
- **Tracking Number** (text input)
- **[Save Tracking]** button

On save:
- `PATCH /api/admin/retail/orders/:id/tracking` updates `retail_order_details.carrier`, `retail_order_details.trackingNumber`, `retail_order_details.labelGeneratedAt = now()`, `orders.status = 'IN_TRANSIT'`
- Triggers buyer shipping notification (email with tracking number)

### 6.3 Quarterly Zone Rate Reconciliation

Admin workflow (no dedicated UI in V1 — documented process):

1. At end of each quarter, admin downloads Servientrega invoices.
2. Admin compares actual per-shipment carrier cost vs `retail_shipping_zones.rateCents` for the same origin/destination pair.
3. Admin updates zone rates via admin UI: `PATCH /api/admin/retail/shipping-zones/:id` (sets `rateCents`, `effectiveFrom = now()`). Old rate row is deactivated.
4. Variance absorbed by FINCAVA is tracked in a manual spreadsheet in V1; V2 may add a reporting table.

---

## 7. AI Architecture

### 7.1 Canonical Model Constants (Unchanged)

All six model constants in `lib/anthropic.ts` are reused without modification:

```typescript
SCORING_MODEL    = "claude-haiku-4-5"    // evaluation scoring
DOCUMENT_MODEL   = "claude-sonnet-4-6"   // origin story drafting, compliance docs
ENRICHMENT_MODEL = "claude-sonnet-4-6"   // ingestion data structuring
DISCOVERY_MODEL  = "claude-haiku-4-5"    // buyer gap search
TRANSLATION_MODEL = "claude-haiku-4-5"   // runtime farmer↔buyer message translation
PRESCREENING_MODEL = DOCUMENT_MODEL       // compliance pre-screening
```

### 7.2 Retail-Specific AI Usage in Phase I

**Origin Story drafting (Farm Biography Records):**
Uses existing `ORIGIN_STORY_PROMPT` via `DOCUMENT_MODEL` (Sonnet tier). No change to the service. The Farm Biography Records admin panel surfaces the draft; the human content producer revises. Drafted content is human-reviewed before `published = true` AND `farmerApprovedAt IS NOT NULL`.

**Live conversation translation (buyer-farmer messages thread):**
Uses existing `TRANSLATION_MODEL`. Phase I adds UI exposure on the buyer-facing message thread view. The `messages.translatedContent` column is already populated by the existing route. The buyer-facing view renders `translatedContent` alongside the original. No new AI service code required.

**Authored content translation (origin stories, product copy in Spanish):**
Does NOT use `TRANSLATION_MODEL`. This is a human content production workflow. Optional Sonnet-tier AI assistance (`DOCUMENT_MODEL`) may be used by the content producer to draft Spanish copy, but this runs through the existing Farm Biography Records admin panel, not a new automated pipeline.

### 7.3 Similar-Farm Recommendation (Not AI)

Per Phase 1 approved baseline #3, similar-farm recommendation is filter-based SQL pattern matching. It extends the scoring vocabulary of `buyer_matches` (matchScore, scoreBreakdown jsonb) conceptually, but for retail it is a direct SQL query — not a call to the buyer-matching service.

```typescript
// services/retail/retail-order-service.ts
export async function getSimilarProducts(
  excludeProductId: number,
  filters: { womenLed?: boolean; organic?: boolean; region?: string; category?: string }
): Promise<Product[]> {
  // Build WHERE clause from filters; count matched filters for each result
  // ORDER BY matched_filter_count DESC; LIMIT 5
  // Returns only PUBLISHED suppliers with retailEnabled = true and retailStockUnits > 0
}
```

The `matchReason` string in the response ("También orgánica, de Huila") is computed server-side from which filters matched.

### 7.4 No Autonomous Agents

No LangGraph, AutoGen, CrewAI, or agentic orchestration in Phase I. All AI calls are single-turn synchronous prompts via the existing `getAnthropicClient()` primitive.

---

## 8. Admin Workflows

### 8.1 Inventory Approval Flow

**Trigger:** farmer sends WhatsApp stock update to FINCAVA WhatsApp number. Admin reads reply manually.

**V1 screen:** Admin > Retail > Stock Management.

Fields: supplier search (dropdown), product (populated from supplier's products), current stock (displayed from `products.retailStockUnits`), new unit count (integer input), farmer confirmed at (datetime picker).

**On save:** `PATCH /api/admin/retail/stock`
```typescript
// Body: { productId, newStockUnits, farmerConfirmedAt }
// Transaction:
// 1. SELECT products.retailStockUnits FOR UPDATE
// 2. If previousStockUnits === 0 AND newStockUnits > 0: trigger waitlist conversion
// 3. UPDATE products SET retailStockUnits = newStockUnits, availableKg = (newStockUnits * retailUnitWeightG / 1000)
// 4. Log to interactions with interactionType = INTERACTION_TYPES.STOCK_UPDATE
// 5. If waitlist conversion triggered: call waitlistService.triggerConversion(productId)
```

Waitlist conversion: sends at-ready email to all `retail_waitlists` rows where `product_id = ? AND exited_at IS NULL AND converted_at IS NULL`, in `joined_at ASC` order. Sets `converted_at = now()` on the rows. Email is authored in farmer's voice per notification template (Section 9).

**Harvest failure detection:** daily cron checks products where `next_window_end < now() AND retail_stock_units = 0 AND retail_enabled = true`. Surfaces these in Admin > Retail > Harvest > Overdue Windows panel for admin review. Admin decides to trigger harvest-failure flow or extend the window.

### 8.2 Harvest Update Flow

**Trigger:** farmer sends photo + one-line WhatsApp message to FINCAVA.

**V1 screen:** Admin > Retail > Harvest > [Supplier] > Post Update.

Fields: update body text (textarea), photo URL (file upload or URL), product selection.

**On post:** `POST /api/admin/retail/harvest-update`
- Saves post to a simple `retail_harvest_updates` table (not specced as a full Phase I table — can start as a JSON log appended to `origin_stories.impact` or as a new table in V1.1).
- Sends mid-cycle update email/WhatsApp to all active waitlist members for that product.

### 8.3 Manual Order Processing (V1)

Screen: Admin > Retail > Orders (queue view).

Queue shows orders in status INQUIRY with `retail_order_details` present. Columns: buyer name, product, quantity, total, payment status, created at.

Per-order actions (detail view):
1. **Notify Farmer** — sends WhatsApp new-order notification template
2. **Mark Payment Authorized** — records manual Wompi authorization
3. **Mark Farmer Ready (LISTO)** — transitions order to READY_TO_SHIP
4. **Capture Payment** — calls WompiAdapter.capture(); transitions to CAPTURED
5. **Enter Tracking** — enters carrier + tracking number; transitions to IN_TRANSIT
6. **Notify Buyer of Shipment** — sends tracking email
7. **Mark Delivered** — sets deliveredAt; sends review request email
8. **Record Farmer Payment** — enters Nequi transfer reference and amount; sets farmerPaidAt

Each action is a single button visible only in the correct state. Transition guard enforced on the backend.

### 8.4 Farm Biography Records Refinements (Section 3.18)

**Side-by-side authoring view:**
Existing Farm Biography Records panel gains a two-column layout in the story editing modal:
- Left: "En sus palabras" — textarea for farmer voice quotes (maps to a new `farmerVoiceQuotes` text column added to `origin_stories` in a V1.1 migration; Phase I uses the existing `story` field)
- Right: "Notas de cata / Buyer copy" — textarea for buyer-facing content

**Farmer review trigger:**
New button: "Enviar para revisión del agricultor"
- `POST /api/admin/retail/origin-stories/:id/farmer-review`
- Sends WhatsApp to `suppliers.whatsappNumber` with a preview link
- Preview link is a signed read-only URL to the story draft

**Record approval:**
New button: "Agricultor aprobó ✓"
- `PATCH /api/admin/retail/origin-stories/:id/approve`
- Body: `{ farmerApprovedAt: string }`
- Sets `origin_stories.farmerApprovedAt`
- Enables the "Publish" button (blocked until `farmerApprovedAt IS NOT NULL`)

### 8.5 Trust-Failure Scenario Workflows

**(a) Harvest fails after waitlist signup:**

Screen: Admin > Retail > Harvest > Failure.

Fields: product selection, failure reason (text, e.g., "helada", "lluvia", "plaga"), failure occurred at (date).

`POST /api/admin/retail/harvest-failure`:
1. Void all AUTHORIZED `retail_payment_transactions` for orders tied to this product (calls WompiAdapter.void(); restores stock units).
2. Issue refunds for any CAPTURED transactions.
3. Send harvest-failure dual-option exit email to all active waitlist members and all affected order buyers.
4. Set `products.retailEnabled = false` until restocked.
5. Log to interactions with `interactionType = INTERACTION_TYPES.HARVEST_UPDATE`.

**(b) Shipping delay:**

Screen: Admin > Retail > Delayed Orders (auto-filtered: IN_TRANSIT orders where `labelGeneratedAt < now() - interval '7 days'`).

Action: "Notify Buyer of Delay" button sends delay notification email with a stated decision point: "Esperamos 3 días más. Si no llega, te reembolsamos."

**(c) Product quality dispute:**

Admin opens order, clicks "Issue Refund." Refund is full. Internally, admin flags for farmer investigation (a `notes` field on the order; no automated farmer-facing action in V1).

**(d) Farmer unresponsive:**

Screen: Admin > Retail > Unresponsive Farmers (orders in READY_TO_SHIP or AUTHORIZED for >48h with no LISTO reply recorded).

Daily cron surfaces these. Admin sees the order and chooses:
- "Escalate to Field Officer" — sends a WhatsApp to the farmer's field officer (looked up from `users` with role FIELD_OFFICER who last visited that supplier via interactions)
- "Refund Buyer" — triggers full refund

**(e) Similar-farm recommendation as introduction:**

Handled in the API layer (Section 3.2) and UI copy. The similar-farm cards are labelled "Conoce también a [farmer name]" not "Alternativas." No separate admin workflow.

---

## 9. Notification Architecture

### 9.1 New Primitives

**lib/sms.ts:** Twilio SMS for OTP delivery (Section 4.1).

**Template discipline:** all templates defined as typed functions in `lib/email.ts` (for email) and inline in `lib/whatsapp.ts` call sites (for WhatsApp). Spanish primary copy. English copy in code comments for review.

### 9.2 Template Specifications

#### Buyer Templates

**T-B1: Order Confirmation (email)**
- Trigger: POST /api/retail/orders 201 response
- Subject: "Tu pedido está confirmado — [Farmer first name] lo está preparando"
- Variables: `buyerFirstName`, `farmerName`, `productName`, `quantity`, `unitLabel`, `totalCents`, `currency`, `shippingDepartment`, `orderId`, `orderAccessToken`
- Body: confirms order, explains payment timing ("Tu pago solo se cobra cuando esté listo para enviar"), links to order status page
- Opt-out: one-click account link (not unsubscribe — this is a transactional email)

**T-B2: Waitlist Confirmation (email or WhatsApp)**
- Trigger: POST /api/retail/waitlist 200 response
- Variables: `farmerName`, `productName`, `nextWindowStart`, `nextWindowEnd`, `unsubscribeUrl`
- Copy: "Te confirmamos en la lista de espera de [farmerName]. La cosecha está prevista para [window]. Te avisamos cuando esté lista."
- Opt-out: unsubscribeUrl (one-click, no session required)

**T-B3: Waitlist Mid-Cycle Update (email or WhatsApp)**
- Trigger: admin `POST /api/admin/retail/harvest-update`
- Variables: `farmerName`, `updateBody`, `photoUrl`, `unsubscribeUrl`
- Copy: sourced from farmer's WhatsApp message, translated/authored by content producer
- Opt-out: unsubscribeUrl

**T-B4: Waitlist At-Ready Conversion (email or WhatsApp)**
- Trigger: `waitlistService.triggerConversion(productId)` on stock replenishment
- Variables: `farmerName`, `productName`, `stockUnits`, `retailPriceCop`, `unitLabel`, `harvestDate`, `buyUrl`, `unsubscribeUrl`
- Copy: authored in farmer's voice (e.g., "Cosechamos el [date]. Las primeras [X] bolsas están listas. — [farmerName]")
- Opt-out: unsubscribeUrl

**T-B5: Harvest Failure Dual-Option Exit (email)**
- Trigger: `POST /api/admin/retail/harvest-failure`
- Variables: `farmerName`, `failureReason`, `similarProductsUrl`, `waitlistExitUrl`, `refundNote`
- Copy: "Esta cosecha no salió como esperábamos. [farmerName] nos informó: [reason]. [Buyer]: tu lista de espera sigue activa. Puedes ver fincas similares o salir de la lista."
- Two CTAs: "Ver fincas similares" | "Salir de la lista"
- Opt-out: waitlistExitUrl (immediate exit)

**T-B6: Shipping Notification (email)**
- Trigger: `PATCH /api/admin/retail/orders/:id/tracking`
- Variables: `buyerFirstName`, `farmerName`, `carrier`, `trackingNumber`, `trackingUrl`
- Copy: tracking number + estimated delivery range

**T-B7: Shipping Delay Notification (email)**
- Trigger: admin "Notify Buyer of Delay" button
- Variables: `buyerFirstName`, `orderId`, `decisionDate`, `refundUrl`
- Copy: honest acknowledgement of delay with stated decision point

**T-B8: Post-Delivery Review Request (email)**
- Trigger: admin "Mark Delivered" action or `deliveredAt` set
- Variables: `farmerName`, `reviewPrompt` ("¿Qué le dirías a [farmerName] sobre su café?")
- One text field; submission goes to admin for review and WhatsApp forward to farmer

**T-B9: Magic Link (email)**
- Trigger: POST /api/retail/auth/request (email channel)
- Variables: `magicLinkUrl` (expires in 15 minutes)
- Copy: "Toca el enlace para acceder a FINCAVA. Válido por 15 minutos."

**T-B10: SMS OTP (SMS)**
- Trigger: POST /api/retail/auth/request (phone channel)
- Variables: `otp`
- Copy: "Tu código de FINCAVA: [otp]. Válido 15 minutos. No lo compartas."

#### Farmer Templates (WhatsApp)

All WhatsApp templates defined as string constants in `lib/whatsapp-templates.ts` (new file). Variables enclosed in `{{double braces}}`. Spanish only.

**T-F1: New Order Notification**
> Hola {{farmerFirstName}}, tienes un nuevo pedido. {{buyerFirstName}} de {{buyerCity}} compró {{quantity}} {{unitLabel}}. Cuando esté listo para enviar, responde LISTO. — FINCAVA

**T-F2: Ready Confirmation**
> ¡Listo! {{buyerFirstName}} sabe que su pedido está en camino. Generaremos la guía y te avisamos. — FINCAVA

**T-F3: Payment Received**
> {{farmerFirstName}}, hoy te transferimos COP {{amountFormatted}} por la venta de {{quantity}} {{unitLabel}}. Revisa tu Nequi. — FINCAVA

**T-F4: Stock Update Prompt**
> Buenos días, {{farmerFirstName}}. ¿Cuántas bolsas tienes disponibles hoy? Responde con el número. — FINCAVA

**T-F5: Harvest Update Request**
> Hola {{farmerFirstName}}, las personas en lista de espera quieren saber cómo va la cosecha. ¿Nos mandas una foto y una frase corta? — FINCAVA

**T-F6: Sellable Status Transition**
> Hola {{farmerFirstName}}, {{statusMessage}}. {{nextStep}} — FINCAVA
> (statusMessage and nextStep set per transition; e.g., "cumples los requisitos básicos" / "Lo siguiente: completar tu RUT")

**T-F7: Story Review Request**
> Hola {{farmerFirstName}}, preparamos tu historia para FINCAVA. ¿Puedes revisar? {{previewUrl}}. Responde OK o dinos qué cambiarías. — FINCAVA

**T-F8: Farmer Claim Invitation**
> Hola {{farmerFirstName}}, soy {{officerName}} de FINCAVA. Para tomar control de tu perfil, responde con tu nombre y te enviamos un enlace. — FINCAVA

#### Admin Templates (Email)

**T-A1: New Retail Order Alert**
- Existing pattern from buyer-intent flow (in `routes/orders.ts`). Extended to include retail order detail.
- Subject: "Nuevo pedido retail — [productName] × [quantity] — [buyerCity]"
- Variables: all order fields + link to Admin > Retail > Orders > [id]

### 9.3 Opt-Out Behavior

All buyer marketing communications (waitlist emails, harvest updates, restock notifications) include a one-click unsubscribe per `retail_waitlists.unsubscribeToken`. Clicking the unsubscribe link calls `DELETE /api/retail/waitlist/unsubscribe?token=<token>` and sets `exited_at = now()`.

Transactional emails (order confirmation, shipping notification, OTP) do not include unsubscribe; they are transactional and not subject to marketing opt-out.

---

## 10. Replit Implementation Safety

### 10.1 Migration Safety Rules

1. **Additive only.** No DROP TABLE, DROP COLUMN, or ALTER TABLE ... DROP CONSTRAINT in Phase I migrations.
2. **Nullable first.** New columns on existing tables are nullable or have safe defaults. Never add a NOT NULL column without a default to an existing table in a single migration.
3. **Forward-only for enums.** `ALTER TYPE ... ADD VALUE` is documented as irreversible. Execute only after team confirmation.
4. **Rollback SQL files.** Each migration `NNNN_name.sql` is paired with `NNNN_name.rollback.sql` stored in `lib/db/drizzle/rollbacks/`. Rollback SQL is hand-authored and reviewed before the migration lands.
5. **No long-running DDL.** Column additions with `DEFAULT NULL` acquire an `ACCESS SHARE` lock and return immediately in PostgreSQL 16. Safe.
6. **FK constraints.** All new FK constraints are `NOT VALID` initially, then `VALIDATE CONSTRAINT` in a subsequent migration. This avoids full table scans on large existing tables at constraint creation time.

### 10.2 Environment Variables Required for Phase I

```
# Wompi
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=
WOMPI_SANDBOX=true

# Twilio SMS (NEW — distinct from existing WhatsApp vars)
TWILIO_SMS_FROM=          # Colombian Twilio phone number

# Existing — unchanged
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
DATABASE_URL=
```

Add `TWILIO_SMS_FROM` to Replit Secrets. Document alongside existing secrets in the Replit `README.md`.

### 10.3 Replit-Specific Notes

**Cold starts:** `node-cron` tasks registered at server startup will re-register on each cold start. This is safe because cron tasks are idempotent (the daily SLA sweep checks current DB state regardless of how many times it has run).

**DB connection limits:** Replit's managed PostgreSQL has connection limits. The existing Drizzle client uses a connection pool. Confirm `max` pool size is ≤ 10. The `node-cron` task shares the existing pool (no new connection).

**Build artifacts:** `lib/sms.ts` and `lib/cron.ts` are TypeScript files in the existing monorepo. They are compiled and bundled as part of the existing build. No new build step.

**File storage:** product and farmer photos are currently stored as URLs (external CDN or Replit object storage). Phase I does not change storage architecture.

### 10.4 Monorepo Boundaries

`lib/db/src/schema/retail.ts` is added to `lib/db`. It is imported in `lib/db/src/schema/index.ts`. Existing packages importing `@workspace/db` will get the new tables automatically after the migration runs. No package.json version bumps required for additive schema changes.

### 10.5 Migration Sequencing for Launch

```
Day -7 (one week before launch):
  Run 0016, 0017 (product + origin_stories column additions)
  Run 0018 (order_status enum additions)
  Verify: no B2B queries broken (run existing test suite)

Day -5:
  Run 0019 (retail_buyer_profiles)
  Run 0020 (retail_auth_tokens)

Day -3:
  Run 0021 (retail_order_details)
  Run 0022 (retail_payment_transactions)
  Run 0023 (retail_waitlists)
  Run 0024 (retail_shipping_zones)
  Run 0025 (zone rate seed)

Day 0 (launch):
  Deploy application code with retail routes
  Register node-cron tasks
  Verify Wompi sandbox webhook delivery
  Run first manual order end-to-end in sandbox
```

---

## 11. Risk Analysis

| Risk | Probability | Impact | Mitigation | Owner |
|---|---|---|---|---|
| **Solo founder capacity** — V1 manual workflows overwhelm available time above 10 orders/week | High | High | Hard cap: accept max 25 orders in V1 period. Automate capture first (highest time cost). | Founder |
| **Content production bottleneck** — one farmer per two weeks is optimistic | High | Medium | Accept it as the catalog ceiling. Prioritize content pipeline over feature development in months 1–3. | Founder |
| **Wompi Nequi immediate settlement** — no authorize/capture separation | High (Nequi is dominant) | Medium | Treat APPROVED as CAPTURED; Nequi path skips AUTHORIZED state. Buyer UI discloses immediate debit for Nequi. Refund is the failure path. | Engineering |
| **Wompi sandbox-to-production behavior differences** — test passes in sandbox, fails live | Medium | High | Run end-to-end with a real COP 1 test transaction in production before opening to buyers. | Engineering |
| **Refund latency** — Wompi refunds may take 3–10 business days to reach buyer's account | Medium | Medium | Disclosure on checkout: "Los reembolsos pueden tardar hasta 10 días hábiles." Set buyer expectations at authorization time. | Product |
| **Chargeback exposure** — buyer disputes with their bank after FINCAVA has paid the farmer | Low | High | Farmer payment is released only after delivery confirmed AND no open disputes. 14-day hold post-delivery before farmer payment. | Operations |
| **Carrier reliability** — Servientrega fails to deliver; package lost | Medium | High | Trust-failure scenario (b): proactive buyer notification at 7 days + refund if not delivered at 14 days. Insurance coverage on parcels >COP 100,000. | Operations |
| **Address validation failures** — buyer enters invalid Colombian address | Medium | Medium | Checkout: department dropdown (constrained to 32 departments). City free text. Admin manually confirms address before label generation in V1. | Engineering |
| **Stock drift** — farmer sells FINCAVA-designated stock through another channel | Low-Medium | High | Farmer pre-commitment at onboarding (Approach A). Daily WhatsApp stock prompt. First incident triggers an honest conversation + potential FINCAVA-channel-exclusivity clause. | Operations |
| **Origin story quality** — AI first draft is inaccurate or romanticized | Medium | Medium | Human review + farmer approval gate (`farmerApprovedAt`). No AI content published without both steps. | Content |
| **Runtime translation accuracy** — TRANSLATION_MODEL mistranslates a buyer-farmer message | Low-Medium | Low | Translation shown alongside original. Buyer and farmer can both see the original. Mistranslation corrected in next message. | Engineering |
| **Prompt drift / model deprecation** — SCORING_MODEL or DOCUMENT_MODEL API changes | Low | Medium | Model constants isolated in `lib/anthropic.ts`. Override via env var. | Engineering |
| **order_status enum rollback** — need to remove AUTHORIZED etc. after forward-only migration | Very Low | Low | Enum values are harmless if unused. Forward-only is documented and accepted. | Engineering |
| **Replit cold start during active order** — server restarts mid-transaction | Low | Medium | Transactions are atomic. The order is in a consistent DB state after restart. node-cron re-registers on restart. Admin reviews any orders with inconsistent status manually. | Engineering |
| **Replit DB connection limit exceeded** — retail traffic spikes exceed pool | Low | High | Pool max = 10 enforced in Drizzle config. Monitor in Replit metrics dashboard. | Engineering |
| **Harvest failure during waitlist wait** — farmer's crop fails, waitlist cannot convert | Medium (agricultural) | Medium | Trust-failure scenario (a) workflow. Dual-option exit. Refunds within 24h of admin action. | Operations |
| **Schema migration blocks existing queries** — column addition takes a lock | Very Low | High | All Phase I additions are `ADD COLUMN ... DEFAULT NULL` or `ADD VALUE` — both lock-safe in PG 16. | Engineering |

---

## 12. Phase I → Phase II Handoff

### 12.1 What Phase I Delivers as Foundation

**Payment gateway abstraction:** `PaymentAdapter` interface is fully defined. `WompiAdapter` implements it. `StripeAdapter` stub is in place. Adding Stripe in Phase II is implementing the stub — not a refactor.

**Currency-aware schema:** every monetary column in every retail table carries an explicit `currency` text column defaulting `'COP'` and stores amounts as integer centavos. Phase II adds `retail_price_usd` and `currency = 'USD'` rows without migration.

**Module boundaries:** `lib/db/src/schema/retail.ts`, `routes/retail/`, `services/retail/` are the extraction surface. Physical separation requires promoting these to a new service with its own DB connection — a deployment change, not a schema change.

**Address schema portability:** `retail_buyer_profiles` and `retail_order_details` use `addressLine1/2`, `city`, `region` / `department`, `countryCode`, `postalCode`. Colombian forms show "Departamento" for `department`; international forms show "Estado/Provincia" for the same column. No schema migration needed for international addressing.

**Origin story language extensibility:** `origin_stories.story` is a single text field. Phase II may add `storyEn` or a child `origin_story_translations` table. Phase I makes no assumptions that block this.

**`lib/interaction-types.ts`:** extending with new interaction types for Phase II is a code change only (no migration).

### 12.2 What Phase II–IV TDD (Prompt 3b) Will Cover

**Phase II — Manual International:**
- Stripe integration (`StripeAdapter` implementation)
- International buyer profile (USD pricing, international addressing)
- International shipping: manual fulfillment via DHL Express or similar
- English UI surfaces (origin story + product copy translation to English, authored by human translator)
- FDA Prior Notice / EU food import compliance for US/EU bound orders
- Currency display and conversion (buyer sees USD; platform holds COP)
- Customs documentation generation (commercial invoice, packing list, HS codes)
- DIAN electronic invoicing integration for Colombian-to-international retail

**Phase III — Consolidation Infrastructure:**
- Miami fulfillment 3PL integration
- Multi-farmer order consolidation (buyer purchases from two suppliers, one shipment)
- Carrier API integration (Servientrega, Coordinadora, DHL)
- Automated label generation replacing V1 manual workflow
- Automated Wompi capture on farmer-ready (replacing V1 manual trigger)
- Automated farmer Nequi payout system
- `product_harvest_windows` child table (V2 of Phase I Approach A deferral)
- Retail analytics dashboard (order volume, revenue, farmer payouts, conversion rates)

**Phase IV — Advanced AI / Agentic:**
- Demand forecasting for harvest cycle planning
- AI-assisted translation of authored content for Phase II English surfaces
- Automated buyer-farmer review summarization for farmer WhatsApp digests
- Predictive stock drift detection (anomaly detection on stock update cadence)
- Automated quality dispute triage (buyer message classification before human review)
- Phase II buyer-farmer matching with preference learning

---

*End of FINCAVA Technical Design Document — Phase I: Colombian Domestic Retail Launch.*
*Phase II–IV roadmap TDD follows separately as Prompt 3b.*
