# Execution Map V1 — Cross-Epic Delivery Plan

Purpose: Define end-to-end capability slices across epics. This document guides execution order, ensures user-visible value delivery, and must be updated after each ticket or slice completion.

## Current Epic: 2 (Input Normalization + Transaction Layer)
## Status: In Progress
## Last Updated: 2026-04-25

---

### Slice 1 — Supplier Visibility

* Status: Done
* Last Updated: 2026-04-22
* Changes:
  * Implemented GET /api/suppliers (list endpoint with evaluation fields)
  * Implemented GET /api/suppliers/:id (detail endpoint with evaluation fields)
  * Verified null handling for non-evaluated suppliers
  * Preserved backward compatibility (no response shape changes)
  * Added GET /api/suppliers/:id/evaluations (evaluation history, DESC, limit 20)
  * Added GET /api/suppliers/:id/transitions (state transition history, DESC, limit 20)
  * Ensured no joins and excluded scoreSnapshot for performance
  * Confirmed empty array vs 404 behavior
  * Completed full supplier visibility layer (current + historical state)
  * SECURITY: GET /api/suppliers and GET /api/suppliers/:id restricted to ADMIN-only (P0.2 + P0.4)

**Goal:** Expose supplier evaluation results and status via API for internal/admin visibility.

**Pulls From:**
- Epic 1 (1.7, 1.8)

**Outputs:**
- Supplier status API (ADMIN-only)
- Evaluation history API (ADMIN-only)

**Dependencies:**
- Tickets 1.1–1.6 complete

---

### Slice 2 — Admin Control Layer

* Status: Done
* Last Updated: 2026-04-22
* Changes:
  * Implemented POST /api/admin/suppliers/:id/transition (manual override)
  * Implemented POST /api/admin/suppliers/:id/publish (explicit publish action)
  * Enforced justification requirement for ADMIN and FOUNDER actors
  * Blocked SYSTEM actor usage at route layer
  * Added SELLABLE → PUBLISHED gate validation
  * Integrated requireAuth + requireAdmin guards for admin endpoints
  * Confirmed transition audit integrity (actor, justification, fromState)
  * Added PATCH /api/admin/suppliers/:id/status (operational status: ACTIVE, INACTIVE+reason)
  * Supplier status changes trigger supplierStatusChangeEmail (fire-and-forget)

**Goal:** Allow admin users to override supplier states with audit enforcement.

**Pulls From:**
- Epic 1 (1.9, 1.10)

**Outputs:**
- Admin transition API
- Publish endpoint with gating
- Operational status API with email notifications

**Dependencies:**
- Slice 1 complete

---

### Slice 3 — Buyer-Ready Supply

* Status: Phase 1 Done
* Last Updated: 2026-04-22
* Changes:
  * Thin marketplace UI implemented for validation
  * Connected to marketplace endpoint
  * Confirmed Phase 1 (UI + API) complete
  * Phase 2 remains unchanged (no expansion yet)
  * Supplier marketplace implemented as isolated validation surface
  * Explicitly not merged into product marketplace to avoid UX confusion
  * Marked for redesign or removal in Phase II

**Goal:** Expose SELLABLE suppliers for external consumption.

**Pulls From:**
- Epic 1
- Marketplace Epic (future)

**Outputs:**
- Filtered supplier listing (SELLABLE only)

**Dependencies:**
- Slice 2 complete (publish gate enforced)

#### Phase 2 — Buyer-ready marketplace (post-validation)

* Status: Not Started
* Goal: Expand marketplace endpoint into a usable buyer-facing API
* Scope: Pagination, filtering, search, sorting
* Dependencies: Epic 2 (data enrichment), buyer requirement validation

#### ⚠ Temporary Validation Surface — Supplier Marketplace

* A separate route `/supplier-marketplace` was introduced as a thin validation UI
* Purpose: validate end-to-end flow (onboarding → evaluation → SELLABLE → UI visibility)
* This surface is NOT part of the final marketplace architecture
* Future action (MANDATORY): Remove OR redesign this surface in Phase II

---

### Slice 4 — AI Scoring Reliability

* Status: Done
* Last Updated: 2026-04-24
* Changes:
  * Retry logic added to `scoreSupplier` (3 attempts, exponential backoff: 1s, 2s, 4s)
  * `Number.isFinite` validation on `exportReadinessScore` — throws on invalid AI output, triggers retry
  * Latency logging: Claude API call duration logged via `logger.info { supplierId, duration }`
  * Final failure: `logger.error` + Sentry capture (no silent drops)
  * `buildScoringInput` abstraction layer introduced (Epic 2 T2): 4 DB reads extracted into typed `ScoringInput` contract
  * Dev-only `logger.debug` of AI input added for prompt equivalence verification

**Goal:** Improve robustness of AI scoring pipeline.

**Pulls From:**
- Epic 1 service layer

**Outputs:**
- Reliable scoring pipeline with retry + validation
- Structured `ScoringInput` contract for future scoring improvements

**Dependencies:**
- Existing scoring system

---

### Slice 5 — System Durability (V2)

* Status: Not Started
* Last Updated: 2026-04-22

**Goal:** Ensure no evaluation jobs are lost using a queue-based architecture.

**Pulls From:**
- Post-MVP System Plan

**Outputs:**
- Job queue
- Worker service
- Persistent retries

