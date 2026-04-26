CREATE INDEX "companies_user_id_idx" ON "companies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "suppliers_sellable_status_idx" ON "suppliers" ("sellable_status")
  WHERE sellable_status IN ('SELLABLE', 'PUBLISHED');--> statement-breakpoint
CREATE INDEX "products_company_id_idx" ON "products" USING btree ("company_id");
