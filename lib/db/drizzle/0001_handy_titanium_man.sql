CREATE TYPE "public"."eligibility_status" AS ENUM('PASS', 'FAIL');--> statement-breakpoint
CREATE TYPE "public"."graduation_pathway" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."sellable_status" AS ENUM('NOT_READY', 'ELIGIBLE', 'SELLABLE', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."actor" AS ENUM('SYSTEM', 'ADMIN', 'FOUNDER');--> statement-breakpoint
CREATE TABLE "supplier_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"eligibility_status" "eligibility_status",
	"commercial_score" integer,
	"sellable_status" "sellable_status",
	"pathway" "graduation_pathway",
	"score_snapshot" jsonb,
	"threshold_version" varchar(64) NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_state_transitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"from_state" "sellable_status",
	"to_state" "sellable_status" NOT NULL,
	"threshold_version" varchar(64) NOT NULL,
	"commercial_score_at_transition" integer,
	"actor" "actor" NOT NULL,
	"justification" text,
	"evaluation_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"assigned_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_roles_user_role_uniq" UNIQUE("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "eligibility_status" "eligibility_status";--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "commercial_score" integer;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "sellable_status" "sellable_status";--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "graduation_pathway" "graduation_pathway";--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "next_actions" jsonb;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "commercial_score_at_onboarding" integer;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "last_evaluated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "threshold_version" varchar(64);--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD CONSTRAINT "supplier_evaluations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_state_transitions" ADD CONSTRAINT "supplier_state_transitions_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_state_transitions" ADD CONSTRAINT "supplier_state_transitions_evaluation_id_supplier_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."supplier_evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_roles" ADD CONSTRAINT "staff_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_roles" ADD CONSTRAINT "staff_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "supplier_evaluations_supplier_evaluated_idx" ON "supplier_evaluations" USING btree ("supplier_id","evaluated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "supplier_state_transitions_supplier_created_idx" ON "supplier_state_transitions" USING btree ("supplier_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "compliance_docs" ADD CONSTRAINT "compliance_docs_supplier_id_unique" UNIQUE("supplier_id");