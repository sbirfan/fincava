# FIN-043 — Anthropic Key Rotation Runbook

**Status:** Approved for Phase 1  
**Owner:** Platform  
**Last reviewed:** 2026-06-01  
**Applies to:** `artifacts/api-server`

---

## 1. Key Inventory

| Environment Variable | Default Value | Purpose | Criticality |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | *(required — no default)* | Authenticates all Anthropic SDK calls | **Critical** — server throws on startup if missing |
| `ANTHROPIC_SCORING_MODEL` | `claude-haiku-4-5` | Supplier export-readiness scoring | Medium |
| `ANTHROPIC_DOCUMENT_MODEL` | `claude-sonnet-4-6` | Document processing and generation | High |
| `ANTHROPIC_ENRICHMENT_MODEL` | `claude-sonnet-4-6` | Supplier data enrichment during ingestion | High |
| `ANTHROPIC_DISCOVERY_MODEL` | `claude-haiku-4-5` | Lead discovery engine | Medium |
| `ANTHROPIC_TRANSLATION_MODEL` | `claude-haiku-4-5` | EN/ES message translation | Medium |
| `ANTHROPIC_PRESCREENING_MODEL` | Inherits `ANTHROPIC_DOCUMENT_MODEL` | Vision-based document pre-screening | Medium |

Model variables have safe in-process defaults. Only `ANTHROPIC_API_KEY` is hard-required.

---

## 2. Key Storage Location

| Environment | Storage | Path / Name |
|---|---|---|
| Production (Replit) | Replit Secrets | `ANTHROPIC_API_KEY` |
| Pre-production (Cloudflare / fincava-hub) | Cloudflare Workers Secrets | `ANTHROPIC_API_KEY` |
| Local development | `.env` file (not committed) | `ANTHROPIC_API_KEY` |
| CI | Environment secret in CI provider | `ANTHROPIC_API_KEY` |

**No `.env` files are committed to the repository.** The key lives exclusively in the secret stores above.

---

## 3. Affected Services

All features below will degrade or fail completely if `ANTHROPIC_API_KEY` is invalid.

| Feature | Route / Service | Model Used | Failure Mode |
|---|---|---|---|
| Supplier scoring pipeline | `services/scoring-service.ts` | `SCORING_MODEL` (haiku) | Hard failure after 3 retries |
| Supplier data enrichment | `services/ingestion-structuring-service.ts` | `ENRICHMENT_MODEL` (sonnet) | Throws; ingestion blocked |
| Document pre-screening | `services/document-prescreening-service.ts` | `PRESCREENING_MODEL` (sonnet) | Soft failure — logged, document stays unprescreened |
| Document generation | `services/document-generator.ts` | `DOCUMENT_MODEL` (sonnet) | Throws; document unavailable |
| Fina AI assistant | `routes/ai-assistant.ts` | `ASSISTANT_MODEL` (haiku) | Returns 503 to user |
| Message translation | `routes/messages.ts` | `TRANSLATION_MODEL` (haiku) | Returns 502; falls back to empty translations |
| RFQ response drafting | `routes/rfqs.ts` | `claude-haiku-4-5` (hard-coded) | Throws; RFQ draft unavailable |
| Admin supplier enrichment | `routes/admin.ts` | `ENRICHMENT_MODEL` (sonnet) | Returns 503 |
| Buyer gap analysis | `services/buyer-gap-service.ts` | `claude-sonnet-4-6` (hard-coded) | Throws; re-thrown for admin retry |
| Buyer-supplier matching | `services/buyer-matching-service.ts` | `claude-sonnet-4-6` (hard-coded) | Throws; matching blocked |
| Origin story generation | `services/origin-story-service.ts` | `claude-haiku-4-5` | Throws |
| Lead discovery | `services/discovery-engine.ts` | `DISCOVERY_MODEL` (haiku) | Wrapped in timeout; throws on expiry |

---

## 4. Startup Validation

The server does **not** test the Anthropic API at boot. Validation is lazy:

1. `getAnthropicClient()` is called the first time an AI feature is invoked.
2. If `ANTHROPIC_API_KEY` is absent, the function throws `"ANTHROPIC_API_KEY is not set"` and the request fails with an unhandled exception.
3. The `/healthz` and `/health` endpoints check **database connectivity only** — they do not probe Anthropic.

**Implication:** A missing or invalid key will not surface until the first AI request hits after a deploy. Monitor logs and Anthropic dashboard after every key rotation.

---

## 5. Failure Modes

| Failure | Immediate Symptom | Affected Requests |
|---|---|---|
| Key missing | `Error: ANTHROPIC_API_KEY is not set` at first AI call | All AI features |
| Key invalid / revoked | HTTP 401 from Anthropic API | All AI features |
| Key rate-limited | HTTP 429 from Anthropic API | All AI features |
| Key on wrong account (billing suspended) | HTTP 403 or 529 from Anthropic API | All AI features |
| Key has restricted permissions | HTTP 403 for specific calls | Subset of features |
| Model deprecated | HTTP 404 or model-not-found error | Features using that model |
| Anthropic API outage | HTTP 5xx or connection timeout | All AI features |

---

## 6. Rotation Procedure

> **Pre-condition:** You need access to the Anthropic Console and both secret stores (Replit + Cloudflare).

### Step 1 — Generate new key

