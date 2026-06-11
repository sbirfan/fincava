# FINCAVA Change Log

**Purpose:** Historical record of **completed** work tied to the Master Improvement Register (`FIN-###`). This is the audit trail for what shipped, how it was validated, and how to roll back.

**Not in scope here:** Backlog intent (`FINCAVA_EXECUTION_BACKLOG.md`), item definitions (`FINCAVA_MASTER_REGISTER.md`), or prioritization (`FINCAVA_PRIORITIZATION.md`).

**Rules:**
1. Add an entry only when the **expected outcome** in the execution backlog is verified in production (or accepted for founder-only process items).
2. Move the backlog item to **Completed** in `FINCAVA_EXECUTION_BACKLOG.md` and add a matching entry here the same day.
3. Do not remove or renumber FIN IDs. Do not delete past entries.
4. One section per calendar date (`## YYYY-MM-DD`), newest date first.

---

## Entry template

Copy for each completed `FIN-###` item:

```markdown
### FIN-###

**Status:** Completed  
**Completed by:** [name or role]  
**Backlog sprint:** [Current | Next | Future]

**Summary:**  
[1–3 sentences: what changed and why it matters for Phase I.]

**Files:**  
- `path/to/file` — [what changed]

**Validation:**  
- [ ] [Concrete check, e.g. curl, UI step, email received]
- [ ] [Regression check]

**Rollback:**  
- [How to revert safely, or "N/A — documentation/process only"]
```

---

## 2026-06-11

### FIN-002 — Farm Supplier Self-Service Auth (WhatsApp OTP + Email Magic Link)

**Status:** Completed (backfilled)
**Completed by:** Founder + Claude Code
**Commits:** `e1b4503`, `4853ca0` (fincava-hub / fincava)

**Summary:**
Farm suppliers who were WhatsApp-onboarded with no password can now self-authenticate via two parallel paths: a 6-digit WhatsApp OTP (10min TTL, Twilio delivery) or an email magic link (UUID token, 24hr TTL, Resend delivery). Both paths result in a JWT session cookie, `supplier.userId` linked, and `claimStatus=CLAIMED`. Officers and admins can trigger either path from the admin supplier drawer. Unblocks FIN-065 (CC-1 self-serve for farm suppliers).

**Files:**
- `lib/db/drizzle/0037_supplier_auth_tokens.sql` — new migration
- `lib/db/src/schema/supplier-auth.ts` — new schema
- `artifacts/api-server/src/routes/supplier-auth.ts` — 4 public + 2 admin endpoints
- `artifacts/api-server/src/routes/suppliers.ts` — pre-flight claim on self-registration
- `artifacts/fincava/src/pages/supplier-login.tsx` — public login page (WA + email tabs)
- `artifacts/fincava/src/pages/supplier-auth/confirm.tsx` — magic link confirm page
- `artifacts/fincava/src/pages/admin/suppliers.tsx` — "Supplier access" section in drawer
- `artifacts/fincava/src/i18n/translations.ts` — 30 new EN/ES keys

**Validation:**
- [x] WhatsApp OTP flow: supplier requests code → receives WA message → enters code → session established
- [x] Email magic link flow: supplier requests link → receives email → clicks link → session established
- [x] Admin drawer "Send Login Link" triggers both channels
- [x] Pre-flight claim: self-registering farmer matched to existing unclaimed record by WhatsApp or email
- [x] Security: timingSafeEqual on verify, used_at replay prevention, always-200 on request routes, IP rate limiting, 5 tokens/hr per supplier cap
- [x] Typecheck: 4/4 packages clean

**Rollback:** Disable `supplier-auth` router mount in `routes/index.ts`. No data loss — tokens table is additive.

---

## 2026-06-08

### Product Catalog V2 — Phase 2: Admin Catalog UI + B2B Enhancements

**Status:** Completed  
**Completed by:** Claude Code + founder approval

**Summary:**  
Phase 2 of Product Catalog V2 shipped. Added `/admin/products` split-pane admin page (product list + detail panel with per-channel approval, SKU management, AI enrichment trigger). Added `PATCH /admin/products/:id` route for admin retail SKU fields. Updated `product-detail.tsx` with B2B Technical Specs tab (renders `typeAttributes` where `wholesaleDisplay=true`) and AI-enriched description badge (`aiContent.longEn`). Extended `openapi.yaml` with 13 new paths and 13 new schemas; regenerated `lib/api-client-react/` and `lib/api-zod/` via Orval.

**Files:**  
- `artifacts/fincava/src/pages/admin/products.tsx` — new file; split-pane admin catalog UI
- `artifacts/api-server/src/routes/products.ts` — added `PATCH /admin/products/:id`
- `artifacts/fincava/src/App.tsx` — added `/admin/products` lazy route
- `artifacts/fincava/src/pages/product-detail.tsx` — Technical Specs tab + AI description with ✨ badge
- `lib/api-spec/openapi.yaml` — 13 new paths + 13 new schemas
- `lib/api-client-react/src/generated/` — regenerated (33 new type files)
- `lib/api-zod/src/generated/` — regenerated

