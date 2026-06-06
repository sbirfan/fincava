# Fincava Intelligence Layer — Design Document v1.1
**Date:** 2026-05-08 (updated 2026-05-08)  
**Status:** C2 COMPLETE — C1 fixes queued — C3/C4 design in progress  
**Scope:** Layer II (Intelligence) across all four components  
**Repo HEAD:** `e025f82`

---

## Document Map

This document is the source of truth for the full Intelligence Layer (Layer II).
It defines all four components, their current state, build readiness, and
execution sequencing. Component 2 (Compliance Intelligence Engine) is **ready
to execute in parallel** with the design of Components 3 and 4.

| Component | Name | Build Status | Priority |
|-----------|------|-------------|----------|
| C1 | Supplier Discovery Engine | Exists — audit complete — 3 fixes queued (prompts ready) | P1 |
| C2 | Compliance Intelligence Engine | ✅ **COMPLETE** — Layers A/B/C/D + OD-5 delivered; schema migrated | — |
| C3 | Buyer-Supplier Matching Engine | Exists — design gaps identified — build next | P1 |
| C4 | Trust Score Layer | Exists — functional, not exposed — build after C3 | P2 |

---

## Layer II Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        INTELLIGENCE LAYER (II)                          │
│                    ENABLE_INTELLIGENCE_PUBLIC = false                    │
│                         Admin-first, all gates                          │
└─────────────────────────────────────────────────────────────────────────┘
           │                    │                    │                    │
           ▼                    ▼                    ▼                    ▼
    ┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐
    │     C1      │    │      C2      │    │      C3      │    │    C4      │
    │  Supplier   │    │  Compliance  │    │   Buyer-     │    │  Trust     │
    │  Discovery  │    │ Intelligence │    │  Supplier    │    │  Score     │
    │  Engine     │    │   Engine     │    │  Matching    │    │  Layer     │
    └─────────────┘    └──────────────┘    └──────────────┘    └────────────┘
    Admin-triggered    Async + on-demand   On-demand           Computed on
    POST discovery     from upload/review  POST trigger        order/verify
    Ephemeral output   Persists ai_outputs Persists matches    Persists scores
    Haiku (discovery)  Sonnet (A, B, D)    Sonnet (matching)   Rules-based
                       Rules-only (C)
