# Fincava — Architecture Document
**Colombian Agricultural Marketplace**
*Updated April 2026 (late)*

---

## 1. Project Overview

Fincava is a B2B marketplace and supply-chain financing platform that connects Colombian smallholder farmers and cooperatives with international buyers. The platform covers the full commercial journey: supplier onboarding and AI scoring, a state machine that graduates suppliers to marketplace readiness, product discovery, RFQ/inquiry management, order tracking, embedded trade finance, and transactional email notifications. The frontend is fully bilingual (English / Spanish) with device-language detection.

---

## 2. Monorepo Structure

The project is a **pnpm workspace** monorepo with the following top-level layout:

```
/
├── artifacts/
│   ├── fincava/          # React 19 + Vite frontend
│   ├── api-server/       # Express 5 API
│   └── mockup-sandbox/   # Isolated UI component preview server
├── lib/
│   ├── db/               # Drizzle ORM schema + migrations (shared)
│   ├── config/           # Shared runtime config (graduation thresholds)
│   ├── api-spec/         # OpenAPI / Swagger definitions
│   ├── api-zod/          # Auto-generated Zod validation schemas
│   └── api-client-react/ # Auto-generated TanStack Query hooks
├── ops/                  # Execution maps, post-MVP plans, epic docs
└── scripts/              # Build and maintenance utilities
```

Each artifact is an independent deployable unit, bound to a port via the `PORT` environment variable and proxied through Replit's path-based routing.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4, Framer Motion, Lucide React |
| Data fetching | TanStack Query (React Query) + auto-generated hooks from `lib/api-client-react` |
| Backend | Node.js, Express 5, TypeScript, tsx/esbuild |
| Database | PostgreSQL (Replit-managed), Drizzle ORM |
| Validation | Zod (server-side schemas in `src/schemas.ts`; shared via `lib/api-zod`) |
| AI — Scoring | Anthropic Claude (`claude-haiku-4-5`) — export readiness scoring |
| AI — Documents | Anthropic Claude (`claude-sonnet-4-6`) — compliance document generation |
| Email | Resend — transactional emails via `artifacts/api-server/src/lib/email.ts` |
| Messaging | Twilio WhatsApp Business API |
| Auth | HTTP-only cookie sessions (`fincava_auth`), bcrypt password hashing |
| Logging | Pino (structured JSON logs) |
| Package manager | pnpm v10 |

---

## 4. Database Schema

All tables live in `lib/db/src/schema/` and are managed by Drizzle ORM.

### 4.1 Users & Auth
| Table | Purpose |
|---|---|
| `users` | Authentication — email, bcrypt password, role (`BUYER`, `SUPPLIER`, `ADMIN`), phone, `emailVerifiedAt` (timestamp, nullable — NULL = unverified) |
| `companies` | Company linked 1:1 to a user — name, tax ID, address, type |
| `profiles` | Extended user profile — firstName, lastName |
| `password_reset_tokens` | Password reset tokens — `token` (unique), `user_id` (FK), `expires_at`, `used` (boolean) |
| `email_verification_tokens` | Email verification tokens — `token` (unique), `user_id` (FK), `expires_at`, `used` (boolean) |

### 4.2 Suppliers
| Table | Purpose |
|---|---|
| `suppliers` | Core profile — `nombreCompleto`, `whatsappNumber`, department, municipio, `supplierType` (`FARMER`, `COOPERATIVE`, `PROCESSOR`, `EXPORTER`), `status` (`PENDING`, `ACTIVE`, `INACTIVE`), graduation state fields: `sellableStatus`, `eligibilityStatus`, `commercialScore`, `graduationPathway`, `lastEvaluatedAt`, `thresholdVersion` |
| `farms` | Farm detail — land size, coordinates, production practices, linked to supplier |
| `economics` | Economic data — buyer types, export history, working capital, linked to supplier |
| `compliance_docs` | Current compliance state (1:1 with supplier, UNIQUE constraint on `supplier_id`). Fields: `rutDian`, `icaRegistro`, `fitosanitarioCert`, `dianExportador`. NOT a history table — represents latest state only |
| `certifications` | Certifications held (Fairtrade, Organic, RainForest Alliance, etc.) |
| `interactions` | Officer-recorded field visits and onboarding interactions. Expanded compliance metadata stored in JSONB column |
| `trust_scores` | Supplier trust/reliability scores |

