# Fincava — Colombian Agricultural B2B Marketplace

## Overview
Fincava is a full-stack B2B trade platform designed to connect Colombian agricultural producers with international buyers, primarily in the Middle East, Asia, and Africa. The platform focuses on specialty products such as coffee, cacao, avocado, exotic fruits, and superfoods. Its core purpose is to streamline trade, provide market access, facilitate embedded finance, and improve distribution for emerging market commerce. The project aims to become the "Operating System for Emerging Market Commerce" across Latin America, moving beyond a traditional marketplace model.

Key capabilities include a unified supplier layer for onboarding and management, AI-driven supplier scoring, comprehensive B2B transaction flows (RFQ, Checkout), and detailed impact reporting to highlight direct trade and farmer support.

## User Preferences
The agent should prioritize iterative development. Ask before making major changes.

## System Architecture

Fincava is built as a pnpm workspace monorepo utilizing TypeScript.

### UI/UX Decisions
- Dismissible dark-green MVP banner on all pages.
- Mobile-first design for field officer dashboards.
- Investor-grade landing page with a 10-section layout, dark full-bleed hero, grid overlays, and primary-color headline emphasis.
- "Three Layers. One Operating System." deep dive on the `/platform` page.
- Investor page with dark background, emerald accents, and market opportunity focus.
- Product cards display farmer identity and impact flags.
- "Meet the Farmer" section on product detail pages.
- Marketplace sidebar includes impact filters (Direct Trade, Smallholder Farm, Women-Led Farm, Certified Organic).
- Dashboard analytics powered by Recharts, featuring stat cards, dual-axis line charts, bar charts, and pie charts.
- Updated navigation bar with consistent styling and active states.

### Technical Implementations
- **Monorepo Management**: pnpm workspaces for managing multiple packages.
- **Node.js & TypeScript**: Node.js v24 and TypeScript v5.9 are used across the project.
- **API Framework**: Express 5 for building robust APIs.
- **Database & ORM**: PostgreSQL as the primary database, managed with Drizzle ORM for schema definitions and migrations.
- **Validation**: Zod is used for schema validation, including `drizzle-zod` for integration with Drizzle.
- **API Codegen**: Orval generates API hooks and Zod schemas from an OpenAPI specification.
- **Build System**: esbuild is used for bundling into CJS.
- **Authentication**: JWTs are stored in httpOnly cookies (`fincava_auth`), with `requireAuth` middleware supporting both cookie and `Authorization: Bearer` header. Frontend uses `AuthContext` with `credentials: "include"`. bcrypt is used for password hashing with transparent legacy SHA-256 migration.
- **Authorization**: Two-tier role system. **Account roles** (`users.role` enum, stored in DB): BUYER, SUPPLIER, ADMIN, FIELD_OFFICER, EMPLOYEE — set at account creation and editable by admins. **Staff roles** (`staff_roles` table, multi-value): employee, field_officer, admin — assigned by admins on top of any account role via `/admin/team`. Shared `requireAdmin` middleware guards all admin routes. SUPPLIER role enforced on all `/supplier/products` routes; BUYER role on `POST /rfqs`; SUPPLIER role on `POST /rfqs/:id/respond`. Supplier onboard update path (supplierId in body) requires ADMIN auth checked before field validation. `GET /api/admin/team` returns `staffRoles` as a flat `string[]` per user; ADMIN account-type users are automatically included with a virtual `"admin"` staff role so the Admin tile count is always accurate.
- **Security**: Helmet for HTTP security headers; explicit allowedOrigins CORS (throws in production without `CORS_ORIGIN` env var); CSRF Origin-check middleware for POST/PUT/PATCH/DELETE; 1MB global JSON body limit. Password reset and email verification use hash-only token lookup (plaintext OR fallback removed). Storage upload URL requires auth + content-type allowlist; object serve requires auth + ACL ownership check with ADMIN bypass; POST `/storage/uploads/confirm` sets ACL after direct GCS upload.
- **Query Safety**: supplier/orders uses selectDistinct + batch fetch (no full-table scan); buyer/orders and rfq listings use batched profile/count queries (no N+1). Order listing endpoints support `?page`/`?pageSize` pagination (max 50).
- **Seed**: `ADMIN_DEFAULT_PASSWORD` env var required at startup; server throws (caught, logged) if missing so no hardcoded credentials are ever used.
- **Error Handling**: Global Express error handler with pino logging and standardized JSON error responses.
- **AI Integration**: Anthropic SDK for AI scoring, with model names configurable via environment variables.
- **Object Storage**: Integration with Google Cloud Storage (GCS) for product images, using presigned URLs for direct client uploads and server-side serving.
- **Email Infrastructure**: Resend SDK for sending emails, supporting supplier confirmations, admin alerts, status changes, and password reset flows. Email templates are centralized.
- **Observability**: Structured pino logs for key events (e.g., CONFIG_LOADED, SUPPLIER_ONBOARDED, PRODUCT_CREATED).
- **TypeScript Strictness**: All packages maintain clean typecheck exits.
- **Validation**: Extensive Zod validation for all API endpoints.
- **Ownership Checks**: Robust ownership verification for sensitive operations.
- **Pagination**: Standardized pagination for all admin list endpoints.
- **Concurrency Control**: `AbortController` implemented for cancelling in-flight requests on filter changes.
- **Frontend Data Handling**: All frontend fetch calls guard with `res.ok` before processing JSON.

