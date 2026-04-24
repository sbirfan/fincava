# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run generate` — generate a new Drizzle migration file from schema changes
- `pnpm --filter @workspace/db run migrate` — apply pending Drizzle migrations to the database
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Fincava — Colombian Agricultural B2B Marketplace

### Product Summary
Full-stack B2B trade platform connecting Colombian agricultural producers with international buyers (Middle East, Asia, Africa). Specialty coffee, cacao, avocado, exotic fruits, superfoods.

### V5 — Full Platform Features (Active)
- **Checkout Flow** — Product detail page has a primary "Place Order" button (BUYER-only) opening a dialog with: quantity (kg), incoterm select (FOB/CIF/CFR/EXW/DDP), destination port, shipping method, notes, real-time total calculation; submits to `POST /api/buyer/orders` and redirects to `/dashboard/orders`
- **Platform Page** (`/platform`) — "Three Layers. One Operating System." deep dive: 3 system layer cards with feature lists, competitor comparison table (Fincava vs. Trade Broker vs. Traditional Import), 6-card technical architecture grid
- **Investors Page** (`/investors`) — Dark hero matching homepage, market opportunity metrics ($180B TAM, 800K+ producers, $2.1B gap, Dastgyr parallel), traction checklist, 3-stream revenue model, 4 competitive moats, team section, CTA
- **Live Messaging** — `dashboard/messages.tsx` fully rewritten: conversation selection, message thread with time-stamped bubbles, live polling every 3s (conversations every 5s), auto-scroll to bottom, send form with optimistic-update mutation
- **Analytics Dashboard** (`/dashboard/analytics`) — Recharts-powered: stat cards (orders, value, products, AOV), dual-axis line chart (orders + value over 7 months), bar chart (product views/inquiries), pie chart (by category), regional demand index horizontal bars; added to buyer dashboard sidebar nav
- **Navbar updated** — Added Platform and Investors links to primary nav (6 links total)
- **Dashboard sidebar** — Added "Analytics" link for buyers (uses existing BarChart2 icon)

### V4 — Investor-Grade Repositioning (Active)
- **New Brand Position** — "The Operating System for Emerging Market Commerce" (not a marketplace)
- **Navbar** — "Commerce OS" badge, active-state nav links, "Get Started" CTA replacing "Sign up", "Products" replaces "Marketplace" label
- **Homepage** — 10-section investor-grade landing page:
  1. Hero (dark full-bleed, grid overlay, primary-color headline emphasis, metrics bar)
  2. Problem (4 problem cards with real stats: fragmented chains, market access, capital, distribution)
  3. Solution (3 System Layers: Market Access / Embedded Finance / Distribution, dark section)
  4. Architecture ("Built as a Modular Agentic System" with interactive ASCII-style diagram)
  5. Why Now (Colombia opportunity, Dastgyr parallel, emerging market demand surge)
  6. Traction (ground-level relationships, live platform stats)
  7. Business Model (3 revenue streams: 2–4% transaction, 8–18% financing APR, future SaaS)
  8. Competitive Advantage (4 moats: local depth, architecture, data flywheel, compliance)
  9. Vision ("Infrastructure for commerce across Latin America", expansion roadmap)
  10. CTA (Partner / Join / Contact three-card grid + primary buttons)

### V3 Features — Story + Impact Layer (Active)
- **Farmer Identity Cards** — every product card shows farmer name, farm, impact flags (Smallholder, Direct Trade, Organic, Climate-Resilient), families supported count
- **Origin Story Engine** — `origin_stories` DB table with farmerName, farmerPhoto, farmName, region, elevation, farmSizeHa, yearsFarming, story, challenges, impact
- **"Meet the Farmer" Section** — full split-layout panel on product detail page with portrait, farm stats, "Their Story" narrative, "The Challenge" and "Your Impact" columns
- **Impact Filters** — marketplace sidebar checkboxes: Direct Trade, Smallholder Farm, Women-Led Farm, Certified Organic
- **`/impact` Page** — live platform impact stats (farmers, families, regions, direct trade), farmer voices carousel, direct trade value comparison, UN SDG alignment, CTA
- **Homepage Mission Section** — "The farmer should earn more than the broker" split layout with farmer portrait, 3 mini stats, "See our full impact report →" link
- **Impact badges** — product page sticky info shows "Direct trade price — 40–70% above commodity market paid to farmer"
- **New API routes** — `GET /stories/:productId`, `GET /impact`; products list + detail now include all impact flags

### New DB Columns / Tables (V3)
- `products`: `smallholder`, `women_led`, `direct_trade`, `climate_resilient`, `organic` booleans; `families_supported` int
- `origin_stories`: full farmer narrative table (productId FK, farmerPhoto, story, challenges, impact, images[], etc.)

### Seed note
V3 origin stories seeded for all 8 products using script run via `scripts/node_modules/.bin/tsx artifacts/api-server/src/seed-v3.ts` from workspace root.

### V2 Features (Active)
- **RFQ System** — buyers post sourcing requests, suppliers bid, buyers award; public `/rfqs` board + dashboard pages
- **Trust Scores** — 0-100 scores (Basic/Silver/Gold/Platinum tiers) per supplier; visible on cards, detail pages, and bid comparisons
- **Shipment Tracking** — timeline widget on order detail with 5-step status (CREATED → EXPORT_CUSTOMS → IN_TRANSIT → IMPORT_CUSTOMS → DELIVERED)
- **Payment Milestones** — 3-stage release (Deposit 30%, Pre-Shipment 40%, On-Delivery 30%) with unlock button
- **Market Intelligence** — live demand signals, price benchmarks, compliance guide by market+product, regulatory alerts
- **Supplier Performance Dashboard** — trade history, export destinations, trust score breakdown, avg response time
- **Product Analytics** — view tracking, trending products per category