### 4.3 Supplier Graduation (Epic 1)
| Table | Purpose |
|---|---|
| `supplier_evaluations` | Append-only snapshot per evaluation run — `eligibilityStatus`, `commercialScore`, `sellableStatus`, `pathway`, `scoreSnapshot` (JSONB), `thresholdVersion`. Never mutated after insert |
| `supplier_state_transitions` | Audit log of every state change — `fromState`, `toState`, `actor` (`SYSTEM`, `ADMIN`, `FOUNDER`), `justification`, `evaluationId` (FK to evaluation that triggered transition), `thresholdVersion` |

### 4.4 AI Outputs
| Table | Purpose |
|---|---|
| `ai_outputs` | One row per Claude API call — `callType` (`ONBOARD_SCORE`, `DOCUMENT_GENERATION`), `exportReadinessScore` (0–100), `pathway` (`A`, `B`, `C`, `D`), `capitalCapacityCop`, `complianceGaps`, `gapAnalysis`, `documentContent`, `whatsappMessageSent` (Twilio SID) |

### 4.5 Marketplace
| Table | Purpose |
|---|---|
| `products` | Marketplace catalog — linked to company (supplier), category, price (`pricePerKgUSD`), certifications, images, origin story |
| `origin_stories` | Human narrative behind a farm/cooperative |
| `product_analytics` | Product view and engagement tracking |

### 4.6 Transactions
| Table | Purpose |
|---|---|
| `inquiries` | Buyer-to-supplier leads — `productId` (FK), `buyerEmail`, `buyerName`, `company`, `country`, `message`, `quantityKg`, `status` (`PENDING`, `RESPONDED`, `CLOSED`) |
| `rfqs` | Request-for-Quote documents — `buyerId`, `title`, `productCategory`, `quantityKg`, `targetPriceUSD`, `destination`, `deadline`, `status` (`OPEN`, `AWARDED`, `CLOSED`) |
| `rfq_responses` | Supplier responses to RFQs — `rfqId`, `supplierId`, `pricePerKgUSD`, `leadTimeDays`, `message`, `awarded` |
| `orders` | Order lifecycle — `buyerId`, `status` (`INQUIRY`, `SAMPLE_REQUESTED`, `QUOTED`, `CONFIRMED`, `IN_PRODUCTION`, `SHIPPED`, `DELIVERED`, `COMPLETED`, `CANCELLED`), `totalUSD`, `incoterm`, `destinationPort`, `shippingMethod` |
| `order_items` | Line items per order — `orderId`, `productId`, `quantityKg`, `pricePerKg`, `totalUSD` |
| `shipments` | Shipment tracking per order |
| `trade_history` | Historical trade records |

### 4.7 Finance
| Table | Purpose |
|---|---|
| `loans` | Trade finance loans — `buyerId`, `orderId` (optional FK), `principalUSD`, `feeUSD`, `totalRepaymentUSD`, `aprPercent`, `termDays`, `status` (`ACTIVE`, `REPAID`, `DEFAULTED`, `CANCELLED`), `dueAt`, `creditScoreAtIssuance` |
| `repayments` | Individual repayment records against a loan |
| `payment_milestones` | Scheduled payment milestones |
| `subscriptions` | Subscription / plan management |

### 4.8 Communication & Operations
| Table | Purpose |
|---|---|
| `messages` | In-platform messaging between buyers and suppliers |
| `reviews` | Buyer reviews of suppliers/products |
| `staff_roles` | Staff role assignments |
| `compliance_requirements` | Configurable compliance requirement definitions |

---

## 5. API Routes

Base path: `/api`

### Auth — `src/routes/auth.ts`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register new user + company. Sends verification email |
| POST | `/auth/login` | None | Authenticate, sets `fincava_auth` cookie (7-day HTTP-only) |
| POST | `/auth/logout` | None | Clears `fincava_auth` cookie |
| GET | `/auth/me` | Cookie | Current user profile |
| POST | `/auth/forgot-password` | None | Creates reset token, sends `passwordResetEmail`. Neutral response regardless of email existence (no enumeration) |
| POST | `/auth/reset-password` | None | Validates token, updates password, marks token `used`. Requires `?token=` query param |
| GET | `/auth/verify-email` | None | Verifies email token, stamps `emailVerifiedAt`. Returns 400 on invalid/used/expired token. Requires `?token=` |
| POST | `/auth/resend-verification` | Cookie | Sends new verification email. Returns 409 if already verified |

