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
- **Authorization**: Role-based access control (BUYER, SUPPLIER, ADMIN) with shared `requireAdmin` middleware.
- **Security**: Helmet for HTTP security headers, restricted CORS, 1MB global JSON body limit.
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

### Feature Specifications
- **Unified Supplier Layer (Phase 1 complete)**: A four-phase system covering ingestion, field collection, AI scoring, and self-completion. Phase 1 is fully closed:
  - `GET /api/suppliers/:id` returns `profileCompleteness` object (`hasFarmData`, `hasEconomicsData`, `hasComplianceData`, `hasAiScore`, `isGraduated`).
  - `POST /api/suppliers/onboard` supports update mode via optional `supplierId` body field (upserts farm, economics, compliance rows, logs interaction).
  - Admin supplier drawer shows a Profile Completeness panel with per-dimension indicators and an amber "Collect farm data →" CTA when `hasFarmData=false`.
  - Onboarding page (`/onboarding?supplierId=:id&prefill=1`) pre-populates Step 1 from the ingested supplier record and includes `supplierId` in submit payload so update mode is triggered.
  - Supplier self-claim: `PATCH /api/suppliers/:id/claim` endpoint; supplier dashboard shows amber claim panel / green success state.
  - Graduation email pipeline complete through G16 (PUBLISHED state fires email via `markPublished()`).
- **AI Scoring Prompt V1**: Detailed, field-by-field AI scoring prompt for improved supplier evaluation based on 5 input blocks and a comprehensive rubric.
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