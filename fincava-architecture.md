# Fincava — Architecture Document
**Colombian Agricultural Marketplace**
*Updated April 2026*

---

## 1. Project Overview

Fincava is a B2B marketplace and supply-chain financing platform that connects Colombian smallholder farmers and cooperatives with international buyers. The platform covers the full commercial journey: supplier onboarding and AI scoring, a state machine that graduates suppliers to marketplace readiness, product discovery, RFQ/inquiry management, order tracking, embedded trade finance, and post-sale communications via WhatsApp. The frontend is fully bilingual (English / Spanish) with device-language detection.

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
| Messaging | Twilio WhatsApp Business API |
| Auth | JWT (Bearer tokens), bcrypt password hashing |
| Logging | Pino (structured JSON logs) |
| Package manager | pnpm v10 |

---

## 4. Database Schema

All tables live in `lib/db/src/schema/` and are managed by Drizzle ORM.

### 4.1 Users & Auth
| Table | Purpose |
|---|---|
| `users` | Authentication — email, bcrypt password, role (`BUYER`, `SUPPLIER`, `ADMIN`), phone |
| `companies` | Company linked 1:1 to a user — name, tax ID, address |
| `profiles` | Extended user profile data |

### 4.2 Suppliers
| Table | Purpose |
|---|---|
| `suppliers` | Core profile — `nombreCompleto`, `whatsappNumber`, department, municipio, `supplierType` (`FARMER`, `COOPERATIVE`, `PROCESSOR`, `EXPORTER`), `status` (`PENDING`, `ACTIVE`, `INACTIVE`), graduation state fields: `sellableStatus`, `eligibilityStatus`, `commercialScore`, `graduationPathway`, `lastEvaluatedAt`, `thresholdVersion` |
| `farms` | Farm detail — land size, coordinates, production practices, linked to supplier |
| `economics` | Economic data — buyer types, export history, working capital, linked to supplier |
| `compliance_docs` | Current compliance state (1:1 with supplier, UNIQUE constraint on `supplier_id`). Fields: `rutDian`, `icaRegistro`, `fitosanitarioCert`, `dianExportador`. NOT a history table — represents latest state only |
| `certifications` | Certifications held (Fairtrade, Organic, RainForest Alliance, etc.) |
| `interactions` | Officer-recorded field visits and onboarding interactions. Expanded compliance metadata stored in JSONB column (see Section 6.1) |
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
| `products` | Marketplace catalog — linked to supplier, category, price, certifications, origin story |
| `origin_stories` | Human narrative behind a farm/cooperative |
| `product_analytics` | Product view and engagement tracking |

### 4.6 Transactions
| Table | Purpose |
|---|---|
| `inquiries` | Buyer-to-supplier leads |
| `rfqs` | Request-for-Quote documents |
| `rfq_responses` | Supplier responses to RFQs |
| `orders` | Order lifecycle — status (`PENDING`, `CONFIRMED`, `SHIPPED`, `COMPLETED`, `CANCELLED`) |
| `order_items` | Line items per order |
| `shipments` | Shipment tracking per order |
| `trade_history` | Historical trade records |

### 4.7 Finance
| Table | Purpose |
|---|---|
| `loans` | Trade finance loans — amount, APR, status (`PENDING`, `APPROVED`, `ACTIVE`, `REPAID`, `DEFAULTED`) |
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
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user (with optional company) |
| POST | `/auth/login` | Authenticate, returns JWT |
| GET | `/auth/me` | Current user profile |

### Suppliers — `src/routes/suppliers.ts`
| Method | Path | Description |
|---|---|---|
| POST | `/suppliers/onboard` | Multi-step supplier registration. Triggers Claude scoring (async, fire-and-forget with retry). Initialises `compliance_docs` row idempotently (`ON CONFLICT DO NOTHING`) |
| GET | `/suppliers` | Paginated supplier list with evaluation fields (`sellableStatus`, `eligibilityStatus`, `commercialScore`) |
| GET | `/suppliers/marketplace` | Buyer-facing listing — returns `SELLABLE` and `PUBLISHED` suppliers only |
| GET | `/suppliers/admin-list` | Paginated admin list with AI scores + `whatsappMessageSent` |
| GET | `/suppliers/:id` | Supplier detail with evaluation fields |
| GET | `/suppliers/:id/evaluations` | Full evaluation history (DESC, limit 20) |
| GET | `/suppliers/:id/transitions` | State transition history (DESC, limit 20) |
| GET | `/suppliers/:id/document` | Latest generated compliance document |
| POST | `/suppliers/:id/generate-document` | Trigger Claude document generation |
| POST | `/suppliers/:id/send-whatsapp` | Manual WhatsApp message trigger (admin only) |

