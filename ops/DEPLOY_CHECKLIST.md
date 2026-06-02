# Fincava Deploy Checklist

Run this before every production deploy. All items must be checked before traffic is served.

---

## Pre-Deploy

- [ ] `git pull` on both repos (`fincava-hub` + `fincava`) — confirm they are in sync
- [ ] No pending database migrations (`0 migrations pending` confirmed via health check or migration journal)
- [ ] Sentry DSN set in Replit Secrets (`SENTRY_DSN`)
- [ ] `RESEND_API_KEY` set — verify with a test email if recently rotated
- [ ] `JWT_SECRET` unchanged (rotation requires coordinated session invalidation)

---

## Feature Flag Verification

Check the Replit Secrets panel and confirm every flag matches the expected state for the current phase.

The server logs `FLAG_VALIDATION_OK` or `FLAG_VALIDATION_DEVIATION` at startup (search for `FIN-096` in logs).
Set `FINCAVA_PHASE` in Replit Secrets to the current phase number so the validator knows what to expect.

### Phase 3 — Revenue Loop + Concierge Ops (current)

| Env var | Expected | Notes |
|---------|----------|-------|
| `FINCAVA_PHASE` | `3` | Tells startup validator which baseline to check against |
| `ENABLE_TRANSACTIONS` | **unset or `false`** | Concierge-only; no direct buyer orders |
| `ENABLE_FINANCE` | **unset or `false`** | Future phase — trade finance not ready |
| `ENABLE_LOGISTICS` | **unset or `false`** | Future phase |
| `ENABLE_MATCHING` | **unset or `false`** | Admin-only today |
| `ENABLE_INTELLIGENCE_PUBLIC` | **unset or `false`** | Legal review pending |

### Phase 4 — Pre-Retail Setup (future)

| Env var | Expected |
|---------|----------|
| `FINCAVA_PHASE` | `4` |
| `ENABLE_MATCHING` | `true` |
| `ENABLE_TRANSACTIONS` | **false** |
| `ENABLE_FINANCE` | **false** |
| `ENABLE_LOGISTICS` | **false** |
| `ENABLE_INTELLIGENCE_PUBLIC` | **false** |

### Phase 5 — Retail Storefront (future)

| Env var | Expected |
|---------|----------|
| `FINCAVA_PHASE` | `5` |
| `ENABLE_MATCHING` | `true` |
| `ENABLE_TRANSACTIONS` | `true` |
| `ENABLE_FINANCE` | **false** |
| `ENABLE_LOGISTICS` | **false** |
| `ENABLE_INTELLIGENCE_PUBLIC` | **false** |

---

## Post-Deploy Smoke Test

Run these checks within 5 minutes of the deploy completing:

- [ ] `GET /api/healthz` → `{ "status": "ok", "db": "ok" }`
- [ ] Admin login works (`/admin`)
- [ ] Open Introductions page loads (`/admin/introductions`)
- [ ] Supplier list loads (`/admin/suppliers`)
- [ ] Server logs show `FLAG_VALIDATION_OK` (search for `FIN-096` or `FLAG_VALIDATION`)

If any check fails: rollback immediately via Replit's deployment history before investigating.

---

## Rollback

Replit preserves previous deployments. To rollback:
1. Open the Replit Deployments panel
2. Select the previous successful deployment
3. Click "Redeploy"
4. Confirm smoke test passes on the rolled-back version

---

*See `ops/OPERATOR_PLAYBOOK.md §19` for full feature flag reference and layer architecture.*