**Dependencies:**
- All previous slices stable

**Replit Execution Prompt:**
Create `jobs` table. Insert evaluation job on onboarding instead of `setImmediate`. Build worker to process jobs and retry with backoff. Do not modify evaluation logic.

---

### Slice 6 — Transaction Layer

* Status: Done
* Last Updated: 2026-04-25
* Changes:
  * Full orders system: POST /api/buyer/orders (requireVerifiedEmail), GET /api/buyer/orders, GET /api/buyer/orders/:id, GET /api/supplier/orders, PATCH /api/supplier/orders/:id/status
  * Order status enum: INQUIRY → SAMPLE_REQUESTED → QUOTED → CONFIRMED → IN_PRODUCTION → SHIPPED → DELIVERED → COMPLETED → CANCELLED
  * Supplier order status update triggers orderStatusEmail to buyer (fire-and-forget)
  * Full RFQ system: GET/POST /api/rfqs, POST /api/rfqs/:id/respond (triggers rfqResponseEmail), POST /api/rfqs/:id/award/:responseId, GET /api/buyer/rfqs, GET /api/supplier/rfqs
  * Inquiry system: POST /api/inquiries (triggers newInquiryEmail to supplier), GET /api/buyer/inquiries, GET /api/supplier/inquiries, PATCH /api/supplier/inquiries/:id
  * Trade finance: GET /api/finance/credit, GET /api/finance/loans, POST /api/finance/loan (requireVerifiedEmail), POST /api/finance/repay
  * Admin finance: GET /api/admin/loans, PATCH /api/admin/loans/:id/status (triggers loanStatusEmail)

**Goal:** Enable buyers and suppliers to transact through the platform.

**Outputs:**
- Orders, RFQs, inquiries, and finance APIs
- Email notifications for all transaction state changes

---

### Slice 7 — Auth Hardening & Email Verification

* Status: Done
* Last Updated: 2026-04-25
* Changes:
  * Auth migrated to HTTP-only cookie sessions (`fincava_auth`), replacing JWT Bearer tokens
  * Password reset tokens persisted in `password_reset_tokens` table (`used` flag)
  * POST /auth/forgot-password sends real passwordResetEmail (previously no-op)
  * POST /auth/reset-password marks token as `used = true`
  * Email verification: `email_verification_tokens` table, `users.emailVerifiedAt` column
  * GET /api/auth/verify-email?token= — verify email, stamp emailVerifiedAt
  * POST /api/auth/resend-verification — resend (409 if already verified)
  * `requireVerifiedEmail` middleware guards POST /api/buyer/orders and POST /api/finance/loan (403 for unverified)
  * Frontend /verify-email page, dashboard banner for unverified users
  * Registration automatically sends verification email
  * Forgot-password returns neutral message (no email enumeration)

**Goal:** Secure auth lifecycle and enforce email verification for sensitive actions.

**Outputs:**
- Verified email enforcement on orders and loans
- Secure password reset flow with token lifecycle
- Email verification flow end-to-end

---

### Slice 8 — Transactional Email Infrastructure

* Status: Done
* Last Updated: 2026-04-25
* Changes:
  * Resend integration: `artifacts/api-server/src/lib/email.ts`, `RESEND_API_KEY` secret
  * 10 email templates implemented (see architecture doc section 6.3)
  * Fire-and-forget pattern throughout: all hooks use `Promise.resolve().then(async () => {...}).catch(logger.warn)`
  * API responses never blocked by email failures
  * Graceful no-op when RESEND_API_KEY absent (WARN log only)
  * Admin account email hooks: user creation, password reset, role change
  * All transaction email hooks wired to relevant routes

**Goal:** Notify all platform participants of status changes automatically.

**Outputs:**
- Resend email service
- Email notifications for auth, supplier, order, loan, inquiry, and RFQ events

---

### Slice 9 — Platform Validation (E2E Testing)

* Status: Done
* Last Updated: 2026-04-25
* Changes:
  * 9-suite comprehensive E2E test campaign executed — ALL PASS
  * Suite 1: Supplier Pipeline (onboard → AI score → evaluation → state transitions → DB consistency)
  * Suite 2: Authentication flows (register, duplicate email, login, password reset token lifecycle)
  * Suite 3: Email Verification (token create/verify/replay, 403 guards, frontend error page)
  * Suite 4: Admin Account Emails (user create, password reset, role change — no 5xx)
  * Suite 5: Supplier Lifecycle Emails (ACTIVE, INACTIVE+REJECTED, INACTIVE+SUSPENDED — no 5xx)
  * Suite 6: Inquiry & RFQ Email Hooks (inquiry, RFQ create, supplier response — no 5xx)
  * Suite 7: Order & Loan Status Emails (buyer order, supplier status updates, loan, admin DEFAULTED — no 5xx)
  * Suite 8: RBAC (unauthenticated → 401, buyer on admin routes → 403)
  * Suite 9: Infrastructure Resilience (server live throughout all email hook calls)

**Goal:** Validate full platform end-to-end across all feature slices.

**Outputs:**
- Confirmed all pipelines working correctly in production-equivalent conditions

---

## Maintenance Instructions

After each ticket:
- Update slice status
- Add new dependencies
- Adjust execution order if needed
- Record new risks or learnings
