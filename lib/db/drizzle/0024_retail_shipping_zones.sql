-- FIN retail Sprint 1: retail_shipping_zones table (TDD §2.3.6)
-- Rollback: DROP TABLE IF EXISTS retail_shipping_zones;

CREATE TABLE IF NOT EXISTS retail_shipping_zones (
  id                      serial PRIMARY KEY,
  origin_department       text NOT NULL,
  destination_department  text NOT NULL,
  weight_class            text NOT NULL DEFAULT 'SMALL',
  rate_cents              integer NOT NULL,
  currency                text NOT NULL DEFAULT 'COP',
  carrier_hint            text,
  active                  boolean NOT NULL DEFAULT true,
  effective_from          timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS retail_shipping_zones_uidx
  ON retail_shipping_zones (origin_department, destination_department, weight_class)
  WHERE active = true;
