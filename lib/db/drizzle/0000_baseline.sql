CREATE TYPE "public"."role" AS ENUM('BUYER', 'SUPPLIER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."company_type" AS ENUM('COOPERATIVE', 'EXPORTER', 'SMALLHOLDER', 'IMPORTER', 'DISTRIBUTOR', 'ROASTER', 'MANUFACTURER');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('COFFEE', 'CACAO', 'AVOCADO', 'EXOTIC_FRUIT', 'SUPERFOOD', 'PROCESSED', 'TEXTILE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('INQUIRY', 'SAMPLE_REQUESTED', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."rfq_status" AS ENUM('OPEN', 'CLOSED', 'AWARDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('BOOKED', 'PICKUP', 'IN_TRANSIT', 'CUSTOMS', 'DELIVERED', 'DELAYED');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('FREE', 'PRO', 'PREMIUM');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('ACTIVE', 'REPAID', 'DEFAULTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('ACTIVE', 'INACTIVE', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."supplier_type" AS ENUM('FARMER', 'COOPERATIVE', 'EXPORTER');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"country" text,
	"language" text DEFAULT 'en' NOT NULL,
	"avatar_url" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'BUYER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" serial NOT NULL,
	"type" text NOT NULL,
	"issuer" text NOT NULL,
	"expiry_date" timestamp with time zone,
	"document_url" text,
	"verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"name" text NOT NULL,
	"type" "company_type" DEFAULT 'EXPORTER' NOT NULL,
	"country" text NOT NULL,
	"region" text,
	"description" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"website" text,
	"verified" boolean DEFAULT false NOT NULL,
	"origin_story" text,
	"farmer_name" text,
	"trust_score" real DEFAULT 0 NOT NULL,
	"subscription_tier" text DEFAULT 'FREE' NOT NULL,
	"response_time_hours" real,
	"export_destinations" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "origin_stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"farmer_name" text NOT NULL,
	"farmer_photo" text,
	"farm_name" text NOT NULL,
	"region" text NOT NULL,
	"elevation" text,
	"farm_size_ha" real,
	"years_farming" integer,
	"story" text NOT NULL,
	"challenges" text NOT NULL,
	"impact" text NOT NULL,
	"images" text[] DEFAULT '{}' NOT NULL,
	"video_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" serial NOT NULL,
	"name" text NOT NULL,
	"category" "product_category" DEFAULT 'COFFEE' NOT NULL,
	"sub_category" text,
	"description" text NOT NULL,
	"origin" text NOT NULL,
	"altitude" text,
	"process" text,
	"variety" text,
	"min_order_kg" real DEFAULT 100 NOT NULL,
	"max_order_kg" real,
	"price_per_kg_usd" real NOT NULL,
	"available_kg" real DEFAULT 0 NOT NULL,
	"harvest_season" text,
	"images" text[] DEFAULT '{}' NOT NULL,
	"certifications" text[] DEFAULT '{}' NOT NULL,
	"cupping" real,
	"active" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"origin_story" text,
	"farmer_name" text,
	"farm_name" text,
	"farm_lat" real,
	"farm_lng" real,
	"harvest_date" timestamp with time zone,
	"smallholder" boolean DEFAULT false NOT NULL,
	"women_led" boolean DEFAULT false NOT NULL,
	"direct_trade" boolean DEFAULT false NOT NULL,
	"climate_resilient" boolean DEFAULT false NOT NULL,
	"organic" boolean DEFAULT false NOT NULL,
	"families_supported" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" serial NOT NULL,
	"product_id" serial NOT NULL,
	"quantity_kg" real NOT NULL,
	"price_per_kg" real NOT NULL,
	"total_usd" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_id" serial NOT NULL,
	"status" "order_status" DEFAULT 'INQUIRY' NOT NULL,
	"total_usd" real DEFAULT 0 NOT NULL,
	"incoterm" text DEFAULT 'FOB' NOT NULL,
	"destination_port" text,
	"shipping_method" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" serial NOT NULL,
	"buyer_email" text NOT NULL,
	"buyer_name" text NOT NULL,
	"company" text NOT NULL,
	"country" text NOT NULL,
	"message" text NOT NULL,
	"quantity_kg" real,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" serial NOT NULL,
	"product_id" serial NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" serial NOT NULL,
	"receiver_id" serial NOT NULL,
	"content" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfq_id" serial NOT NULL,
	"supplier_id" serial NOT NULL,
	"price_per_kg_usd" real NOT NULL,
	"lead_time_days" integer NOT NULL,
	"message" text NOT NULL,
	"awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_id" serial NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"product_category" text NOT NULL,
	"quantity_kg" real NOT NULL,
	"target_price_usd" real,
	"destination" text NOT NULL,
	"destination_port" text,
	"incoterm" text DEFAULT 'FOB' NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"status" "rfq_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" serial NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"amount_usd" real NOT NULL,
	"percentage" real NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"due_date" timestamp with time zone,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" serial NOT NULL,
	"status" "shipment_status" DEFAULT 'BOOKED' NOT NULL,
	"origin_port" text NOT NULL,
	"destination_port" text NOT NULL,
	"carrier" text,
	"tracking_number" text,
	"container_number" text,
	"eta" timestamp with time zone,
	"departed_at" timestamp with time zone,
	"arrived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"country" text NOT NULL,
	"product_type" text NOT NULL,
	"requirement" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"mandatory" integer DEFAULT 1 NOT NULL,
	"category" text DEFAULT 'DOCUMENT' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" serial NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"inquiries" integer DEFAULT 0 NOT NULL,
	"saves" integer DEFAULT 0 NOT NULL,
	"rfq_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" serial NOT NULL,
	"tier" "subscription_tier" DEFAULT 'FREE' NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" serial NOT NULL,
	"product" text NOT NULL,
	"volume_kg" real NOT NULL,
	"destination" text NOT NULL,
	"year" integer NOT NULL,
	"value_usd" real
);
--> statement-breakpoint
CREATE TABLE "trust_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" serial NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"orders_completed" real DEFAULT 0 NOT NULL,
	"certifications_count" real DEFAULT 0 NOT NULL,
	"response_time" real DEFAULT 0 NOT NULL,
	"profile_completeness" real DEFAULT 0 NOT NULL,
	"trade_volume" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_id" integer NOT NULL,
	"order_id" integer,
	"principal_usd" real NOT NULL,
	"fee_usd" real NOT NULL,
	"total_repayment_usd" real NOT NULL,
	"apr_percent" real DEFAULT 12 NOT NULL,
	"term_days" integer DEFAULT 30 NOT NULL,
	"status" "loan_status" DEFAULT 'ACTIVE' NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"credit_score_at_issuance" integer DEFAULT 500 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repayments" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" serial NOT NULL,
	"amount_usd" real NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_outputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ai_model" text,
	"call_type" text,
	"export_readiness_score" smallint,
	"pathway" text,
	"capital_capacity_cop" integer,
	"compliance_gaps" text,
	"gap_analysis" text,
	"document_content" text,
	"whatsapp_message_sent" text
);
--> statement-breakpoint
CREATE TABLE "compliance_docs" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"rut_dian" boolean DEFAULT false NOT NULL,
	"ica_registro" boolean DEFAULT false NOT NULL,
	"fitosanitario_cert" boolean DEFAULT false NOT NULL,
	"dian_exportador" boolean DEFAULT false NOT NULL,
	"compliance_score" smallint,
	"last_reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "economics" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"tipo_comprador" text,
	"volumen_kg_ultima_cosecha" integer,
	"precio_venta_banda" text,
	"tiempo_pago_dias" integer,
	"deuda_actual" text,
	"uso_capital" text[],
	"comodidad_pagos" text,
	"personas_dependientes" integer,
	"otras_fuentes_ingreso" text,
	"situacion_economica" text,
	"interes_canal_premium" boolean,
	"conoce_precio_exportacion" boolean,
	"ha_intentado_exportar" boolean
);
--> statement-breakpoint
CREATE TABLE "farms" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"cultivo_principal" text,
	"variedad_cafe" text,
	"hectareas_produccion" numeric(6, 2),
	"edad_plantas_anos" integer,
	"cosechas_por_ano" integer,
	"metodo_secado" text,
	"acceso_agua" text,
	"anos_en_finca" integer,
	"tenencia_tierra" text,
	"asistencia_tecnica" text
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"interaction_type" text,
	"actor" text,
	"notes" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre_completo" text NOT NULL,
	"whatsapp_number" text NOT NULL,
	"municipio" text NOT NULL,
	"vereda" text,
	"supplier_type" "supplier_type" DEFAULT 'FARMER' NOT NULL,
	"registered_by" text,
	"status" "supplier_status" DEFAULT 'ACTIVE' NOT NULL,
	"consent_given" boolean DEFAULT false NOT NULL,
	"consent_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_whatsapp_number_unique" UNIQUE("whatsapp_number")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "origin_stories" ADD CONSTRAINT "origin_stories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_responses" ADD CONSTRAINT "rfq_responses_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_responses" ADD CONSTRAINT "rfq_responses_supplier_id_companies_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_analytics" ADD CONSTRAINT "product_analytics_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_history" ADD CONSTRAINT "trade_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_scores" ADD CONSTRAINT "trust_scores_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_outputs" ADD CONSTRAINT "ai_outputs_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_docs" ADD CONSTRAINT "compliance_docs_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economics" ADD CONSTRAINT "economics_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_outputs_supplier_idx" ON "ai_outputs" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "interactions_supplier_idx" ON "interactions" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "suppliers_whatsapp_idx" ON "suppliers" USING btree ("whatsapp_number");