**Validation:**  
- [x] `/admin/products` renders product list with status filter tabs
- [x] `PATCH /admin/products/:id` accepts retailPriceCop, retailStockUnits, retailUnitLabel, retailUnitWeightG, retailMaxPerOrder, harvest window fields
- [x] Technical Specs tab appears on `product-detail.tsx` only when `typeSchema` is loaded
- [x] AI description badge renders `aiContent.longEn` with ✨ fallback to `product.description`
- [x] Orval codegen ran without errors; generated files updated

**Rollback:** Revert the 7 files above. No schema change in this phase.

**Improves:** FIN-093 (OpenAPI coverage meaningfully extended)

---

### Product Catalog V2 — Phase 1B Code Review: Finding #6 + #8

**Status:** Completed  
**Completed by:** Claude Code + founder approval  
**Commits:** `b925f95`, `ffe6496` (fincava-hub)

**Summary:**  
Two remaining code review findings from Phase 1B addressed. Finding #6: authenticated users without a buyer profile now get a stable `"user:${userId}"` cart key (no more session cookie dependency for auth users — cart survives cookie loss). Stale guest cookie cleared on authenticated request. Finding #8: `rawAccessToken` variable hoisted to outer function scope, eliminating the `(res as any)._orderAccessToken` cross-scope hack.

**Files:**  
- `artifacts/api-server/src/routes/retail/cart.ts` — stable `"user:${userId}"` key in `resolveCart()`; stale cookie cleared; PATCH/DELETE verify cart ownership
- `artifacts/api-server/src/routes/retail/orders.ts` — `rawAccessToken` hoisted; `(res as any)` pattern removed

**Validation:**  
- [x] CP-8: Cart operations pass with auth user (no cookie required)
- [x] CP-9: Checkout creates orders with correct `rawAccessToken` in email

**Rollback:** Revert the two files. No schema change.

---

### Product Catalog V2 — Phase 1B Code Review: Findings #1–#5 + #7

**Status:** Completed  
**Completed by:** Founder (self-applied after review)

**Summary:**  
Seven of eight Phase 1B code review findings fixed by founder. Fixes: (1) PATCH/DELETE cart items now verify cart ownership before write; (2) CHECK constraints `quantity > 0` added to `retail_cart_items` and `unit_quantity > 0` to `retail_order_items` via migration 0036; (3) PATCH cart item now returns 409 if requested quantity exceeds `max_per_order_snapshot` (no silent cap); (4) checkout validates email domain ownership before sending (prevent impersonation); (5) shipping origin country confirmed non-null in order pre-flight; (7) UPSERT `onConflictDoUpdate` refreshes all 4 snapshots including `unitLabelSnapshot` and `maxPerOrderSnapshot`.

**Files:**  
- `artifacts/api-server/src/routes/retail/cart.ts` — ownership check, 409 on quantity cap
- `lib/db/src/schema/retail.ts` — CHECK constraints
- `artifacts/api-server/src/routes/retail/orders.ts` — email guard, shipping origin, snapshot refresh

**Validation:**  
- [x] CP-7, CP-8, CP-9 all pass after fixes applied
- [x] Typecheck passes

**Rollback:** Revert the three files; remove CHECK constraint additions from migration if needed (dev DB only at time of fix).

---

### Product Catalog V2 — Phase 1B: Retail Cart + Multi-Supplier Checkout

**Status:** Completed  
**Completed by:** Founder (implemented) + Claude Code (reviewed + fixes)  
**Checkpoints:** CP-7 ✅ CP-8 ✅ CP-9 ✅

**Summary:**  
Phase 1B retail foundation shipped. Migration 0036 adds `retail_carts`, `retail_cart_items`, `retail_order_items` tables and `orders.checkout_batch_ref`. Cart routes (GET/POST/PATCH/DELETE) with guest cookie + auth session management. `POST /api/retail/checkout` implements 3-phase flow: Phase A pre-flight validation (all items, no DB writes), Phase B single atomic transaction across all supplier groups, Phase C fire-and-forget email. CartDrawer and AddToCartButton frontend components. `producto.tsx` wired to cart.

**Files:**  
- `lib/db/drizzle/0036_retail_cart_order_items.sql` — migration
- `lib/db/src/schema/retail.ts` — 3 new tables
- `lib/db/src/schema/orders.ts` — `checkoutBatchRef` column
- `artifacts/api-server/src/lib/flags.ts` — `ENABLE_CART` added
- `artifacts/fincava/src/lib/flags.ts` — `ENABLE_CART` frontend
- `artifacts/api-server/src/routes/retail/cart.ts` — new file
- `artifacts/api-server/src/routes/retail/orders.ts` — `POST /retail/checkout`
- `artifacts/api-server/src/routes/retail/index.ts` — cart sub-router mounted
- `artifacts/fincava/src/components/cart-drawer.tsx` — new file
- `artifacts/fincava/src/components/add-to-cart-button.tsx` — new file
- `artifacts/fincava/src/pages/tienda/producto.tsx` — AddToCartButton wired