### Admin-Controlled Public Content (Phase 2 — complete)
Two new DB tables and a full admin CRUD interface give the team control over every public-facing number and producer story without code changes.

**Tables:**
- `public_metrics` (11 cols): `metric_key` (unique), `page`, `section`, `label`, `value`, `source_type` (manual_verified | live_db | external_research), `source_note`, `last_verified_at`, `sort_order`, `is_visible`, `updated_at`.
- `public_stories` (10 cols): `story_key` (unique), `page`, `section`, `name`, `region`, `product`, `quote`, `photo_url`, `is_visible`, `sort_order`, `updated_at`.

**API routes** (`artifacts/api-server/src/routes/public-content.ts`):
- `GET /api/public-metrics` — public, `?page` / `?section` filters, returns only `is_visible=true` rows.
- `GET /api/public-stories` — public, returns only `is_visible=true` rows.
- `GET /api/admin/public-metrics` — admin-only, returns all rows.
- `PATCH /api/admin/public-metrics/:id` — update value, source, visibility, sort order.
- `GET /api/admin/public-stories` — admin-only, returns all rows.
- `POST /api/admin/public-stories` — create new story card.
- `PATCH /api/admin/public-stories/:id` — update any field.
- `DELETE /api/admin/public-stories/:id` — remove a story card.

**Admin pages:**
- `/admin/public-metrics` — table view grouped by page → section, inline editable value + source type/note, eye toggle for visibility.
- `/admin/stories` — card grid with toggle, edit modal, delete confirmation, add new story.
- Both linked in the admin sidebar nav.

**Frontend wiring:**
- `impact.tsx`: farmer voices section fetches from `/api/public-stories`. Section is completely hidden if 0 visible stories (no placeholder cards shown).
- `home.tsx` traction section already conditionally renders only if `stats.length > 0`; public metrics will populate it once an admin publishes rows.

### Compliance Certification Layer (complete)

Governs which phytosanitary, food-safety, and regulatory certificates a supplier must hold before export. Three interlocking services:

**Requirement Registry** (`gap-analysis-service.ts` — `REQUIREMENT_REGISTRY`):
Central map of every trackable certification. Each entry carries: human-readable label, responsible agency, severity (`CRITICAL` | `HIGH` | `MEDIUM`), estimated cost range (COP), resolution timeline (days), and a Spanish-language recommendation string pointing to the appropriate regulatory body. Current registered codes: ICA_PHYTO, ORGANIC_CERT, FAIR_TRADE, RAINFOREST, HACCP, ISO22000, BRC, GLOBALGAP, INVIMA.

**INVIMA Certification** (food-safety permit for processed/packaged goods — Ministerio de Salud):
- Applies to supplier categories: EXOTIC_FRUIT (dried/packaged), SUPERFOOD, PROCESSED.
- **Two-path detection** ensures no supplier is missed:
  1. **AI path**: Claude's scoring prompt includes `invimaRegistro` in its compliance field guide and rubric; gaps reported by AI flow through the standard `compliance_gaps` list.
  2. **Deterministic path** (independent safety net, runs after every scoring): normalises `cultivo_principal` against ~20 Spanish/English keywords (procesado, chocolate, deshidratado, superfood, spirulina, moringa, acai, maca, camu, etc.); if no keyword match, falls back to scanning the `products` table for any `EXOTIC_FRUIT`, `SUPERFOOD`, or `PROCESSED` category row. On match, inserts `{ requirementCode: "INVIMA", agency: "INVIMA", state: "not_started" }` via `onConflictDoNothing` — re-scoring never resets officer progress.