### Suppliers — `src/routes/suppliers.ts`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/suppliers/onboard` | None | Multi-step supplier registration. Triggers Claude scoring async (fire-and-forget with retry). Initialises `compliance_docs` idempotently |
| GET | `/suppliers` | Admin | Paginated supplier list with evaluation fields — ADMIN-only |
| GET | `/suppliers/marketplace` | None | Buyer-facing listing — returns `SELLABLE` and `PUBLISHED` suppliers only |
| GET | `/suppliers/admin-list` | Admin | Paginated admin list with AI scores + `whatsappMessageSent` |
| GET | `/suppliers/:id` | Admin | Supplier detail — ADMIN-only |
| GET | `/suppliers/:id/evaluations` | Admin | Full evaluation history (DESC, limit 20) |
| GET | `/suppliers/:id/transitions` | Admin | State transition history (DESC, limit 20) |
| GET | `/suppliers/:id/document` | Admin | Latest generated compliance document |
| POST | `/suppliers/:id/generate-document` | Admin | Trigger Claude document generation |
| POST | `/suppliers/:id/send-whatsapp` | Admin | Manual WhatsApp message trigger |

### Admin Graduation — `src/routes/suppliers.ts` (admin-guarded)
| Method | Path | Description |
|---|---|---|
| POST | `/admin/suppliers/:id/transition` | Manual state override. Requires `actor` (`ADMIN` or `FOUNDER`) and `justification`. `SYSTEM` actor is blocked at route layer |
| POST | `/admin/suppliers/:id/publish` | Explicit `SELLABLE → PUBLISHED` gate. Requires `justification`. Returns 409 if supplier is not `SELLABLE` |
| PATCH | `/admin/suppliers/:id/status` | Update supplier operational status. Body: `{ status: "PENDING"\|"ACTIVE"\|"INACTIVE", reason?: "REJECTED"\|"SUSPENDED" }`. `reason` required when `status = "INACTIVE"`. Triggers `supplierStatusChangeEmail` |

### Admin — `src/routes/admin.ts`
| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Dashboard KPIs — user count, supplier count, order count, loan totals |
| GET | `/admin/users` | All users with company + phone |
| POST | `/admin/users` | Create user + optional company. Triggers `adminCreatedAccountEmail` |
| PATCH | `/admin/users/:id` | Update user (upserts company row if missing). Triggers `adminRoleChangeEmail` if role changes |
| DELETE | `/admin/users/:id` | Delete user |
| POST | `/admin/users/:id/reset-password` | Admin-forced password reset. Triggers `adminPasswordResetEmail` |
| GET | `/admin/orders` | All orders with buyer info |
| GET | `/admin/loans` | All loans with credit/status info |
| PATCH | `/admin/loans/:id/status` | Update loan status. Body: `{ status: "ACTIVE"\|"REPAID"\|"DEFAULTED"\|"CANCELLED" }`. Triggers `loanStatusEmail` |

### Products — `src/routes/products.ts`
| Method | Path | Description |
|---|---|---|
| GET | `/products` | Browse marketplace (filter by origin, cert, score) |
| GET | `/products/:id` | Product detail |
| POST | `/products` | Create listing (supplier) |
| PATCH | `/products/:id` | Update listing |
| DELETE | `/products/:id` | Remove listing |

### Orders — `src/routes/orders.ts`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/buyer/orders` | Cookie + verifiedEmail | Create order. Body: `{ incoterm?, destinationPort?, shippingMethod?, notes?, items: [{ productId, quantityKg }] }`. Calculates total from `pricePerKgUSD` |
| GET | `/buyer/orders` | Cookie | List buyer's orders |
| GET | `/buyer/orders/:id` | Cookie | Order detail with line items |
| GET | `/supplier/orders` | Cookie | List orders containing supplier's products |
| PATCH | `/supplier/orders/:id/status` | Cookie | Advance order status. Ownership check: supplier must have a product in the order. Triggers `orderStatusEmail` to buyer |

