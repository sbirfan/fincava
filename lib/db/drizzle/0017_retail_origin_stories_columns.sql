-- FIN retail Sprint 1: bilingual + farmer approval columns on origin_stories (TDD §2.2.2)
-- Rollback: ALTER TABLE origin_stories DROP COLUMN IF EXISTS farmer_approved_at, ...

ALTER TABLE origin_stories
  ADD COLUMN IF NOT EXISTS farmer_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS farmer_voice_es    text,
  ADD COLUMN IF NOT EXISTS farmer_voice_en    text,
  ADD COLUMN IF NOT EXISTS buyer_copy_es      text,
  ADD COLUMN IF NOT EXISTS buyer_copy_en      text,
  ADD COLUMN IF NOT EXISTS translated_by      text;
