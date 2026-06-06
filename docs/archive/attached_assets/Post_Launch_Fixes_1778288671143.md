# Post-Launch Fixes — Replit Prompts
**Date:** 2026-05-10  
**Source:** Repo sync `bb35552` + live codebase audit  

---

## Pre-Flight: Status Correction

Before applying any prompts, note that two of the four originally open items
are already delivered in the current codebase and require NO prompt:

| Item | Status | Evidence |
|------|--------|----------|
| I5 — Discovery concurrency cache | ✅ DONE | `discoveryCache = new Map<string, { leads, ts }>()` at discovery-engine.ts L163; 15-min TTL; cache hit at L188–191; write at L273 |
| I6 — AGRO_KEYWORDS Colombian exotics | ✅ DONE | Full ProColombia category set already in AGRO_KEYWORDS (L696–757): uchuva, granadilla, maracuyá, borojó, gulupa, pitaya, guanábana, lulo, feijoa, hearts of palm, superfoods, flowers, herbs & spices. Score-based category selection (not first-keyword-wins) also already implemented. |

I2's **backend** is also complete (`annotateWithExistingStatus()` with batch LIKE query,
4-state ExistingStatus type, returned on every discoverLeads() call). Only the
**UI layer** of I2 remains — discover.tsx ignores `existingStatus` on each lead.

**Three prompts follow:** CL-1, CL-2, I2-UI.

---

## PROMPT CL-1 — Add PHYTO_SEQUENCING_RISK as P6 (30 min)

**File:** `artifacts/api-server/src/services/risk-pattern-service.ts`

**Issue:** P6 was specified in the design but never implemented. FITOSANITARIO appears
in `CRITICAL_REQUIREMENTS` (used by P4 STALE_SUBMISSION) but no pattern catches the
sequencing risk: a supplier can submit a phytosanitary certificate while ICA_REGISTRO
is still `not_started` or `not_sure` — which is invalid, since ICA_REGISTRO must be
active before FITOSANITARIO can be verified.

---

```
STEP 0 — Inspect before touching anything

Open: artifacts/api-server/src/services/risk-pattern-service.ts
Read the full file and confirm:
  a) There are exactly 5 patterns (P1–P5) — patternCode values:
     SEQUENCING_RISK, SYSTEMIC_ISSUES, COMMERCIAL_READINESS_GAP,
     STALE_SUBMISSION, SCORE_COMPLIANCE_MISMATCH
  b) FITOSANITARIO is present in CRITICAL_REQUIREMENTS at the top of the file
  c) There is NO pattern referencing PHYTO_SEQUENCING_RISK anywhere
  d) The file ends after the P5 block with the closing brace of the flags array
     and the return statement

If any of this differs, stop and tell me what you see.

---

STEP 1 — Add P6 immediately after the closing brace of the P5 block

Find the end of the P5 block, which looks like:

  // ── P5: SCORE_COMPLIANCE_MISMATCH ─────────────────────────────────────────
  ...
      flags.push({
        patternCode: "SCORE_COMPLIANCE_MISMATCH",
        severity: "info",
        label: "Score-compliance mismatch",
        description: ...,
      });
    }

Immediately AFTER this P5 block (before the closing `return flags;` or before the
function's final closing brace), insert:

  // ── P6: PHYTO_SEQUENCING_RISK ─────────────────────────────────────────────
  // ICA_REGISTRO must be active before FITOSANITARIO can be verified.
  // Flagging this early prevents a supplier from submitting phytosanitary
  // documents while their ICA registry is not yet in progress — the
  // certification authority will reject the submission regardless.
  {
    const phytoState = stateByCode.get("FITOSANITARIO");
    const icaState   = stateByCode.get("ICA_REGISTRO");
    const phytoActive = phytoState != null &&
      (phytoState === "submitted" || phytoState === "verified");
    const icaNotReady = icaState != null &&
      (icaState === "not_started" || icaState === "not_sure");
    if (phytoActive && icaNotReady) {
      flags.push({
        patternCode: "PHYTO_SEQUENCING_RISK",
        severity: "warning",
        label: "Phytosanitary sequencing risk",
        description:
          "FITOSANITARIO certificate submitted but ICA_REGISTRO is not yet active. " +
          "ICA Registro must be in progress before the phytosanitary certificate " +
          "can be verified — reorder the compliance sequence.",
      });
    }
  }

---

STEP 2 — Verify

1. Run: pnpm --filter @workspace/api-server typecheck
2. Confirm zero type errors.
3. Confirm the new block uses stateByCode.get("FITOSANITARIO") and
   stateByCode.get("ICA_REGISTRO") — both keys match the REQUIREMENT_REGISTRY
   codes exactly (case-sensitive).
4. Confirm patternCode is "PHYTO_SEQUENCING_RISK" (matches the design spec).

Report: paste the full P6 block and confirm typecheck passes.
```

