CREATE TABLE "buyer_admin_actions" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_admin_id" integer NOT NULL,
  "buyer_profile_id" integer NOT NULL REFERENCES "buyer_profiles"("id") ON DELETE CASCADE,
  "action_type" varchar(50) NOT NULL,
  "payload" jsonb,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_buyer_admin_actions_profile" ON "buyer_admin_actions" ("buyer_profile_id", "created_at");
--> statement-breakpoint
CREATE INDEX "idx_buyer_admin_actions_actor" ON "buyer_admin_actions" ("actor_admin_id");
