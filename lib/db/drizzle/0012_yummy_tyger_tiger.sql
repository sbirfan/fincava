ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'FIELD_OFFICER';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'EMPLOYEE';--> statement-breakpoint
ALTER TYPE "public"."sellable_status" ADD VALUE IF NOT EXISTS 'INACTIVE';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_key" text NOT NULL,
	"label" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"is_visible" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_public_metrics_key" UNIQUE("metric_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_compliance_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"requirement_code" text NOT NULL,
	"document_id" integer,
	"decision" text NOT NULL,
	"reason_code" text,
	"visible_note" text,
	"internal_note" text,
	"reviewer_id" integer,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "buyer_visibility_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"requirement_code" text NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"badge_label" text,
	"disclaimer" text,
	"enabled_by" integer,
	"enabled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_documents_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"requirement_code" text NOT NULL,
	"document_type" text NOT NULL,
	"evidence_type" text,
	"file_url" text NOT NULL,
	"extracted_fields_json" jsonb,
	"validation_results_json" jsonb,
	"ocr_confidence" integer,
	"uploaded_by" text DEFAULT 'officer' NOT NULL,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"prescreening_result" jsonb,
	"prescreened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_enablement_flows" (
	"id" serial PRIMARY KEY NOT NULL,
	"requirement_code" text NOT NULL,
	"step_order" integer NOT NULL,
	"mode" text NOT NULL,
	"language" text DEFAULT 'es' NOT NULL,
	"title" text NOT NULL,
	"guidance" text NOT NULL,
	"expected_output" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "managed_service_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"requirement_code" text NOT NULL,
	"package_type" text NOT NULL,
	"consent_record" text,
	"consent_at" timestamp with time zone,
	"fee_status" text DEFAULT 'none' NOT NULL,
	"assigned_staff_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_export_mode" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"product_category" text DEFAULT 'coffee' NOT NULL,
	"mode" text NOT NULL,
	"confidence" text DEFAULT 'self_declared' NOT NULL,
	"verified_by" integer,
	"partner_name" text,
	"partner_role" text,
	"evidence_status" text DEFAULT 'none',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_requirement_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"requirement_code" text NOT NULL,
	"agency" text NOT NULL,
	"state" text DEFAULT 'not_started' NOT NULL,
	"selected_mode" text,
	"admin_required" boolean DEFAULT false NOT NULL,
	"confidence_score" integer,
	"visible_note" text,
	"internal_note" text,
	"verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "suppliers_sellable_status_idx";--> statement-breakpoint
ALTER TABLE "origin_stories" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_reset_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "token_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "origin_stories" ADD COLUMN IF NOT EXISTS "product_category" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "translated_content" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "detected_lang" varchar(5);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "user_id" integer;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "buyer_segment" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "location_count" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "annual_budget_usd" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "coffee_quality_tier" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "coffee_flavor_profile" text[];--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "cacao_flavor_profile" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "fruit_form" text[];--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "availability_requirement" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "order_frequency" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "coffee_order_size_kg" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "cacao_order_size_kg" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "fruit_order_size_kg" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "price_sensitivity" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "price_transparency" text[];--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "certs_nice_to_have" text[];--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "quality_doc_required" text[];--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "coffee_defect_rate" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "cacao_mold_pct" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "source_consistency" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "quality_verification" text[];--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "sustainability_importance" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "sustainability_dimensions" text[];--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "p2_approval_status" text DEFAULT 'PENDING_REVIEW' NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "p2_revision_note" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "admin_compliance_reviews" ADD CONSTRAINT "admin_compliance_reviews_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "admin_compliance_reviews" ADD CONSTRAINT "admin_compliance_reviews_document_id_compliance_documents_v2_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."compliance_documents_v2"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "admin_compliance_reviews" ADD CONSTRAINT "admin_compliance_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "buyer_visibility_signals" ADD CONSTRAINT "buyer_visibility_signals_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "buyer_visibility_signals" ADD CONSTRAINT "buyer_visibility_signals_enabled_by_users_id_fk" FOREIGN KEY ("enabled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "compliance_documents_v2" ADD CONSTRAINT "compliance_documents_v2_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "managed_service_cases" ADD CONSTRAINT "managed_service_cases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "managed_service_cases" ADD CONSTRAINT "managed_service_cases_assigned_staff_id_users_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_export_mode" ADD CONSTRAINT "supplier_export_mode_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_export_mode" ADD CONSTRAINT "supplier_export_mode_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_requirement_status" ADD CONSTRAINT "supplier_requirement_status_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bvs_supplier_req_unique" ON "buyer_visibility_signals" USING btree ("supplier_id","requirement_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_export_mode_supplier_category_uidx" ON "supplier_export_mode" USING btree ("supplier_id","product_category");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "srs_supplier_req_unique" ON "supplier_requirement_status" USING btree ("supplier_id","requirement_code");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suppliers_sellable_status_idx" ON "suppliers" USING btree ("sellable_status") WHERE sellable_status = ANY (ARRAY['SELLABLE'::sellable_status, 'PUBLISHED'::sellable_status]);
