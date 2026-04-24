# Fincava Hub — Codebase Takeover Plan

**For:** New engineer inheriting the codebase with zero knowledge transfer
**Platform:** B2B agricultural trading — Colombian exporters selling to international buyers (UAE, EU, Saudi Arabia, Japan)

---

## Problem Statement

The sole engineer who built Fincava Hub has left without documentation or handover. A new engineer must get productive quickly without breaking a live production platform. The risk is high: auth bugs, sync conflicts between Replit and GitHub, and undocumented architectural decisions could cause data loss or downtime if the new engineer operates blind.

---

## Phase 1 — Orient (Days 1–2): Understand Before Touching Anything

### Get access first
- [ ] GitHub repo: `github.com/sbirfan/FinCava-Hub` — request collaborator access
- [ ] Replit workspace — request owner invite
- [ ] PostgreSQL database credentials (stored in Replit Secrets, not in code)
- [ ] Admin login: `irfan@fincava.com` or `info@fincava.com` — get password from owner, change immediately after first login

### Understand the monorepo layout

```
/artifacts/api-server     ← Express 5 backend (the API)
/artifacts/fincava        ← React + Vite frontend
/lib/db                   ← Drizzle ORM schema + migrations (source of truth for DB)
/scripts                  ← One-off admin scripts (seed, fix data)
/pnpm-workspace.yaml      ← Workspace package definitions
```

**Key insight:** There are TWO separate entity hierarchies:
- `suppliersTable` — Colombian farmers/growers (registered via WhatsApp onboarding, NOT web login)
- `companiesTable` — Marketplace companies (importers/exporters with web accounts, trust scores)

These are **not** the same thing. Confusing them breaks trust score calculations and product queries.

### Understand the three user roles

| Role | Login | Dashboard | Key capability |
|------|-------|-----------|----------------|
| BUYER | Web | `/dashboard` | Browse products, place orders |
| SUPPLIER | Web | `/supplier-dashboard` | List products, manage orders |
| ADMIN | Web | `/admin` | Manage users, reset passwords, verify companies |

### Read these files first (in order)

1. `lib/db/src/schema/` — understand the data model before anything else
2. `artifacts/api-server/src/lib/auth.ts` — JWT, cookies, bcrypt
3. `artifacts/api-server/src/routes/auth.ts` — register/login/change-password
4. `artifacts/api-server/src/app.ts` — middleware stack, CORS, trust proxy
5. `artifacts/api-server/src/index.ts` — server startup, admin seed

---

## Phase 2 — Stabilize (Days 3–5): Know What's Fragile

### The GitHub ↔ Replit sync problem

**GitHub is the single source of truth.** Replit's agent commits locally without always pushing. If you ever see diverged branches:

```bash
git fetch origin
git reset --hard origin/main
```

Never use `git pull` in Replit without first checking `git log --oneline origin/main..HEAD` for unpushed local commits. If there are any, cherry-pick them to GitHub before resetting.

Permanent guard already set: `git config pull.rebase false`

### Critical environment variables (all in Replit Secrets)

| Variable | Purpose | What breaks if missing |
|----------|---------|------------------------|
| `JWT_SECRET` | Signs auth tokens | Server refuses to start |
| `DATABASE_URL` | PostgreSQL connection | All DB queries fail |
| `TWILIO_*` | WhatsApp messaging | Supplier onboarding fails silently |
| `ANTHROPIC_API_KEY` | AI scoring/docs | Trust scoring and document generation fail |

**Never commit these to git.** The `.replit` file previously had `JWT_SECRET` hardcoded — that was removed. Check `git log` if you ever see auth mysteriously stop working after a Replit agent commit.

### Known fixed bugs (don't re-introduce)

- `hashPassword()` is **async** — always `await` it. Every call site that missed this caused silent bcrypt failures storing literal `[object Promise]` as the password hash.
- Cookie `SameSite` must be `"none"` on Replit (iframe), `"lax"` locally. Detection: `!!process.env.REPLIT_DOMAINS`
- `app.set("trust proxy", 1)` must stay — rate limiter breaks without it behind Replit's proxy
- Email normalization: always `.toLowerCase().trim()` on email at registration AND login

