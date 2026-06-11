# AI / Scoring Layer — Design Outline

## What Already Exists

Before designing new layers, the current pipeline is documented precisely so
every new piece fits cleanly onto it.

### Existing Claude models (anthropic.ts)

| Constant | Default model | Purpose |
|---|---|---|
| `SCORING_MODEL` | claude-haiku-4-5 | Onboarding score |
| `DOCUMENT_MODEL` | claude-sonnet-4-6 | Compliance document (Spanish) |
| `ENRICHMENT_MODEL` | claude-sonnet-4-6 | Ingestion enrichment |
| `DISCOVERY_MODEL` | claude-haiku-4-5 | Buyer gap discovery |
| `TRANSLATION_MODEL` | claude-haiku-4-5 | ES/EN translation |

### Existing `ai_outputs` callTypes

| callType | Service | Triggered by |
|---|---|---|
| `ONBOARD_SCORE` | `scoring-service.ts` | Supplier onboarding |
| `COMPLIANCE_DOCUMENT` | `document-generator.ts` | Admin POST evaluate/document |

### Existing services

| Service | Function | Notes |
|---|---|---|
| `scoring-input.ts` | `buildScoringInput()` | Reads 5 tables; flat JSON for Claude |
| `scoring-service.ts` | `scoreSupplier()` | Retry-3, writes ai_outputs + compliance_docs + req_status |
| `supplier-graduation-service.ts` | `evaluateSupplier()`, `previewEvaluation()`, `transitionTo()`, `markPublished()` | State machine, DB transaction |
| `gap-analysis-service.ts` | `analyzeGaps()` | Pure read, REQUIREMENT_REGISTRY, feeds document generator |
| `document-generator.ts` | `generateComplianceDocument()` | Spanish gap document, Claude Sonnet |
| `scoring-prompts.ts` | `SCORING_PROMPT` (V0+V1) | Prompt configuration layer |

---

## End-to-End Pipeline Map

```
[1] Supplier submits onboarding form
      ↓
[2] POST /api/suppliers/onboard
    → onboard-pipeline.ts
    → rows: supplier, farm, economics, compliance_docs
    → emails: supplier confirmation + admin alert
      ↓
[3] scoreSupplier(supplierId)                             [async, fire & forget, 3-retry]
    → buildScoringInput() — reads 5 tables
    → Claude Haiku (SCORING_MODEL) + SCORING_PROMPT_V1
    → parse: export_readiness_score, pathway, compliance_gaps, gap_analysis
    → write: ai_outputs (callType=ONBOARD_SCORE)
    → write-back: compliance_docs booleans from gap list
    → seed: supplier_requirement_status rows (onConflictDoNothing)
    → send: WhatsApp score notification (non-fatal)
      ↓
[4] Admin opens compliance queue
    → GET /api/admin/compliance-queue                     ← [NEW Layer C] risk patterns injected here
      ↓
[5] Admin selects supplier → opens detail drawer
    → GET /api/admin/compliance-queue/:supplierId
      ↓
[6] Supplier or officer uploads document
    → POST /storage/uploads/confirm
    → [NEW Layer A] async: document-prescreening-service  ← fire & forget after 200 response
      ↓
[7] Admin opens review modal for a requirement
    → [NEW Layer B] GET /admin/compliance/requirements/:id/ai-suggestion
      ↓
[8] Admin submits review decision
    → POST /api/admin/compliance/review/:requirementId
    → updates supplier_requirement_status.state
      ↓
[9] Admin triggers re-evaluation
    → POST /api/admin/suppliers/:id/evaluate
    → scoreSupplier() (if forceRescore=true)
    → evaluateSupplier() — graduation DB transaction
    → state: NOT_READY → ELIGIBLE → SELLABLE
      ↓
[10] Admin generates compliance document
    → POST /api/admin/suppliers/:id/compliance-document           [existing, Spanish]
    → POST /api/admin/suppliers/:id/compliance-document?mode=investor  ← [NEW Layer D]
      ↓
[11] Admin manually publishes
    → POST /api/admin/suppliers/:id/transition { toState: PUBLISHED }
    → markPublished() → PUBLISHED email → live on marketplace
```

