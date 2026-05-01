ALTER TABLE "suppliers" ADD COLUMN "published_to_origin_stories" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "origin_story_image_url" text;--> statement-breakpoint
CREATE INDEX "idx_suppliers_published_to_origin_stories" ON "suppliers" USING btree ("published_to_origin_stories") WHERE published_to_origin_stories = true;
