-- Migration: 0037_supplier_auth_tokens
-- Purpose: Short-lived token table for WhatsApp OTP and magic-link email auth
--          used by FIN-002 (farm supplier self-service login).
--
-- Rollback:
--   DROP TABLE IF EXISTS supplier_auth_tokens;
--   DROP TYPE  IF EXISTS supplier_auth_contact_type;

CREATE TYPE supplier_auth_contact_type AS ENUM ('whatsapp', 'email');

CREATE TABLE supplier_auth_tokens (
  id                   serial PRIMARY KEY,
  supplier_id          integer NOT NULL REFERENCES suppliers(id),
  token_hash           text    NOT NULL,
  contact_type         supplier_auth_contact_type NOT NULL,
  contact_value        text    NOT NULL,
  expires_at           timestamptz NOT NULL,
  used_at              timestamptz,
  created_by_admin_id  integer REFERENCES users(id),
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX supplier_auth_tokens_supplier_idx ON supplier_auth_tokens (supplier_id);