### Auth Pattern
- Token stored as `fincava_auth` **httpOnly cookie** (sameSite:strict, secure in prod, 7-day maxAge); signed JWT (HS256) via `JWT_SECRET` env var
- `requireAuth` middleware: checks cookie first, then `Authorization: Bearer` fallback (for API/curl clients)
- Frontend: `AuthContext` uses always-enabled `/api/auth/me` query; login/logout via `/api/auth/login` + `/api/auth/logout`
- All frontend pages use `credentials: "include"` on every fetch (no localStorage token or manual Authorization header)
- Password hash: bcrypt (12 rounds). Legacy SHA-256 hashes auto-upgraded to bcrypt on next login (transparent migration)
- Roles: BUYER, SUPPLIER, ADMIN
- Rate limiting: login/register 20 req/15 min, onboarding 30 req/hour

### Security & Architecture
- **Helmet** — HTTP security headers on all responses
- **CORS** — restricted to `ALLOWED_ORIGIN` env var (default: Replit dev domain); wildcard removed
- **Body size limit** — 1 MB global limit on all JSON bodies
- **Global error handler** — 4-arg Express middleware; logs via pino, returns `{error}` JSON
- **Anthropic singleton** — `lib/anthropic.ts`; model names env-overridable via `ANTHROPIC_SCORING_MODEL` / `ANTHROPIC_DOCUMENT_MODEL`
- **Shared requireAdmin** — `middleware/admin.ts`; imported by both admin and supplier routes
- **Zod validation** — `src/schemas.ts` + inline validators; covers all admin endpoints, product boolean filters
- **Ownership checks** — PATCH /supplier/inquiries/:id, PATCH /supplier/orders/:id/status, GET /buyer/inquiries all verified
- **Admin user delete** — FK constraint violations return 409 (not 500) with a clear message to deactivate instead
- **Paginated admin endpoints** — all list endpoints return `{ data, total, page, limit, totalPages }` (default limit=50, max=100); `totalPages` is always ≥ 1
- **Drizzle migrations** — baseline SQL generated at `lib/db/drizzle/0000_baseline.sql`; apply with `pnpm --filter @workspace/db run migrate`
- **AbortController** — supplier admin filter fetches cancel in-flight requests on filter change (race condition fix)
- **res.ok guards** — all frontend fetch calls check `res.ok` before calling `.json()` (admin/team, admin/users, messages)

### Key API Routes (V2)
- `GET/POST /rfqs` — public RFQ board + create (buyer auth)
- `GET /rfqs/:id` — detail with responses
- `POST /rfqs/:id/respond` — supplier bids
- `POST /rfqs/:id/award/:responseId` — buyer awards
- `GET /buyer/rfqs` — buyer's own RFQs
- `GET /supplier/rfqs` — open RFQs for supplier inbox
- `GET /trust/:companyId` — trust score with factor breakdown
- `GET /markets/intelligence` — demand signals, trending, prices, highlights
- `GET /analytics/trending` — top products by inquiries
- `GET /analytics/trade-history/:companyId`
- `GET /orders/:id/shipment` — shipment status + tracking
- `GET /orders/:id/milestones` — payment milestone list
- `POST /orders/:orderId/milestones/:milestoneId/release` — release payment

### Supplier Lifecycle Emails (Task #88)
- **Email column added**: `suppliers.email` (nullable text) — Drizzle migration at `lib/db/drizzle/0002_lazy_ink.sql`
- **Onboarding form updated**: Email address (optional) field added to Step 1 (`StepFarmIdentity.tsx`); shows helper text "We'll send you a confirmation"
- **Post-onboard emails** (fire-and-forget after 201 response):
  - Supplier confirmation email (Spanish) if email provided
  - Admin alert email to info@fincava.com always (with supplier details + link to admin panel)
- **Admin status change**: `PATCH /api/admin/suppliers/:id/status` fires status-change email to supplier when email is on file; covers ACTIVE/INACTIVE/PENDING statuses
- **Templates**: `supplierApplicationConfirmationEmail`, `supplierApplicationAdminAlertEmail`, `supplierStatusChangeEmail` in `artifacts/api-server/src/lib/email.ts`

### Email Infrastructure
- **Resend SDK** — installed in `@workspace/api-server`; lazy-initialized in `artifacts/api-server/src/lib/email.ts`
- **RESEND_API_KEY** — stored as a Replit secret; email is silently skipped (logged as warn) if key is missing
- **FROM_ADDRESS** — `Fincava <noreply@fincava.com>`; all templates use `baseTemplate()` in `email.ts`
- **Password reset flow** — `password_reset_tokens` DB table (token, user_id, expires_at, used); `POST /api/auth/forgot-password` (always 200, generates 32-byte hex token, 1h expiry); `POST /api/auth/reset-password` (validates token, updates hash, marks used)
- **Frontend pages** — `/forgot-password` and `/reset-password?token=...`; login page has "Forgot your password? Reset it here" link
- **FRONTEND_URL** env var — used by API to build reset links; falls back to `REPLIT_DOMAINS` then `localhost:25876`

### Seeded Suppliers
- id=1 Café Huilas Premium (PREMIUM, trustScore=87)
- id=2 Cooperativa Cacao del Pacífico (PRO, trustScore=79)
- id=3 Exportaciones Andinas Colombia (PREMIUM, trustScore=91)
- id=4 Santero Premium Superfoods (FREE)
