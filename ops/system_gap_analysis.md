# System Gap Analysis — Source of Truth

Derived from:

* Codebase (schema, routes, services)
* supplier_persona.md
* onboarding_flow.md
* buyer_persona.md
* ops documents

Last Updated: 2026-04-25

---

## 0. Classification

* CURRENT_STATE → validated from code
* GAP → system deficiency or inconsistency
* TARGET_STATE → desired behavior
* FIXED → gap resolved; fix details documented

---

## 1. Cross-Document Alignment

This analysis consolidates:

* Supplier persona (data + lifecycle)
* Onboarding flow (execution pipeline)
* Buyer persona (experience layer)

---

## 2. Gap Categories

* SECURITY
* DATA_INTEGRITY
* PRODUCT_LOGIC
* ARCHITECTURE
* UX

---

## 3. HIGH Priority Gaps

---

### H1 — ICA Sync Mismatch (DATA_INTEGRITY)

STATUS: **FIXED (P0.1 — 2026-04-23)**

PREVIOUS_STATE:
* `ica_registered` stored in interactions.metadata only
* `ica_registro` in compliance_docs remained false for all new suppliers
* Eligibility gate read `compliance_docs.ica_registro` — ignored onboarding input

FIX:
* Two-step sync in `POST /api/suppliers/onboard`:
  1. INSERT seeds `ica_registro = (ica_registered === true)` — applies to new rows
  2. Conditional UPDATE sets `ica_registro = true` when `ica_registered === true` — applies to existing rows
* Upgrade-only — never downgrades from `true` to `false`
* Admin can still override via `PATCH /api/admin/suppliers/:id/compliance`

IMPACT: Eligibility gate now correctly reflects supplier-declared ICA status at onboarding time.

---

### H2 — Marketplace / Graduation Disconnect (PRODUCT_LOGIC)

CURRENT_STATE (at open):
* Product marketplace showed products regardless of supplier readiness
* `/supplier-marketplace` validation surface was graduation-aware (SELLABLE/PUBLISHED only)

STATUS: **FIXED (B2 — 2026-05-03)**

FIX:
* `GET /api/products` now INNER JOINs `productsTable.supplierId → suppliersTable.id`
* `inArray(suppliersTable.sellableStatus, GRADUATED_STATUSES)` applied to both main query and countQuery
* `GRADUATED_STATUSES` derived from `sellableStatusEnum.enumValues` — no raw string literals
* Products with `supplierId = null` (no verified supplier link) excluded by INNER JOIN semantics
* Partial index `suppliers_sellable_status_idx` on `sellable_status IN ('SELLABLE','PUBLISHED')` already present — query is index-eligible
* `Math.min(limit, 50)` hard cap applied in route handler (no Zod schema change)
* Response adds `totalPages: Math.ceil(count / cappedLimit)`
* Frontend: `page` state added; all filter handlers reset to page 1; Prev/Next controls shown when `totalPages > 1`; "Page X of Y" indicator; empty state updated to specified text
* `products/featured` and `products/:id/similar` intentionally not gated (out of scope)

---

### H3 — Async Job Durability (ARCHITECTURE)

CURRENT_STATE:
* `scoreSupplier` and `evaluateSupplier` run via `setImmediate` (fire-and-forget in-process)
* Retry logic: 3 attempts, exponential backoff (1s, 2s, 4s)
* Final failure: `logger.error` + Sentry capture

GAP:
* Process crash = permanent job loss (no persistence)
* Supplier can remain unevaluated if all retries fail before crash

TARGET_STATE:
* Database-backed durable job queue
* Workers that retry on restart

STATUS: Open — deferred to Phase 4 (Automation & Scale). Acceptable risk at MVP volume

---

### H4 — Public Supplier Dataset Exposure (SECURITY)

STATUS: **FIXED (P0.2 — 2026-04-23)**

FIX:
* `GET /api/suppliers` restricted to ADMIN-only via `requireAuth + requireAdmin`
* Public buyer access unchanged via `/suppliers/marketplace` (SELLABLE/PUBLISHED only, sanitized fields)
* Internal evaluation fields (`commercialScore`, `eligibilityStatus`, etc.) no longer externally accessible

---

### H4-B — GET /suppliers/:id Unguarded (SECURITY)

STATUS: **FIXED (P0.4 — 2026-04-23 + B1 — 2026-05-02)**

