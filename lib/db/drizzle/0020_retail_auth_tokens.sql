-- FIN retail Sprint 1: retail_auth_tokens table (TDD §2.3.2 / §4)
-- Rollback: DROP TABLE IF EXISTS retail_auth_tokens;

CREATE TABLE IF NOT EXISTS retail_auth_tokens (
  id          serial PRIMARY KEY,
  user_id     integer REFERENCES users(id) ON DELETE CASCADE,
  email       text,
  phone       text,
  token_hash  text NOT NULL,
  token_type  text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS retail_auth_tokens_hash_uidx ON retail_auth_tokens (token_hash);
CREATE INDEX IF NOT EXISTS retail_auth_tokens_email_idx ON retail_auth_tokens (email);
CREATE INDEX IF NOT EXISTS retail_auth_tokens_phone_idx ON retail_auth_tokens (phone);
