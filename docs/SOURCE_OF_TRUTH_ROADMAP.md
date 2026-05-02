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

Prioritized execution stream:
1. Remove hardcoded legacy salt fallback (completed)
2. Make register writes transactional
3. Hash reset/verification tokens + compatibility window
4. Fix pagination totals
5. Remove N+1 product review author lookups
6. Add idempotency markers for post-verify side effects
7. Redact PII in auth logs

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
Latest Closeout Commit: <new R10 commit SHA>

## Phase II — MVP Boundary Enforcement
- Route-level gating for Layer II/III public exposure
- Admin-only controls for intelligence surfaces
- UI navigation and deep-link hardening for MVP-only public routes

Exit criteria:
- Layer I independent operation confirmed

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