---

## Layer A — Document Pre-Screening (Vision AI)

### Purpose
Catch obvious problems in uploaded compliance documents before they reach the
admin review queue — wrong document type, unreadable scan, non-Spanish text,
wrong agency logo. Saves admin time; flags go into the review drawer automatically.

### Trigger
`POST /storage/uploads/confirm` — after the existing ACL + ownership check
returns 200, fire `prescreenDocument(uploadId)` as a `setImmediate` so it never
blocks the response.

### New service: `document-prescreening-service.ts`

**Input assembled from:**
- `compliance_documents_v2` row (requirementCode, supplierId, gcsPath)
- Supplier row (nombreCompleto, municipio)
- Requirement metadata from `REQUIREMENT_REGISTRY` (expected agency, label)

**Claude call:**
- Model: `DOCUMENT_MODEL` (claude-sonnet-4-6) — vision-capable
- Max tokens: 512
- Input: base64-encoded image bytes fetched from GCS signed URL + structured context JSON
- System prompt (`PRESCREENING_PROMPT`): instructs Claude to examine the image
  and return structured JSON only

**Output schema (strict JSON):**
```json
{
  "document_type_detected": "string — what Claude thinks the document is",
  "expected_document_type": "string — what was required",
  "type_match": true | false,
  "language_detected": "es" | "en" | "other",
  "image_quality": "good" | "poor" | "unreadable",
  "agency_detected": "DIAN" | "ICA" | "FNC" | "unknown",
  "agency_match": true | false,
  "flags": ["string array of specific problems found"],
  "recommendation": "pass" | "needs_review" | "reject",
  "rationale": "one sentence in English for admin display",
  "confidence": 0.0–1.0
}
```

**Flags catalogue (static, not AI-generated):**
- `WRONG_DOCUMENT_TYPE` — detected type doesn't match requirement
- `LOW_IMAGE_QUALITY` — blurry, dark, or partially cropped scan
- `UNREADABLE` — Claude cannot extract any text
- `LANGUAGE_MISMATCH` — document not in Spanish
- `WRONG_AGENCY` — agency logo/letterhead doesn't match expected
- `POSSIBLE_EXPIRY` — Claude detects a visible date that may be past
- `HANDWRITTEN_CONTENT` — unexpected handwritten sections

**DB writes:**
- `ai_outputs` row: `callType = "DOC_PRESCREENING"`, `documentContent = JSON.stringify(result)`
- `compliance_documents_v2.prescreeningResult` — new `jsonb` column (schema migration needed)
- `compliance_documents_v2.prescreeningAt` — timestamp

**Failure handling:**
- Non-fatal. If GCS fetch fails or Claude errors, log warn and set
  `prescreeningResult = null`. Admin queue is unaffected.
- 60-second timeout on the GCS fetch + Claude call combined.

**New `callType`:** `DOC_PRESCREENING`

**Schema changes needed:**
```sql
ALTER TABLE compliance_documents_v2
  ADD COLUMN prescreening_result jsonb,
  ADD COLUMN prescreened_at timestamptz;
```

---

## Layer B — Suggested Review Decision

### Purpose
When an admin opens the review modal for a specific requirement, show an
AI-generated recommendation chip (Verified / Needs Fix / Escalate) with a
one-line rationale. Admin confirms or overrides — the AI suggestion is advisory
only and never blocks the review action.

### New route
```
GET /api/admin/compliance/requirements/:requirementId/ai-suggestion
```
Admin-only. Returns cached result if one exists and the document hasn't changed
since it was generated.

### New service: `review-suggestion-service.ts`

**Input assembled from:**
- `supplier_requirement_status` row (state, requirementCode, agency, visibleNote)
- `compliance_documents_v2` rows for this requirement (GCS paths, upload dates)
- Latest `DOC_PRESCREENING` result for those documents (from `ai_outputs`)
- Supplier row (comercialScore, sellableStatus, nombreCompleto, municipio)
- `admin_compliance_reviews` history rows (past decisions on this requirement)