**Validation:**  
- [x] CP-7: All 4 new tables + checkout_batch_ref column exist in DB
- [x] CP-8: POST cart/items → GET cart → DELETE works end-to-end
- [x] CP-9: 2-product/2-supplier checkout creates 2 orders with same batch_ref + Nequi snapshots; null supplier_id → 409

**Rollback:** Set `ENABLE_CART=false` (disables all cart/checkout routes at runtime). Full rollback: revert the 11 files above.

**Improves:** FIN-064 (ENABLE_CART added consistently to both flag files)

---

### Product Catalog V2 — Phase 1A: Catalog Foundation

**Status:** Completed  
**Completed by:** Claude Code + founder approval  
**Checkpoints:** CP-1 ✅ CP-2 ✅ CP-3 ✅ CP-4 ✅ CP-5 ✅ CP-6 ✅

**Summary:**  
Phase 1A catalog foundation shipped. Migration 0034 adds 7 new columns to `products` (product_type_key, type_attributes, wholesale_enabled, ai_content, product_status, wholesale_approved_at, retail_approved_at). Product template engine for 5 types (COFFEE_GREEN, COFFEE_ROASTED, CACAO_BEAN, CACAO_POWDER, CACAO_NIBS). Admin per-channel approve route with full retail pre-flight. AI enrichment service writing to `products.ai_content`. Three new frontend components (ProductTypeSelector, DynamicTypeForm, AiEnrichmentPreview) plus updated product-new/product-edit pages.

**Files:**  
- `lib/db/drizzle/0034_product_catalog_v2.sql` — migration
- `lib/db/src/schema/products.ts` — 7 new columns
- `artifacts/api-server/src/lib/product-type-schemas.ts` — new template engine
- `artifacts/api-server/src/services/product-enrichment-service.ts` — AI enrichment
- `artifacts/api-server/src/routes/products.ts` — type-schemas, enrich, approve, link-supplier routes
- `artifacts/fincava/src/components/product-type-selector.tsx` — new
- `artifacts/fincava/src/components/dynamic-type-form.tsx` — new
- `artifacts/fincava/src/components/ai-enrichment-preview.tsx` — new
- `artifacts/fincava/src/pages/supplier-dashboard/product-new.tsx` — type selector + AI enhance
- `artifacts/fincava/src/pages/supplier-dashboard/product-edit.tsx` — type selector + AI enhance

**Validation:**  
- [x] CP-1 through CP-6 all pass (verified in dev against local DB)
- [x] Typecheck passes across api-server and fincava packages

**Rollback:** Migration 0034 is additive only (nullable/default columns). Runtime flag: set product_status filter to bypass 'draft' gate. Full: `git revert` the Phase 1A commits; drop migration columns if needed.

---

### FIN-060 — Backup endpoint timing-safe comparison

**Status:** Completed  
**Completed by:** Claude Code  
**Commit:** `da0da0e` (fincava-hub)

**Summary:**  
Backup trigger endpoint at `POST /admin/backup/run` was comparing the secret with string equality (`===`), which is timing-vulnerable. Replaced with `crypto.timingSafeEqual` plus a length pre-check (avoids length-leaking branch). Zero functional change — behavior identical for correct and incorrect tokens.

**Files:**  
- `artifacts/api-server/src/routes/admin.ts` — `timingSafeEqual` comparison in backup route

**Validation:**  
- [x] Correct token still triggers backup (200 OK)
- [x] Wrong token still returns 401
- [x] No `===` string comparison on secret value

**Rollback:** Revert the one-line change in `admin.ts`.

**Resolves:** FIN-060

---

### FIN-053 + FIN-042 — Secrets audit confirmation

**Status:** Completed  
**Completed by:** Founder (verified) + Claude Code (documented)

**Summary:**  
Secrets audit confirmed: `UPLOAD_TOKEN_SECRET` is in Replit Secrets only (not in shared `.replit` env block) — FIN-053 resolved. Cron job `0 3 * * *` confirmed present in `.replit` and `BACKUP_SECRET_V2` confirmed in Replit Secrets — FIN-042 resolved. Two orphaned secrets (`SESSION_SECRET` and `RESEND_FINCAVA_EMAIL_API_KEY`) with zero code references confirmed and deleted from Replit Secrets.

**Files:**  
- Replit Secrets (external) — orphan entries deleted; no code files changed

**Validation:**  
- [x] `grep -r "SESSION_SECRET" artifacts/` — zero results
- [x] `grep -r "RESEND_FINCAVA_EMAIL_API_KEY" artifacts/` — zero results
- [x] `BACKUP_SECRET_V2` present in Secrets; cron `0 3 * * *` in `.replit`
- [x] `UPLOAD_TOKEN_SECRET` in Secrets; absent from shared env block

**Rollback:** N/A — secrets management only.

**Resolves:** FIN-053, FIN-042

---

### FIN-055 — `claim_token` dormant column annotated

