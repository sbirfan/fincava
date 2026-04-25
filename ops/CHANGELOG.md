# Changelog

All notable changes to the Fincava platform are recorded here.
Format: `[Date] — Ticket / Slice — Description`

---

## Phase 1 — Supplier Graduation State Machine

| Date | Ticket | Description |
|---|---|---|
| Apr 2026 | 1.1 | Added Phase 1 columns to `suppliers` table: `eligibilityStatus`, `commercialScore`, `sellableStatus`, `graduationPathway`, `nextActions`, `commercialScoreAtOnboarding`, `lastEvaluatedAt`, `thresholdVersion` |
| Apr 2026 | 1.2 | Created `supplier_evaluations` table — append-only evaluation snapshot per scoring run |
| Apr 2026 | 1.3 | Created `supplier_state_transitions` table + `actor` enum (`SYSTEM`, `ADMIN`, `FOUNDER`) — full audit trail for all state changes |
| Apr 2026 | 1.4 | Added `lib/config/thresholds.ts` — `THRESHOLDS_V0` config object (`sellableMin=60`, `partialMin=30`, 4 required compliance fields). Single source of truth; no hardcoded values in service layer |
| Apr 2026 | 1.5 | Implemented `supplier-graduation-service.ts` — exports `evaluateSupplier`, `transitionTo`, `markPublished`, `NotFoundError`. SNAPSHOT FIRST invariant, `db.transaction()` throughout, Sentry shim |
| Apr 2026 | 1.5 | Bug fix: `exportReadinessScore = null` now throws `NotFoundError` instead of silently substituting `0` |
| Apr 2026 | 1.6 | Wired `evaluateSupplier` into `POST /api/suppliers/onboard` as fire-and-forget via `setImmediate`. Retry on `NotFoundError` (max 3 attempts: 1 s, 2 s backoff). All events logged at `info`/`warn` with `correlationId` |

---

## Phase 1 — Security Hardening (Pre-Epic 2)

| Date | Ticket | Description |
|---|---|---|
| 2026-04-23 | P0.1 | ICA sync fix — `ica_registered` from onboarding body now syncs into `compliance_docs.ica_registro`. Two-step: INSERT seeds value, conditional UPDATE for `true` only. Upgrade-only; never downgrades |
| 2026-04-23 | P0.2 | `GET /api/suppliers` restricted to ADMIN-only (`requireAuth + requireAdmin`). Buyer surface unchanged via `/suppliers/marketplace` |
| 2026-04-23 | P0.4 | `GET /api/suppliers/:id` restricted to ADMIN-only. Buyer detail route deferred to Epic 2 as a separate sanitized endpoint |

---

## Epic 2 — Input Normalization Layer

| Date | Ticket | Description |
|---|---|---|
| 2026-04-24 | T1 | `SupplierOnboardingInput` interface wired into `POST /suppliers/onboard`. `rawBody` normalization layer + `typedInput` (Partial<SupplierOnboardingInput>) introduced. Additive only — zero runtime changes. 12 field drift mappings confirmed |
| 2026-04-24 | T2 | `buildScoringInput` abstraction layer introduced. New file: `artifacts/api-server/src/services/scoring-input.ts`. Extracts 4 DB reads from `scoreSupplier` into typed `ScoringInput` contract. Destructured inside `attemptScore`. Dev-only `logger.debug` of AI input added |

---

## Email Infrastructure & Transactional Emails (Tasks #87–91)

| Date | Task | Description |
|---|---|---|
| Apr 2026 | #87 | Created `artifacts/api-server/src/lib/email.ts` — Resend-backed email service. `sendEmail()` helper, `getResend()` lazy init from `RESEND_API_KEY`. Graceful skip with `logger.warn` when key absent — API response never blocked |
| Apr 2026 | #87 | Email templates implemented: `welcomeEmail`, `passwordResetEmail`, `adminCreatedAccountEmail`, `adminPasswordResetEmail`, `adminRoleChangeEmail` |
| Apr 2026 | #88 | Supplier lifecycle email hooks: `supplierStatusChangeEmail`. Supplier admin status route (`PATCH /api/admin/suppliers/:id/status`) triggers email on status change. Status enum: `ACTIVE` (approved copy), `INACTIVE+REJECTED`, `INACTIVE+SUSPENDED`, `PENDING` |
| Apr 2026 | #89 | Inquiry + RFQ email hooks: `newInquiryEmail` (notifies supplier on new inquiry), `rfqResponseEmail` (notifies buyer when supplier responds to RFQ). Both fire-and-forget with `try/catch + logger.warn` |
| Apr 2026 | #90 | Order + loan status email hooks: `orderStatusEmail` (notifies buyer on supplier order status update), `loanStatusEmail` (notifies buyer when admin changes loan status). All fire-and-forget |
| Apr 2026 | #91 | User account email hooks wired into admin routes: `POST /api/admin/users` → `adminCreatedAccountEmail`, `POST /api/admin/users/:id/reset-password` → `adminPasswordResetEmail` |

---

## Email Verification & Auth Hardening (Task #95)

