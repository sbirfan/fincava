# Fincava MVP & End-to-End Validation Plan

Derived from:

* Existing system (Epic 1 completed)
* supplier_persona.md
* onboarding_flow.md
* buyer_persona.md
* system_gap_analysis.md

Last Updated: 2026-04-25

---

## 0. Objective

Validate that the current system can support a **real end-to-end transaction** between buyer and supplier.

MVP is NOT feature completeness.

MVP = **first successful, repeatable transaction with value exchange**

---

## 1. Current System Reality (Starting Point)

### What Already Exists

✔ Supplier onboarding pipeline (6-step form, AI scoring, graduation state machine)
✔ AI scoring + evaluation system (Claude Haiku, retry logic, Sentry observability)
✔ Supplier lifecycle (NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED)
✔ Admin controls (transition, compliance patch, status management)
✔ Supplier marketplace (thin validation surface — SELLABLE/PUBLISHED only)
✔ Product marketplace (products browsable by buyers)
✔ Full transaction layer (orders, RFQs, inquiries, trade finance)
✔ Auth system (cookie-based sessions, verified email enforcement)
✔ Email verification (registration, verify-email page, dashboard banner)
✔ Password reset flow (tokens, email delivery via Resend)
✔ Transactional email notifications (10 templates, all transaction events covered)
✔ RBAC (buyer/supplier/admin roles enforced on all routes)
✔ API security hardened (supplier dataset exposure fixed — P0.2 + P0.4)

---

### What Does NOT Exist (Yet)

❌ Buyer decision support (supplier readiness signals in main marketplace)
❌ Supplier self-service visibility (no supplier dashboard)
❌ Marketplace integration with graduation (product marketplace ungated)
❌ Durable job queue (scoring jobs lost on crash)
❌ Buyer-facing supplier detail route (sanitized — needed for Epic 2 UI)

---

## 2. MVP Definition (Reframed)

### MVP = End-to-End Flow

```text
Supplier onboarded
→ evaluated (SELLABLE)
→ visible in marketplace
→ buyer discovers supplier
→ buyer engages supplier (inquiry / RFQ)
→ transaction initiated (order)
→ value exchanged (payment or commitment)
```

All API layers for this flow now exist. The gap is buyer-facing UX and curated experience.

---

### Success Criteria

* Buyer expresses trust (engagement via inquiry or RFQ)
* Buyer initiates transaction (order created)
* Supplier participates (order status updated)
* Monetary signal observed (loan application, payment, or commitment)

---

## 3. Thin Slice Validation Strategy

We DO NOT build broadly.

We validate a **single vertical slice**:

---

### Slice 1 — Supply Creation

* Onboard supplier
* Fix compliance (admin patch if needed)
* Ensure SELLABLE status

STATUS: Infrastructure complete and validated via E2E test suite

---

### Slice 2 — Visibility

* Supplier appears in:
  * `/supplier-marketplace` (validation surface — working)
  * `/products` (product marketplace — products browsable)

STATUS: Working

---

### Slice 3 — Buyer Exposure

* Buyer can browse marketplace
* Buyer can submit inquiry (`POST /api/inquiries`) — triggers email to supplier
* Buyer can create RFQ (`POST /api/rfqs`)
* Supplier receives email notification for both

STATUS: Working — email hooks active

---

### Slice 4 — Engagement

* Supplier responds to inquiry via `PATCH /api/supplier/inquiries/:id`
* Supplier responds to RFQ via `POST /api/rfqs/:id/respond` — triggers email to buyer
* Manual introduction via WhatsApp where needed

STATUS: Working — RFQ response email active

---

### Slice 5 — Transaction

* Buyer creates order: `POST /api/buyer/orders` (requires verified email)
* Supplier advances order status: `PATCH /api/supplier/orders/:id/status` — triggers email to buyer
* Buyer can apply for financing: `POST /api/finance/loan` (requires verified email)
* All milestones notified via email

STATUS: Working — full order + loan cycle implemented and E2E tested

---

## 4. Critical Gaps (Integrated from System Analysis)

### G1 — Compliance Input Disconnect

* `ica_registered` onboarding input now correctly syncs to `compliance_docs.ica_registro` (H1 — FIXED P0.1)
* Other compliance fields (has_rut, vuce_registered, etc.) still require admin patch
* Admin compliance workflow is manual but documented

→ PARTIALLY FIXED — ICA resolved; remaining fields accepted for MVP (admin-patched)

---

### G2 — Marketplace / Graduation Disconnect

* Product marketplace shows all products regardless of supplier readiness
* `/supplier-marketplace` is graduation-aware (SELLABLE/PUBLISHED) but is a thin validation surface

→ DECISION: Use supplier marketplace for validation; product marketplace for discovery
→ Integration deferred to Epic 2

---

### G3 — Supplier Invisibility

* Supplier cannot see their own status, score, or next steps in-app
* WhatsApp notification sent after scoring — only external signal

→ ACCEPT for MVP (admin-driven, WhatsApp communication)

---

### G4 — Public Supplier Dataset Exposure

→ FIXED (P0.2 + P0.4 — 2026-04-23)
* `GET /api/suppliers` — ADMIN-only
* `GET /api/suppliers/:id` — ADMIN-only
* No internal data accessible to public

---

### G5 — Async Job Durability