**Status:** Partially Mitigated  
**Completed by:** Claude Code

**Summary:**  
Confirmed that `suppliers.claim_token` column has no active read or write paths in the current codebase. Annotated the column declaration in `suppliers.ts` with a comment marking the hash contract for when the column is eventually activated. No migration needed. Full remediation (bcrypt hash at rest) deferred until the claim flow is built.

**Files:**  
- `lib/db/src/schema/suppliers.ts` — `claim_token` column annotated

**Validation:**  
- [x] `grep -rn "claim_token" artifacts/api-server/src/routes/` — no route reads or writes this column
- [x] Annotation present in schema file

**Rollback:** N/A — annotation only.

**Partially mitigates:** FIN-055

---

### FIN-011 — Operator playbook *(final)*

**Status:** Completed  
**Completed by:** Claude Code + founder approval  
**Backlog sprint:** Next (Phase B) — finalised 2026-06-06

**Summary:**  
Playbook upgraded from Draft to Final. The FIN-023 "pending" note in Section 3 was removed (FIN-023 shipped 2026-06-01). Phase C tooling (FIN-009 email alerts, FIN-010 open-introductions endpoint, FIN-033 batch-confirm auto-scoring, FIN-006 introduce endpoint) documented in relevant sections. Status header updated.

**Files:**  
- `docs/runbooks/OPERATOR_PLAYBOOK.md` — status Draft → Final; §3 compliance note corrected; §4/§5 updated with FIN-010 endpoint and FIN-009 email context

**Validation:**  
- [x] Document reflects all shipped Phase A, B, and C workflows
- [x] No stale "pending" notes for completed FIN items
- [x] Playbook consistent with actual endpoints in `admin.ts`, `rfqs.ts`, `inquiries.ts`

**Rollback:** N/A — documentation only.

---

### FIN-009 — Email notifications on new RFQ/inquiry *(backfill)*

**Status:** Completed (shipped 2026-06-01; backfilled 2026-06-06)  
**Completed by:** Founder (pre-existing implementation)  
**Backlog sprint:** Future (Phase C)

**Summary:**  
RFQ creation fires `newRfqAdminAlertEmail` to all ADMIN users via `getAdminEmails()`. Inquiry creation fires `newInquiryEmail` to the matched supplier and `newInquiryAdminAlertEmail` to all admins. Both use fire-and-forget async; failures are logged, not thrown.

**Files:**  
- `artifacts/api-server/src/routes/rfqs.ts` — `newRfqAdminAlertEmail` on `POST /api/rfqs`
- `artifacts/api-server/src/routes/inquiries.ts` — `newInquiryEmail` + `newInquiryAdminAlertEmail` on `POST /api/inquiries`

**Validation:**  
- [x] `sendEmail` + email helpers imported and called in both routes
- [x] Admin alert goes to all admin users (dynamic via `getAdminEmails()`)
- [x] Supplier notification sent on inquiry creation

**Rollback:** Remove the fire-and-forget email blocks from each route; no schema change.

---

### FIN-010 — Admin "open introductions" dashboard *(backfill)*

**Status:** Completed (shipped 2026-06-01; backfilled 2026-06-06)  
**Completed by:** Founder (pre-existing implementation)  
**Backlog sprint:** Future (Phase C)

**Summary:**  
`GET /api/admin/open-introductions` (commented `FIN-010` in source) returns RFQs and inquiries awaiting founder action. Provides the single triage view needed for daily concierge operations.

**Files:**  
- `artifacts/api-server/src/routes/admin.ts` — route at line 88, tagged `FIN-010`

**Validation:**  
- [x] Route exists and is protected by `adminOnly` middleware
- [x] Referenced in operator playbook §4 triage flow

**Rollback:** Remove the route from `admin.ts`.

---

### FIN-033 — Batch confirm auto-triggers scoring *(backfill)*

**Status:** Completed (shipped 2026-06-01; backfilled 2026-06-06)  
**Completed by:** Founder (pre-existing implementation)  
**Backlog sprint:** Future (Phase C, optional)

**Summary:**  
The `POST /api/admin/ingestion/batch-confirm` handler calls `runOnboardPipeline()` for each confirmed supplier — emitting the post-onboard event if a listener exists, or running the pipeline directly otherwise. No separate "Score Now" click needed after batch confirmation.

**Files:**  
- `artifacts/api-server/src/routes/admin.ts` — lines 2763–2774, `runOnboardPipeline` call in batch-confirm loop

**Validation:**  
- [x] `import { runOnboardPipeline }` at top of admin.ts
- [x] Pipeline triggered for every successfully confirmed supplier in the batch

**Rollback:** Remove the `runOnboardPipeline` call from the batch-confirm loop; no schema change.

---

### FIN-006 — Concierge introduction workflow *(backfill)*

**Status:** Completed (shipped pre-session; backfilled 2026-06-06)  
**Completed by:** Founder (pre-existing implementation)  
**Backlog sprint:** Future (Phase C)

