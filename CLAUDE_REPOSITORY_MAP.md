# CLAUDE_REPOSITORY_MAP.md

This file provides repository-specific technical context to Claude Code (claude.ai/code).
For operating rules and governance, see CLAUDE.md.

## What This Is

Fincava is a B2B marketplace connecting Colombian specialty product suppliers (coffee, cacao,
dried fruits, oils) with global buyers (roasters, importers, food businesses). It is a
two-sided marketplace with a supplier graduation pipeline, buyer onboarding flow,
AI-powered matching, and compliance/concierge workflows.

## Commands

All commands run from repo root. Package manager is pnpm 10.

### Typecheck / Build / Lint
```bash
pnpm run typecheck          # fast; run first
pnpm run build              # all packages in dependency order
pnpm run lint
pnpm run lint:fix
```

### Tests
```bash
pnpm --filter @workspace/api-server run test        # requires DATABASE_URL (PostgreSQL)
pnpm --filter @workspace/api-server run test:watch
pnpm --filter @workspace/fincava run test           # jsdom; no DB needed
pnpm --filter @workspace/fincava run test:watch
```

### Dev Servers
```bash
pnpm --filter @workspace/api-server run dev         # http://localhost:8080
pnpm --filter @workspace/fincava run dev            # http://localhost:5173
pnpm --filter @workspace/mockup-sandbox run dev     # http://localhost:8081
```

### Database (requires DATABASE_URL)
```bash
pnpm --filter @workspace/db run generate    # schema → migration files
pnpm --filter @workspace/db run push        # apply migrations
```

### OpenAPI Code Generation (run after editing openapi.yaml)
```bash
pnpm --filter @workspace/api-spec run codegen
```

CI order: typecheck → build → frontend tests → API tests (real PostgreSQL 16 service).

## Directory Structure

```
artifacts/
  api-server/       Express 5 backend (Node 24, ES modules, Pino logging)
  fincava/          React 19 SPA (Vite, TailwindCSS 4, TanStack Query)
  mockup-sandbox/   Component preview environment
lib/
  db/               Drizzle ORM schema (27 tables) + migration config
  api-spec/         openapi.yaml — canonical API contract
  api-client-react/ Auto-generated React Query hooks (never edit manually)
  api-zod/          Zod schemas shared between frontend and backend
  object-storage-web/ GCS/Uppy abstraction for file uploads
  config/           Shared config utilities
```

## Architecture

### API Contract Flow

`lib/api-spec/openapi.yaml` is the source of truth. Changing the API requires:
1. Update `openapi.yaml`
2. Run `codegen` to regenerate `lib/api-client-react` (never edit it directly)
3. Update Zod schemas in `artifacts/api-server/src/schemas.ts` and `lib/api-zod`

### Backend (`artifacts/api-server/src/`)

- `routes/` — One file per domain (auth, buyers, suppliers, orders, admin, contact, etc.), mounted in `app.ts`
- `services/` — Business logic decoupled from Express. The onboarding pipeline calls Claude Sonnet 4.6 for supplier scoring and document generation.
- `schemas.ts` — Zod request/response validation for all routes
- `lib/` — Logger (Pino), in-memory email queue, auth middleware, pipeline event emitter

### Frontend (`artifacts/fincava/src/`)

- `pages/` — Public marketing, auth flows, buyer dashboard (9 sub-pages), admin panel, supplier dashboard, onboarding flows
- `components/` — Built on Radix UI primitives. Layouts: `AppLayout`, `DashboardLayout`, `AdminLayout`
- `contexts/` — `AuthContext` (JWT + localStorage fallback), `LanguageContext`
- `lib/flags.ts` — Feature flags from env vars (`ENABLE_TRANSACTIONS`, `ENABLE_FINANCE`, `ENABLE_MATCHING`)
- Vite dev proxy: `/api` → `http://localhost:8080` (no manual CORS config needed locally)

### Database

27-table PostgreSQL schema in `lib/db/src/schema/`. Key split:
- **Suppliers**: `suppliersTable` (farmer identity, AI scores — admin-managed) vs. `companiesTable` (B2B seller accounts — user-managed). Email matching bridges them in Phase 4.
- **Buyers**: `buyer_profiles`, `buyers_matches`, `buyer_gap_briefs`, `compliance_concierge`
- **Transactions**: `orders`, `inquiries`, `rfqs`, `messages` (all feature-flagged)
- All tables have `company_id` for future multi-tenancy; currently a single `FINCAVA_COMPANY_ID` env var is used.

### Supplier Graduation Pipeline

DRAFT → PENDING → ACTIVE → SELLABLE → PUBLISHED

Triggered by `SUPPLIER_ONBOARD_EVENT` (in-memory emitter). Steps: validate → AI score (Claude Sonnet 4.6) → generate compliance docs → publish.

### Auth

JWT tokens in signed cookies (`SameSite=None` for Replit proxy). Roles: ADMIN, FOUNDER, STAFF, SUPPLIER, BUYER. API uses `trust proxy = 1` for correct IP resolution behind Replit's proxy.

## Technical Constraints

- `lib/api-client-react` is fully generated — never edit it manually.
- ESLint enforces `@typescript-eslint/no-floating-promises: error` — all async calls must be awaited or have `.catch()`.
- Feature-flagged code (`ENABLE_TRANSACTIONS`, `ENABLE_FINANCE`) must not be activated without approval.
- Any API change requires the full cycle: `openapi.yaml` → `codegen` → Zod schemas.
- Any schema change requires the full cycle: `generate` → review migration → `push`.
