-- Migration 0036: retail cart tables + order line items + checkout grouping
-- Rollback: DROP TABLE IF EXISTS retail_order_items; DROP TABLE IF EXISTS retail_cart_items;
--           DROP TABLE IF EXISTS retail_carts; ALTER TABLE orders DROP COLUMN IF EXISTS checkout_batch_ref;

-- ── retail_carts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retail_carts (
  id                      serial PRIMARY KEY,
  session_id              text NULL,
  retail_buyer_profile_id integer NULL REFERENCES retail_buyer_profiles(id) ON DELETE CASCADE,
  expires_at              timestamptz NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT retail_carts_has_identity
    CHECK (session_id IS NOT NULL OR retail_buyer_profile_id IS NOT NULL)
);

CREATE UNIQUE INDEX retail_carts_session_id_uidx
  ON retail_carts(session_id)
  WHERE session_id IS NOT NULL;

CREATE UNIQUE INDEX retail_carts_buyer_profile_uidx
  ON retail_carts(retail_buyer_profile_id)
  WHERE retail_buyer_profile_id IS NOT NULL;

-- ── retail_cart_items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retail_cart_items (
  id                      serial PRIMARY KEY,
  cart_id                 integer NOT NULL REFERENCES retail_carts(id) ON DELETE CASCADE,
  product_id              integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity                integer NOT NULL CHECK (quantity > 0),
  unit_label_snapshot     text NOT NULL,
  price_cop_snapshot      integer NOT NULL,
  max_per_order_snapshot  integer NOT NULL,
  added_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
);

CREATE INDEX retail_cart_items_cart_id_idx ON retail_cart_items(cart_id);

-- ── retail_order_items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retail_order_items (
  id                            serial PRIMARY KEY,
  order_id                      integer NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  product_id                    integer NULL REFERENCES products(id) ON DELETE SET NULL,
  supplier_id                   integer NULL REFERENCES suppliers(id) ON DELETE SET NULL,
  unit_quantity                 integer NOT NULL CHECK (unit_quantity > 0),
  unit_label_snapshot           text NULL,
  product_price_cents_snapshot  integer NULL,
  nequi_phone_snapshot          text NULL,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX retail_order_items_order_id_idx ON retail_order_items(order_id);

-- ── orders.checkout_batch_ref ─────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_batch_ref text NULL;

CREATE INDEX orders_checkout_batch_ref_idx
  ON orders(checkout_batch_ref)
  WHERE checkout_batch_ref IS NOT NULL;
