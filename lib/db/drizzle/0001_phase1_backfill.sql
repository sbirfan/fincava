-- Phase 1 State Machine — Backfill (memo v1.0)
--
-- Run manually after db:push has applied the new Phase 1 columns.
-- Sets sellable_status = 'NOT_READY' for all existing supplier rows
-- where sellable_status is NULL (i.e. rows that pre-date the Phase 1 schema).
--
-- Safe to re-run: WHERE sellable_status IS NULL is idempotent.
--
-- Usage:
--   psql $DATABASE_URL -f lib/db/drizzle/0001_phase1_backfill.sql

UPDATE suppliers
SET sellable_status = 'NOT_READY'
WHERE sellable_status IS NULL;