```

**Shared infrastructure across all components:**
- `lib/anthropic.ts` — model constants, `getAnthropicClient()`
- `ai_outputs` table — canonical log of all AI calls (callType, documentContent, gapAnalysis jsonb)
- `config/ai-prompts/` — prompt configuration layer (all prompts live here)
- `lib/logger.ts` — structured Pino logging

---

## Component 1 — Supplier Discovery Engine

### Current State
`services/discovery-engine.ts` (607 lines). Fully functional. Admin-only route.
Ephemeral — no DB writes. Returns candidate farm leads with optional 1-level
link expansion.

Full audit findings are in: `PIVOT/root/Discovery_Engine_Audit.md`

### Pre-Public Fixes (queued — prompts in `PIVOT/root/IntelligenceFixes/Discovery_Engine_Fixes.md`)

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| I4 | `extractJsonArray` grabs first `[...]` — misses leads if Claude puts incidental array first | Medium | Prompt ready |
| I3 | `category`/`region` interpolated into prompt without newline/backtick sanitization | Medium | Prompt ready |
| I1 | `expandLeadsWithLinks` is sequential in request path — worst-case 50s | Critical | Prompt ready |

### Design Gaps (post-fix, pre-public)

| Gap | Description |
|-----|-------------|
| I2 | No deduplication against existing `suppliersTable` — admins get same farms on repeat runs |
| I5 | No concurrency protection — two admins get identical leads simultaneously |
| I6 | `AGRO_KEYWORDS` dictionary missing Colombian exotic categories (uchuva, granadilla, borojó, hearts of palm, maracuyá) |

---

## Component 2 — Compliance Intelligence Engine

> **Status: DESIGN COMPLETE — ready to execute in parallel with C3/C4 design**

This component was designed in `ai-scoring-design.md` (uploaded 2026-05-08).
The design is sound and the build can begin immediately after the 5 open
decisions below are locked. The full design spec follows in §2.1–2.5.

### Pre-Build Review Findings

The following issues were identified during design review. They must be resolved
before paste-to-Replit, not after.

**Issue R1 — FITOSANITARIO requirement missing from Layer C risk patterns [MUST FIX]**

The `REQUIREMENT_REGISTRY` in `gap-analysis-service.ts` has 6 requirement codes:
`DIAN_RUT`, `DIAN_EXPORTADOR`, `ICA_REGISTRO`, `ICA_CONTEXT`, `FITOSANITARIO`, `FNC_COFFEE`.

The Layer C pattern registry covers 5 patterns, but `FITOSANITARIO` (severity:
HIGH, estimatedDays: 14) is not referenced in any pattern. A supplier whose
phytosanitary certificate is submitted but whose ICA_REGISTRO is not started
has a sequencing risk that won't be flagged. Add this pattern:

| Code | Severity | Trigger | Label |
|------|----------|---------|-------|
| `PHYTO_SEQUENCING_RISK` | warning | `FITOSANITARIO` state ∈ {submitted, verified} AND `ICA_REGISTRO` state ∈ {not_started, not_sure} | Phytosanitary sequencing risk — ICA Registro must be active before FITOSANITARIO can be verified |

**Issue R2 — Layer A Vision input: PDF vs. image ambiguity [MUST CLARIFY before build]**

The design specifies "base64-encoded image bytes" for the Vision call, but the
storage service (`storage.ts`) accepts a content-type allowlist that likely
includes PDFs (`application/pdf`). Claude Sonnet vision handles PDFs via a
different input format (`document` block, not `image` block in the Anthropic
SDK). The prescreening service must branch on content type:

```typescript
// In prescreening-service.ts:
const contentType = doc.contentType; // from compliance_documents_v2
if (contentType === "application/pdf") {
  // Use { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
} else {
  // Use { type: "image", source: { type: "base64", media_type: contentType, data: base64 } }
}
```

Verify the storage allowlist before building Layer A.

**Issue R3 — Layer A has no Zod validation on prescreening output [SHOULD FIX]**

Every other AI service in the codebase has been flagged (M-4 hardening task)
for missing Zod validation on AI responses. Layer A should not repeat this
pattern — it's the cleanest implementation opportunity.

Add `PrescreeningResultSchema` before shipping:

```typescript
const PrescreeningResultSchema = z.object({
  document_type_detected: z.string(),
  expected_document_type: z.string(),
  type_match: z.boolean(),
  language_detected: z.enum(["es", "en", "other"]),
  image_quality: z.enum(["good", "poor", "unreadable"]),
  agency_detected: z.enum(["DIAN", "ICA", "FNC", "unknown"]),
  agency_match: z.boolean(),
  flags: z.array(z.string()),
  recommendation: z.enum(["pass", "needs_review", "reject"]),
  rationale: z.string().max(200),
  confidence: z.number().min(0).max(1),
});
```

**Issue R4 — Layer B caching key collision risk [SHOULD FIX before build]**

The design caches by `requirementId` in `ai_outputs.gapAnalysis`. But if a
supplier re-uploads a document for the same requirement, `requirementId` hasn't
changed — the stale suggestion is returned. The design correctly identifies this
in Open Decision #2. Resolution: cache by `(requirementId, latestDocumentId)`.
Store the `documentId` as a field in the `ai_outputs.gapAnalysis` JSON so the
invalidation check is O(1):

```typescript
// On cache read:
const cached = await db.select().from(aiOutputsTable)
  .where(and(
    eq(aiOutputsTable.callType, "REVIEW_SUGGESTION"),
    sql`gap_analysis->>'requirementId' = ${requirementId}`,
    sql`gap_analysis->>'documentId' = ${latestDocumentId}`,
  )).limit(1);
