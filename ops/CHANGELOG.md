# Changelog

All notable changes to the Fincava platform are recorded here.
Format: `[Date] — Ticket / Slice — Description`

---

## Phase 1 — Supplier Graduation State Machine

| Date | Ticket | Description |
|---|---|---|
| Apr 2026 | 1.1 | Added Phase 1 columns to `suppliers` table: `eligibilityStatus`, `commercialScore`, `sellableStatus`, `graduationPathway`, `nextActions`, `commercialScoreAtOnboarding`, `lastEvaluatedAt`, `thresholdVersion` |
| Apr 2026 | 1.2 | Created `supplier_evaluations` table — append-only evaluation snapshot per scoring run |
| Apr 2026 | 1.3 | Created `supplier_state_transitions` table + `actor` enum (`SYSTEM`, `ADMIN`, `FOUNDER`) — full audit trail for all state changes |
| Apr 2026 | 1.4 | Added `lib/config/thresholds.ts` — `THRESHOLDS_V0` config object (`sellableMin=60`, `partialMin=30`, 4 required compliance fields). Single source of truth; no hardcoded values in service layer |
| Apr 2026 | 1.5 | Implemented `supplier-graduation-service.ts` — exports `evaluateSupplier`, `transitionTo`, `markPublished`, `NotFoundError`. SNAPSHOT FIRST invariant, `db.transaction()` throughout, Sentry shim |
| Apr 2026 | 1.5 | Bug fix: `exportReadinessScore = null` now throws `NotFoundError` instead of silently substituting `0` |
| Apr 2026 | 1.6 | Wired `evaluateSupplier` into `POST /api/suppliers/onboard` as fire-and-forget via `setImmediate`. Retry on `NotFoundError` (max 3 attempts: 1 s, 2 s backoff). All events logged at `info`/`warn` with `correlationId` |

---

## Ops / Tooling

| Date | Change |
|---|---|
| Apr 2026 | Added `ops/execution_map.md` and `ops/post_mvp_plan.md` as source-of-truth planning documents |
| Apr 2026 | Added `scripts/src/export-docs.ts` — generates `docs/Execution_Map_V1.docx` and `docs/Post_MVP_System_Plan.docx` from Markdown source via `pnpm --filter @workspace/scripts run export:docs` |