**Claude call:**
- Model: `DOCUMENT_MODEL` (claude-sonnet-4-6)
- Max tokens: 256
- No image input — uses prescreening JSON result as text input
- System prompt (`REVIEW_SUGGESTION_PROMPT`): instructs Claude to act as a
  compliance review assistant; output structured JSON only

**Output schema:**
```json
{
  "recommendation": "verified" | "needs_fix" | "escalate",
  "rationale": "one sentence for admin display (max 120 chars)",
  "confidence": 0.0–1.0,
  "key_signals": ["up to 3 signals that drove the decision"]
}
```

**Recommendation rules baked into prompt:**
- `verified` — prescreening passed, agency match, document type match, no flags
- `needs_fix` — low image quality OR wrong document type OR language mismatch
- `escalate` — wrong agency, possible expiry, or prescreening was inconclusive
  with confidence < 0.5

**Caching:**
- Result stored in `ai_outputs`: `callType = "REVIEW_SUGGESTION"`,
  keyed by `requirementId` in `gapAnalysis` JSON field
- Cache is invalidated when a new document is uploaded for the same requirement
  (check `compliance_documents_v2.createdAt` vs `ai_outputs.createdAt`)
- If cached, return immediately without a Claude call

**DB writes:**
- `ai_outputs` row on cache miss: `callType = "REVIEW_SUGGESTION"`

**UI integration (compliance-queue.tsx):**
- Review modal fetches suggestion on open
- Shows a colored chip: green (Verified), amber (Needs Fix), red (Escalate)
- Shows rationale below chip
- Shows `key_signals` as small grey tags
- Chip has "AI suggested" label; cannot be submitted without admin confirming or changing the decision

**New `callType`:** `REVIEW_SUGGESTION`

---

## Layer C — Risk Pattern Flagging

### Purpose
Surface contextual warnings on the compliance queue row and supplier detail
drawer when a supplier's combination of requirement states matches a known
risk pattern. Helps admins triage without opening each supplier.

### Design principles
- **Pure computation — no DB writes, no Claude calls.** Patterns are a
  deterministic rules engine over `supplier_requirement_status` rows.
- Runs inline in `GET /admin/compliance-queue` and
  `GET /admin/compliance-queue/:supplierId` — already have the requirement data.
- Patterns are defined in a single registry file so new ones can be added
  without touching route logic.

### New service: `risk-pattern-service.ts`

**Input:**
```typescript
type RequirementSnapshot = {
  requirementCode: string;
  state: string;
  agency: string;
  updatedAt: Date;
};

type SupplierContext = {
  commercialScore: number | null;
  eligibilityStatus: string | null;
};

evaluateRiskPatterns(
  requirements: RequirementSnapshot[],
  supplier: SupplierContext,
  now?: Date
): RiskFlag[]
```

**Output:**
```typescript
type RiskFlag = {
  patternCode: string;
  severity: "critical" | "warning" | "info";
  label: string;
  description: string;
};
```

### Pattern registry (Phase I — 5 patterns)

| Code | Severity | Trigger condition | Label | Description |
|---|---|---|---|---|
| `SEQUENCING_RISK` | warning | ICA_REGISTRO state ∈ {submitted, verified} AND DIAN_RUT state ∈ {not_started, not_sure} | Sequencing risk | ICA progressing but DIAN RUT not started — DIAN must be resolved first for export eligibility. |
| `SYSTEMIC_ISSUES` | critical | ≥ 2 requirements in `needs_fix` simultaneously | Systemic issues | Multiple requirements rejected simultaneously — consider escalating to managed service. |
| `COMMERCIAL_READINESS_GAP` | warning | DIAN_EXPORTADOR state ∈ {submitted, verified} AND commercialScore < 40 | Commercial readiness gap | Export authorization progressing but commercial score is low — may not clear SELLABLE threshold. |
| `STALE_SUBMISSION` | warning | Any CRITICAL requirement in `submitted` state AND `updatedAt` > 30 days ago | Stale submission | Submitted document has had no admin action for 30+ days — re-engagement needed. |
| `SCORE_COMPLIANCE_MISMATCH` | info | commercialScore ≥ 60 AND eligibilityStatus = "FAIL" | Score-compliance mismatch | Strong commercial score but compliance still failing — fast track compliance to unlock SELLABLE. |

