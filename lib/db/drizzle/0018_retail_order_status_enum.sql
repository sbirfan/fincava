-- FIN retail Sprint 1: add retail order status values + channel discriminator (TDD §2.2.3)
-- FORWARD-ONLY: PostgreSQL does not support removing enum values.
-- Rollback: drop retail_order_details table only; enum values remain (harmless if unused).

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'AUTHORIZED';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'READY_TO_SHIP';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'CAPTURED';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'IN_TRANSIT';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'DELIVERED_RETAIL';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'REFUNDED';

-- channel discriminator: 'b2b' | 'retail'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'b2b';