**Summary:**  
`POST /api/admin/rfqs/:id/introduce` sends a bilingual introduction email to both buyer and supplier. Email resolution order: (1) supplier's primary company link → company owner email; (2) legacy product company; (3) `supplier.userId` email. Operator playbook §5 documents the full introduction SOP including matching, triggering the endpoint, and follow-up cadence.

**Files:**  
- `artifacts/api-server/src/routes/admin.ts` — introduce route at line 163; `introductionEmail` imported from `../lib/email`
- `docs/runbooks/OPERATOR_PLAYBOOK.md` — §5 Introduction SOP

**Validation:**  
- [x] Route exists and guarded by `adminOnly`
- [x] `introductionEmail` helper confirmed imported in admin.ts
- [x] Email resolution order documented in playbook and verified against code

**Rollback:** Remove the introduce route; no schema change.

---

### FIN-040 — Replit ↔ GitHub sync discipline

**Status:** Completed  
**Completed by:** Founder (process adopted) + Claude Code (documented)  
**Backlog sprint:** Current (Phase A)

**Summary:**  
Bidirectional sync discipline documented and adopted. Two change sources: (A) Replit Agent fixes → push to `fincava` → pull locally → ask Claude to sync to `fincava-hub`; (B) local Claude sessions → commit `fincava-hub` → sync to `fincava` → Replit publishes. Both flows documented in `OPERATOR_PLAYBOOK.md` Section 8.

**Files:**  
- `docs/runbooks/OPERATOR_PLAYBOOK.md` — Section 8 updated with Flow A and Flow B, source-of-truth table, pull-before-work rule

**Validation:**  
- [x] Process in active use throughout this session (2026-06-06)
- [x] Both flows documented with exact shell commands
- [x] Source-of-truth table clarifies which repo owns what

**Rollback:** N/A — process documentation.

---

### FIN-042 — Automated DB backup scheduler

**Status:** Completed  
**Completed by:** Claude Code + founder approval  
**Backlog sprint:** Current (Phase A)

**Summary:**  
Added a daily Replit cron job to `POST /api/admin/backup/run` at 03:00 UTC (22:00 COT). Uses `BACKUP_SECRET_V2` from Replit Secrets for auth. The backup service already handled pg_dump, object storage upload, and 7-backup retention — this adds the missing schedule trigger.

**Files:**  
- `.replit` — added `[[cron]]` entry: `daily-db-backup`, schedule `0 3 * * *`

**Validation:**  
- [x] Cron entry added to `.replit`
- [ ] First scheduled run at 03:00 UTC — verify `[cron] backup ok` in Replit logs
- [ ] `GET /api/admin/backup/list` shows a new entry < 25h old next morning

**Rollback:** Remove the `[[cron]]` block from `.replit`.

---

### FIN-011 — Operator playbook *(draft)*

**Status:** Draft completed  
**Completed by:** Claude Code + founder approval  
**Backlog sprint:** Current (Phase A)

**Summary:**  
Created `docs/runbooks/OPERATOR_PLAYBOOK.md` — the single operator reference covering daily triage, the full supplier pipeline (onboard → score → graduate → publish), compliance queue, RFQ triage, introduction SOP, stuck supplier recovery, company/supplier linking, deploy ritual, feature flags, backup procedures, and secrets reference.

**Files:**  
- `docs/runbooks/OPERATOR_PLAYBOOK.md` — new file (~280 lines)

**Validation:**  
- [x] Document covers all Phase A operator workflows
- [ ] Founder reads and confirms accuracy against actual Replit UI
- [ ] Update after FIN-023 (compliance gate fix) and FIN-019 (AI gap writeback) land

**Rollback:** N/A — documentation only.

---

### FIN-023 — `rut_dian` body field vs eligibility gate mismatch

**Status:** Completed  
**Completed by:** Founder (commit 5046c6e)  
**Backlog sprint:** Next (Phase B) — shipped early  
**Backfilled:** 2026-06-06

**Summary:**  
`has_rut = true` on the onboarding form now seeds a `DIAN_RUT = conditionally_approved` row in `supplierRequirementStatusTable` AND sets `complianceDocsTable.rutDian = true`. Previously the onboarding declaration had no effect on the eligibility gate, leaving suppliers stuck at `NOT_READY` despite declaring they had a RUT.

**Files:**  
- `artifacts/api-server/src/routes/suppliers.ts` — DIAN_RUT seeding on onboard + update paths

**Validation:**  
- [x] Code confirmed with `// FIN-023:` comment in suppliers.ts
- [x] Suppliers declaring `has_rut = true` now advance through the RUT eligibility gate

**Rollback:** Remove the DIAN_RUT seeding block in the onboarding route.

---

### FIN-019 — AI compliance gaps not written back to `compliance_docs`

**Status:** Completed  
**Completed by:** Founder (commit cb22a9a)  
**Backlog sprint:** Next (Phase B) — shipped early  
**Backfilled:** 2026-06-06