* Scoring and evaluation run in-process (setImmediate)
* Retry logic: 3 attempts with backoff + Sentry on final failure
* Process crash = job loss

→ ACCEPT risk for MVP (low volume, admin can manually re-trigger)
→ Phase 4: durable job queue

---

### G6 — Email Domain Verification (NEW)

* `noreply@fincava.com` must be verified in Resend dashboard
* Without domain verification, all emails silently fail in production (403 from Resend)
* `RESEND_API_KEY` is now configured

→ MUST RESOLVE before buyer-facing launch: complete DNS propagation + Resend domain verification

---

## 5. Buyer Experience Strategy (MVP)

### CURRENT_STATE

* Buyer can see products in product marketplace
* Buyer can submit inquiries and RFQs (email notification to supplier)
* Buyer can create orders and apply for financing (verified email required)
* Buyer receives email notifications on all status updates

### MVP APPROACH

* Curated experience: use `/supplier-marketplace` for readiness signals
* Supplement with manual curation and direct communication
* Email notifications cover all transaction events

### KEY PRINCIPLE

```text
Buyer experience = curated + assisted, not fully self-serve
```

---

## 6. Supplier Experience Strategy (MVP)

### CURRENT_STATE

* Supplier submits onboarding (6 steps)
* Receives WhatsApp notification after scoring
* Receives email notifications on status changes (admin-triggered)
* No in-app dashboard or status visibility

### MVP APPROACH

* Admin-driven progression
* WhatsApp + email communication
* Admin monitors via admin console

### KEY PRINCIPLE

```text
Supplier experience = assisted onboarding, not productized
```

---

## 7. Internal Ops Layer (Critical)

This is the REAL MVP engine.

### Responsibilities

* Validate supplier data after onboarding
* Update compliance (admin route)
* Verify Resend domain so emails deliver
* Trigger evaluation if needed
* Curate supplier list
* Match buyers manually
* Facilitate transactions

### Reality

```text
System = backend infrastructure (now comprehensive)
Ops = product delivery mechanism for MVP
```

---

## 8. What NOT to Build (Critical Discipline)

DO NOT BUILD (yet):

❌ Full supplier dashboard (Phase 2)
❌ Full buyer filtering/search with graduation signals (Epic 2)
❌ Automated matching (Phase 3)
❌ Durable job queue (Phase 4)
❌ Full compliance unification (Phase 4)
❌ Product gating by graduation (Epic 2 scope)

---

## 9. Claude Usage (Updated Role)

Claude is used to:

* Score supplier export readiness (Claude Haiku — in production)
* Generate compliance documents (Claude Sonnet — admin-triggered)
* Analyze system gaps
* Propose minimal fixes
* Validate flows
* Prevent overbuilding

---

## 10. Monetization Validation

### PRIMARY TEST

Can we get a buyer to:

* Pay for access
  OR
* Commit to a transaction

---

### METHOD

* Concierge approach — admin facilitates first transactions
* Direct outreach
* Manual coordination
* Email notifications confirm engagement

---

## 11. Execution Plan

### Phase 1 — Immediate (Completed)

* ✔ ICA sync fix (P0.1)
* ✔ Restrict `/api/suppliers` (P0.2) and `/api/suppliers/:id` (P0.4)
* ✔ Email infrastructure deployed (Resend, 10 templates)
* ✔ Email verification enforced on orders + loans
* ✔ Full transaction layer (orders, RFQs, inquiries, finance)
* ✔ E2E test suite — all 9 suites PASS
* ⚠ Resend domain verification — in progress (DNS propagation pending)

---

### Phase 2 — Buyer Validation

* Identify 3–5 buyers
* Present curated suppliers via `/supplier-marketplace`
* Use inquiry / RFQ / order flow for engagement tracking
* Track:
  * interest (inquiries, RFQs)
  * engagement (order creation)
  * conversion (order completion or loan application)

---

### Phase 3 — First Transaction

* Facilitate manually
* Capture:
  * friction points
  * decision factors
  * willingness to pay

---

### Phase 4 — Iterate

* Refine:
  * supplier selection criteria
  * buyer messaging and trust signals
  * email communication quality
  * next system investments (Epic 2 marketplace, supplier dashboard)

---

## 12. Risks (Real, Not Theoretical)

### HIGH

* No buyer demand — primary risk
* Weak supplier quality
* Trust not established
* Resend domain not verified → emails not delivered

### MEDIUM

* Manual ops overload as volume grows
* Data inconsistencies (non-ICA compliance fields)
* SupplierDetail UI calling admin-only route (blocker for Epic 2)

### LOW

* Technical scalability (not relevant at MVP volume)
* Async job loss (mitigated by Sentry alerting)

---

## 13. Success Definition

You succeed when:

* A buyer completes a transaction (order created + status advanced by supplier)
* The process can be repeated
* Value is clear to both sides
* Email notifications keep all parties informed automatically

---

## 14. Summary

You already built:

```text
Supply system (onboarding + evaluation)
Transaction layer (orders, RFQs, inquiries, financing)
Auth system (cookie sessions, email verification, password reset)
Email infrastructure (10 templates, all events covered)
```

Now you must validate:

```text
Demand + first transaction + value confirmation
```

The biggest risk is NOT technical — the infrastructure is solid.

It is:

```text
Building more without proving buyer demand and transaction value
```

---

END