```

**Issue R5 — Layer A concurrent upload bursts are unbounded [LOW — note for ops]**

`setImmediate(() => prescreenDocument(uploadId))` fires once per document
upload confirm. A supplier uploading 5 documents in a batch triggers 5
concurrent Sonnet Vision calls. With current Anthropic rate limits (RPM/TPM),
this is unlikely to cause errors at Fincava's current volume. Monitor and add a
per-supplier debounce (Redis or node Map with TTL) if prescreening failures
appear in logs.

### Open Decisions — ALL LOCKED ✅

| # | Decision | Resolution |
|---|----------|------------|
| OD-1 | Layer A image fetch method | ✅ **Direct server-account access via `storage.bucket().file().download()`** — GCS service account created; `GOOGLE_APPLICATION_CREDENTIALS` set in Replit env; Replit Object Storage is a real GCS bucket so service account needs `roles/storage.objectViewer` on that bucket; prescreening service uses `new Storage()` auto-credential detection + `file.download()` to buffer bytes in one call |
| OD-2 | Layer B cache granularity | ✅ **Cache by `(requirementId, latestDocumentId)`** — requirementId-only causes correctness failure on document re-upload; store both as `{ requirementId, documentId }` in `ai_outputs.gapAnalysis` jsonb |
| OD-3 | Layer C stale threshold | ✅ **`COMPLIANCE_STALE_DAYS` env var, default 30, bounded 7–90** — multi-market flexibility; bounds enforcement in code prevents misconfiguration |
| OD-4 | Layer D access | ✅ **Admin-only** — supplier self-serve deferred to Phase III |
| OD-5 | Auto-rescore after document verification | ✅ **Auto-trigger enabled with 5-minute debounce guard** — fires `setImmediate` in `adminComplianceQueue.ts` after transition to `verified`; skips if a score was written in the last 5 minutes (prevents storm when admin verifies multiple requirements back-to-back) |

**OD-5 implementation pattern** (in `adminComplianceQueue.ts` after state transition — `scoreSupplier` is unchanged):
```typescript
setImmediate(async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const [recentScore] = await db
    .select({ id: aiOutputsTable.id })
    .from(aiOutputsTable)
    .where(and(
      eq(aiOutputsTable.supplierId, supplierId),
      eq(aiOutputsTable.callType, "ONBOARD_SCORE"),
      gt(aiOutputsTable.createdAt, fiveMinutesAgo)
    ))
    .limit(1);
  if (recentScore) return; // debounce — scored recently, skip
  await scoreSupplier(supplierId, { forceRescore: true });
});
```

**OD-1 fetch pattern** (in `document-prescreening-service.ts`):
```typescript
import { Storage } from "@google-cloud/storage";

// new Storage() with no arguments uses GOOGLE_APPLICATION_CREDENTIALS env var
// (set in Replit Secrets to the path of your service account JSON key).
// The service account must have roles/storage.objectViewer on the Replit Object Storage bucket.
const prescreeningStorage = new Storage();

// documentPath is the normalized /objects/... path stored in compliance_documents_v2.
// Parse to get bucketName + objectName (same helper pattern as objectStorage.ts).
const { bucketName, objectName } = parseObjectPath(documentPath);
const [bytes] = await prescreeningStorage.bucket(bucketName).file(objectName).download();

// Branch on contentType — Claude SDK uses different input block types for PDF vs image:
const visionInput = contentType === "application/pdf"
  ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") } }
  : { type: "image", source: { type: "base64", media_type: contentType as "image/jpeg" | "image/png" | "image/webp", data: bytes.toString("base64") } };
