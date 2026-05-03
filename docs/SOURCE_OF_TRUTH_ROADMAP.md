# FINCAVA-HUB Source of Truth (SoT)

Last updated: 2026-05-02 (UTC)
Owner: Founder + Engineering Operator
Status: Active execution document

---

## 1) Purpose

This document is the single execution and governance source for:
- Current platform state
- MVP activation boundaries
- Layered architecture (current, MVP, future)
- Security and reliability hardening program
- Replit/Codex operating process
- Phase-by-phase rollout through Finance and Distribution layers

This is intended to reduce drift, preserve context, and ensure reversible progress.

---

## 2) Product Context

FINCAVA-HUB is a B2B sourcing platform connecting Colombian agricultural suppliers with global buyers.

### Current capabilities present in code/database
- Supplier profiles, farms, products
- Buyer profiles, RFQs, inquiries
- Matching, analytics, trust scoring
- Orders, shipments, loans (built ahead of MVP need)

### Strategic rollout stance
- Keep all existing capabilities intact in code and schema
- Activate only MVP-critical surfaces publicly
- Gate non-MVP surfaces with feature flags and role-based access

---

## 3) Architecture Layers (Canonical)

## Layer I — CORE SOURCING (Active MVP)
Primary user value and public surface.

Scope:
- Supplier discovery
- Structured supplier + lot-level data
- Basic verification (documents + profile trust indicators)
- Buyer-supplier connection (RFQ/inquiry)

Non-goals:
- No checkout/order orchestration required for MVP
- No financing dependency in public flows

## Layer II — INTELLIGENCE (Soft-active, Admin-first)
Internal decision support now; automation-ready later.

Scope:
- Buyer profiling
- Matching
- Trust scoring
- Analytics

Rules:
- Admin-only UI/API exposure for now
- One-directional data flow: Core -> Intelligence
- No public ranking/sorting dependency on intelligence outputs

Future evolution:
- Can become active automation orchestrator via explicit, gated interfaces

## Layer III — TRANSACTIONS (Inactive for MVP)
Built but intentionally dormant.

Scope:
- Orders
- Payments orchestration
- Shipments
- Loans

Rules:
- Must not block Layer I success paths
- Must be feature-gated off by default

## Layer IV — FUTURE CAPABILITY PLAN
Not active now; captured for architecture continuity.

### Finance sub-layer (Future)
- Underwriting signals
- Disbursement rules
- Repayment workflows
- Risk/compliance controls

### Distribution/Logistics sub-layer (Future)
- Fulfillment routing
- Shipment milestones and events
- Carrier/network integrations
- SLA and incident handling

---

## 4) Folder/Module Direction (Target Shape, incremental)

Target logical grouping (incremental, not big-bang move):
- `/core` (Layer I)
- `/intelligence` (Layer II)
- `/transactions` (Layer III)
- `/future` (Layer IV placeholders)

Implementation policy:
1. Gating-first
2. Decoupling second
3. Physical module move last

---

## 5) Feature Flags (Canonical Defaults)

Runtime flags (default in production today):
- `ENABLE_TRANSACTIONS=false`
- `ENABLE_FINANCE=false`
- `ENABLE_LOGISTICS=false`
- `ENABLE_INTELLIGENCE_PUBLIC=false`

Canonical implementation files (created P2-R1 / P2-R5):
- Backend: `artifacts/api-server/src/lib/flags.ts` — reads `process.env.*`, evaluated once at process start
- Frontend: `artifacts/fincava/src/lib/flags.ts` — reads `import.meta.env.VITE_*`, bundled at build time

Enforcement points (active as of P2-R2/R3/R5/R6):
- Backend: path-scoped `router.use()` middleware in `orders.ts`, `financing.ts`, `shipments.ts`, `analytics.ts`, `buyers.ts`
- Frontend: JSX conditional rendering in `App.tsx` (routes), `dashboard-layout.tsx` (nav items), `product-detail.tsx`, `dashboard/index.tsx`
- Automated tests: `flags-boundary.test.ts` (15 tests) + `flags-boundary.test.tsx` (9 tests) lock in all gate behaviors

Guidelines:
- Centralized flag module only
- No scattered `process.env` checks across routes
- Flag changes require change-log entry + rollout note

---

## 6) Data & Schema Direction

## Active constraints
- No destructive schema changes during MVP hardening
- Expand-contract migrations only
- Backward compatibility first

## Minimal additive improvements approved
1. Lots entity introduction (without breaking products)
2. Product certifications migration from array-first to relational table (dual-write transition)
3. Verification level field:
   - `self_reported`
   - `document_uploaded`
   - `fincava_verified`

## Security-critical updates in progress
- Token storage migration to hashed token lookup with compatibility for legacy plaintext rows

