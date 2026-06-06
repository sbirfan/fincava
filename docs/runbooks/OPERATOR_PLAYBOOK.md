# FINCAVA Operator Playbook

**Audience:** Founder / solo operator  
**Updated:** 2026-06-06  
**Status:** Draft (FIN-011 Phase A) — finalise after FIN-023 and FIN-019 land

This is the single reference for running FINCAVA day-to-day. Every manual
step, every admin endpoint, and every flag is documented here.

---

## Table of contents

1. [Daily triage checklist](#1-daily-triage-checklist)
2. [Supplier pipeline — onboard → publish](#2-supplier-pipeline)
3. [Compliance queue](#3-compliance-queue)
4. [RFQ and inquiry triage](#4-rfq-and-inquiry-triage)
5. [Introduction SOP](#5-introduction-sop)
6. [Stuck supplier recovery](#6-stuck-supplier-recovery)
7. [Company ↔ supplier linking (FIN-001)](#7-company--supplier-linking)
8. [Deploy ritual (FIN-040)](#8-deploy-ritual)
9. [Feature flags reference](#9-feature-flags-reference)
10. [DB backup — manual and scheduled](#10-db-backup)
11. [Environment secrets reference](#11-environment-secrets-reference)

---

## 1. Daily triage checklist

Run this every morning before anything else.

```
□ Admin dashboard — any new supplier applications? (Supplier list, filter PENDING)
□ Compliance queue — any items awaiting review?
□ RFQ inbox — any new or open RFQs needing introduction?
□ Inquiry inbox — any unanswered buyer inquiries?
□ Sentry — any overnight errors or spikes?
□ /api/healthz — confirm { status: "ok", db: "ok" }
□ Check last backup ran (GET /api/admin/backup/list — newest entry < 25h old)
```

---

## 2. Supplier pipeline

### Supplier status model

```
NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED
                                      ↓
                                   INACTIVE  (manual suspend)
```

| Status | Meaning | Admin action needed |
|--------|---------|-------------------|
| `NOT_READY` | Onboarded but not yet evaluated | Trigger scoring |
| `ELIGIBLE` | Passed graduation gate — has RUT, verified docs | Create product, set SELLABLE |
| `SELLABLE` | Commercially scored, ready for matching | Publish when marketplace is ready |
| `PUBLISHED` | Live on marketplace | Monitor |
| `INACTIVE` | Suspended | Investigate, restore if resolved |

### Step-by-step: WhatsApp-onboarded farmer → published

**Step 1 — Farmer submits via WhatsApp onboarding form**
- Auto-creates a row in `suppliers` with `sellableStatus = NOT_READY`
- Admin receives email alert (configured via `ADMIN_EMAIL`)
- Review in admin dashboard: `/admin/suppliers`

**Step 2 — AI enrichment (optional, improves data quality)**
```
POST /api/admin/ingestion/enrich
Body: { supplierId: <id> }
```
Calls Claude to fill gaps in farm data (crops, municipality, certifications).
Check result in supplier detail drawer.

**Step 3 — Score the supplier**
```
POST /api/admin/suppliers/<id>/score   (via admin UI "Score Now" button)
```
Runs the graduation pipeline: compliance check → trust score → sets
`sellableStatus` to `ELIGIBLE` if all gates pass.

**Step 4 — Review graduation result**
- If `ELIGIBLE`: supplier passed. Proceed to Step 5.
- If still `NOT_READY`: check compliance drawer for which gate failed.
  Common failures: missing `rutDian`, unverified compliance docs. See
  [Section 3](#3-compliance-queue).

**Step 5 — Create a product listing**
```
POST /api/admin/suppliers/<companyId>/create-product
Body: { name, category, pricePerKg, availableKg, certifications, ... }
```

**Step 6 — Advance to SELLABLE**
```
PATCH /api/admin/suppliers/<id>/status
Body: { sellableStatus: "SELLABLE" }
```

**Step 7 — Link to a company (cooperative or own company) if applicable**
See [Section 7](#7-company--supplier-linking).

**Step 8 — Publish** *(when ENABLE_RETAIL is on)*
```
PATCH /api/admin/suppliers/<id>/status
Body: { sellableStatus: "PUBLISHED" }
```

---

## 3. Compliance queue

The compliance queue lists suppliers with outstanding documentation gaps
surfaced by the AI scoring pipeline.

**Access:** `/admin/compliance-queue` in the admin UI

### Actioning a compliance item

1. Open the item — review which document or field is flagged
2. Contact the supplier (or their field officer) to obtain the missing doc
3. Once received, update via admin supplier edit:
   ```
   PATCH /api/admin/suppliers/<id>
   Body: { complianceDocs: { rutDian: true, ... } }
   ```
4. Re-trigger scoring (Step 3 above) — supplier should advance if the gap
   is resolved

### Common compliance gates

| Gate | Field | What's needed |
|------|-------|--------------|
| RUT/DIAN | `compliance_docs.rutDian` | Verified NIT / RUT document |
| Organic cert | `compliance_docs.organicCert` | Certifying body + expiry |
| Phytosanitary | `compliance_docs.phytosanitary` | Valid certificate |

> **Note (FIN-023 pending):** The `rut_dian` declaration in the onboarding
> form does not yet align with the `compliance_docs.rutDian` gate. Until
> FIN-023 lands, manually verify RUT status in the supplier drawer rather
> than relying solely on the onboarding declaration.

---

## 4. RFQ and inquiry triage

### RFQs

Buyers submit RFQs via the platform. Each RFQ has a status:

| Status | Meaning |
|--------|---------|
| `OPEN` | Awaiting supplier match / introduction |
| `INTRODUCED` | Founder has made an introduction |
| `AWARDED` | Buyer selected a supplier response |
| `CLOSED` | Expired or cancelled |

**Daily check:**
```
GET /api/rfqs  (or admin UI → RFQs tab)
Filter: status = OPEN
```

For each open RFQ, identify the best-matched supplier(s) and proceed to
[Section 5](#5-introduction-sop).

### Inquiries

Direct buyer inquiries (not full RFQs):
```
GET /api/admin/inquiries  (admin UI → Inquiries tab)
```
Same triage: identify supplier, make introduction.

---

## 5. Introduction SOP

**Goal:** Connect a buyer with a verified supplier within 24h of RFQ submission.

### Step 1 — Identify the right supplier

- Check buyer's RFQ: product category, quantity, destination, certifications required
- Cross-reference with `SELLABLE` / `PUBLISHED` suppliers in that category
- Optionally run matching:
  ```
  POST /api/admin/buyers/<buyerProfileId>/run-match
  ```

### Step 2 — Trigger the introduction email

```
POST /api/admin/rfqs/<rfqId>/introduce
Body: { supplierId: <id> }
```

This sends a bilingual introduction email to both parties.

**Email resolution order (FIN-001):**
1. Supplier's primary company link → company owner email
2. Active product's company → company owner email (legacy)
3. `supplier.userId` email (web-registered suppliers)

If the endpoint returns `"supplier email not found"`, the supplier has no
linked email path — link them to a company first (Section 7) or update
`supplier.userId` to a valid user account.

### Step 3 — Follow-up

- Mark in your CRM / notes: introduced on [date], buyer = X, supplier = Y
- Follow up in 48h if no response from either party
- If deal progresses, update RFQ status manually or via buyer's award action

---

## 6. Stuck supplier recovery

Use this when a supplier is visible in the dashboard but not advancing.

### Symptom: stuck at NOT_READY after scoring

1. Open supplier drawer → Compliance tab
2. Check which gate is red
3. Fix the underlying data (Section 3)
4. Re-score: `POST /api/admin/suppliers/<id>/score`

### Symptom: scoring pipeline appears to hang

The pipeline is not durable (FIN-037 — no job queue). If scoring was
triggered but the supplier never advanced:

1. Check server logs (Sentry or Replit logs) for errors around that supplier ID
2. Common causes: Anthropic API timeout, DB connection blip
3. Recovery: re-trigger scoring manually from the admin UI
4. If still stuck after 2 re-tries, check `ai_outputs` table for the
   latest entry for that supplier — error field will indicate the failure

### Symptom: supplier is ELIGIBLE but no product created

Products are not auto-created. Manually run Step 5 of the supplier pipeline.

### Symptom: SELLABLE supplier not appearing in buyer matches

- Confirm `ENABLE_MATCHING = true` in Replit shared env
- Confirm the supplier has at least one active product
- Re-run matching for the buyer: `POST /api/admin/buyers/<id>/run-match`

---

## 7. Company ↔ supplier linking

FIN-001 introduced the `company_supplier_links` join table. Use these
endpoints to link a WhatsApp-onboarded farmer to a company (e.g. their
cooperative).

**List links for a supplier:**
```
GET /api/admin/suppliers/<supplierId>/links
```

**Create a link:**
```
POST /api/admin/suppliers/<supplierId>/links
Body: {
  companyId: <id>,
  linkType: "MEMBER" | "OWNER" | "CONTRACTED",
  isPrimary: true,          // true = this is the canonical selling channel
  notes: "optional string"  // max 500 chars
}
```

**Remove a link:**
```
DELETE /api/admin/suppliers/<supplierId>/links/<linkId>
```

**Link types:**

| Type | When to use |
|------|-------------|
| `MEMBER` | Farmer is a member of a cooperative company |
| `OWNER` | Sole-trader whose company IS their selling entity |
| `CONTRACTED` | Independent supplier under a supply agreement |

**Rule:** Only one `isPrimary = true` link per supplier. Setting a new
primary link automatically demotes the previous one.

---

## 8. Deploy ritual

Follow this every time you push changes to production. (FIN-040)

```
# 1. Confirm local is clean and up to date
git fetch origin
git status              # should be clean
git log origin/main..HEAD  # should be empty (nothing unpushed)

# 2. Pull latest in both repos
cd ~/GitHub/fincava-hub && git pull origin main
cd ~/GitHub/fincava     && git pull origin main

# 3. Run tests locally (if code changed)
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/api-server run typecheck

# 4. Push to GitHub (triggers review)
git push origin main   # from fincava-hub
# sync to fincava and push

# 5. In Replit — click Publish
# Replit pulls from GitHub and runs the deploy workflow.
# Monitor the deploy log for errors.

# 6. Verify post-deploy
curl https://fincava.replit.app/api/healthz
# Expected: { "status": "ok", "db": "ok" }
```

**If the deploy fails:**
- Check Replit deploy log for the error
- If DB migration failed: inspect `drizzle.__drizzle_migrations` table
- Rollback: revert the commit in GitHub and re-publish

---

## 9. Feature flags reference

Flags are set in `.replit` `[userenv.shared]` or Replit Secrets. Evaluated
at process start — **restart the server after changing a flag**.

| Flag | Default | Current | What it gates |
|------|---------|---------|--------------|
| `ENABLE_MATCHING` | `false` | `true` | Buyer–supplier matching engine |
| `ENABLE_TRANSACTIONS` | `false` | `true` | Order/transaction flows |
| `ENABLE_RETAIL` | `false` | `false` | Retail storefront (Phase 5) |
| `ENABLE_FINANCE` | `false` | `false` | Financing / loan flows |
| `ENABLE_LOGISTICS` | `false` | `false` | Shipment tracking |
| `ENABLE_INTELLIGENCE_PUBLIC` | `false` | `false` | Public market intelligence |

**Phase gate expectations:**

| Phase | Matching | Transactions | Retail |
|-------|----------|--------------|--------|
| Phase I (now) | ✅ on | ✅ on | ❌ off |
| Phase II | ✅ on | ✅ on | ✅ on |

Do not enable `ENABLE_RETAIL` until Phase 4 gate criteria are met (see
`docs/SOURCE_OF_TRUTH_ROADMAP.md`).

---

## 10. DB backup

### Scheduled backup
Runs automatically at **03:00 UTC / 22:00 COT** daily via Replit cron (FIN-042).  
Retention: 7 most recent backups. Older backups are deleted automatically.

### Manual backup trigger
```
POST /api/admin/backup/run
Header: x-backup-token: <BACKUP_SECRET_V2>
# OR log in as admin and POST without the header (uses JWT auth)
```

### List available backups
```
GET /api/admin/backup/list   (admin auth required)
```

### Verify last backup ran
```bash
curl -s https://fincava.replit.app/api/admin/backup/list \
  -H "Cookie: <admin-session-cookie>" | jq '.[0]'
# Check: timestamp of newest entry should be < 25h ago
```

### Restore procedure
```bash
# 1. Download the .dump file from Replit Object Storage
# 2. Run pg_restore against a fresh DB or the target DB
pg_restore -d $DATABASE_URL --clean --if-exists <filename>.dump
# WARNING: --clean drops existing objects before restoring. Use on a copy first.
```

---

## 11. Environment secrets reference

All secrets live in **Replit Secrets** (never in committed files).

| Secret | Purpose | Required |
|--------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Always |
| `SESSION_SECRET` | Express session signing | ✅ Always |
| `RESEND_API_KEY` | Transactional email via Resend | ✅ Always |
| `ADMIN_EMAIL` | Operator inbox for alerts | ✅ Always |
| `UPLOAD_TOKEN_SECRET` | HMAC signing for upload tokens | ✅ Always |
| `BACKUP_SECRET_V2` | Bearer token for cron backup calls | ✅ Always |
| `SENTRY_DSN` | Error monitoring | ✅ Set (FIN-036) |
| `ANTHROPIC_API_KEY` | AI enrichment + scoring | ✅ Always |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Replit Object Storage bucket | ✅ Always |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | WhatsApp onboarding | ⚠️ Required for onboarding |
| `ENABLE_MATCHING` | Feature flag (shared env, not secret) | — |
| `ENABLE_TRANSACTIONS` | Feature flag (shared env, not secret) | — |

**Key rotation procedure:** See `docs/runbooks/FIN-043-anthropic-key-rotation.md`
for the Anthropic key. Apply the same pattern for other keys: update in Replit
Secrets → re-publish → verify healthz.

---

*This playbook is a living document. Update it whenever a FIN item changes
an operator-facing flow. Next scheduled update: after FIN-023 (compliance
gate fix) and FIN-019 (AI gap writeback) land in Phase B.*
