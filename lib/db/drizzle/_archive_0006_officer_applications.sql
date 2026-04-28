CREATE TABLE "email_verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "buyer_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company_name" text,
	"country" text,
	"destination_port" text,
	"target_products" text[] DEFAULT '{}' NOT NULL,
	"preferred_incoterm" text,
	"intended_volume_mt" real,
	"import_frequency" text,
	"onboarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interaction_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"actor_id" integer,
	"actor_type" text,
	"reference_id" integer,
	"reference_type" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "officer_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text NOT NULL,
	"department" text NOT NULL,
	"municipio" text NOT NULL,
	"languages" text,
	"experience_years" integer,
	"has_motorcycle" boolean,
	"available_days" text[],
	"motivation" text,
	"referral_code" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "company_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "order_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "product_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "buyer_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "product_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "author_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "product_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "sender_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "receiver_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "rfq_responses" ALTER COLUMN "rfq_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "rfqs" ALTER COLUMN "buyer_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "payment_milestones" ALTER COLUMN "order_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "order_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "product_analytics" ALTER COLUMN "product_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "company_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "trade_history" ALTER COLUMN "company_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "trust_scores" ALTER COLUMN "company_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "repayments" ALTER COLUMN "loan_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fee_percentage" real;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fee_amount_usd" real;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fee_status" text;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "buyer_profiles_user_id_unique" ON "buyer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "companies_user_id_idx" ON "companies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "products_company_id_idx" ON "products" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "suppliers_sellable_status_idx" ON "suppliers" USING btree ("sellable_status") WHERE sellable_status IN ('SELLABLE', 'PUBLISHED');