ALTER TABLE "ai_outputs" ADD COLUMN IF NOT EXISTS "confidence_level" text;--> statement-breakpoint
ALTER TABLE "ai_outputs" ADD COLUMN IF NOT EXISTS "data_completeness" smallint;--> statement-breakpoint
ALTER TABLE "ai_outputs" ADD COLUMN IF NOT EXISTS "evidence_tier" text;