---

## 7) Security, Reliability, and Integrity Program

### Phase I — Security & Correctness Hardening (COMPLETE)
1. Remove hardcoded legacy salt fallback ✅ R2-LEGACY-SALT
2. Make register writes transactional ✅ R3-REGISTER-TX
3. Hash reset/verification tokens + compatibility window ✅ R4-TOKEN-HASHING
4. Fix pagination totals ✅ R5-PRODUCTS-PAGINATION
5. Remove N+1 product review author lookups ✅ R6-REVIEWS-NPLUS1
6. Add idempotency markers for post-verify side effects ✅ R7-VERIFY-IDEMPOTENCY
7. Redact PII in auth logs ✅ R8-PII-LOGGING

### Phase II — MVP Boundary Enforcement (COMPLETE)
8. Canonical feature flag module (backend + frontend) ✅ P2-R1
9. Backend transaction gates (orders, finance, logistics → 404 when disabled) ✅ P2-R2
10. Backend intelligence gates (analytics, compliance, trust, buyer-matches → admin-only) ✅ P2-R3
11. One-way dataflow enforcement (trust score failure isolation in core rfqs route) ✅ P2-R4
12. Frontend transaction route + nav hiding ✅ P2-R5
13. Frontend intelligence ADMIN-role gating (6 routes, 3 nav items) ✅ P2-R6
14. Public ranking isolation (marketplace sort: lastEvaluatedAt → createdAt) ✅ P2-R7
15. Automated boundary tests locking all gate behaviors (84 tests total, 24 boundary-specific) ✅ P2-R8

Definition:
- One task per change set
- Must pass typecheck/build before proceeding
- Must include rollback note

---

## 8) Execution Phases

## Phase 0 — Platform Stabilization
- CI normalization (single canonical pipeline)
- Baseline typecheck/build green
- Execution log process in place

Exit criteria:
- Clean baseline, deterministic checks

## Phase I — Security & Correctness Hardening
Tasks R0-R9 (iterative task cards)

Exit criteria:
- Security-critical findings addressed
- MVP flow correctness preserved

## Execution Status Snapshot
R-Series Status: COMPLETE  
Final Closeout Task: R10-AUDIT-CLOSEOUT  
Final Validation: PASSED  
Traceability Mapping: RESOLVED  
Latest Closeout Commit: 7a8a8e5

## Phase II — MVP Boundary Enforcement
- Route-level gating for Layer II/III public exposure
- Admin-only controls for intelligence surfaces
- UI navigation and deep-link hardening for MVP-only public routes

Exit criteria:
- Layer I independent operation confirmed

## Execution Status Snapshot — Phase II
P2-Series Status: COMPLETE  
Tasks: P2-R0 through P2-R8 (9 tasks)  
Final Task: P2-R8-BOUNDARY-TESTS  
Final Validation: PASSED  
Latest Commit: 71f3553  

| Task ID | Commit | Outcome | Summary |
|---|---|---|---|
| P2-R0-ROUTE-INVENTORY | 9996ded | COMPLETE | Full backend + frontend route audit; docs/phase2_route_inventory.md produced |
| P2-R1-FLAG-CANONICAL | 3209394 | COMPLETE | Canonical flag module created (backend); 4 flags, all default false |
| P2-R2-BE-TRANSACTION-GATES | 2b9b1e4 | COMPLETE | Orders/shipments/financing routes gated with path-scoped middleware; 404 when disabled |
| P2-R3-BE-INTELLIGENCE-PUBLIC-GATES | 78b21a5 | COMPLETE | Analytics/compliance/trust/markets/buyer-matches gated; admin-only when flag off |
| P2-R4-DATAFLOW-ONEWAY | aea9fc0 | COMPLETE | Trust score DB read in core rfqs route wrapped in try/catch with fallback |
| P2-R5-FE-TRANSACTION-HIDE | d9bbafb | COMPLETE | Frontend flag module created; 4 transaction routes + nav items hidden when ENABLE_TRANSACTIONS=false |
| P2-R6-FE-INTELLIGENCE-ADMIN | b9646a3 | COMPLETE | 6 intelligence routes locked to ADMIN role; 3 nav items hidden in dashboard |
| P2-R7-RANKING-ISOLATION | 25550d6 | COMPLETE | Marketplace order changed from lastEvaluatedAt (AI pipeline) to createdAt (deterministic) |
| P2-R8-BOUNDARY-TESTS | 71f3553 | COMPLETE | 24 boundary tests (15 backend + 9 frontend); PrivateRoute extracted and tested |

## Phase III — Modularization (Low-risk refactor)
- Introduce logical module boundaries with minimal import churn
- Preserve behavior through compatibility exports

