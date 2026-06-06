# Threat Model

## Project Overview

Fincava is a TypeScript pnpm-monorepo B2B marketplace for Colombian agricultural trade. The production application consists of an Express API in `artifacts/api-server/src` and a React frontend in `artifacts/fincava/src`, backed by PostgreSQL via Drizzle, Google Cloud Storage for file storage, Resend for email delivery, and Anthropic for AI-powered matching, scoring, translation, and assistant features.

The primary production users are buyers, suppliers, admins, and field officers. Authentication is JWT-based, with tokens accepted from an httpOnly cookie (`fincava_auth`) or `Authorization: Bearer` header. Feature-gated modules such as transactions, finance, logistics, and public intelligence are in scope because they can be enabled in production.

## Assets

- **User accounts and sessions** — email addresses, password hashes, JWTs, and verification/reset tokens. Compromise allows impersonation and privilege abuse.
- **Business transaction data** — orders, RFQs, bids, inquiries, loans, shipments, milestones, and messaging threads. This contains sensitive commercial information and operational state.
- **Supplier and buyer profile data** — onboarding data, compliance status, trade readiness, contact information, and scoring outputs. Exposure can harm users and business relationships.
- **Private uploaded files** — product/supporting documents stored in object storage under private ACLs. Unauthorized access could expose confidential commercial or identity material.
- **Admin capabilities and operational automations** — supplier ingestion, buyer management, backup execution, content management, and status transitions. Abuse can change platform state at scale.
- **Application secrets and service credentials** — `JWT_SECRET`, database credentials, Anthropic/Resend keys, backup secret, and object-storage sidecar credentials. Leakage could enable account compromise or infrastructure abuse.

## Trust Boundaries

