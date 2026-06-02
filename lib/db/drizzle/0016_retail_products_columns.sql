-- FIN retail Sprint 1: retail SKU columns on products (TDD §2.2.1)
-- Rollback: ALTER TABLE products DROP COLUMN IF EXISTS retail_enabled, DROP COLUMN IF EXISTS retail_price_cop, ...

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS retail_enabled      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retail_price_cop    integer,
  ADD COLUMN IF NOT EXISTS retail_stock_units  integer,
  ADD COLUMN IF NOT EXISTS retail_unit_weight_g integer,
  ADD COLUMN IF NOT EXISTS retail_unit_label   text,
  ADD COLUMN IF NOT EXISTS retail_max_per_order integer,
  ADD COLUMN IF NOT EXISTS last_replenished_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_window_start   timestamptz,
  ADD COLUMN IF NOT EXISTS next_window_end     timestamptz;

CREATE INDEX IF NOT EXISTS idx_products_retail_enabled ON products (id) WHERE retail_enabled = true AND active = true;
