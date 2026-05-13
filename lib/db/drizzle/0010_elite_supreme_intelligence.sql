CREATE TYPE "public"."batch_status" AS ENUM('DRAFT', 'SUBMITTED', 'ROLLED_BACK');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('UNCLAIMED', 'PENDING_CLAIM', 'CLAIMED');--> statement-breakpoint
CREATE TYPE "public"."ingestion_source" AS ENUM('FIELD_COLLECTED', 'ADMIN_ENTRY', 'WEB_SCRAPE', 'PARTNER_IMPORT');--> statement-breakpoint
CREATE TYPE "public"."ingestion_status" AS ENUM('DRAFT', 'ENRICHED', 'READY', 'REJECTED');--> statement-breakpoint
ALTER TYPE "public"."supplier_type" ADD VALUE 'PROCESSOR';--> statement-breakpoint
ALTER TYPE "public"."supplier_type" ADD VALUE 'DISTRIBUTOR';--> statement-breakpoint
ALTER TYPE "public"."supplier_type" ADD VALUE 'OTHER';--> statement-breakpoint
CREATE TABLE "product_placeholders" (
        "id" serial PRIMARY KEY NOT NULL,
        "supplier_id" integer NOT NULL,
        "category_hint" text,
        "data_origin" text DEFAULT 'inferred' NOT NULL,
        "verification_status" text DEFAULT 'unverified' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_contacts" (
        "id" serial PRIMARY KEY NOT NULL,
        "supplier_id" integer NOT NULL,
        "contact_type" text NOT NULL,
        "contact_value" text,
        "source" text,
        "consent_status" text DEFAULT 'UNKNOWN',
        "approved_for_outreach" boolean DEFAULT false NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_ingestion_batches" (
        "id" serial PRIMARY KEY NOT NULL,
        "batch_uuid" varchar(36) NOT NULL,
        "created_by_admin_id" integer NOT NULL,
        "status" "batch_status" DEFAULT 'DRAFT' NOT NULL,
        "batch_size" integer,
        "notes" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "submitted_at" timestamp with time zone,
        CONSTRAINT "supplier_ingestion_batches_batch_uuid_unique" UNIQUE("batch_uuid")
);
--> statement-breakpoint
CREATE TABLE "buyer_matches" (
        "id" serial PRIMARY KEY NOT NULL,
        "buyer_profile_id" integer NOT NULL,
        "supplier_id" integer NOT NULL,
        "match_score" numeric(3, 2) NOT NULL,
        "score_breakdown" jsonb NOT NULL,
        "disqualifiers" text[],
        "match_notes" text,
        "sections_at_run" text[] NOT NULL,
        "is_current" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "buyer_matches_score_range" CHECK ("buyer_matches"."match_score" >= 0.00 AND "buyer_matches"."match_score" <= 1.00)
);
--> statement-breakpoint
CREATE TABLE "buyer_gap_briefs" (
        "id" serial PRIMARY KEY NOT NULL,
        "buyer_profile_id" integer NOT NULL,
        "gap_type" varchar(30) NOT NULL,
        "priority" varchar(10) NOT NULL,
        "pipeline_action" varchar(30) NOT NULL,
        "is_real_gap" boolean DEFAULT true NOT NULL,
        "search_category" varchar(50),
        "search_region" text,
        "required_attributes" text[],
        "volume_target_mt" numeric(10, 2),
        "buyer_urgency_note" text,
        "discovery_search_terms" text[],
        "ingestion_batch_id" integer,
        "resolved_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_admin_actions" (
        "id" serial PRIMARY KEY NOT NULL,
        "actor_admin_id" integer NOT NULL,
        "buyer_profile_id" integer NOT NULL,
        "action_type" varchar(50) NOT NULL,
        "payload" jsonb,
        "note" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "campaign_id" integer NOT NULL,
        "profile_id" integer,
        "email" text NOT NULL,
        "status" varchar(10) NOT NULL,
        "error" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_campaigns" (
        "id" serial PRIMARY KEY NOT NULL,
        "admin_id" integer NOT NULL,
        "subject" text NOT NULL,
        "html" text NOT NULL,
        "text_body" text,
        "topic" varchar(80),
        "country" varchar(80),
        "state_filter" varchar(40),
        "status" varchar(20) DEFAULT 'pending' NOT NULL,
        "total_recipients" integer DEFAULT 0 NOT NULL,
        "sent" integer DEFAULT 0 NOT NULL,
        "failed" integer DEFAULT 0 NOT NULL,
        "started_at" timestamp with time zone,
        "completed_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_whatsapp_number_unique";--> statement-breakpoint
DROP INDEX "suppliers_whatsapp_idx";--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "last_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ALTER COLUMN "whatsapp_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "origin_stories" ADD COLUMN "published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "supplier_id" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "supplier_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "supplier_id" integer;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "origin_requirements" text;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "processing_method" varchar(50);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "quality_grade" varchar(100);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "required_certifications" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "preferred_certifications" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "required_documents" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "import_regs" text;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "annual_volume_mt" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "moq_mt" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "order_frequency" varchar(30);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "price_range_min_usd_kg" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "price_range_max_usd_kg" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "incoterms" varchar(10);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "lead_time_weeks" integer;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "cold_chain_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "packaging_requirements" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "normalized_name" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "source_type" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "supplier_fingerprint" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "claim_status" "claim_status" DEFAULT 'UNCLAIMED';--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "claim_token" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "ingestion_source" "ingestion_source" DEFAULT 'FIELD_COLLECTED';--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "ingestion_status" "ingestion_status";--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "created_by_admin_id" integer;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "batch_id" integer;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "country" text DEFAULT 'Colombia';--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "data_completeness_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "confidence_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "custom_supplier_type" varchar(120);--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN "token_hash" text;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD COLUMN "token_hash" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "state" varchar(20) DEFAULT 'REGISTERED' NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "volume_band" varchar(20);--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "required_certs_p1" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "time_to_first_order" varchar(20);--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "p2_completion_pct" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "p2_sections_done" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "matching_run_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "last_matched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "gap_flag_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "subscription_recommendation" varchar(10);--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "traceability_level" varchar(20);--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "existing_colombia_rel" boolean;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "trade_finance_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "audit_standard" varchar(50);--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "logistics_partner" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "platform_intent" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "sample_ready" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "prev_sourcing_channel" varchar(100);--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "discovery_budget_band" varchar(20);--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "supplier_dev_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "supplier_type_pref" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "social_impact_reqs" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "early_stage_supplier_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "language_preference" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "marketing_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "marketing_topics" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_placeholders" ADD CONSTRAINT "product_placeholders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_ingestion_batches" ADD CONSTRAINT "supplier_ingestion_batches_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_matches" ADD CONSTRAINT "buyer_matches_buyer_profile_id_buyer_profiles_id_fk" FOREIGN KEY ("buyer_profile_id") REFERENCES "public"."buyer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_matches" ADD CONSTRAINT "buyer_matches_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_gap_briefs" ADD CONSTRAINT "buyer_gap_briefs_buyer_profile_id_buyer_profiles_id_fk" FOREIGN KEY ("buyer_profile_id") REFERENCES "public"."buyer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_gap_briefs" ADD CONSTRAINT "buyer_gap_briefs_ingestion_batch_id_supplier_ingestion_batches_id_fk" FOREIGN KEY ("ingestion_batch_id") REFERENCES "public"."supplier_ingestion_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_admin_actions" ADD CONSTRAINT "buyer_admin_actions_buyer_profile_id_buyer_profiles_id_fk" FOREIGN KEY ("buyer_profile_id") REFERENCES "public"."buyer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_logs" ADD CONSTRAINT "campaign_logs_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_contacts_type_unique_idx" ON "supplier_contacts" USING btree ("supplier_id","contact_type");--> statement-breakpoint
CREATE INDEX "idx_buyer_matches_profile" ON "buyer_matches" USING btree ("buyer_profile_id","is_current");--> statement-breakpoint
CREATE INDEX "idx_buyer_matches_supplier" ON "buyer_matches" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_buyer_matches_score" ON "buyer_matches" USING btree ("buyer_profile_id","match_score");--> statement-breakpoint
CREATE INDEX "idx_buyer_gaps_profile" ON "buyer_gap_briefs" USING btree ("buyer_profile_id");--> statement-breakpoint
CREATE INDEX "idx_buyer_gaps_priority" ON "buyer_gap_briefs" USING btree ("priority","pipeline_action");--> statement-breakpoint
CREATE INDEX "idx_buyer_gaps_unresolved" ON "buyer_gap_briefs" USING btree ("resolved_at") WHERE "buyer_gap_briefs"."resolved_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_buyer_admin_actions_profile" ON "buyer_admin_actions" USING btree ("buyer_profile_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_buyer_admin_actions_actor" ON "buyer_admin_actions" USING btree ("actor_admin_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_logs_campaign_id" ON "campaign_logs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_marketing_campaigns_admin_id" ON "marketing_campaigns" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_marketing_campaigns_status" ON "marketing_campaigns" USING btree ("status");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_batch_id_supplier_ingestion_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."supplier_ingestion_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_whatsapp_unique_idx" ON "suppliers" USING btree ("whatsapp_number") WHERE whatsapp_number IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_buyer_profiles_state" ON "buyer_profiles" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_buyer_profiles_completion" ON "buyer_profiles" USING btree ("p2_completion_pct");--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "data_completeness_score_range" CHECK (data_completeness_score IS NULL OR (data_completeness_score >= 0 AND data_completeness_score <= 100));--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "confidence_score_range" CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100));