FIX:
* `requireAuth + requireAdmin` applied to `GET /suppliers/:id`
* Route remains ADMIN-only
* `GET /api/suppliers/marketplace/:id` added (public, no auth) — buyer-safe contract
* `supplier-detail.tsx` migrated to fetch `/api/suppliers/marketplace/:id`
* Excluded fields confirmed absent: commercialScore, scoreSnapshot, eligibilityStatus, graduationPathway, whatsappNumber, rutDian, icaRegistro, fitosanitarioCert, economics, ai_outputs
* `isExportReady` boolean drives product visibility and inquiry CTA gate
* `images?.[0] ?? null` guards both origin story and product imageUrl mappings

---

### H5 — Compliance Fragmentation (ARCHITECTURE)

CURRENT_STATE:
* `compliance_docs` — current state (1:1 with supplier, UNIQUE constraint)
* `interactions.metadata` — onboarding-time signal capture (JSONB)
* `compliance_score` — legacy field, unused

GAP:
* No single source of truth for compliance state
* Onboarding compliance signals (has_rut, bank_account, etc.) not promoted to `compliance_docs`
* Admin must manually update `compliance_docs` to reflect onboarding inputs

TARGET_STATE:
* Unified compliance model or explicit mapping layer
* Onboarding inputs automatically populate compliance_docs where applicable (H1 fixed for ICA; full unification deferred)

STATUS: Partially fixed (H1 ICA sync). Full compliance unification deferred to Phase 4

---

## 4. MEDIUM Priority Gaps

### M1 — Type Mismatch (economics.volumen_kg_ultima_cosecha)
* CURRENT: receives string from frontend, stored as integer column
* STATUS: Open — deferred to Epic 2 T3 (onboarding validation layer)

### M2 — Pathway Undefined Internally
* `pathway` is returned by AI (A/B/C/D) but has no internal definition or business logic
* STATUS: Open — deferred to Phase 3 (Intelligence Layer)

### M3 — Dual Status Fields (suppliers table)
* `status` (PENDING/ACTIVE/INACTIVE) — operational flag
* `sellableStatus` (NOT_READY/ELIGIBLE/SELLABLE/PUBLISHED) — graduation state
* Two parallel status systems with different semantics
* STATUS: Open — by design in v0, will be unified in Phase 2

### M4 — Supplier Marketplace Not Integrated
* `/supplier-marketplace` is isolated validation surface
* Cannot be expanded or integrated without Phase II redesign
* STATUS: Open — intentional constraint

### M5 — Missing Readiness Signals in Supplier Detail
* Buyer-facing supplier detail page will need graduation readiness signals
* Current `GET /suppliers/:id` is ADMIN-only
* STATUS: **FIXED (B1 — 2026-05-02)** — `GET /api/suppliers/marketplace/:id` returns `isExportReady` boolean; supplier-detail.tsx gates product tab, certifications tab, and inquiry CTA on `isExportReady`

### M6 — Supplier Dashboard Absent
* Supplier has no visibility into their own status, score, or next actions
* Currently admin-driven only
* STATUS: FIXED — S1 task (Phase I Sprint)
* NOTES: GET /api/suppliers/my-profile now returns graduationPathway + lastEvaluatedAt;
  new GET /api/supplier/status endpoint returns structured graduation status + nextAction string;
  ProfileCompletenessWidget renders found:false prompt card (no more silent blank) and
  graduation status row (sellableStatus badge, pathway badge, lastEvaluatedAt) when data present.

---

## 5. LOW Priority

* Naming inconsistencies (Spanish/English field names mixed in schema)
* Language duality in onboarding inputs (`contact_name` vs `nombreCompleto`)
* Free-text interaction types — no enforced enum

---

## 6. NEW GAPS — Identified Post Email/Auth Implementation

### N1 — Email Domain Verification Required (CONFIG)
* `noreply@fincava.com` must be verified in Resend dashboard
* Dev environment: sends silently skipped (WARN log) when `RESEND_API_KEY` absent
* Prod environment: 403 from Resend API if domain not verified
* `RESEND_API_KEY` confirmed present in Replit Secrets (`re_EJgLx...`, 36 chars) — B7 2026-05-03
* Domain verification status: cannot be confirmed from codebase — requires Resend dashboard check
* STATUS: Open — operational action only (add DNS TXT/MX records, verify in dashboard)

### N2 — No Health Endpoint at /api/health (ARCHITECTURE)
* `GET /api/health` returns 404 — not registered
* `GET /api/healthz` is active (Replit deployment health check)
* STATUS: Open — minor. Only relevant if using external load balancers or uptime monitors