### Admin Graduation — `src/routes/suppliers.ts` (admin-guarded)
| Method | Path | Description |
|---|---|---|
| POST | `/admin/suppliers/:id/transition` | Manual state override. Requires `actor` (`ADMIN` or `FOUNDER`) and `justification`. `SYSTEM` actor is blocked at route layer |
| POST | `/admin/suppliers/:id/publish` | Explicit `SELLABLE → PUBLISHED` gate. Requires `justification`. Returns 409 if supplier is not `SELLABLE` |

### Admin — `src/routes/admin.ts`
| Method | Path | Description |
|---|---|---|
| GET | `/admin/users` | All users with company + phone |
| POST | `/admin/users` | Create user + optional company |
| PATCH | `/admin/users/:id` | Update user (upserts company row if missing) |
| DELETE | `/admin/users/:id` | Delete user |
| PATCH | `/admin/suppliers/:id/status` | Update supplier status |
| GET | `/admin/stats` | Dashboard KPIs |

### Products — `src/routes/products.ts`
| Method | Path | Description |
|---|---|---|
| GET | `/products` | Browse marketplace (filter by origin, cert, score) |
| GET | `/products/:id` | Product detail |
| POST | `/products` | Create listing (supplier) |
| PATCH | `/products/:id` | Update listing |
| DELETE | `/products/:id` | Remove listing |

### Orders & Finance
| Method | Path | Description |
|---|---|---|
| GET/POST | `/orders` | List / create orders |
| PATCH | `/orders/:id/status` | Advance order status |
| GET/POST | `/financing/loans` | List / apply for trade finance loans |
| POST | `/financing/loans/:id/repayments` | Record repayment |

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

**Extended compliance fields (Step 3 — Export Readiness):**

The Step 3 form captures richer compliance assessment. The following fields are stored in `interactions.metadata` (JSONB):

| Field | Type | Options |
|---|---|---|
| `has_rut` | 5-choice | Yes / In progress / Applied, awaiting / No — planning to / No — not aware |
| `has_bank_account` | 3-choice | Yes, personal / Yes, business / No |
| `business_structure` | choice | Persona natural / SAS / Ltda / Cooperativa / Asociación / Other |
| `part_of_cooperative` | yes/no | Yes / No |
| `vuce_registered` | yes/no | Yes / No |
| `invima_required` | yes/no | Yes / No |
| `invima_approved` | yes/no | Yes / No |
| `ica_registered` | yes/no | Yes / No |
| `working_capital_needed` | numeric | COP amount |
| `export_blocker` | text | Free text description of main blocker |

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

Thresholds are versioned and immutable — bumping creates a new export, old versions are preserved for replay.

**Actors:**
- `SYSTEM` — automated, forward-only transitions, always linked to an `evaluationId`
- `ADMIN` / `FOUNDER` — manual overrides, `justification` always required, no exceptions

**Compliance model:**
- `compliance_docs` is a 1:1 current-state table (UNIQUE constraint on `supplier_id`)
- History is NOT tracked here — if audit history is needed in future, use a separate `compliance_docs_history` append-only table; do not remove the UNIQUE constraint

### 6.3 Registration Flow UX

The registration page (`/register`) supports two entry paths:

- **With role param** (`/register?role=supplier` or `?role=buyer`): skips the role picker entirely and opens at Step 2 (Account Details)
- **Without param**: shows the role picker at Step 1. Clicking a card immediately advances to Step 2

Supplier registration is a 6-step flow: Role → Account → Farm → Production → Readiness → Review. Buyer registration is 2 steps: Role → Account.

### 6.4 Document Generation
Admins can trigger a compliance document for any supplier via "Gen Doc". Claude Sonnet generates a formatted document (stored as plain text in `ai_outputs.documentContent`). The admin can open it in the DocModal viewer (with Download-as-TXT), or re-open the last generated document via "View Last".

### 6.5 WhatsApp Notifications (Twilio)
- **Automatic**: fires immediately after successful AI scoring on onboarding
- **Manual**: "Send WA" button in the admin supplier table — sends a Spanish-language summary with score and pathway
- Phone normalisation: E.164 format, strips spaces, adds `+57` Colombia prefix if missing
- The Twilio message SID is stored in `ai_outputs.whatsappMessageSent`

### 6.6 Admin Console
Full CRUD for users and suppliers:
- **Users**: create (with company), edit (upserts company row), delete, role management
- **Suppliers**: status controls, graduation state controls (`transition`, `publish`), pathway badge, AI score display, document viewer, WhatsApp trigger
- Filtering by product type, status, search (name/location)
- Pagination

### 6.7 Embedded Trade Finance
Buyers can apply for trade finance loans linked to specific orders. The finance dashboard tracks loan status, APR, outstanding balance, and repayment schedule.

### 6.8 Multilingual Support

All frontend UI strings are served from `LanguageContext` (English / Spanish). Key behaviours:

- **Device detection**: on first visit, `navigator.language` is checked. If it starts with `"es"`, Spanish is set automatically
- **Persistence**: saved to `localStorage` under key `"fincava_lang"`
- **Toggle**: EN/ES pill in the navbar
- **Registration steps**: `StepFarmIdentity`, `StepProduction`, `StepBusinessReadiness`, and `ReviewSummary` all receive the live `lang` prop and render bilingual content

Translation strings live in `src/i18n/translations.ts`.

### 6.9 Supplier Marketplace (Validation Surface — Temporary)

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
| Twilio WhatsApp | Supplier notifications | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` |
| PostgreSQL | Primary datastore | `DATABASE_URL` (Replit-managed) |

---

## 8. Auth & Security

- Passwords hashed with **bcrypt** (10 rounds)
- Sessions managed via **JWT** — signed with `JWT_SECRET`, 7-day expiry
- All admin and supplier-mutating routes are behind `requireAuth` + `requireAdmin` middleware
- Request bodies validated with Zod schemas before reaching business logic
- Admin graduation routes block `SYSTEM` actor usage at the route layer

---

## 9. Deployment

The app is published via **Replit's native deployment system**.

| Artifact | Production mode |
|---|---|
| `artifacts/fincava` | Static — built with Vite, served from `artifacts/fincava/dist/public` |
| `artifacts/api-server` | Process — `node --enable-source-maps artifacts/api-server/dist/index.mjs` |

Replit handles build, hosting, TLS, health checks (path: `/api/healthz`), and path-based routing.

GitHub is used as a source-control mirror. The Replit project is the source of truth.

---

## 10. Local Development Workflows

| Workflow | Command |
|---|---|
| API Server | `pnpm --filter @workspace/api-server run dev` |
| Frontend | `pnpm --filter @workspace/fincava run dev` |
| Component Preview | `pnpm --filter @workspace/mockup-sandbox run dev` |
| DB schema push | `psql $DATABASE_URL` (direct SQL — avoids interactive drizzle-kit prompts) |

---

## 11. Known Gaps / Planned Work

| Area | Description |
|---|---|
| No job queue | `scoreSupplier` and `evaluateSupplier` run via `setImmediate` (fire-and-forget). Jobs can be lost on process crash. Phase II: database-backed job queue |
| Thin marketplace UI | `/supplier-marketplace` is a validation surface only — not buyer-ready. Phase II: pagination, filtering, search, sorting |
| Register page shell translations | Card title, field labels, button text, and Zod validation error messages in `register.tsx` are still English-only |
| Mobile navbar | Language toggle and nav links not yet adapted for mobile viewports |
| Compliance history | `compliance_docs` stores current state only. Audit history requires a separate `compliance_docs_history` table (do not remove UNIQUE constraint) |

---

## Changelog

| Date | Change |
|---|---|
| Apr 2026 (initial) | Document created — reflects codebase at commit `faeb902` |
| Apr 2026 | Step 3 Export Readiness expanded: 6 new compliance fields, MultiChoice component, COP capital label |
| Apr 2026 | Registration flow UX: `?role=` params on all home CTAs, skip-role-picker logic, click-to-advance role cards |
| Apr 2026 | Language system: device-language detection via `navigator.language`, live `lang` prop wired into all registration sub-components |
| Apr 2026 | Copy audit: em dashes replaced with commas/colons across `translations.ts`, `investors.tsx`, and `trust-badge.tsx` |
| Apr 2026 | Epic 1 — Supplier Graduation State Machine: `evaluateSupplier`, `transitionTo`, `markPublished`, state machine (NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED), threshold versioning, `supplier_evaluations` + `supplier_state_transitions` tables |
| Apr 2026 | Compliance model hardened: `compliance_docs` UNIQUE constraint on `supplier_id`, `ON CONFLICT DO NOTHING` on onboard insert, `ORDER BY id DESC LIMIT 1` defensive query |
| Apr 2026 | `scoreSupplier` hardened: retry logic (3 attempts, exponential backoff), latency logging, `Number.isFinite` output validation, `logger.error` + Sentry on final failure, outer `.catch()` removed |
| Apr 2026 | Admin graduation routes: `POST /admin/suppliers/:id/transition`, `POST /admin/suppliers/:id/publish` with SELLABLE gate (409) |
| Apr 2026 | Marketplace API: `GET /suppliers/marketplace` (SELLABLE/PUBLISHED only), evaluation + transition history endpoints |
| Apr 2026 | AI model split: scoring → `claude-haiku-4-5`, document generation → `claude-sonnet-4-6` |
| Apr 2026 | `lib/config/thresholds.ts` introduced — versioned, immutable threshold definitions |
| Apr 2026 | `ops/` directory: `execution_map.md`, `post_mvp_plan.md`, `epic_1_supplier_graduation.md`, `assets/` |