---

## PROMPT CL-2 — riskFlags UI in compliance-queue.tsx (2–3 hrs)

**File:** `artifacts/fincava/src/pages/admin/compliance-queue.tsx`

**Issue:** The backend injects `riskFlags: RiskFlag[]` on both compliance queue
endpoints (queue list at L148, detail at L208 of adminComplianceQueue.ts). The
frontend has zero references to riskFlags — the data is returned but silently
discarded. This prompt adds:
1. Colored severity badges on each queue row (queue list view)
2. A "Risk Signals" section at the top of the supplier detail view

**RiskFlag shape from backend:**
```typescript
{ patternCode: string; severity: "critical" | "warning" | "info"; label: string; description: string }
```

---

```
STEP 0 — Inspect before touching anything

Open: artifacts/fincava/src/pages/admin/compliance-queue.tsx

Confirm:
  a) QueueItem interface (lines 6–16) has NO riskFlags field
  b) SupplierDetail interface (lines 53–58) has NO riskFlags field
  c) The queue table row (lines ~444–484) has NO risk badge rendering
  d) The supplier detail view (lines ~236–406) has NO "Risk Signals" section
  e) The import at line 3 includes: ClipboardCheck, ChevronRight, CheckCircle2,
     AlertTriangle, Clock, XCircle, Eye, EyeOff (from lucide-react)

If any of this differs, stop and tell me what you see.

---

STEP 1 — Add RiskFlag interface and update QueueItem + SupplierDetail

At the TOP of the file, AFTER the existing imports (after line 4), add:

  interface RiskFlag {
    patternCode: string;
    severity: "critical" | "warning" | "info";
    label: string;
    description: string;
  }

Then update the QueueItem interface — add one field after verifiedCount:
  riskFlags?: RiskFlag[];

Then update the SupplierDetail interface — add one field after reviews:
  riskFlags?: RiskFlag[];

---

STEP 2 — Add RiskBadge component

After the existing SellableBadge component (after line ~105), add:

  const RISK_SEVERITY_CONFIG = {
    critical: { bg: "bg-red-500/20",    text: "text-red-400",    dot: "bg-red-400"    },
    warning:  { bg: "bg-amber-500/20",  text: "text-amber-400",  dot: "bg-amber-400"  },
    info:     { bg: "bg-blue-500/20",   text: "text-blue-400",   dot: "bg-blue-400"   },
  } as const;

  function RiskBadge({ flag }: { flag: RiskFlag }) {
    const cfg = RISK_SEVERITY_CONFIG[flag.severity];
    return (
      <span
        title={flag.description}
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        {flag.label}
      </span>
    );
  }

---

STEP 3 — Add risk badges to the queue table rows

Find the queue table row block (lines ~444–484). Each row renders:
  <td> supplier name </td>
  <td> SellableBadge </td>
  <td> pending count </td>
  <td> verified count </td>
  <td> location </td>
  <td> chevron </td>

Add a new <td> BETWEEN the supplier name cell and the SellableBadge cell.
Insert it so the column order becomes:
  Supplier | Risk Signals | Status | Pending | Verified | Location | →

The new cell:

  <td className="px-5 py-4">
    {item.riskFlags && item.riskFlags.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {item.riskFlags
          .sort((a, b) => {
            const order = { critical: 0, warning: 1, info: 2 };
            return order[a.severity] - order[b.severity];
          })
          .map((flag) => (
            <RiskBadge key={flag.patternCode} flag={flag} />
          ))}
      </div>
    ) : (
      <span className="text-white/20 text-xs">—</span>
    )}
  </td>

Also add the column header in the <thead> row, in the same position:

  <th className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider px-5 py-3">
    Risk Signals
  </th>

---

STEP 4 — Add "Risk Signals" section to supplier detail view

In the supplier detail view (lines ~236–406), find the block that begins:

  <div className="space-y-4">
    {detailLoading && <p className="text-white/40 text-sm">Loading…</p>}
    {selectedSupplier.requirements.map(...)}

Immediately AFTER the `{detailLoading && ...}` line and BEFORE the
`{selectedSupplier.requirements.map(...)}` line, insert:

  {selectedSupplier.riskFlags && selectedSupplier.riskFlags.length > 0 && (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <h3 className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider mb-3 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5" />
        Risk Signals ({selectedSupplier.riskFlags.length})
      </h3>
      <div className="space-y-2">
        {selectedSupplier.riskFlags
          .sort((a, b) => {
            const order = { critical: 0, warning: 1, info: 2 };
            return order[a.severity] - order[b.severity];
          })
          .map((flag) => (
            <div
              key={flag.patternCode}
              className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2.5"
            >
              <RiskBadge flag={flag} />
              <p className="text-xs text-white/50 leading-relaxed">{flag.description}</p>
            </div>
          ))}
      </div>
    </div>
  )}

---

STEP 5 — Verify

1. Check TypeScript: the project uses Vite/React — confirm the component renders
   without red underlines in the editor (or run `pnpm --filter @workspace/fincava typecheck`
   if a typecheck script exists).
2. Visually confirm in the browser:
   a) Queue table has a "Risk Signals" column — rows with active patterns show
      colored badges; rows with no flags show "—"
   b) Clicking a supplier with riskFlags opens the detail view with the amber
      "Risk Signals" panel at the top, before the requirements list
   c) RiskBadge tooltip (title attribute) shows the full description on hover
3. Confirm critical flags (red) sort before warnings (amber) before info (blue)
   in both the row badges and the detail panel.

Report: confirm the Risk Signals column is visible in the queue table and the
Risk Signals panel appears at the top of the detail drawer for suppliers with flags.
```