```

**One-time GCS setup required before building Layer A:**
1. Google Cloud Console → IAM & Admin → Service Accounts → Create service account
2. Grant the service account `roles/storage.objectViewer` on your Replit Object Storage bucket
   - Find the bucket name from your Replit `PRIVATE_OBJECT_DIR` env var (format: `/bucketname/...`)
3. Download the service account JSON key
4. Add to Replit Secrets: `GOOGLE_APPLICATION_CREDENTIALS` = path to the JSON key file
   (or set `GOOGLE_APPLICATION_CREDENTIALS_JSON` = the JSON content directly, and add a startup line to write it to disk)

**Note:** The prescreening service uses its own `new Storage()` instance with explicit credentials — it does NOT use the existing `objectStorageClient` (which relies on the Replit sidecar). Both can coexist.

**OD-2 cache key pattern** (in `review-suggestion-service.ts`):
```typescript
// Store: ai_outputs.gapAnalysis = { "requirementId": 42, "documentId": 17 }
// Hit condition: both requirementId AND latestDocumentId match → return cached
// Miss condition: documentId changed (new upload) → call Claude, write new ai_outputs row
```

**OD-3 env var initialization** (module-level in `risk-pattern-service.ts`):
```typescript
const rawDays = parseInt(process.env["COMPLIANCE_STALE_DAYS"] ?? "30", 10);
const COMPLIANCE_STALE_DAYS = Math.min(90, Math.max(7, isNaN(rawDays) ? 30 : rawDays));
```

### Build Status (C2 layers) — ✅ ALL COMPLETE

| Layer | Deliverable | Status |
|-------|-------------|--------|
| C | `risk-pattern-service.ts` + route injection (6 patterns incl. PHYTO_SEQUENCING_RISK) | ✅ Done |
| A | `document-prescreening-service.ts` + schema migration + storage trigger + Zod validation | ✅ Done |
| B | `review-suggestion-service.ts` + new route + `(requirementId, documentId)` cache | ✅ Done |
| D | `generateInvestorSummary()` + `mode=investor` route branch | ✅ Done |
| OD-5 | Event-driven re-score on `verified` transition (5-min debounce in `adminComplianceQueue.ts`) | ✅ Done |
| Schema | `prescreening_result jsonb` + `prescreened_at timestamptz` on `compliance_documents_v2` | ✅ Done |

---

### 2.1 — Layer A: Document Pre-Screening (Vision AI)

**Trigger:** `POST /storage/uploads/confirm` — fires `prescreenDocument(uploadId)` as `setImmediate` after 200 response. Never blocks the upload response.

**New service:** `services/document-prescreening-service.ts`

**Input assembled from:**
- `compliance_documents_v2` row (requirementCode, supplierId, gcsPath, contentType)
- Supplier row (nombreCompleto, municipio)
- `REQUIREMENT_REGISTRY[requirementCode]` (expected agency, label, severity)

**Claude call:**
- Model: `DOCUMENT_MODEL` (claude-sonnet-4-6) — vision-capable
- Max tokens: 512
- Input: base64 document bytes (image block or document block, branching on `contentType`) + structured context JSON
- System prompt: `PRESCREENING_PROMPT` from `config/ai-prompts/prescreening-prompt.ts`

**Output schema (Zod-validated — R3 fix):**
```typescript
const PrescreeningResultSchema = z.object({
  document_type_detected: z.string(),
  expected_document_type: z.string(),
  type_match: z.boolean(),
  language_detected: z.enum(["es", "en", "other"]),
  image_quality: z.enum(["good", "poor", "unreadable"]),
  agency_detected: z.enum(["DIAN", "ICA", "FNC", "unknown"]),
  agency_match: z.boolean(),
  flags: z.array(z.string()),
  recommendation: z.enum(["pass", "needs_review", "reject"]),
  rationale: z.string().max(200),
  confidence: z.number().min(0).max(1),
});
```

**Flag catalogue (static — not AI-generated):**
`WRONG_DOCUMENT_TYPE`, `LOW_IMAGE_QUALITY`, `UNREADABLE`, `LANGUAGE_MISMATCH`, `WRONG_AGENCY`, `POSSIBLE_EXPIRY`, `HANDWRITTEN_CONTENT`

**DB writes:**
- `ai_outputs`: `callType = "DOC_PRESCREENING"`, `documentContent = JSON.stringify(result)`
- `compliance_documents_v2.prescreening_result` — new `jsonb` column
- `compliance_documents_v2.prescreened_at` — new `timestamptz` column

**Schema migration:**
```sql
ALTER TABLE compliance_documents_v2
  ADD COLUMN prescreening_result jsonb,
  ADD COLUMN prescreened_at timestamptz;