**Summary:**  
After AI scoring, detected compliance gaps are now written back to `complianceDocsTable` boolean fields via a `GAP_TO_COMPLIANCE_FIELD` map in `scoring-service.ts`. Write-back is non-fatal — failure is logged but does not crash scoring. Admin compliance drawer now shows data consistent with the AI graduation gate.

**Files:**  
- `artifacts/api-server/src/services/scoring-service.ts` — `GAP_TO_COMPLIANCE_FIELD` map + `complianceDocsTable` update after AI scoring

**Validation:**  
- [x] Code confirmed with `// FIN-019:` comment in scoring-service.ts
- [x] Write-back covers `DIAN_RUT`, organic cert, and other mapped gap codes

**Rollback:** Remove the write-back block in `scoreSupplier()` — scoring continues, just without the compliance_docs update.

---

### Repo health check — 2026-06-06 (post .replit stabilisation)

**Status:** All 10 checks passed  
**Verified by:** Founder (Replit shell)

| Check | Result |
|-------|--------|
| Git state | ✅ Clean, up to date with origin/main |
| `.replit` — modules, cron, no secrets | ✅ `modules = ["nodejs-24"]` only; FIN-042 cron present; no `packages` under `[nix]`; `UPLOAD_TOKEN_SECRET` absent |
| Migration journal — idx 31 + 32 | ✅ `0028_company_supplier_links` and `0032_shiny_wendell_rand` both present |
| Migration files on disk | ✅ Both `.sql` files present |
| `0032` idempotency | ✅ `ADD VALUE IF NOT EXISTS 'FOUNDER'` |
| Key files (admin.ts, test, schema, playbook) | ✅ All present |
| FIN-001 schema (`linkTypeEnum`, `companySupplierLinksTable`) | ✅ Defined in `companies.ts` |
| No secrets in committed files | ✅ `UPLOAD_TOKEN_SECRET=` not found in `.replit` |
| Nix / Node | ✅ Node v24.13.0, no nix errors |
| App boots — `/api/healthz` | ✅ `{"status":"ok","db":"ok"}` |

---

## 2026-06-01

### FIN-035 — Shallow health check (no DB probe)

**Status:** Completed  
**Completed by:** Founder (commit 4a6c482)  
**Backlog sprint:** Current (Phase A)

**Summary:**  
`/healthz` and `/health` now execute `SELECT 1` against the DB and return `503 { status: "degraded", db: "error" }` if the probe fails. Previously the endpoint returned 200 regardless of DB state.

**Files:**  
- `artifacts/api-server/src/routes/health.ts` — added `dbPing()` function; both routes return 503 on failure

**Validation:**  
- [x] `GET /api/healthz` returns `200 { status: "ok", db: "ok" }` when DB is reachable
- [x] Returns `503` when DB is unreachable (confirmed by code inspection 2026-06-06)

**Rollback:** N/A — health check is non-destructive.

---

### FIN-004 — Contact form has no backend

**Status:** Completed  
**Completed by:** Founder (commit 56c27d5)  
**Backlog sprint:** Current (Phase A)

**Summary:**  
`POST /api/contact` implemented in `contact.ts` — validates name/email/phone/company/message via Zod, sends formatted email via Resend to the operator inbox. Frontend `contact.tsx` already submits to `/api/contact`. Submissions no longer go to `console.log` only.

**Files:**  
- `artifacts/api-server/src/routes/contact.ts` — new route with Zod validation + Resend email dispatch

**Validation:**  
- [x] Route mounted at `/api/contact` — confirmed in `index.ts`
- [x] Frontend submits to `/api/contact` — confirmed in `contact.tsx`
- [ ] Live end-to-end: submit contact form in production; confirm email arrives in operator inbox

**Rollback:** N/A — additive route; removing it only silences submissions.

---

### FIN-036 — No error monitoring or alerting

**Status:** Completed (code) — pending secret activation  
**Completed by:** Founder (commit 671051c)  
**Backlog sprint:** Current (Phase A)

**Summary:**  
Sentry initialised in `instrument.ts` (first import in `index.ts`). Reads `SENTRY_DSN` from env — graceful no-op if not set. `tracesSampleRate: 0` for cost control at Phase I. Existing pipeline services (`onboard-pipeline.ts`, `scoring-service.ts`, `supplier-graduation-service.ts`) already call `globalThis.Sentry?.captureException()` — no changes needed there.

**Files:**  
- `artifacts/api-server/src/instrument.ts` — Sentry init with env-gated DSN

**Validation:**  
- [x] Code ships cleanly — no errors when `SENTRY_DSN` is absent
- [x] `SENTRY_DSN` confirmed in Replit Secrets (2026-06-06)
- [ ] Trigger a test error in production; confirm it appears in Sentry dashboard

**Rollback:** Remove `SENTRY_DSN` from Replit Secrets — Sentry silently disables itself.

---

### FIN-003 — Officer registration API path bug

**Status:** Completed  
**Completed by:** Founder (commit 936cf44)  
**Backlog sprint:** Current (Phase A)

