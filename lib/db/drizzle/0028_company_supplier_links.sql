-- FIN-001: company_supplier_links join table
-- Bridges the two supplier identity graphs:
--   Graph A (graduation): suppliers — WhatsApp-onboarded farmers
--   Graph B (marketplace): companies — web-registered B2B accounts
-- Supports cooperatives natively: one company → many farmer suppliers.
-- Rollback: DROP TABLE company_supplier_links; DROP TYPE company_supplier_link_type;

CREATE TYPE "company_supplier_link_type" AS ENUM ('MEMBER', 'OWNER', 'CONTRACTED');

CREATE TABLE "company_supplier_links" (
  "id"                  serial PRIMARY KEY,
  "company_id"          integer NOT NULL REFERENCES "companies"("id"),
  "supplier_id"         integer NOT NULL REFERENCES "suppliers"("id"),
  "link_type"           "company_supplier_link_type" NOT NULL DEFAULT 'MEMBER',
  "is_primary"          boolean NOT NULL DEFAULT true,
  "linked_by_admin_id"  integer REFERENCES "users"("id"),
  "linked_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "notes"               text
);

CREATE UNIQUE INDEX "csl_company_supplier_type_uidx"
  ON "company_supplier_links" ("company_id", "supplier_id", "link_type");

CREATE INDEX "csl_company_idx"
  ON "company_supplier_links" ("company_id");

CREATE INDEX "csl_supplier_idx"
  ON "company_supplier_links" ("supplier_id");