```

**Failure handling:** Non-fatal. Any error → `prescreening_result = null`, log warn. 60-second combined timeout on GCS fetch + Claude call.

**New `callType`:** `DOC_PRESCREENING`

---

### 2.2 — Layer B: Suggested Review Decision

**Trigger:** Admin opens compliance review modal.

**New route:** `GET /api/admin/compliance/requirements/:requirementId/ai-suggestion` (adminOnly)

**New service:** `services/review-suggestion-service.ts`

**Caching (OD-2 resolved):** Cache key = `(requirementId, latestDocumentId)` stored in `ai_outputs.gapAnalysis` JSON. Return cached result if `documentId` matches; re-run Claude if a newer document was uploaded.

**Input assembled from:**
- `supplier_requirement_status` row (state, requirementCode, agency)
- `compliance_documents_v2` rows for this requirement (latest documentId, gcsPath, uploadDate)
- Latest `DOC_PRESCREENING` result from `ai_outputs` for those documents
- Supplier row (commercialScore, sellableStatus, nombreCompleto, municipio)
- `admin_compliance_reviews` history (past decisions on this requirement)

**Claude call:**
- Model: `DOCUMENT_MODEL` (claude-sonnet-4-6)
- Max tokens: 256
- Text input only (no vision) — uses prescreening JSON as context
- System prompt: `REVIEW_SUGGESTION_PROMPT` from `config/ai-prompts/review-suggestion-prompt.ts`

**Output schema:**
```typescript
const ReviewSuggestionSchema = z.object({
  recommendation: z.enum(["verified", "needs_fix", "escalate"]),
  rationale: z.string().max(120),
  confidence: z.number().min(0).max(1),
  key_signals: z.array(z.string()).max(3),
});
```

**Recommendation rules (baked into prompt):**
- `verified` — prescreening passed, agency match, type match, no flags
- `needs_fix` — low image quality OR wrong type OR language mismatch
- `escalate` — wrong agency, possible expiry, or confidence < 0.5

**UI integration (compliance-queue.tsx):**
- Review modal fetches on open, shows colored chip: green (Verified) / amber (Needs Fix) / red (Escalate)
- Rationale displayed below chip; `key_signals` as grey tags
- Chip is labeled "AI suggested" — admin must confirm or override before submitting

**DB writes:** `ai_outputs` on cache miss: `callType = "REVIEW_SUGGESTION"`

**New `callType`:** `REVIEW_SUGGESTION`

---

### 2.3 — Layer C: Risk Pattern Flagging

**Design principle: Pure computation — zero DB writes, zero Claude calls.**
Deterministic rules engine over `supplier_requirement_status` rows. Runs inline
in existing compliance queue routes — no new endpoints, no added latency (all
data already fetched by the route).

**New service:** `services/risk-pattern-service.ts`

**Function signature:**
```typescript
evaluateRiskPatterns(
  requirements: RequirementSnapshot[],
  supplier: { commercialScore: number | null; eligibilityStatus: string | null },
  now?: Date
): RiskFlag[]
```

**Pattern registry (Phase I — 6 patterns including R1 fix):**

| Code | Severity | Trigger Condition | Label |
|------|----------|-------------------|-------|
| `SEQUENCING_RISK` | warning | ICA_REGISTRO ∈ {submitted, verified} AND DIAN_RUT ∈ {not_started, not_sure} | Sequencing risk — DIAN RUT must be resolved before ICA can be verified |
| `PHYTO_SEQUENCING_RISK` | warning | FITOSANITARIO ∈ {submitted, verified} AND ICA_REGISTRO ∈ {not_started, not_sure} | Phytosanitary sequencing risk — ICA Registro must be active first |
| `SYSTEMIC_ISSUES` | critical | ≥ 2 requirements in `needs_fix` simultaneously | Systemic issues — multiple requirements rejected simultaneously |
| `COMMERCIAL_READINESS_GAP` | warning | DIAN_EXPORTADOR ∈ {submitted, verified} AND commercialScore < 40 | Commercial readiness gap — export authorization progressing but score too low |
| `STALE_SUBMISSION` | warning | Any CRITICAL requirement in `submitted` AND `updatedAt` > `COMPLIANCE_STALE_DAYS` (default 30) days ago | Stale submission — no admin action in 30+ days |
| `SCORE_COMPLIANCE_MISMATCH` | info | commercialScore ≥ 60 AND eligibilityStatus = "FAIL" | Score-compliance mismatch — strong score, compliance blocking SELLABLE |

**OD-3 resolution:** `COMPLIANCE_STALE_DAYS` env var, default 30.

**Route integration:**
- `GET /admin/compliance-queue` → inject `riskFlags: RiskFlag[]` per item in response
- `GET /admin/compliance-queue/:supplierId` → inject `riskFlags` at top level

**UI integration:**
- Queue table: color-coded icon badges per row (🔴 critical / 🟡 warning / 🔵 info)
- Supplier detail drawer: expandable "Risk Signals" section

---

### 2.4 — Layer D: Investor-Grade Compliance Summary

**Trigger:** Admin POST with `mode=investor` on existing route.

**Route change:**
```
POST /api/admin/suppliers/:id/compliance-document
Body: { mode?: "standard" | "investor" }   ← mode is new; default = "standard"
```

`mode=standard` → existing Spanish gap document (no change)
`mode=investor` → new English investor summary

**New function:** `generateInvestorSummary()` added to `services/document-generator.ts`

**Input assembled from:**
- Supplier row (all fields), farm row, economics row
- All `supplier_requirement_status` rows (including verified)
- `admin_compliance_reviews` — last review per requirement
- Latest `ai_outputs` (callType=ONBOARD_SCORE) — score, pathway, gap_analysis
- `supplier_export_mode` row (direct / intermediary / not_sure)
- `trust_scores` row (platform trust score + tier)

**Claude call:**
- Model: `DOCUMENT_MODEL` (claude-sonnet-4-6)
- Max tokens: 3000
- System prompt: `INVESTOR_SUMMARY_PROMPT` from `config/ai-prompts/investor-summary-prompt.ts`
- Instructions: English, professional investor-grade tone, plain text with markdown headings, factual only

**Output document sections:**
1. Executive Summary (3–4 sentences)
2. Compliance Status by Agency (DIAN / ICA / FNC)
3. Export Readiness Score Breakdown (score, pathway, signals)
4. Verified Certifications (table with verifiedAt, expiresAt)
5. Outstanding Items (with severity + estimated days to resolution)
6. Risk Assessment (Low / Medium / High, investor action)
7. Metadata footer (supplierId, timestamp, model version)

**DB writes:** `ai_outputs`: `callType = "INVESTOR_SUMMARY"`, `documentContent = <text>`

**OD-4 resolution:** Admin-only in Phase II. Supplier self-serve deferred to Phase III.

**New `callType`:** `INVESTOR_SUMMARY`

---

### 2.5 — C2 Schema + File Summary

**Schema changes (minimal — R1-R4 fixes incorporated):**

| Table | Column | Type | Layer |
|-------|--------|------|-------|
| `compliance_documents_v2` | `prescreening_result` | `jsonb` | A |
| `compliance_documents_v2` | `prescreened_at` | `timestamptz` | A |
| `ai_outputs.callType` | New values: `DOC_PRESCREENING`, `REVIEW_SUGGESTION`, `INVESTOR_SUMMARY` | — | A, B, D |

No new tables needed.

**New files:**

| File | Type | Layer |
|------|------|-------|
| `services/document-prescreening-service.ts` | New service | A |
| `services/review-suggestion-service.ts` | New service | B |
| `services/risk-pattern-service.ts` | New service | C |
| `config/ai-prompts/prescreening-prompt.ts` | New prompt | A |
| `config/ai-prompts/review-suggestion-prompt.ts` | New prompt | B |
| `config/ai-prompts/investor-summary-prompt.ts` | New prompt | D |

**Existing files modified:**

| File | Change | Layer |
|------|--------|-------|
| `routes/storage.ts` | Fire `prescreenDocument()` in `setImmediate` after confirm 200 | A |
| `routes/adminComplianceQueue.ts` | Inject `riskFlags` into GET responses | C |
| `routes/complianceEvaluator.ts` | Add `?mode=investor` branch | D |
| `services/document-generator.ts` | Add `generateInvestorSummary()` | D |
| `routes/index.ts` | Register review-suggestion route | B |
| `schema/compliance-concierge.ts` | Add 2 columns to `compliance_documents_v2` | A |

**Model assignment:**

| Layer | Model | Reason |
|-------|-------|--------|
| A | claude-sonnet-4-6 | Vision required; small output (512 tokens) |
| B | claude-sonnet-4-6 | Nuanced document reasoning; reuses DOCUMENT_MODEL |
| C | None | Deterministic rules; zero latency cost; zero API spend |
| D | claude-sonnet-4-6 | High-quality English prose; longer output (3000 tokens) |

---

## Component 3 — Buyer-Supplier Matching Engine

### Current State
`services/buyer-matching-service.ts` (497 lines). Functional but **not yet
connected to a buyer-triggered flow**. It uses claude-sonnet-4-6, a pre-filter
SQL query capped at 50 `SELLABLE/PUBLISHED` candidates, and writes `buyer_matches`
rows with match score + score breakdown + disqualifiers.

**What works:**
- `runMatching(buyerProfileId)` — single entry point
- SQL pre-filter: `sellable_status IN ('SELLABLE','PUBLISHED')`, category + cert EXISTS subqueries
- Match result writes with `is_current = false` on previous rows (clean history)
- Match-ready email fires after write
- Raw `JSON.parse()` without Zod validation (M-4 gap — should be fixed as part of C3 design)

### Design Gaps

**G3.1 — No buyer-triggered route exists**  
`buyer-matching-service.ts` has no connected route in `buyers.ts` or elsewhere.
A buyer cannot request matching from the UI. The service exists in isolation.
Recommendation: `POST /api/buyers/match` (buyer-auth required) → `runMatching(req.userId.buyerProfileId)`.

**G3.2 — No `ENABLE_MATCHING` gate**  
Discovery has `ENABLE_INTELLIGENCE_PUBLIC`. Matching has no equivalent. It should
have a flag before exposing to buyers — matching against a thin SELLABLE catalog
returns poor results and damages trust.

**G3.3 — Pre-filter uses category string match but categories are not normalized**  
`selectCandidates` filters on `products.category IN buyer.targetProducts`. But
`targetProducts` strings entered by buyers at onboarding (free text) likely
won't exactly match `products.category` values (also semi-free text). This is a
silent zero-result bug.

Recommendation: add a category normalization map or fuzzy match in the
pre-filter before passing to SQL.

**G3.4 — Matching prompt not visible (M-4 gap applies here too)**  
`buyer-matching-service.ts` uses `BUYER_MATCHING_SYSTEM_PROMPT` from
`config/buyer-matching-prompts.ts`. The matching output is parsed with raw
`JSON.parse()`. Add `MatchResponseSchema` Zod validation.

**G3.5 — No match expiry or freshness signal**  
`buyer_matches` rows have `is_current` but no `expiresAt` or `refreshedAt`. A
buyer who matched 90 days ago sees the same match list even if 10 new SELLABLE
suppliers have been added. Add a background refresh trigger: re-run matching
when `buyer_matches.createdAt` > 30 days old and buyer logs in.

### Recommended Design (C3 Phase II)

```
POST /api/buyers/match   (buyer auth, ENABLE_MATCHING gate)
  → validate buyer profile exists
  → check if existing matches are fresh (< 30 days)
  → if stale or no matches: runMatching(buyerProfileId)
  → return buyer_matches rows with supplier summaries
  → log ai_outputs (callType = "BUYER_MATCH")

