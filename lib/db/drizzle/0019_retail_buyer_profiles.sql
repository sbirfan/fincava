-- FIN retail Sprint 1: retail_buyer_profiles table (TDD §2.3.1)
-- Rollback: DROP TABLE IF EXISTS retail_buyer_profiles;

CREATE TABLE IF NOT EXISTS retail_buyer_profiles (
  id                    serial PRIMARY KEY,
  user_id               integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name            text NOT NULL,
  last_name             text,
  phone                 text,
  default_address_line1 text,
  default_address_line2 text,
  default_city          text,
  default_department    text,
  default_country_code  text NOT NULL DEFAULT 'CO',
  default_postal_code   text,
  filter_preferences    jsonb,
  notification_channel  text NOT NULL DEFAULT 'EMAIL',
  language_pref         text NOT NULL DEFAULT 'es',
  marketing_opt_in      boolean NOT NULL DEFAULT false,
  deleted_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS retail_buyer_profiles_user_id_uidx ON retail_buyer_profiles (user_id);
