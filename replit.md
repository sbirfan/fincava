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

### Seeded Suppliers
- id=1 Café Huilas Premium (PREMIUM, trustScore=87)
- id=2 Cooperativa Cacao del Pacífico (PRO, trustScore=79)
- id=3 Exportaciones Andinas Colombia (PREMIUM, trustScore=91)
- id=4 Santero Premium Superfoods (FREE)