Exit criteria:
- Clear internal module ownership and reduced coupling

## Phase IV — Intelligence Evolution (Admin -> Assisted Ops)
- Establish stable internal APIs for intelligence read/write
- Add automation hooks behind explicit flags

Exit criteria:
- Automation-ready without public coupling

## Phase V — Transactions Reactivation Readiness
- Validate dormant transaction services
- Ensure independent activation by flag

Exit criteria:
- Safe staged activation plan available

## Phase VI — Finance Layer Activation (Future)
- Controlled pilot on financing workflows
- Risk and compliance checkpoints

Exit criteria:
- Pilot metrics and rollback controls in place

## Phase VII — Distribution Layer Activation (Future)
- Logistics integration pilot
- Event reliability and exception handling

Exit criteria:
- Operational readiness with SLA instrumentation

---

## 9) Operating Model (Replit-first, GitHub controlled)

Current working model:
- Changes authored with Replit Agent task-by-task
- Checkpoint commit created per execution step
- Validate immediately with typecheck/build
- Record task log entry
- Promote to GitHub with clear traceability

Task gating:
- Do not run next task until current task is reviewed and accepted
- If failed: debug -> fix -> revalidate -> then continue

---

## 10) Code Review Protocol (Per Change)

Required evidence package per task:
1. Task ID
2. Branch + commit SHA
3. Files changed
4. Exact commands run
5. Validation outputs
6. Risks and rollback plan
7. Ready/blocked decision

Approval gate:
- No scope creep
- No silent contract change
- No unresolved failing checks

---

## 11) Non-Negotiables

- No customer data loss
- No table/module deletions for current hardening phases
- No microservices split at this stage
- No public dependency on intelligence scores for visibility/ranking
- Backward compatibility by default

---

## 12) Open Questions (to finalize next revision)

1. Preferred long-term canonical authoring flow:
   - Replit-first with GitHub promotion (current)
   - or GitHub-first with Replit validation
2. Target go-live criteria for enabling Layer II public features (if any)
3. Finance pilot entry conditions (volume, risk controls, jurisdiction)
4. Distribution pilot partners and integration sequencing

---

## 13) Change Log

- 2026-05-02: Initial Source of Truth document created, consolidating architecture, phases, and execution governance.
- 2026-05-02 (P2-R1): Canonical flag module created — `artifacts/api-server/src/lib/flags.ts` and `artifacts/fincava/src/lib/flags.ts`. All four ENABLE_* flags documented as canonical defaults.
- 2026-05-02 (P2-R2 / P2-R3): Backend enforcement complete — Layer III routes return 404 when disabled; Layer II routes require admin auth when ENABLE_INTELLIGENCE_PUBLIC=false.
- 2026-05-02 (P2-R4): One-way dataflow confirmed — intelligence failures cannot break core sourcing routes; trust score read in rfqs wrapped with try/catch + company-level fallback.
- 2026-05-02 (P2-R5 / P2-R6): Frontend enforcement complete — transaction routes and nav items hidden; intelligence pages locked to ADMIN role in router and navigation.
- 2026-05-02 (P2-R7): Public ranking isolation — marketplace endpoint now orders by `createdAt` (deterministic) instead of `lastEvaluatedAt` (AI-pipeline-dependent). Non-Negotiable §11 enforced in code.
- 2026-05-02 (P2-R8): Boundary tests added — 24 new tests (15 backend, 9 frontend) locking all gate behaviors; PrivateRoute extracted to standalone component. Total test suite: 84 passing.
- 2026-05-02 (P2-R9): Documentation aligned — execution log SHAs reconciled (P2-R7: 25550d6, P2-R8: 71f3553); Phase II status snapshot added; Section 5 and Section 7 updated to reflect Phase II enforcement state.
- 2026-05-02 (B0-BASELINE): Phase I Sprint baseline established — branch `main`, SHA `b3c50ee` (full: `b3c50eea0da1a24eba12cc384a3fad12114e075c`). Typecheck: 4/4 packages clean. Build: all artifacts pass. Test suite: 84/84 passing. Phase II boundary enforcement independently verified (P2-V0-VERIFY: 13/13 checks PASS, GO verdict). No regressions. Phase I Sprint entry confirmed.
- 2026-05-03 (B9): `GET /api/health` alias added to health.ts alongside existing `/api/healthz` — identical handler, same `HealthCheckResponse` Zod schema `{ status: "ok" }`. `.replit` has no `healthcheckPath` key; autoscale probes `/` by default — alias is additive only. Typecheck: 4/4 packages clean. Build: all artifacts pass. Test suite: 84/84 passing. **Phase I Sprint complete — B0 through B9 delivered.**

