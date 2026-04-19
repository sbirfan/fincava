ALTER TABLE "onboarding_drafts" ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp with time zone;