### Run these once on a fresh database

```bash
pnpm --filter @workspace/scripts run fix:email-case    # fix any mixed-case emails
pnpm --filter @workspace/scripts run seed:compliance   # load 32 export compliance requirements
```

---

## Phase 3 — Map the System (Week 2): Fill the Knowledge Gaps

### How a buyer order flows end-to-end

```
Buyer browses products → adds to cart → places order
→ POST /api/orders → creates order + order_items rows
→ Supplier sees order in dashboard → updates status
→ DELIVERED/COMPLETED status → triggers trust score recompute
```

### How trust scores work

File: `artifacts/api-server/src/services/trust-score-service.ts`

| Signal | Weight | Full score at |
|--------|--------|---------------|
| Profile completeness | 30% | All 5 fields filled |
| Orders completed | 25% | 5+ delivered orders |
| Products catalog | 20% | 3+ products listed |
| Admin verified | 15% | `companies.verified = true` |
| Response time | 10% | Static 50% placeholder |

Tiers: BASIC → SILVER (45+) → GOLD (65+) → PLATINUM (80+)

Admin can manually retrigger: `POST /api/admin/suppliers/:companyId/recompute-trust`

### How the Anthropic AI is used

- **Claude Haiku 4.5** — fast scoring tasks
- **Claude Sonnet 4.6** — document generation (compliance docs, export summaries)

Check `artifacts/api-server/src/` for files importing `@anthropic-ai/sdk`.

### What the compliance system covers

32 requirements seeded across: Coffee, Cacao, Avocado × UAE, Saudi Arabia, Japan, EU + universal Colombian export requirements (ICA, DIAN, RUT). Table: `compliance_requirements`. No UI yet — data is in the DB, endpoints exist, frontend display is a known gap.

---

## Phase 4 — Safe Contributing (Week 3+)

### Before making any change

1. `git pull` in Replit to check for agent changes: `git log --oneline origin/main..HEAD`
2. Make your change locally (not in Replit agent)
3. Push to GitHub first
4. Then `git pull` in Replit

### Schema changes

All schema changes go through Drizzle:

```bash
# Edit lib/db/src/schema/*.ts
pnpm --filter @workspace/db run push        # apply to dev DB
pnpm --filter @workspace/db run generate    # generate migration files
```

**Never edit the database directly** — Drizzle schema is the source of truth.

### API client is auto-generated

The frontend calls the API through an Orval-generated client. If you add/change an API route:

```bash
# Regenerate the client after updating the OpenAPI spec
pnpm --filter @workspace/api-client run generate
```

### The known technical gaps (prioritized)

| Gap | Effort | Status |
|-----|--------|--------|
| Account lockout after failed logins | Small | Not started |
| Email-based password reset | Medium | Needs email provider (SendGrid/Resend) |
| Supplier ↔ Product schema link | Medium | suppliersTable has no companyId |
| Automated trust score re-trigger | Medium | Currently admin-only |
| WhatsApp inbound message handling | Large | Outbound only today |
| Job queue (BullMQ) | Large | No queue infrastructure yet |

---

## Quick Reference: Commands You'll Use Weekly

```bash
# Sync Replit with GitHub
git fetch origin && git reset --hard origin/main

# Install after package.json changes
pnpm install

# Run the API server locally
pnpm --filter @workspace/api-server run dev

# Run the frontend locally
pnpm --filter @workspace/fincava run dev

# Check TypeScript errors across the monorepo
pnpm -r run typecheck

# Seed / fix data
pnpm --filter @workspace/scripts run fix:email-case
pnpm --filter @workspace/scripts run seed:compliance
```

---

## Open Questions

| Question | Owner |
|----------|-------|
| Which email provider will be used for password reset? | Stakeholder |
| Is there a staging environment separate from production? | Stakeholder |
| Should the Replit agent be disabled to prevent unsanctioned commits? | Stakeholder |
| What is the intended onboarding flow for new suppliers — WhatsApp only or also web? | Product |
| Are there active buyers/suppliers in production whose data must not be touched? | Stakeholder |
