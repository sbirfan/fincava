-- FIN retail Sprint 1: retail_harvest_updates table (TDD §2.3.7)
-- Rollback: DROP TABLE IF EXISTS retail_harvest_updates;

CREATE TABLE IF NOT EXISTS retail_harvest_updates (
  id                  serial PRIMARY KEY,
  product_id          integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id         integer NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  body                text NOT NULL,
  photo_url           text,
  posted_at           timestamptz NOT NULL DEFAULT now(),
  posted_by_user_id   integer REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_retail_harvest_updates_product_id ON retail_harvest_updates (product_id);
