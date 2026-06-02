-- FIN retail Sprint 1: retail_order_details table (TDD §2.3.3)
-- Rollback: DROP TABLE IF EXISTS retail_order_details;
-- Note: enum values added in 0018 remain (forward-only).

CREATE TABLE IF NOT EXISTS retail_order_details (
  id                          serial PRIMARY KEY,
  order_id                    integer NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  retail_buyer_profile_id     integer REFERENCES retail_buyer_profiles(id) ON DELETE SET NULL,
  shipping_name               text NOT NULL,
  shipping_address_line1      text NOT NULL,
  shipping_address_line2      text,
  shipping_city               text NOT NULL,
  shipping_department         text NOT NULL,
  shipping_country_code       text NOT NULL DEFAULT 'CO',
  shipping_postal_code        text,
  shipping_rate_cents         integer,
  currency                    text NOT NULL DEFAULT 'COP',
  carrier                     text,
  tracking_number             text,
  parcel_weight_g             integer,
  label_generated_at          timestamptz,
  delivered_at                timestamptz,
  farmer_paid_at              timestamptz,
  farmer_payment_ref          text,
  farmer_payment_amount_cents integer,
  review_requested_at         timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS retail_order_details_buyer_profile_idx ON retail_order_details (retail_buyer_profile_id);