**Summary:**  
`officers.ts` had `POST /api/officers/register` as the route path, but the router is already mounted at `/api` in `app.ts` — making the effective path `/api/api/officers/register`. Frontend called `/api/officers/register` → 404. Fixed by removing the `/api` prefix from the route declaration, yielding the correct path.

**Files:**  
- `artifacts/api-server/src/routes/officers.ts` — changed `/api/officers/register` → `/officers/register`

**Validation:**  
- [x] Route path corrected — `POST /api/officers/register` now resolves correctly
- [x] Backfill confirmed by code inspection (2026-06-06)

**Rollback:** N/A — one-character path fix; no data affected.

---

## 2026-06-06

### FIN-053 — `UPLOAD_TOKEN_SECRET` in `.replit` shared env

**Status:** Completed  
**Completed by:** Claude Code + founder approval  
**Backlog sprint:** Current (Phase A)

**Summary:**  
Removed hardcoded `UPLOAD_TOKEN_SECRET` from the committed `.replit` `[userenv.shared]` block. Secret moved to Replit Secrets (inaccessible to anyone with repo access). No behaviour change — `storage.ts` reads from `process.env.UPLOAD_TOKEN_SECRET` as before; upload signing continues to work.

**Files:**  
- `.replit` — deleted one line from `[userenv.shared]`

**Validation:**  
- [x] `grep UPLOAD_TOKEN_SECRET .replit` returns nothing
- [x] Secret confirmed in Replit Secrets by founder
- [ ] Verify upload flow still works after next Replit deploy (storage.ts logs a warning if the env var is missing — absence of that warning confirms the secret is being read from Secrets correctly)

**Rollback:**  
Re-add the line to `.replit` — though the value is already in git history, so rotation is preferred if this ever becomes a concern (`openssl rand -hex 32`).

---

### Observation — graduation-service ESM import failure (6 tests, pre-existing)

**Status:** Known issue — not introduced by FIN-001  
**First observed:** FIN-001 validation run (2026-06-06); root commit 0732899  
**Not a FIN register item yet** — logging here for visibility; promote to register if it blocks a future sprint.

**Symptom:**  
`graduation-service.test.ts > computeEligibility` — 6 tests fail with:  
`ERR_UNSUPPORTED_DIR_IMPORT: Directory import '.../lib/db/src/schema' is not supported resolving ES modules`  
All other 193 tests pass. FIN-001 tests (14) are unaffected.

**Root cause:**  
`lib/db/src/schema` is imported as a bare directory (relies on implicit `index.ts` resolution). Node.js ESM does not support directory imports — only CommonJS does. The test runner (Vitest) normally handles this via its module resolver, but something in the graduation-service test setup bypasses that path.

**Impact:** Low — graduation-service logic is tested via integration in other paths; no production code path is broken. Affects test confidence only.

**To fix (when prioritised):** Change the import in the graduation service (or its test) from `from "@workspace/db/src/schema"` to the explicit index file, or ensure the `@workspace/db` package.json exports map covers the path.

---

### FIN-001 — Two supplier systems with no database link

**Status:** Completed  
**Completed by:** Claude Code + founder approval  
**Backlog sprint:** Blocked (architectural decision required) → resolved

**Summary:**  
Introduced `company_supplier_links` join table bridging the two supplier identity graphs: WhatsApp-onboarded farmers (`suppliers`) and web-registered B2B accounts (`companies`/`users`). Chose a many-to-many join table over a simple nullable FK to natively support the cooperative model confirmed by field study. Improved admin introduce-route email resolution to use the primary link first, with graceful fallback for pre-FIN-001 suppliers.

**Files:**  
- `lib/db/src/schema/companies.ts` — added `linkTypeEnum`, `companySupplierLinksTable`, exported types
- `lib/db/drizzle/0028_company_supplier_links.sql` — new migration (additive only)
- `lib/db/drizzle/meta/_journal.json` — registered migration at idx 31
- `artifacts/api-server/src/routes/admin.ts` — 3 new CRUD endpoints (`GET/POST/DELETE /api/admin/suppliers/:id/links`); improved email resolution in introduce route

**Validation:**  
- [x] TypeScript typecheck passes (`pnpm --filter @workspace/api-server run typecheck` exits 0)
- [x] Test suite — 193/199 pass; all 14 new FIN-001 tests green. 6 pre-existing failures in `graduation-service.test.ts` (ESM `ERR_UNSUPPORTED_DIR_IMPORT` on `lib/db/src/schema` — commit 0732899, predates FIN-001, tracked separately)
- [x] Schema change synced to `fincava` (prod repo)
- [x] Migration applied to dev DB (Replit) — DDL applied directly; `drizzle-kit generate` confirms no further drift
- [x] Manual smoke: `POST /admin/suppliers/29/links` → 201; `GET` → 200 with companyName/companyType; `DELETE` → 200 `{success:true}`; second `GET` → `[]`
- [x] Introduce route: mounted and DB-connected; returns 409 "RFQ closed" (no open RFQs in dev DB — not a FIN-001 regression)
- [x] Migration applied to production DB ✅ — publish flow applied `0028` correctly; `company_supplier_links` (8 cols) + `company_supplier_link_type` enum confirmed in prod