**Risk Pattern Service** (`risk-pattern-service.ts`):
Runs after every scoring cycle and compliance write-back; produces named `riskFlags` on each supplier record. Patterns evaluated in priority order:

| Code | Severity | Trigger condition |
|---|---|---|
| P1 `GRADUATION_BLOCKED` | critical | `isGraduated=false` + trust score ≥ 70 |
| P2 `LOW_TRUST_SCORE` | high | trust score < 40 |
| P3 `MISSING_CRITICAL_CERT` | critical | any CRITICAL_REQUIREMENTS code in `not_started` or `not_sure` |
| P4 `STALE_SUBMISSION` | medium | any CRITICAL cert doc in `submitted` state > 30 days |
| P5 `NO_COMPLIANCE_DATA` | high | `hasComplianceData=false` |
| P6 `PHYTO_SEQUENCING_RISK` | high | ICA_PHYTO exists but state is `not_started` or `not_sure` while at least one other cert is already `approved` — flags out-of-order sequencing |
| P7 `INVIMA_NOT_STARTED` | critical | INVIMA row exists with state `not_started` or `not_sure` — no export can proceed without it |

`CRITICAL_REQUIREMENTS` set: ICA_PHYTO, HACCP, ISO22000, BRC, GLOBALGAP, INVIMA.

**Compliance Queue UI enhancements:**
- Risk flag badges rendered inline on each supplier row: colour-coded by severity (red = critical, amber = high, slate = medium), with tooltip showing human-readable description. Badges hidden when no risk flags present.
- Review modal state machine mirrored in frontend: `ALLOWED_TRANSITIONS` map enforced client-side; the Review button is disabled for terminal states (`verified`, `rejected`) and the modal only offers valid next-state options based on current state — prevents illegal transitions without relying solely on server rejection.
- Discovery/ingestion page (`/admin/ingestion`): `existingStatus` badges on each lead card show whether a supplier record already exists in the DB (PUBLISHED, DRAFT, etc.) so operators can avoid duplicating ingestion work.

### Admin-Controlled Public Content (Phase 2 — complete) A four-phase system covering ingestion, field collection, AI scoring, and self-completion. Phase 1 is fully closed:
  - `GET /api/suppliers/:id` returns `profileCompleteness` object (`hasFarmData`, `hasEconomicsData`, `hasComplianceData`, `hasAiScore`, `isGraduated`).
  - `POST /api/suppliers/onboard` supports update mode via optional `supplierId` body field (upserts farm, economics, compliance rows, logs interaction).
  - Admin supplier drawer shows a Profile Completeness panel with per-dimension indicators and an amber "Collect farm data →" CTA when `hasFarmData=false`.
  - Onboarding page (`/onboarding?supplierId=:id&prefill=1`) pre-populates Step 1 from the ingested supplier record and includes `supplierId` in submit payload so update mode is triggered.
  - Supplier self-claim: `PATCH /api/suppliers/:id/claim` endpoint; supplier dashboard shows amber claim panel / green success state.
  - Graduation email pipeline complete through G16 (PUBLISHED state fires email via `markPublished()`).