---

## PROMPT I2-UI — Show existingStatus badges in discover.tsx (1 hr)

**File:** `artifacts/fincava/src/pages/admin/ingestion/discover.tsx`

**Issue:** The backend's `discoverLeads()` already returns `existingStatus` on every
lead (via `annotateWithExistingStatus()`). The four states are: `"new"` | `"in_evaluation"`
| `"already_onboarded"` | `"rejected"`. The `CandidateLead` interface in discover.tsx
doesn't include `existingStatus` — it's stripped before rendering, so admins have
no visibility into whether a discovered lead already exists in Fincava.

**UX intent:** Non-new leads should be immediately distinguishable so admins don't
waste time selecting suppliers already in the pipeline. `already_onboarded` and
`rejected` leads should also be auto-disabled for selection.

---

```
STEP 0 — Inspect before touching anything

Open: artifacts/fincava/src/pages/admin/ingestion/discover.tsx

Confirm:
  a) The CandidateLead interface (lines ~10–15) has fields:
       name, location, website, categoryHint
     with NO existingStatus field
  b) The lead card render block (lines ~388–440) shows name, location,
     categoryHint, and optional website link — NO status badge
  c) The toggleSelect function (lines ~108–120) does NOT prevent selecting
     based on existingStatus

If any of this differs, stop and tell me what you see.

---

STEP 1 — Update CandidateLead interface

Find the CandidateLead interface. Update it to:

  interface CandidateLead {
    name: string;
    location: string;
    website: string | null;
    categoryHint: string;
    existingStatus?: "new" | "in_evaluation" | "already_onboarded" | "rejected";
  }

---

STEP 2 — Add EXISTING_STATUS_CONFIG constant

After the CandidateLead interface, add:

  const EXISTING_STATUS_CONFIG = {
    new:               null, // no badge — default, most common case
    in_evaluation:     { label: "In Evaluation", bg: "bg-amber-500/20", text: "text-amber-400" },
    already_onboarded: { label: "Already Onboarded", bg: "bg-emerald-500/20", text: "text-emerald-400" },
    rejected:          { label: "Rejected", bg: "bg-red-500/20", text: "text-red-400" },
  } as const;

---

STEP 3 — Block selection for already_onboarded and rejected

Find the toggleSelect function. The current check is:
  if (next.size >= 5) return prev;

Add a second guard BEFORE the size check:

  const lead = leads[idx];
  if (
    lead?.existingStatus === "already_onboarded" ||
    lead?.existingStatus === "rejected"
  ) {
    return prev; // cannot select — already in system
  }

---

STEP 4 — Update the isDisabled calculation in the render

Find the lead card render block inside `leads.map((lead, idx) => {`.
It currently reads:
  const isDisabled = !isSelected && selected.size >= 5;

Replace with:
  const isBlocked =
    lead.existingStatus === "already_onboarded" ||
    lead.existingStatus === "rejected";
  const isDisabled = isBlocked || (!isSelected && selected.size >= 5);

---

STEP 5 — Add existingStatus badge to each lead card

Inside the lead card, find the metadata row that shows location, categoryHint,
and website (the `<div className="flex flex-wrap items-center gap-x-3...">` block).

After the website link block (after the `{lead.website && (...)}` closing brace),
add:

  {lead.existingStatus && lead.existingStatus !== "new" && (() => {
    const cfg = EXISTING_STATUS_CONFIG[lead.existingStatus!];
    if (!cfg) return null;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    );
  })()}

Also add a title attribute to the card's outer div to explain why blocked leads
cannot be selected. Find the outer div's className string and add:
  title={isBlocked ? `${lead.existingStatus === "already_onboarded" ? "Already onboarded" : "Previously rejected"} — cannot select` : undefined}

---

STEP 6 — Verify

1. Run discovery for a category with known existing suppliers (e.g. Coffee/Huila).
2. Confirm:
   a) Leads already in suppliersTable appear with "Already Onboarded" (green badge)
      or "In Evaluation" (amber badge) — and cannot be selected
   b) Rejected suppliers show a red "Rejected" badge and are disabled
   c) New leads (existingStatus = "new" or undefined) show no badge and behave normally
   d) The 5-lead selection cap still works correctly for non-blocked leads
3. Hover over a blocked lead card — confirm the tooltip explains why it's disabled.

Report: confirm badges are visible and blocked leads cannot be checked.
```

---

## Summary

| Prompt | File | Effort | Gate |
|--------|------|--------|------|
| CL-1 | `risk-pattern-service.ts` | 30 min | Compliance accuracy |
| CL-2 | `compliance-queue.tsx` | 2–3 hrs | Admin UX — highest-value open item |
| I2-UI | `discover.tsx` | 1 hr | Discovery UX — dedup visibility |
| I5 | — | DONE | Already delivered at discovery-engine.ts L163 |
| I6 | — | DONE | Already delivered at discovery-engine.ts L696–757 |

**Recommended order:** CL-1 → CL-2 → I2-UI.
CL-1 first because it's pure backend logic with no UI dependency and closes a
compliance correctness gap. CL-2 second because it's the highest-value admin
surface — risk signals are live but invisible. I2-UI last because it's a pure
UX improvement on an already-functional backend.

---

*Prompts produced from live repo HEAD `bb35552`. Line numbers verified against actual source.*