**Integration into existing routes:**

`GET /admin/compliance-queue` response enriched:
```json
{
  "items": [
    {
      "supplierId": 1,
      ...existing fields...,
      "riskFlags": [
        {
          "patternCode": "STALE_SUBMISSION",
          "severity": "warning",
          "label": "Stale submission",
          "description": "Submitted document has had no admin action for 30+ days."
        }
      ]
    }
  ]
}
```

`GET /admin/compliance-queue/:supplierId` response enriched with the same
`riskFlags` array at the top level.

**UI integration:**
- Queue table: coloured icon badges in the supplier row (`⚠ critical`, `! warning`, `ℹ info`)
- Supplier detail drawer: expandable "Risk Signals" section listing all flags
  with full description text

---

## Layer D — Investor-Grade Compliance Summary

### Purpose
Extend the existing `POST /api/admin/suppliers/:id/compliance-document` to
support a second mode that produces an English-language, investor-ready summary
of a supplier's verified compliance standing — suitable for due diligence
packets, LP reporting, or buyer trust verification.

### Route change
```
POST /api/admin/suppliers/:id/compliance-document
Body: { mode?: "standard" | "investor" }   ← mode is new; default = "standard"
```
`mode=standard` — existing Spanish gap document (no change)
`mode=investor` — new English investor summary (new branch)

### New function in `document-generator.ts`: `generateInvestorSummary()`

**Input assembled from:**
- Supplier row (all fields)
- `supplier_requirement_status` rows — all, including verified
- `admin_compliance_reviews` history — last review per requirement
- `ai_outputs` latest ONBOARD_SCORE — for score + pathway + gap_analysis
- `supplier_export_mode` — direct/intermediary/not_sure
- `trust_scores` — platform trust score
- Farm + economics rows — volume, hectares, crop

**Claude call:**
- Model: `DOCUMENT_MODEL` (claude-sonnet-4-6)
- Max tokens: 3000
- System prompt (`INVESTOR_SUMMARY_PROMPT`): instructs Claude to write in English,
  structured, professional, investor-grade tone; output plain text with
  markdown-style headings; factual only, no embellishment

**Output document sections:**
1. **Executive Summary** — 3-4 sentences: who the supplier is, current
   compliance standing, export readiness score, overall risk level
2. **Compliance Status by Agency** — one section per agency (DIAN / ICA / FNC)
   with requirement name, current state, verified date or outstanding status
3. **Export Readiness Score Breakdown** — score out of 100, pathway assigned
   (A/B/C/D), what the pathway means, key scoring signals
4. **Verified Certifications** — table of all verified requirements with
   `verifiedAt` date, `expiresAt` if applicable
5. **Outstanding Items** — any open requirements with severity + estimated
   resolution timeline in days
6. **Risk Assessment** — concise paragraph: compliance risk level (Low / Medium /
   High), commercial risk, recommended investor action
7. **Metadata footer** — generated by Fincava, supplierId, timestamp, model version

**DB writes:**
- `ai_outputs` row: `callType = "INVESTOR_SUMMARY"`, `documentContent = <text>`

**Response includes:**
```json
{
  "id": 42,
  "supplierId": 1,
  "mode": "investor",
  "documentContent": "...",
  "generatedAt": "2026-05-08T...",
  "aiModel": "claude-sonnet-4-6"
}
```

**New `callType`:** `INVESTOR_SUMMARY`

---

## DB Schema Changes Summary

| Table | Change | Layer |
|---|---|---|
| `compliance_documents_v2` | ADD `prescreening_result jsonb` | A |
| `compliance_documents_v2` | ADD `prescreened_at timestamptz` | A |
| `ai_outputs.callType` | New values: `DOC_PRESCREENING`, `REVIEW_SUGGESTION`, `INVESTOR_SUMMARY` | A, B, D |

No new tables needed. `ai_outputs` already has `documentContent`, `gapAnalysis`
(jsonb), and `callType` — all three new layers store into existing columns.