### Inquiries — `src/routes/inquiries.ts`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/inquiries` | Cookie | Create inquiry about a product. Body: `{ productId, buyerEmail, buyerName, company?, country?, message, quantityKg? }`. Triggers `newInquiryEmail` to supplier |
| GET | `/buyer/inquiries` | Cookie | List buyer's submitted inquiries |
| GET | `/supplier/inquiries` | Cookie | List inquiries about supplier's products |
| PATCH | `/supplier/inquiries/:id` | Cookie | Supplier responds to inquiry |

### RFQs — `src/routes/rfqs.ts`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/rfqs` | None | List open RFQs (public) |
| GET | `/rfqs/:id` | None | RFQ detail (public) |
| POST | `/rfqs` | Cookie | Create RFQ. Body: `{ title, description, productCategory, quantityKg, targetPriceUSD?, destination, destinationPort?, incoterm?, deadline }` |
| POST | `/rfqs/:id/respond` | Cookie (supplier) | Supplier responds to RFQ. Body: `{ pricePerKgUSD, leadTimeDays, message }`. Triggers `rfqResponseEmail` to buyer |
| POST | `/rfqs/:id/award/:responseId` | Cookie | Award RFQ to a supplier response |
| GET | `/buyer/rfqs` | Cookie | List buyer's RFQs |
| GET | `/supplier/rfqs` | Cookie | List RFQs with supplier's responses |

### Finance — `src/routes/financing.ts`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/finance/credit` | Cookie | Buyer's credit score + available limit |
| GET | `/finance/loans` | Cookie | Buyer's loan history |
| POST | `/finance/loan` | Cookie + verifiedEmail | Apply for loan. Body: `{ principalUSD, termDays?, aprPercent?, orderId? }`. Credit limit enforced |
| POST | `/finance/repay` | Cookie | Record repayment against an active loan |

### Platform Stats — `src/routes/admin.ts`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stats/platform` | None | Public KPIs — supplier count, order count, active loan value, total loan principal |

---

## 6. Feature Descriptions

### 6.1 Supplier Onboarding + AI Scoring

New suppliers submit a multi-step registration form (personal info, location, farm, production, compliance). On submission, `scoreSupplier()` is called fire-and-forget. It calls Claude Haiku with a structured prompt and includes:

- **Retry logic**: max 3 attempts, exponential backoff (1 s → 2 s → 4 s), retries on all error types
- **Latency logging**: Claude API call duration logged via `logger.info { supplierId, duration }`
- **Output validation**: `Number.isFinite(export_readiness_score)` enforced before insert — invalid responses throw and trigger retry
- **Failure visibility**: after all retries exhausted, `logger.error` + Sentry capture. No silent drops

Claude returns:
- `export_readiness_score` (0–100)
- `pathway` (`A` / `B` / `C` / `D`)
- `capital_capacity_cop` (estimated capital in Colombian pesos)
- `compliance_gaps` (array)
- `gap_analysis` (narrative)

Results are stored in `ai_outputs`. On success, a WhatsApp message is sent to the supplier's registered number via Twilio.

The `compliance_docs` row is initialised with all fields set to `false` using `ON CONFLICT (supplier_id) DO NOTHING` — retrying onboarding never overwrites existing compliance state.

**ICA sync (P0.1):** `ica_registered` from the onboarding body is now synced into `compliance_docs.ica_registro` at submission time. Two-step: INSERT seeds value, conditional UPDATE for `true` only (upgrade-only, never downgrades).

### 6.2 Supplier Graduation State Machine (Epic 1)

After AI scoring, `evaluateSupplier()` in `src/services/supplier-graduation-service.ts` runs asynchronously (via `setImmediate`, max 3 retries). It computes the supplier's readiness state and writes an immutable snapshot.

**States:**
```
NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED
```

**Transition rules:**