| Date | Change | Description |
|---|---|---|
| Apr 2026 | #95 | New DB table: `email_verification_tokens` — columns: `id`, `user_id` (FK → users), `token` (text unique), `expires_at`, `used` (boolean), `created_at` |
| Apr 2026 | #95 | `users.email_verified_at` column added (timestamp, nullable) — NULL = unverified |
| Apr 2026 | #95 | New route: `GET /api/auth/verify-email?token=` — validates token, stamps `email_verified_at`, marks token `used`. Returns 400 on invalid/expired/used token |
| Apr 2026 | #95 | New route: `POST /api/auth/resend-verification` — creates new verification token + sends email. Returns 409 if already verified |
| Apr 2026 | #95 | `requireVerifiedEmail` middleware added — guards `POST /api/buyer/orders` and `POST /api/finance/loan`. Returns 403 for unverified users |
| Apr 2026 | #95 | Frontend `/verify-email` page — loading → success/error state based on `?token=` query param. Error state shows "link invalid or expired" with "Sign in to resend" CTA |
| Apr 2026 | #95 | Dashboard banner for unverified users — persists until email verified |
| Apr 2026 | #95 | `POST /api/auth/register` now automatically sends verification email via `welcomeEmail` + verification token |

---

## Role-Change Notification Email (Task #96)

| Date | Change | Description |
|---|---|---|
| Apr 2026 | #96 | `adminRoleChangeEmail` template added to `email.ts` — notifies user when admin changes their account role |
| Apr 2026 | #96 | `PATCH /api/admin/users/:id` now fires `adminRoleChangeEmail` hook when `role` field changes. Fire-and-forget pattern |

---

## Transaction Layer & Buyer/Supplier Routes

| Date | Change | Description |
|---|---|---|
| Apr 2026 | — | Full orders system implemented: `POST /api/buyer/orders` (requireVerifiedEmail), `GET /api/buyer/orders`, `GET /api/buyer/orders/:id`, `GET /api/supplier/orders`, `PATCH /api/supplier/orders/:id/status`. Order status enum: `INQUIRY → SAMPLE_REQUESTED → QUOTED → CONFIRMED → IN_PRODUCTION → SHIPPED → DELIVERED → COMPLETED → CANCELLED` |
| Apr 2026 | — | Full RFQ system implemented: `GET /api/rfqs` (public), `GET /api/rfqs/:id` (public), `POST /api/rfqs` (auth), `POST /api/rfqs/:id/respond` (auth, supplier — triggers rfqResponseEmail), `POST /api/rfqs/:id/award/:responseId` (auth), `GET /api/buyer/rfqs`, `GET /api/supplier/rfqs` |
| Apr 2026 | — | Inquiry system implemented: `POST /api/inquiries` (auth — triggers newInquiryEmail to supplier), `GET /api/buyer/inquiries`, `GET /api/supplier/inquiries`, `PATCH /api/supplier/inquiries/:id` |
| Apr 2026 | — | Trade finance system implemented: `GET /api/finance/credit` (credit score), `GET /api/finance/loans`, `POST /api/finance/loan` (requireVerifiedEmail), `POST /api/finance/repay`, `GET /api/admin/loans`, `PATCH /api/admin/loans/:id/status` (admin — triggers loanStatusEmail). Loan status enum: `ACTIVE`, `REPAID`, `DEFAULTED`, `CANCELLED` |
| Apr 2026 | — | Platform stats: `GET /api/stats/platform` — public KPIs (supplier count, order count, loan totals, active loan value) |
| Apr 2026 | — | Admin: `POST /api/admin/users/:id/reset-password` — admin-forced password reset with security notice email |

---

## Auth System Migration

| Date | Change | Description |
|---|---|---|
| Apr 2026 | — | Session management migrated from **JWT Bearer tokens** to **HTTP-only cookies** (`fincava_auth`). 7-day expiry, `httpOnly`, `secure` in production, `sameSite: lax`. `requireAuth` reads from cookie, not Authorization header |
| Apr 2026 | — | `POST /api/auth/forgot-password` now sends actual `passwordResetEmail` via Resend (previously no-op). Token stored in `password_reset_tokens` |
| Apr 2026 | — | `POST /api/auth/reset-password?token=` marks token as `used = true` on consumption |
| Apr 2026 | — | `POST /api/auth/logout` clears `fincava_auth` cookie |

---

## Environment & Infrastructure

| Date | Change | Description |
|---|---|---|
| Apr 2026 | — | `RESEND_API_KEY` added to Replit Secrets — enables live transactional email delivery via Resend |
| Apr 2026 | — | `FROM_ADDRESS` hardcoded to `Fincava <noreply@fincava.com>` in `email.ts`. Domain must be verified in Resend dashboard for delivery to work |
| Apr 2026 | — | `/api/healthz` confirmed active (used by Replit deployment health checks). `/api/health` not registered — returns 404 |

---

## Testing

| Date | Change | Description |
|---|---|---|
| Apr 2026 | — | 9-suite comprehensive E2E test campaign executed and passed: Suite 1 (Supplier Pipeline), Suite 2 (Auth flows), Suite 3 (Email Verification), Suite 4 (Admin Account Emails), Suite 5 (Supplier Lifecycle Emails), Suite 6 (Inquiry/RFQ Emails), Suite 7 (Order/Loan Emails), Suite 8 (RBAC), Suite 9 (Infrastructure Resilience). All suites PASS |

---

## Ops / Tooling

| Date | Change |
|---|---|
| Apr 2026 | Added `ops/execution_map.md` and `ops/post_mvp_plan.md` as source-of-truth planning documents |
| Apr 2026 | Added `scripts/src/export-docs.ts` — generates `docs/Execution_Map_V1.docx` and `docs/Post_MVP_System_Plan.docx` from Markdown source via `pnpm --filter @workspace/scripts run export:docs` |
| Apr 2026 | All `/ops/*.md` files reviewed and updated to reflect platform state as of late April 2026 |