GET /api/buyers/matches   (buyer auth)
  → return current buyer_matches with is_current = true
  → include match_score, score_breakdown, disqualifiers, supplier summary
```

---

## Component 4 — Trust Score Layer

### Current State
`services/trust-score-service.ts` (134 lines). Fully functional. Computes a
0–100 trust score for **companies** (not individual suppliers) based on 5
weighted dimensions.

**Weight breakdown:**
- Profile completeness: 30%
- Orders completed (DELIVERED/COMPLETED): 25%
- Products catalog (active listings): 20%
- Admin-verified: 15%
- Response time (placeholder): 10%

**Tiers:** PLATINUM (≥80), GOLD (≥65), SILVER (≥45), BASIC (<45)

**Critical gap:** Trust score is **buyer-facing** (evaluates exporter companies)
but it is **not exposed to buyers in any route**. The `trust_scores` table is
written but not read by any buyer API endpoint.

### Design Gaps

**G4.1 — Trust score not exposed to buyers**  
`computeTrustScore()` writes to `trust_scores` but no `GET /api/buyers/suppliers/:id`
or marketplace endpoint reads it. Buyers have no way to see trust tiers.

**G4.2 — Response time dimension is a placeholder**  
The `responseTime` weight (10%) is always a fixed value — no messaging latency
data feeds it. Either replace with a meaningful signal (e.g., compliance
completion speed, onboarding-to-SELLABLE days) or document it as a stub.

**G4.3 — Trust score not integrated with matching pre-filter**  
`selectCandidates` in buyer-matching-service.ts doesn't use trust score as a
ranking or filter input. GOLD/PLATINUM suppliers should rank higher in match
results.

**G4.4 — Score not recalculated on key events**  
`computeTrustScore()` is never called reactively. Score goes stale unless admin
triggers a re-evaluation. Should trigger on: order status → DELIVERED,
admin verification change, new product listed.

### Recommended Design (C4 Phase II)

Add trust score as a sort dimension in matching pre-filter, expose via buyer
supplier detail endpoint, and add event triggers on order completion and admin
verification.

---

## Execution Plan — Intelligence Layer Build Sequence

### Track A: C2 Compliance Intelligence (start immediately)

```
Week 1, Day 1:  Lock 5 open decisions (OD-1 through OD-5)
Week 1, Day 1:  Layer C — risk-pattern-service.ts + route injection
Week 1, Day 2:  Layer A — prescreening-service + schema migration + storage trigger
Week 1, Day 3:  Layer B — review-suggestion-service + route + cache fix
Week 1, Day 4:  Layer D — generateInvestorSummary + route mode branch
Week 1, Day 5:  Integration test (full upload → prescreen → queue → review → summary)
```

### Track B: C1 Discovery Fixes (apply in parallel — prompts ready)

```
Day 1:  Paste I4 prompt (extractJsonArray fix) — 2 hrs
Day 1:  Paste I3 prompt (prompt sanitization) — 2 hrs
Day 2:  Paste I1 prompt (parallel expansion) — 4 hrs including p-limit install
Day 2:  Manual regression test (discovery call, check logs)
```

### Track C: C3 + C4 Design (parallel to build tracks A + B)

```
Week 1:  Lock G3.1–G3.5 design decisions for buyer matching
Week 1:  Lock G4.1–G4.4 design decisions for trust score
Week 2:  Produce C3 Replit prompts (route + normalization + Zod fix)
Week 2:  Produce C4 Replit prompts (expose to buyers + event triggers)
```

---

## API Surface — Full Intelligence Layer (current + planned)

| Method | Path | Auth | Component | Status |
|--------|------|------|-----------|--------|
| POST | `/api/admin/ingestion/discover` | Admin | C1 | Live |
| GET | `/api/admin/compliance/requirements/:id/ai-suggestion` | Admin | C2-B | **To build** |
| POST | `/api/admin/suppliers/:id/compliance-document` | Admin | C2-D | Extended (`mode`) |
| POST | `/api/buyers/match` | Buyer | C3 | **To build** |
| GET | `/api/buyers/matches` | Buyer | C3 | **To build** |

Internal (no new route):
- C2-A fires from `storage.ts` confirm endpoint
- C2-C injects into existing compliance queue GET responses

---

## Intelligence Layer Gate Conditions (before ENABLE_INTELLIGENCE_PUBLIC)

| Gate | Condition | Owner |
|------|-----------|-------|
| C1 Gate | I1 + I3 + I4 fixes applied; I2 dedup annotation added | Engineering |
| C2 Gate | OD-1 through OD-5 locked; all 4 layers built; integration test pass | Engineering + Product |
| C3 Gate | G3.1 route live; ENABLE_MATCHING flag added; category normalization working | Engineering |
| C4 Gate | Trust score exposed to buyers; event triggers on order completion | Engineering |
| Layer II Public Gate | All 4 component gates cleared; `ENABLE_INTELLIGENCE_PUBLIC = true` | Fincava leadership |

---

*v1.0 — 2026-05-08. Next update after C2 open decisions are locked.*