| State | Condition |
|---|---|
| `NOT_READY` | eligibility FAIL, or `commercialScore < 30` |
| `ELIGIBLE` | eligibility PASS + `30 ≤ score < 60` |
| `SELLABLE` | eligibility PASS + `score ≥ 60` (SYSTEM auto-transition) |
| `PUBLISHED` | ADMIN or FOUNDER explicit publish only (`SELLABLE → PUBLISHED` gate) |

**Eligibility requirements** (all must be true):
- `rutDian`
- `icaRegistration`
- `fitosanitario`
- `consentGiven`

**Thresholds** (`lib/config/thresholds.ts`, version `v0_pre_buyer_calls`):
- `sellableMin`: 60
- `partialMin`: 30

### 6.3 Transactional Email System

All transactional emails are sent via **Resend** (`artifacts/api-server/src/lib/email.ts`). Requires `RESEND_API_KEY` secret and verified sending domain (`noreply@fincava.com`).

**Fire-and-forget pattern:** every email hook uses `Promise.resolve().then(async () => { ... }).catch(err => logger.warn(...))` — the HTTP response is always delivered regardless of email send result.

| Template | Trigger | Recipient |
|---|---|---|
| `welcomeEmail` | User registration | New user |
| `passwordResetEmail` | `POST /auth/forgot-password` | User |
| `adminCreatedAccountEmail` | `POST /admin/users` | New user created by admin |
| `adminPasswordResetEmail` | `POST /admin/users/:id/reset-password` | Affected user |
| `adminRoleChangeEmail` | `PATCH /admin/users/:id` (role change) | Affected user |
| `supplierStatusChangeEmail` | `PATCH /admin/suppliers/:id/status` | Supplier |
| `newInquiryEmail` | `POST /inquiries` | Supplier (product owner) |
| `rfqResponseEmail` | `POST /rfqs/:id/respond` | Buyer (RFQ owner) |
| `orderStatusEmail` | `PATCH /supplier/orders/:id/status` | Buyer (order owner) |
| `loanStatusEmail` | `PATCH /admin/loans/:id/status` | Buyer (loan holder) |

### 6.4 Email Verification

On registration, a verification token is created and a verification email is sent. Until verified, `emailVerifiedAt` remains `NULL`.

- `GET /api/auth/verify-email?token=` — validates token, stamps `emailVerifiedAt`
- `POST /api/auth/resend-verification` — sends new token (409 if already verified)
- `requireVerifiedEmail` middleware blocks `POST /api/buyer/orders` and `POST /api/finance/loan` with 403

Frontend: `/verify-email` page handles loading → success/error states based on `?token=` param. Dashboard shows a persistent banner for unverified users.

### 6.5 Registration Flow UX

The registration page (`/register`) supports two entry paths:

- **With role param** (`/register?role=supplier` or `?role=buyer`): skips the role picker entirely and opens at Step 2 (Account Details)
- **Without param**: shows the role picker at Step 1. Clicking a card immediately advances to Step 2

Supplier registration is a 6-step flow: Role → Account → Farm → Production → Readiness → Review. Buyer registration is 2 steps: Role → Account.

### 6.6 Document Generation
Admins can trigger a compliance document for any supplier via "Gen Doc". Claude Sonnet generates a formatted document (stored as plain text in `ai_outputs.documentContent`). The admin can open it in the DocModal viewer (with Download-as-TXT), or re-open the last generated document via "View Last".

### 6.7 WhatsApp Notifications (Twilio)
- **Automatic**: fires immediately after successful AI scoring on onboarding
- **Manual**: "Send WA" button in the admin supplier table — sends a Spanish-language summary with score and pathway
- Phone normalisation: E.164 format, strips spaces, adds `+57` Colombia prefix if missing
- The Twilio message SID is stored in `ai_outputs.whatsappMessageSent`

### 6.8 Admin Console
Full CRUD for users and suppliers:
- **Users**: create (with company + welcome email), edit (role change triggers notification email), reset password (triggers security notice), delete
- **Suppliers**: status controls (`ACTIVE`, `INACTIVE+reason`), graduation state controls (`transition`, `publish`), pathway badge, AI score display, document viewer, WhatsApp trigger
- **Orders**: view all orders across all buyers
- **Loans**: view all loans, update status (triggers notification email)
- Filtering, search, pagination throughout

