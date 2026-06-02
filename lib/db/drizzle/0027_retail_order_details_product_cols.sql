-- Sprint 3: add product snapshot + order access token columns to retail_order_details
-- Rollback: ALTER TABLE retail_order_details DROP COLUMN IF EXISTS product_id, ...

ALTER TABLE retail_order_details
  ADD COLUMN IF NOT EXISTS product_id              integer REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_quantity           integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_label              text,
  ADD COLUMN IF NOT EXISTS product_price_cents     integer,
  ADD COLUMN IF NOT EXISTS order_access_token_hash text;
