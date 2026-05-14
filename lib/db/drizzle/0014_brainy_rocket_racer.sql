ALTER TABLE "economics" ADD COLUMN IF NOT EXISTS "cost_per_kg" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "economics" ADD COLUMN IF NOT EXISTS "minimum_order_kg" integer;--> statement-breakpoint
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "altitude_meters" integer;--> statement-breakpoint
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "harvest_months" text[];