- **AI Scoring Prompt V1**: Detailed, field-by-field AI scoring prompt for improved supplier evaluation based on 5 input blocks and a comprehensive rubric. Prompt includes `invimaRegistro` in the compliance field guide and rubric so Claude flags INVIMA gaps for processed/packaged product suppliers. Scoring pipeline: AI gap extraction → `supplier_requirement_status` seeding → deterministic INVIMA check → risk pattern evaluation, all in a single `scoreSupplier()` call with non-fatal try/catch on the compliance write-back block.
- **Buyer Layer Architecture (BG-series defined)**: `Buyer_Layer_Architecture.md` documents the full buyer layer: General Buyer Persona strategy (Marco Vogel + GCC/Asian archetypes), buyer state machine (REGISTERED→ACTIVE→PROFILING→MATCHED→GAP_SCANNED→ENGAGING→TRADING), two new tables (`buyer_matches`, `buyer_gap_briefs`), Phase 2 profile sections A–F, AI matching via Sonnet 4.6, gap analysis + ingestion pipeline escalation, admin buyer management, and marketing opt-in email layer. Finance layer parked from buyer scope. FINCAVA Certified Badge, buyer financing, and persona-specific UI modes documented as backlog.
- **Buyer Layer Phase 2 — Profiling (complete)**: Buyers can deepen their profile from `/dashboard/profile` via six collapsible sections (A: Product Detail, B: Commercial Terms, C: Quality & Compliance, D: Logistics, E: Gap Sourcing — amber-styled with tooltip, F: Platform Intent). `PATCH /api/buyers/:id/profile` accepts `{ section, field, value }` with section-scoped field allow-listing and per-field Zod validation; ownership-gated. Each save recomputes `p2_completion_pct` + `p2_sections_done` inline and returns `{ section, completion_pct, sections_done, matching_triggered }`. `matching_triggered=true` only when a save first pushes sections_done to include both A and B (or adds a new section after a prior matching run); the actual matching service call is wired in Phase 3 — for now the flag is computed and logged. Frontend uses debounced auto-save (~600ms) with per-field saving/saved/error indicators and a top progress widget with section pills.
- **RFQ System**: Buyers can post sourcing requests, suppliers can bid, and buyers can award.
- **Trust Scores**: 0-100 scores for suppliers (Basic/Silver/Gold/Platinum tiers) visible across the platform.
- **Shipment Tracking**: Timeline widget for order status.
- **Payment Milestones**: 3-stage payment release mechanism.
- **Market Intelligence**: Tools for demand signals, price benchmarks, and compliance guides.
- **Supplier Performance Dashboard**: Provides trade history and performance metrics.
- **Product Analytics**: Tracks views and trending products.
- **Checkout Flow**: Comprehensive buyer-only checkout process with quantity, incoterm, destination, shipping, notes, and real-time total.
- **Live Messaging**: Real-time conversation selection, message threads with polling, and optimistic updates.
- **AI Assistant ("Fina")**: In-dashboard chat assistant for buyers and suppliers at `/dashboard/ai-assistant` and `/supplier-dashboard/ai-assistant`. Backed by `POST /api/ai-assistant/chat` (Anthropic Claude, role-aware system prompt, EN/ES bilingual). Server enforces strict user/assistant alternation, 20-message / 16k-char ceiling, and a 60 req/hour per-user rate limit to prevent abuse and prompt-history forgery.
- **Farmer Identity & Impact**: Displays farmer details, impact flags, origin stories, and supports impact-focused filtering.
- **Email Notifications**: Automated emails for supplier onboarding confirmation, admin alerts, status changes, and password resets.
- **Admin Team Management**: Two-tier internal team system. `/admin/team` manages staff role assignments (employee, field_officer, admin) layered on top of any account type — one user can hold multiple staff roles simultaneously. `/admin/users` manages account-level roles with full CRUD (create, edit, delete, password reset). Account role dropdown now supports all 5 types: BUYER, SUPPLIER, ADMIN, FIELD OFFICER, EMPLOYEE, each with a distinct colour badge. The team endpoint (`GET /api/admin/team`) auto-includes ADMIN account-type users with a virtual `"admin"` staff role so tile counts reflect the real state without requiring a manual staff-role assignment for each admin. `staffRoles` is returned as a flat `string[]` to prevent frontend render crashes from object/string type mismatch.

## External Dependencies

- **pnpm**: Monorepo package manager.
- **Node.js**: Runtime environment.
- **TypeScript**: Programming language.
- **Express**: Web application framework.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **Zod**: Schema declaration and validation library.
- **Orval**: OpenAPI code generator.
- **esbuild**: JavaScript bundler.
- **Anthropic**: AI service for scoring and document analysis.
- **Google Cloud Storage (GCS)**: Object storage for product images.
- **Resend**: Email API service.
- **Uppy**: File upload library (specifically Uppy v5 modal).
- **bcrypt**: Password hashing library.
- **pino**: Node.js logger.
- **Helmet**: Express middleware for HTTP security headers.
- **Recharts**: Charting library for React.