- **Browser/mobile client to API** — all request data is untrusted until validated and authorized server-side.
- **Authenticated user to privileged server actions** — buyer, supplier, admin, and field-officer roles must be separated by server-side authorization on every route.
- **Public to authenticated/admin surfaces** — catalog/public-content endpoints are intentionally public, but transactional, private-file, and admin endpoints must remain protected.
- **API to PostgreSQL** — the API has broad database access; any injection or broken scoping at the API layer can expose or modify tenant data.
- **API to object storage** — the API mints upload URLs and serves stored objects. Path normalization and ACL enforcement must prevent cross-user file access.
- **API to third-party services** — email, AI, and discovery/fetch features cross into external networks and must not permit SSRF, secret leakage, or unsafe prompt/data handling.
- **Production to dev-only artifacts** — `artifacts/mockup-sandbox/**`, one-off scripts, and local tooling are out of scope unless a production path reaches them.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`
- **Highest-risk server areas:** `artifacts/api-server/src/routes/auth.ts`, `admin.ts`, `suppliers.ts`, `orders.ts`, `shipments.ts`, `storage.ts`, `buyers.ts`, `messages.ts`, `rfqs.ts`, `stats.ts`
- **External-service boundaries:** `artifacts/api-server/src/lib/objectStorage.ts`, `lib/email.ts`, `lib/anthropic.ts`, `services/discovery-engine.ts`, `services/backup-service.ts`
- **Public surfaces:** product/catalog, stories, public metrics/stories, health, selected analytics/intelligence when feature flag enables public access
- **Authenticated surfaces:** buyer/supplier dashboards, messaging, orders, inquiries, AI assistant, file upload/serve, buyer profile/matching, finance, logistics
- **Admin surfaces:** `/api/admin/**`, supplier/admin list and transition paths, ingestion/discovery, team/user management, backup execution
- **Usually dev-only / ignore unless proven reachable:** `artifacts/mockup-sandbox/**`, maintenance scripts under `scripts/**`, compiled `dist/**`

## Threat Categories

### Spoofing

The application relies on JWT authentication from a cookie or Bearer header. Every protected route must validate the token, load the current user, and derive authorization from server-side role data rather than client-supplied identifiers. Password reset and email verification tokens must remain single-use, time-bounded, and non-enumerable.

### Tampering

Buyers, suppliers, and admins can all change high-value business state: RFQs, bids, orders, shipments, milestones, profiles, public content, and supplier evaluations. The server must enforce object ownership and role checks on every mutation, compute sensitive values server-side, and reject client attempts to update data outside the caller’s allowed scope.

### Information Disclosure

The system stores commercially sensitive inquiry, order, messaging, financing, and profile data. API responses must be scoped to the authenticated tenant or admin role, private object-storage paths must remain unreadable without ACL authorization, and logs/errors must avoid exposing secrets, tokens, or private message content. Public intelligence and marketing content must not accidentally expose internal or cross-tenant data.

### Denial of Service

Public and authenticated endpoints include expensive operations such as login, password reset, supplier onboarding, AI calls, external discovery fetches, and file handling. Production routes must apply appropriate rate limits, size limits, and timeouts so a single actor cannot exhaust compute, email, AI, or storage resources.

### Elevation of Privilege

This codebase has multiple privilege boundaries: public vs authenticated, buyer vs supplier, and user vs admin. The highest-risk failures are broken access control (IDOR/BFLA) on transactional routes, missing admin enforcement on operational endpoints, and any path that lets a lower-privilege user read or modify another tenant’s data or platform-wide state. Object-storage helpers, logistics endpoints, and feature-gated modules require special scrutiny because they often bypass the usual business-route patterns.

---

## Security Hardening Log

### SSRF — Discovery Engine URL Fetch

**Status: Resolved (2026-06-06)**

The discovery engine (`services/discovery-engine.ts`) fetches supplier websites returned by Claude Haiku. Five independent defence layers are in place:

1. **String-based pre-check** (`isSsrfRisk`, `isBlockedDomain`) — rejects private IP literals, loopback, link-local, metadata endpoints (169.254.169.254), `.local`/`.internal` TLDs, social media domains, and non-http(s) schemes before any connection is attempted.
2. **TOCTOU-safe connect-time IP validation** (`safeLookupFn`) — passed directly to `http.request({ lookup })`. Node calls this function at actual socket-connect time, so the IP we validate is the IP the socket connects to. This eliminates the race window between a separate DNS pre-flight check and the actual connection (DNS rebinding attacks).
3. **Redirect re-validation** — each redirect hop in `fetchPageHtml()` passes through both the string check and the connect-time guard before a new connection is made.
4. **Hard caps** — `MAX_TOTAL_LINKS=10` (requests per discovery call), `MAX_REDIRECT_HOPS=5`, body cap 64 KB, 5 s per-link timeout.
5. **Protocol enforcement** — only `http:` and `https:` are accepted; `file:`, `ftp:`, `gopher:`, etc. are rejected.

All five layers covered by 13 unit tests in `src/test/discovery-engine.test.ts`.

---

### Prompt Injection — AI Input/Output Escaping

**Status: Resolved (2026-06-06)**

| Surface | Defence | Notes |
|---------|---------|-------|
| `category` / `region` → prompt | `sanitizePromptInput()` strips `\n`, `\r`, `` ` ``, `<`, `>` (angle-brackets added 2026-06-06); caps at 100 chars | `<>` prevent pseudo-XML tag injection (Anthropic treats XML-like tags as instruction markers) |
| `excludeTypes` → prompt | Zod `z.enum(EXCLUDE_TYPE_VALUES)` — only known enum values reach the prompt | No free-text interpolation possible |
| AI output → application | `CandidateLeadArraySchema` (Zod) validates every field with type and length constraints before any field is used | Rejects unexpected fields via `.strip()` |
| AI output `website` → SQL LIKE | Hostname escaped (`%` → `\%`, `_` → `\_`) before `like()` call (fix 2026-06-06) | Drizzle parameterizes so SQL injection is not possible, but unescaped wildcards would broaden LIKE match |
| AI assistant messages | 2 000-char cap per message; 20-message max; server-side role alternation enforcement strips forged assistant history; rate-limited at 60 req/hr per user | `requireAuth` — only authenticated users reach this surface |

All prompt injection fixes covered by 6 unit tests (`sanitizePromptInput` suite) and 5 tests (`escapeLikeWildcards` suite) in `src/test/discovery-engine.test.ts`.

---

### Open Security Items

| Item | Severity | Notes |
|------|----------|-------|
| FIN-002 farmer self-service login | Medium | Auth model not yet designed; farmers currently mediated by officers |
| FIN-037 durable job queue | Medium | `setImmediate` AI scoring — process crash loses in-flight jobs; no SSRF risk but operational |
| Rate limiting — AI scoring endpoints | Low | Admin-only surface; low priority until field-officer role is separated (FIN-059) |
