CREATE TABLE "marketing_campaigns" (
  "id"               serial PRIMARY KEY,
  "admin_id"         integer NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "subject"          text NOT NULL,
  "html"             text NOT NULL,
  "text_body"        text,
  "topic"            varchar(80),
  "country"          varchar(80),
  "state_filter"     varchar(40),
  "status"           varchar(20) NOT NULL DEFAULT 'pending',
  "total_recipients" integer NOT NULL DEFAULT 0,
  "sent"             integer NOT NULL DEFAULT 0,
  "failed"           integer NOT NULL DEFAULT 0,
  "started_at"       timestamptz,
  "completed_at"     timestamptz,
  "created_at"       timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "idx_marketing_campaigns_admin_id" ON "marketing_campaigns" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_marketing_campaigns_status" ON "marketing_campaigns" USING btree ("status");--> statement-breakpoint

CREATE TABLE "campaign_logs" (
  "id"          serial PRIMARY KEY,
  "campaign_id" integer NOT NULL REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE,
  "profile_id"  integer,
  "email"       text NOT NULL,
  "status"      varchar(10) NOT NULL,
  "error"       text,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "idx_campaign_logs_campaign_id" ON "campaign_logs" USING btree ("campaign_id");
