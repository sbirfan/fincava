-- FIN retail Sprint 1: retail_waitlists table (TDD §2.3.5)
-- Rollback: DROP TABLE IF EXISTS retail_waitlists;

CREATE TABLE IF NOT EXISTS retail_waitlists (
  id                      serial PRIMARY KEY,
  product_id              integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  retail_buyer_profile_id integer REFERENCES retail_buyer_profiles(id) ON DELETE SET NULL,
  email                   text,
  phone                   text,
  notification_channel    text NOT NULL,
  unsubscribe_token       text NOT NULL,
  joined_at               timestamptz NOT NULL DEFAULT now(),
  converted_at            timestamptz,
  exited_at               timestamptz,
  CONSTRAINT retail_waitlists_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS retail_waitlists_product_idx ON retail_waitlists (product_id);
CREATE INDEX IF NOT EXISTS retail_waitlists_profile_idx ON retail_waitlists (retail_buyer_profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS retail_waitlists_unsubscribe_uidx ON retail_waitlists (unsubscribe_token);
CREATE UNIQUE INDEX IF NOT EXISTS retail_waitlists_dedup_uidx ON retail_waitlists (
  product_id,
  COALESCE(retail_buyer_profile_id, 0),
  COALESCE(email, ''),
  COALESCE(phone, '')
);