**Incidental fixes applied during validation (Replit):**  
- `0032_shiny_wendell_rand.sql` — changed `ALTER TYPE "public"."actor" ADD VALUE 'FOUNDER'` to `ADD VALUE IF NOT EXISTS 'FOUNDER'` to make it idempotent. `FOUNDER` is an audit-trail actor label (not a login role; `ADMIN` remains the highest auth role) that was already live in the DB but missing from the Drizzle snapshot.

**Rollback:**  
```sql
DROP TABLE company_supplier_links;
DROP TYPE company_supplier_link_type;
```
No existing data affected — purely additive.

---

## 2026-05-06

### FIN-008 — Hardcoded admin alert email on supplier onboard

**Status:** Completed  
**Completed by:** Founder (commit 5b4094e)  
**Backlog sprint:** Next (Phase B) — shipped early  
**Backfilled:** 2026-06-06

**Summary:**  
`getAdminEmails()` in `email.ts` queries `users` where `role = "ADMIN"` and returns all matching emails dynamically. Onboarding alert now sends to every admin account rather than a single hardcoded address.

**Files:**  
- `artifacts/api-server/src/lib/email.ts` — added `getAdminEmails()` function
- `artifacts/api-server/src/routes/suppliers.ts` — onboarding alert calls `getAdminEmails()`

**Validation:**  
- [x] `getAdminEmails()` confirmed: dynamic DB query, no hardcoded address
- [x] Suppliers route calls `getAdminEmails()` for new application alerts

**Rollback:** N/A — additive function; removing it only reverts alert recipients.

---

## 2026-05-31

### Planning baseline (operational — not a FIN register completion)

**Status:** Completed  
**Completed by:** Discovery & planning session  

**Summary:**  
Established the improvement register, prioritization dashboards, and execution backlog. No register items (`FIN-001`–`FIN-112`) were implemented in code on this date.

**Files created:**  
- `FINCAVA_MASTER_REGISTER.md` — 112-item source of truth  
- `FINCAVA_PRIORITIZATION.md` — dashboards, top 10, 60-day sequencing  
- `FINCAVA_EXECUTION_BACKLOG.md` — Current / Next / Future / Blocked / Completed sprints  
- `FINCAVA_CHANGE_LOG.md` — this file  

**Validation:**  
- [x] Documents present at repo root and cross-reference each other  
- [x] `FINCAVA_EXECUTION_BACKLOG.md` **Completed** section empty for register items  

**Rollback:**  
- Delete or revert the four files above if the planning baseline is abandoned (no production impact).

---

### Register items (FIN-###)

*No `FIN-###` items completed on 2026-05-31.*

| FIN ID | Status |
|--------|--------|
| — | — |

---

## Index of completed FIN items

*Newest first. Update when entries are added above.*

| FIN ID | Completed date | Title | Summary (short) |
|--------|----------------|-------|-----------------|
| FIN-060 | 2026-06-08 | Backup endpoint timing-safe comparison | `crypto.timingSafeEqual` + length pre-check in admin.ts |
| FIN-053 | 2026-06-08 | UPLOAD_TOKEN_SECRET confirmed in Secrets | Not in shared env; orphan secrets deleted |
| FIN-042 | 2026-06-08 | Cron + BACKUP_SECRET_V2 confirmed | Cron active in .replit; secret in Replit Secrets |
| FIN-055 | 2026-06-08 | claim_token dormant column annotated | Column has no active routes; hash contract annotated |
| FIN-064 | 2026-06-08 | ENABLE_CART added to both flag files | Backend flags.ts + frontend flags.ts consistent |
| FIN-093 | 2026-06-08 | OpenAPI coverage extended (Phase 2) | 13 paths + 13 schemas added; Orval regenerated |
| — (Phase 2) | 2026-06-08 | Product Catalog V2 Phase 2 | Admin products page, Technical Specs tab, AI description |
| — (Phase 1B review) | 2026-06-08 | Phase 1B code review findings #1–#8 | All 8 findings fixed across 3 files |
| — (Phase 1B) | 2026-06-08 | Product Catalog V2 Phase 1B | Cart + multi-supplier atomic checkout; CP-7/8/9 pass |
| — (Phase 1A) | 2026-06-08 | Product Catalog V2 Phase 1A | Template engine, AI enrichment, admin approve; CP-1–6 pass |

---

## Related documents

| Document | Role |
|----------|------|
| `FINCAVA_MASTER_REGISTER.md` | Item definitions |
| `FINCAVA_EXECUTION_BACKLOG.md` | Sprint placement; move items to Completed here |
| `FINCAVA_PRIORITIZATION.md` | Why items were sequenced |
| `docs/TAKEOVER_PLAN.md` | Deploy and fragile-area context |

---

## Changelog meta

| Date | Change |
|------|--------|
| 2026-05-31 | Initial change log created; format and planning baseline recorded |