### N3 — Email Verification Not Enforced on All Sensitive Routes (UX/SECURITY)
* `requireVerifiedEmail` guards: `POST /api/buyer/orders`, `POST /api/finance/loan`, `POST /api/buyer/intent`
* Other sensitive actions (RFQ creation, inquiry submission) do not require verification
* STATUS: Open — acceptable for MVP; can expand guards incrementally
* Updated B7 2026-05-03: `/api/buyer/intent` added to guarded list (B6)

### N4 — Unverified Supplier User Access (SECURITY)
* Supplier users can update order status and respond to RFQs without email verification
* `requireVerifiedEmail` only applied to buyer-specific sensitive routes
* STATUS: Open — acceptable for MVP given supplier onboarding is admin-assisted

### N5 — No Email Notification for Supplier Inquiry Response (PRODUCT_LOGIC)
* `PATCH /api/supplier/inquiries/:id` updates inquiry status only — no email fired to buyer
* No `inquiryResponseEmail` template exists in email.ts
* Buyer receives no notification when supplier accepts/declines/responds to their inquiry
* Identified: B7 preflight 2026-05-03
* STATUS: Open — gap, not a crash risk. Building the template is out of scope for B7 (per task rules: "NOT permitted: adding new templates"). Defer to Phase II buyer experience work.

---

## 7. Execution Priority

### RESOLVED
* H1 — ICA sync fix ✔
* H2 — Marketplace / Graduation Disconnect ✔ (B2)
* H4 — Public supplier exposure ✔ (P0.2)
* H4-B — GET /suppliers/:id unguarded ✔ (P0.4 + B1)
* M5 — Missing readiness signals in supplier detail ✔ (B1)
* Slice 4 — AI scoring reliability ✔
* Slice 6 — Transaction layer ✔
* Slice 7 — Auth hardening + email verification ✔
* Slice 8 — Transactional email infrastructure ✔

### DO NOW (Before Epic 2 UI)
* Verify fincava.com domain in Resend for live email delivery (N1)

### DO NEXT (Epic 2)
* Epic 2 T3: onboarding validation layer (resolve M1 type mismatch)
* Epic 2 T4: compliance alignment (promote onboarding inputs → compliance_docs)
* Supplier dashboard (M6)

### DEFER (Post Epic 2)
* Durable job queue (H3) — Phase 4
* Full compliance unification (H5) — Phase 4
* Pathway business logic definition (M2) — Phase 3
* Supplier dashboard (M6) — Phase 2

---

## 8. Updated Top Risks

| # | Risk | Severity | Status |
|---|---|---|---|
| R1 | ICA mismatch breaks eligibility correctness | Critical | FIXED (P0.1) |
| R2 | No job durability | High | Open (accepted for MVP) |
| R3 | Marketplace ignores graduation | High | Open (Epic 2 scope) |
| R4 | Compliance fragmentation | High | Partial (H1 fixed; full unification Phase 4) |
| R5 | Public supplier dataset exposure | Medium-High | FIXED (P0.2 + P0.4) |
| R6 | Email domain not verified in production | Medium | Open (DNS propagation pending) |
| R7 | SupplierDetail calls admin-only route | Medium | Open (Epic 2 blocker) |

---

## 10. Phase 1.5 — Extended Buyer Onboarding

### P2-B1 — Extended Buyer Onboarding Backend (IN PROGRESS — 2026-05-03)

STATUS: **IN PROGRESS** — backend complete; frontend form (P2-B2) deferred.

SCOPE:
- 22 new columns added to buyer_profiles via individual ALTER TABLE ADD COLUMN IF NOT EXISTS
- GET /api/buyer/onboarding — returns all 25 extended profile fields; 404 if no profile row
- PATCH /api/buyer/onboarding — partial update of any subset of 25 fields; recomputes p2CompletionPct (S1–S4 / 4 * 100); merges S1–S4 keys into p2SectionsDone without disturbing existing A–F keys from the legacy PATCH /api/buyers/:id/profile endpoint
- buyerPayload in runMatching() extended with 6 new conditional signals (spread-in only when non-null)
- Matching prompt updated with qualitative routing block (weights unchanged: 30/25/20/15/10)

OPEN: Frontend multi-step form at /buyer/onboarding (P2-B2 — not yet scheduled)

---

## 9. Summary

The system is:

* Functionally correct across supplier pipeline, transaction layer, and auth
* Operationally usable with email notifications and admin controls
* Architecturally incomplete in marketplace integration and job durability

Key insight:

```text
The system now produces high-quality signals (scoring, evaluation, email hooks)
and delivers notifications reliably. The remaining gaps are in buyer-facing
discoverability and long-term infrastructure durability.
```

---

END