### 6.9 Embedded Trade Finance
Buyers (with verified emails) can apply for trade finance loans linked to specific orders. Credit scoring determines available limit. The finance dashboard tracks loan status, APR, outstanding balance, and repayment schedule. Admin can update loan status triggering buyer notification.

### 6.10 Multilingual Support

All frontend UI strings are served from `LanguageContext` (English / Spanish). Key behaviours:

- **Device detection**: on first visit, `navigator.language` is checked. If it starts with `"es"`, Spanish is set automatically
- **Persistence**: saved to `localStorage` under key `"fincava_lang"`
- **Toggle**: EN/ES pill in the navbar

Translation strings live in `src/i18n/translations.ts`.

### 6.11 Supplier Marketplace (Validation Surface — Temporary)

Route `/supplier-marketplace` is an isolated thin UI for internal validation of the graduation pipeline end-to-end. It is not part of the product marketplace and must not be expanded.

- No filters, search, or pagination
- Displays `SELLABLE` and `PUBLISHED` suppliers only
- Marked for removal or redesign in Phase II

---

## 7. Key Integrations

| Service | Purpose | Config |
|---|---|---|
| Anthropic Claude Haiku | AI scoring | `ANTHROPIC_API_KEY`, `ANTHROPIC_SCORING_MODEL` |
| Anthropic Claude Sonnet | Document generation | `ANTHROPIC_API_KEY`, `ANTHROPIC_DOCUMENT_MODEL` |
| Resend | Transactional emails (all system emails) | `RESEND_API_KEY` (secret); `noreply@fincava.com` must be verified domain |
| Twilio WhatsApp | Supplier notifications | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` |
| PostgreSQL | Primary datastore | `DATABASE_URL` (Replit-managed) |

---

## 8. Auth & Security

- Passwords hashed with **bcrypt** (10 rounds)
- Sessions managed via **HTTP-only cookies** — cookie name `fincava_auth`, 7-day expiry, `httpOnly: true`, `secure: true` in production, `sameSite: lax`
- `requireAuth` middleware reads session from cookie (not Authorization header)
- All admin and supplier-mutating routes are behind `requireAuth` + `requireAdmin` middleware
- `requireVerifiedEmail` middleware guards order creation and loan applications — returns 403 for unverified users
- Request bodies validated with Zod schemas before reaching business logic
- Admin graduation routes block `SYSTEM` actor usage at the route layer
- `GET /api/suppliers` and `GET /api/suppliers/:id` are ADMIN-only (P0.2 + P0.4 fixes)
- Password reset tokens stored in `password_reset_tokens` table, marked `used = true` on consumption
- Email verification tokens stored in `email_verification_tokens` table
- Forgot-password endpoint returns neutral message regardless of email existence (prevents enumeration)

---

## 9. Deployment

The app is published via **Replit's native deployment system**.

| Artifact | Production mode |
|---|---|
| `artifacts/fincava` | Static — built with Vite, served from `artifacts/fincava/dist/public` |
| `artifacts/api-server` | Process — `node --enable-source-maps artifacts/api-server/dist/index.mjs` |

Replit handles build, hosting, TLS, health checks (path: `/api/healthz`), and path-based routing.

Note: `/api/health` (no `z`) is NOT registered and returns 404. Use `/api/healthz` for health checks.

GitHub is used as a source-control mirror. The Replit project is the source of truth.

---

## 10. Local Development Workflows

| Workflow | Command |
|---|---|
| API Server | `pnpm --filter @workspace/api-server run dev` |
| Frontend | `pnpm --filter @workspace/fincava run dev` |
| Component Preview | `pnpm --filter @workspace/mockup-sandbox run dev` |
| DB schema push | `psql $DATABASE_URL` (direct SQL — avoids interactive drizzle-kit prompts) |

Server ports: API on `8080`, Vite on `25876`, Component Preview on `8081`.

---

## 11. Known Gaps / Planned Work

| Area | Status | Description |
|---|---|---|
| No job queue | Open | `scoreSupplier` and `evaluateSupplier` run via `setImmediate` (fire-and-forget). Jobs can be lost on process crash. Phase II: database-backed job queue |
| Thin marketplace UI | Open | `/supplier-marketplace` is a validation surface only — not buyer-ready. Phase II: pagination, filtering, search, sorting |
| Register page shell translations | Open | Card title, field labels, button text, and Zod validation error messages in `register.tsx` are still English-only |
| Mobile navbar | Open | Language toggle and nav links not yet adapted for mobile viewports |
| Compliance history | Open | `compliance_docs` stores current state only. Audit history requires a separate `compliance_docs_history` table (do not remove UNIQUE constraint) |
| Buyer supplier detail route | Open | `SupplierDetail` currently calls ADMIN-only `GET /api/suppliers/:id`. Requires sanitized buyer-facing route before Epic 2 UI work |
| `/api/health` missing | Minor | `/api/health` returns 404. Use `/api/healthz`. Add simple health route before using load balancer health checks |
| Email domain verification | Config | `noreply@fincava.com` must be verified in Resend dashboard for email delivery. Dev sends are no-ops (WARN log) if `RESEND_API_KEY` unset |
| Public supplier dataset exposure | FIXED (P0.2) | GET /api/suppliers now ADMIN-only. Buyer surface via /suppliers/marketplace |
| GET /suppliers/:id unguarded | FIXED (P0.4) | requireAuth + requireAdmin applied. ADMIN-only in v0 |
| ICA sync disconnect | FIXED (P0.1) | ica_registered from onboarding now syncs to compliance_docs.ica_registro |

---

## Changelog

| Date | Change |
|---|---|
| Apr 2026 (initial) | Document created — reflects codebase at commit `faeb902` |
| Apr 2026 | Step 3 Export Readiness expanded: 6 new compliance fields, MultiChoice component, COP capital label |
| Apr 2026 | Registration flow UX: `?role=` params on all home CTAs, skip-role-picker logic, click-to-advance role cards |
| Apr 2026 | Language system: device-language detection via `navigator.language`, live `lang` prop wired into all registration sub-components |
| Apr 2026 | Epic 1 — Supplier Graduation State Machine: full pipeline, threshold versioning, audit tables |
| Apr 2026 | Compliance model hardened: `compliance_docs` UNIQUE constraint, `ON CONFLICT DO NOTHING` on onboard insert |
| Apr 2026 | `scoreSupplier` hardened: retry logic (3 attempts), latency logging, `Number.isFinite` validation, Sentry on final failure |
| Apr 2026 | Admin graduation routes: transition + publish with SELLABLE gate |
| Apr 2026 | Marketplace API: SELLABLE/PUBLISHED filter, evaluation + transition history endpoints |
| Apr 2026 | AI model split: scoring → `claude-haiku-4-5`, document generation → `claude-sonnet-4-6` |
| Apr 2026 | `lib/config/thresholds.ts` introduced — versioned, immutable threshold definitions |
| 2026-04-23 | P0.1 — ICA sync fix |
| 2026-04-23 | P0.2 — GET /api/suppliers restricted to ADMIN-only |
| 2026-04-23 | P0.4 — GET /api/suppliers/:id restricted to ADMIN-only |
| 2026-04-24 | Epic 2 T1 — SupplierOnboardingInput normalization layer |
| 2026-04-24 | Epic 2 T2 — buildScoringInput abstraction layer |
| Apr 2026 (late) | Auth migrated to HTTP-only cookie sessions (`fincava_auth`). JWT Bearer tokens removed |
| Apr 2026 (late) | Email infrastructure: Resend integration, 10 transactional email templates, fire-and-forget hooks throughout API |
| Apr 2026 (late) | Email verification: `email_verification_tokens` table, `users.emailVerifiedAt`, verify/resend routes, `requireVerifiedEmail` middleware, frontend `/verify-email` page, dashboard banner |
| Apr 2026 (late) | Role-change notification: `adminRoleChangeEmail` triggered on admin role update |
| Apr 2026 (late) | Full transaction layer: orders (buyer/supplier), RFQs, inquiries, trade finance (loans/repayments) |
| Apr 2026 (late) | `password_reset_tokens` table: token lifecycle with `used` flag, `POST /auth/forgot-password` sends real email |
| Apr 2026 (late) | `GET /api/stats/platform` — public platform KPIs endpoint |
| Apr 2026 (late) | 9-suite E2E test campaign — all suites PASS |