1. Open [console.anthropic.com](https://console.anthropic.com) → **API Keys**.
2. Click **Create Key**.
3. Name it: `fincava-prod-YYYYMMDD` (use today's date).
4. Copy the key immediately — it is shown only once.

### Step 2 — Update Replit (production)

1. Open the `fincava` Repl → **Secrets** panel.
2. Find `ANTHROPIC_API_KEY`.
3. Update the value with the new key.
4. Click **Save**.

### Step 3 — Update Cloudflare (pre-production)

```bash
cd artifacts/api-server
npx wrangler secret put ANTHROPIC_API_KEY
# Paste the new key when prompted
```

### Step 4 — Update local development (optional)

Edit your local `.env` file:

```
ANTHROPIC_API_KEY=sk-ant-...new-key...
```

### Step 5 — Update CI

Update the `ANTHROPIC_API_KEY` secret in your CI provider's environment settings.

### Step 6 — Validate (see Section 7)

Complete all validation checks before revoking the old key.

### Step 7 — Revoke old key

1. Return to [console.anthropic.com](https://console.anthropic.com) → **API Keys**.
2. Find the old key by its name/date.
3. Click **Revoke**.

---

## 7. Validation Procedure

Run these checks immediately after deploying the new key.

### 7.1 Smoke test — AI assistant

```bash
curl -s -X POST https://<host>/api/ai-assistant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user-token>" \
  -d '{"message":"hello"}' | jq .
# Expected: HTTP 200 with a reply field
```

### 7.2 Smoke test — Translation

```bash
curl -s -X POST https://<host>/api/messages/<id>/translate \
  -H "Authorization: Bearer <user-token>" | jq .
# Expected: HTTP 200 (or 404 if message not found — not a key error)
```

### 7.3 Check server logs

Within 2 minutes of deployment, look for:

```
# Good — no errors
# Bad — any of these indicate key problems:
Error: ANTHROPIC_API_KEY is not set
anthropic 401
anthropic 403
anthropic 429
```

### 7.4 Anthropic Console verification

1. Open [console.anthropic.com](https://console.anthropic.com) → **Usage**.
2. Confirm new requests appear under the new key's usage.
3. Confirm the old key shows zero new activity.

---

## 8. Rollback Procedure

If the new key fails validation:

1. **Do not revoke the old key** (skip Step 7 of the rotation procedure).
2. Revert Replit secret to the old key value.
3. Revert Cloudflare secret:

   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   # Paste the old key
   ```

4. Verify services recover using Section 7.
5. Investigate why the new key failed before retrying.

Rollback window: old key remains valid until explicitly revoked, so you can revert at any point.

---

## 9. Incident Response

### 9.1 Detection

Monitor for any of these signals:

- Server logs: `401`, `403`, `anthropic`, `ANTHROPIC_API_KEY is not set`
- User-facing errors: "AI assistant is not configured", "Translation service unavailable"
- Anthropic Console: sudden drop to zero usage

### 9.2 Triage

```bash
# Test the key directly (replace <key> with current value)
curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: <key>" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}' \
  | jq '{type,error}'
```

| Response | Meaning |
|---|---|
| `{"type":"message"}` | Key is valid |
| `{"type":"error","error":{"type":"authentication_error"}}` | Key invalid or revoked |
| `{"type":"error","error":{"type":"permission_error"}}` | Account suspended or restricted |
| `{"type":"error","error":{"type":"overloaded_error"}}` | Anthropic outage |
| HTTP 429 | Rate limit exceeded |

### 9.3 Escalation path

1. On-call engineer confirms the failure mode using the triage command above.
2. If key issue: rotate immediately (Section 6).
3. If billing/account issue: contact `support@anthropic.com` with workspace email.
4. If outage: activate emergency fallback (Section 11, Scenario C).

---

## 10. Emergency Fallback

AI features degrade gracefully to varying degrees. The table below documents safe fallback behavior when Anthropic is unavailable.

| Feature | Fallback Behavior | User Impact |
|---|---|---|
| AI assistant | Returns 503 — `"AI assistant is not configured"` | User sees error message; no data loss |
| Translation | Returns 502 — `"Translation service unavailable"` | Messages display untranslated |
| Document pre-screening | Error logged; document stays unprescreened | Admin reviews document manually |
| Scoring | Fails after 3 retries; supplier onboarding paused | Operator must re-trigger scoring manually |
| Document generation | Throws; document unavailable | User must wait; retry manually |
| RFQ drafting | Throws; draft unavailable | User writes draft manually |
| Buyer matching | Throws; matching blocked | Matching deferred until service restored |
| Admin enrichment | Returns 503 | Admin retries after recovery |

**Core platform functions that do NOT depend on Anthropic:**
- User registration and login
- Supplier and buyer profile management
- File uploads and storage
- Database reads and writes
- Health checks (`/healthz`, `/health`)
- Email notifications

The platform remains operational for non-AI workflows during an Anthropic outage.

---

## 11. Scenario Playbooks

### Scenario A — Key Expired

**Symptom:** `authentication_error` in logs; all AI calls returning 401.

**Steps:**
1. Generate a new key (Section 6, Step 1).
2. Update secrets in Replit and Cloudflare (Steps 2–3).
3. Validate (Section 7).
4. Revoke expired key (Step 7).

**Expected recovery time:** 10–15 minutes.

---

### Scenario B — Key Leaked

**Symptom:** Unexpected usage in Anthropic Console, a key found in logs/commits, or a security alert.

**Steps:**
1. **Immediately revoke the compromised key** via [console.anthropic.com](https://console.anthropic.com) → **API Keys** → **Revoke**. Do this before generating a replacement.
2. Generate a new key (Section 6, Step 1).
3. Update secrets in Replit and Cloudflare (Steps 2–3).
4. Validate (Section 7).
5. **Audit usage:** In Anthropic Console, check usage history on the compromised key for anomalous calls (unexpected models, high token counts, unusual hours).
6. **Scan the codebase and git history** for the leaked key string:

   ```bash
   git log -p | grep "sk-ant-"
   grep -r "sk-ant-" . --include="*.ts" --include="*.js" --include="*.env*"
   ```

7. If the key appears in git history, treat the entire history as compromised. Rotate all secrets stored alongside it.
8. File an incident report documenting: when the key was leaked, scope of potential exposure, and remediation taken.

**Expected recovery time:** 15–30 minutes (plus audit time).

---

### Scenario C — Anthropic API Outage

**Symptom:** HTTP 500/529 from Anthropic, or connection timeouts; [status.anthropic.com](https://status.anthropic.com) shows an incident.

**Steps:**
1. Confirm it is an Anthropic-side outage, not a key issue (Section 9.2 triage).
2. Do not rotate the key — it is not at fault.
3. Communicate status to affected users via in-app notice or email.
4. Defer non-urgent AI operations (scoring, enrichment, matching) — operators can re-trigger these manually after recovery.
5. Monitor [status.anthropic.com](https://status.anthropic.com) for resolution.
6. After recovery, verify with Section 7 smoke tests.
7. Re-trigger any queued or failed AI operations: supplier scoring, buyer matching, pending enrichment jobs.

**Features unaffected:** All non-AI platform workflows remain operational (see Section 10).

**Expected recovery time:** Dependent on Anthropic; typically minutes to hours.

---

### Scenario D — Model Deprecation

**Symptom:** `model_not_found` or `model_deprecated` error for a specific model string; Anthropic sends deprecation notice via email.

**Affected hard-coded models** (require code change, not just env var):

| File | Line | Current Model |
|---|---|---|
| `routes/rfqs.ts` | ~473 | `claude-haiku-4-5` |
| `services/buyer-gap-service.ts` | ~26 | `claude-sonnet-4-6` |
| `services/buyer-matching-service.ts` | ~29 | `claude-sonnet-4-6` |

**Configurable models** (can be updated via env var without a code deploy):
- `ANTHROPIC_SCORING_MODEL`
- `ANTHROPIC_DOCUMENT_MODEL`
- `ANTHROPIC_ENRICHMENT_MODEL`
- `ANTHROPIC_DISCOVERY_MODEL`
- `ANTHROPIC_TRANSLATION_MODEL`
- `ANTHROPIC_PRESCREENING_MODEL`
- `ANTHROPIC_ASSISTANT_MODEL` (in `routes/ai-assistant.ts`)
- `ANTHROPIC_ENHANCE_MODEL` (in `routes/admin.ts`)

**Steps:**

For configurable models:
1. Identify the replacement model from [Anthropic's model deprecation guide](https://docs.anthropic.com/en/docs/about-claude/models).
2. Update the relevant env var in Replit and Cloudflare secrets.
3. Validate with Section 7 smoke tests.
4. Update the default value in `lib/anthropic.ts` in a follow-up PR.

For hard-coded models (requires code change — follow CLAUDE.md development rules):
1. Show implementation plan and wait for approval.
2. Replace the hard-coded string with the appropriate exported constant from `lib/anthropic.ts`, or add a new env var.
3. Run tests: `cd artifacts/api-server && npm test`.
4. Deploy and validate.

**Expected lead time:** Anthropic typically provides 6+ months notice before deprecation. Action on receipt of notice, not at deadline.

---

### Scenario E — Billing / Account Suspension

**Symptom:** HTTP 403 or `permission_error` across all Anthropic calls; Anthropic sends billing alert email.

**Steps:**
1. Confirm via triage (Section 9.2) — `permission_error` response body confirms account-level block.
2. Log into [console.anthropic.com](https://console.anthropic.com) → **Billing** to identify the issue (overdue invoice, spending limit hit, policy violation).
3. Resolve billing:
   - **Overdue invoice:** Update payment method and settle outstanding balance.
   - **Spending limit:** Raise the limit under **Billing → Limits** or add credits.
   - **Policy violation:** Contact `support@anthropic.com` with workspace email (`sbirfan@gmail.com`).
4. Confirm the account is reinstated in the Anthropic Console.
5. Validate with Section 7 smoke tests — no key rotation needed.
6. Set a budget alert in Anthropic Console to prevent recurrence.

**Expected recovery time:** Minutes (billing update) to 1–2 business days (policy review).

---

## 12. Maintenance Notes

- **Rotate the key every 90 days** as a baseline practice, or immediately after any team member departure who had access to the key.
- **Set a spending alert** in [console.anthropic.com](https://console.anthropic.com) → Billing → at 80% of monthly budget to catch Scenario E before suspension.
- **Hard-coded model strings** in `routes/rfqs.ts`, `services/buyer-gap-service.ts`, and `services/buyer-matching-service.ts` should be migrated to env-var-backed constants in a future ticket to make model rotation purely operational.
- **The health endpoint does not probe Anthropic.** If uptime monitoring is added in a future phase, consider a shallow Anthropic liveness check (e.g., a minimal `messages.create` call) gated behind an internal-only endpoint.
- The singleton pattern in `lib/anthropic.ts` means a key change requires a process restart — updating secrets alone is not sufficient. Always restart or redeploy after updating `ANTHROPIC_API_KEY`.
