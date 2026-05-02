-- Phase 1 (Expand): add token_hash columns alongside existing plaintext token columns.
-- New tokens are written with token_hash = sha256(raw_token).
-- Verification queries match on token_hash OR token for transition compatibility.
ALTER TABLE "password_reset_tokens" ADD COLUMN "token_hash" text;
ALTER TABLE "email_verification_tokens" ADD COLUMN "token_hash" text;

-- ── Phase 2 (Contract — run after all active plaintext tokens have expired) ────
-- Backfill hashes for any remaining plaintext rows, enforce NOT NULL, add unique
-- index, then drop the plaintext column.
--
-- UPDATE "password_reset_tokens"
--   SET token_hash = encode(sha256(token::bytea), 'hex')
--   WHERE token_hash IS NULL;
-- UPDATE "email_verification_tokens"
--   SET token_hash = encode(sha256(token::bytea), 'hex')
--   WHERE token_hash IS NULL;
--
-- ALTER TABLE "password_reset_tokens"
--   ALTER COLUMN "token_hash" SET NOT NULL,
--   ADD CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE ("token_hash"),
--   DROP COLUMN "token";
-- ALTER TABLE "email_verification_tokens"
--   ALTER COLUMN "token_hash" SET NOT NULL,
--   ADD CONSTRAINT "email_verification_tokens_token_hash_unique" UNIQUE ("token_hash"),
--   DROP COLUMN "token";
