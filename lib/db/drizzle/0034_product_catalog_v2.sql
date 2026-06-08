-- FIN-V2: Product Catalog V2 — typed products, AI enrichment, status lifecycle
-- Adds 7 columns to products. All additive — nullable or have safe defaults.
-- Zero production rows at migration time — no backfill needed.
-- Rollback:
--   ALTER TABLE products
--     DROP COLUMN IF EXISTS product_type_key,
--     DROP COLUMN IF EXISTS type_attributes,
--     DROP COLUMN IF EXISTS wholesale_enabled,
--     DROP COLUMN IF EXISTS ai_content,
--     DROP COLUMN IF EXISTS product_status,
--     DROP COLUMN IF EXISTS wholesale_approved_at,
--     DROP COLUMN IF EXISTS retail_approved_at;
--   DROP INDEX IF EXISTS idx_products_type_key;
--   DROP INDEX IF EXISTS idx_products_type_attrs_gin;
--   DROP INDEX IF EXISTS idx_products_status;

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "product_type_key"      text,
  ADD COLUMN IF NOT EXISTS "type_attributes"        jsonb,
  ADD COLUMN IF NOT EXISTS "wholesale_enabled"      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "ai_content"             jsonb,
  ADD COLUMN IF NOT EXISTS "product_status"         text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "wholesale_approved_at"  timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "retail_approved_at"     timestamp with time zone;

CREATE INDEX IF NOT EXISTS "idx_products_type_key"
  ON "products" ("product_type_key")
  WHERE "product_type_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_products_type_attrs_gin"
  ON "products" USING GIN ("type_attributes")
  WHERE "type_attributes" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_products_status"
  ON "products" ("product_status")
  WHERE "product_status" IS NOT NULL;