---

## New Files Summary

| File | Type | Layer |
|---|---|---|
| `services/document-prescreening-service.ts` | New service | A |
| `services/review-suggestion-service.ts` | New service | B |
| `services/risk-pattern-service.ts` | New service | C |
| `config/ai-prompts/prescreening-prompt.ts` | New prompt | A |
| `config/ai-prompts/review-suggestion-prompt.ts` | New prompt | B |
| `config/ai-prompts/investor-summary-prompt.ts` | New prompt | D |

Existing files modified:

| File | Change | Layer |
|---|---|---|
| `anthropic.ts` | Add `PRESCREENING_MODEL` constant (= DOCUMENT_MODEL) | A |
| `routes/storage.ts` | Fire prescreenDocument() in setImmediate after confirm | A |
| `routes/adminComplianceQueue.ts` | Inject riskFlags into GET response | C |
| `routes/complianceEvaluator.ts` | Add `?mode=investor` branch | D |
| `services/document-generator.ts` | Add `generateInvestorSummary()` | D |
| `routes/index.ts` | Register new review-suggestion route | B |

---

## New Route Inventory

| Method | Path | Auth | Layer | Notes |
|---|---|---|---|---|
| GET | `/admin/compliance/requirements/:id/ai-suggestion` | Admin | B | Returns cached or fresh suggestion |
| — | *(storage.ts internal)* | — | A | No new route; fires from existing confirm |
| — | *(compliance-queue.ts inline)* | — | C | No new route; injected into existing responses |
| POST | `/admin/suppliers/:id/compliance-document` | Admin | D | Existing route; new `mode` body field |

---

## Model Assignment Rationale

| Layer | Model | Reason |
|---|---|---|
| A (Pre-screening) | claude-sonnet-4-6 | Vision input requires Sonnet; output is small (512 tokens) |
| B (Review suggestion) | claude-sonnet-4-6 | Needs nuanced document reasoning; reuses DOCUMENT_MODEL |
| C (Risk patterns) | None — pure rules | Deterministic; no AI needed; zero latency cost |
| D (Investor summary) | claude-sonnet-4-6 | High-quality English prose; longer output (3000 tokens) |

---

## Prompt Design Constraints (all four layers)

- All prompts live in `config/ai-prompts/` as named exports — consistent with
  the existing `scoring-prompts.ts` pattern (EP8: prompts are configuration)
- All AI-output prompts instruct Claude to return **strict JSON only** (A, B)
  or **plain text with markdown headings** (D)
- All prompts include an explicit fallback instruction: "if you cannot determine
  X, set field to null rather than guessing"
- Token budgets are fixed per layer; Claude must respect them via max_tokens
- Rate limiting: Layers A and B are subject to the existing API-level rate
  limits; no new per-user rate limits needed since both are admin-triggered
  or async

---

## Open Decisions (need sign-off before building)

1. **Layer A image fetch** — should the prescreening service fetch the image
   directly from GCS using the server's service account (no signed URL needed
   if same-project), or generate a short-lived (60s) signed URL? The former is
   cleaner but requires the GCS service account to have Storage Object Viewer.

2. **Layer B caching granularity** — cache per `requirementId` (current design)
   or per `(supplierId, requirementCode, documentId)` triplet? The triplet is
   more precise but requires storing the documentId in the ai_outputs row.

3. **Layer C stale threshold** — 30 days is proposed for `STALE_SUBMISSION`.
   Should this be a configurable env var (`COMPLIANCE_STALE_DAYS`) or a
   hard-coded constant? Env var adds flexibility for different country contexts.

4. **Layer D access** — investor summary is currently admin-only. Should
   SELLABLE/PUBLISHED suppliers be able to request their own investor summary
   from the supplier dashboard? This would be a clean self-serve trust signal.

5. **Scoring pipeline question** — should `scoreSupplier()` be called
   automatically after a document is verified (requirement moves to `verified`),
   so the graduation score reflects the latest compliance state without admin
   manually triggering re-evaluate? This would make the pipeline event-driven
   rather than poll-driven.
