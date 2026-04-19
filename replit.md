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
- Token stored as `fincava_token` in localStorage; base64url encoded `{userId, iat}`
- Password hash: SHA-256 with salt `fincava_salt_2025`
- Roles: BUYER, SUPPLIER, ADMIN

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

### Farmer Onboarding — Cross-Device Draft Recovery
- **Server-side draft persistence** — `onboarding_drafts` table (whatsapp_number unique, data jsonb, restore_token UUID)
- **Token-based access control** — A `restore_token` UUID is generated on first PUT and returned to the client; all mutating operations (update PUT, POST /restore, DELETE) require the correct token or return 403
- **Draft API** (`artifacts/api-server/src/routes/drafts.ts`):
  - `GET /api/drafts/onboarding` — metadata only (found, savedStep, updatedAt), no token required, no PII
  - `PUT /api/drafts/onboarding` — upsert; returns restore_token on first create; requires token for updates
  - `POST /api/drafts/onboarding/restore` — returns full draft data; requires valid restore_token
  - `DELETE /api/drafts/onboarding` — deletes only if token matches
  - Rate-limited (15 req/min per IP) on all four endpoints
- **WhatsApp blur check** — Queries GET for metadata; if token exists in localStorage, also calls POST /restore to prefetch full data
- **Same-device full restore** — Token in localStorage → "Restaurar borrador" button; all form fields restored
- **Cross-device navigate-only** — No token (different device/browser) → "Ir a Sección X" button; navigates to saved step but does not pre-fill form fields
- **Auto-save** — pushes to server (and localStorage) on each step advance and every 30-second interval; stores returned token
- **Cleanup on submission** — Successful onboarding deletes server draft via token-authenticated DELETE

### Seeded Suppliers
- id=1 Café Huilas Premium (PREMIUM, trustScore=87)
- id=2 Cooperativa Cacao del Pacífico (PRO, trustScore=79)
- id=3 Exportaciones Andinas Colombia (PREMIUM, trustScore=91)
- id=4 Santero Premium Superfoods (FREE)
