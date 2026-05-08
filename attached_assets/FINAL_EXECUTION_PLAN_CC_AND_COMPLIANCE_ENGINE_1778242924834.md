# FINAL EXECUTION PLAN: CC SERIES + COMPLIANCE ENGINE

**Date**: May 8, 2026  
**Status**: Ready for execution  
**Total Duration**: 9 weeks (May 9 - July 11)  
**Codebase**: 0% CC series implemented, ready to start  

---

## EXECUTIVE SUMMARY

```
CC-1 (May 9-11):      Phase I DIAN RUT supplier intake workflow
                      ↓
CC-1A Enhancement:    AI compliance gaps → boolean writeback
                      ↓
Compliance Engine:    6-week foundation (May 28 - July 11)
  Phase 1 (Week 1):   Rules engine (27 tests)
  Phase 2 (Week 2-3): Evaluator + AI (28 tests)
  Phase 3 (Week 4-5): State machine + graduation (28 tests)
  Phase 4 (Week 6-7): Regulatory integration (22 tests)
                      ↓
CC-2 (After Jun 1):   ICA Context flow
CC-3 (After Jun 13):  FNC Coffee flow
```

---

## BLOCKING ISSUE - RESOLVE FIRST

**B1: CC-1A Not Built**
- `scoring-service.ts` captures `complianceGaps` as text only (line 79)
- Does NOT write parsed gaps back to `compliance_docs` booleans
- **Decision needed**: Run CC-1A before CC-1B, or after CC-1E?
  - **Recommended**: Before CC-1B (B1 is blocking graduation logic)
  - **Alternative**: After CC-1E (complete UI first, then add data persistence)

**One Code Fix Needed**
- CC-1D paste references `ObjectStorageService` class
- **Actual**: `objectStorageClient` (instance, not class)
- Fix before executing CC-1D paste

---

## PHASE 1: CC SERIES - PHASE I (May 9-11)

### CC-1B: Database Schema (2-3 hours)
**Files to create**: 1 schema file + 1 migration
- Create: `lib/db/src/schema/compliance-concierge.ts`
- Add 7 new tables:
  - `supplier_requirement_status` (main tracker)
  - `compliance_enablement_flows` (guidance content)
  - `requirement_document_uploads` (file metadata)
  - `compliance_case_assignments` (officer assignments)
  - `managed_service_cases` (concierge service)
  - `buyer_visibility_signals` (marketplace flags)
  - `managed_service_definitions` (service offerings)
- Export in: `lib/db/src/schema/index.ts`
- Run: `pnpm --filter @workspace/db push`

**Pass Criteria**:
- All 7 tables exist in Neon
- `pnpm tsc --noEmit` clean
- No existing tables modified

### CC-1C: Admin Compliance Queue (3-4 hours)
**Files to create**: 2 files
- Create: `artifacts/api-server/src/routes/adminComplianceQueue.ts` (3 routes)
  - GET /api/admin/compliance-queue (ranked list)
  - GET /api/admin/compliance-queue/:supplierId (detail)
  - POST /api/admin/compliance/review/:requirementId (admin decision)
- Create: React admin component
- Register routes in: `routes/index.ts`

**Pass Criteria**:
- Admin can reach `/admin/compliance-queue`
- Ranked table renders with suppliers needing review

### CC-1D: Officer DIAN RUT Management (5-6 hours)
**Files to create**: 2 files
- Create: `artifacts/api-server/src/routes/supplierCompliance.ts` (8 routes + 1 summary)
- Create: 5-screen React intake flow
  - Inspection screen (fetch supplier data)
  - Quiz screen (assessment questions)
  - Mode selection screen (self-serve vs assisted vs managed)
  - Document upload screen
  - Confirmation screen
- Update route registration

**Pass Criteria**:
- Supplier can complete full DIAN RUT flow
- All 5 screens accessible
- Document upload works via presigned URLs
- **CODE FIX**: Change `new ObjectStorageService()` to `objectStorageClient`

### CC-1E: Compliance Status Widget (2-3 hours)
**Files to create**: 2 files
- Add endpoint: `GET /api/supplier/compliance/summary` (to supplierCompliance.ts)
- Create: React dashboard widget component
- Wire into supplier dashboard

**Pass Criteria**:
- Widget appears on supplier dashboard
- Empty state works for fresh supplier
- Progress bar renders correctly
- CTA links route to `/supplier/compliance/[slug]` pages

### CC-1A: AI Enhancement - BEFORE OR AFTER?
**Decision Required**: When to run CC-1A?

**Option A: Before CC-1B (Recommended)**
- Fix scoring-service.ts to write compliance_docs booleans
- Then graduation service reads correct data
- Risk: Minimal (isolated service modification)
- Timeline: +1-2 hours before CC-1B
- **Recommended**: YES

**Option B: After CC-1E (Defer)**
- Complete UI/routes first (May 9-11)
- Add AI enhancement after (May 12)
- Risk: Graduation reads incomplete data until CC-1A done
- Timeline: Later this week
- **Recommended**: NO (blocks graduation validation)

**CC-1A Work** (1-2 hours):
- File: `artifacts/api-server/src/services/scoring-service.ts`
- Change: Parse individual `complianceGaps` items from Claude response
- Write: Back to `compliance_docs` booleans (`rut_dian`, `ica_registro`, `fitosanitario_cert`, `dian_exportador`)
- Verify: Graduation service reads correct state

---

## PHASE 2: BLOCKER RESOLUTIONS (May 8 Evening)

**B1**: Decide CC-1A timing (before or after CC-1B?)
**B2**: ✅ Resolved - product_category is in `products.category` or `rfqs.productCategory`
**B3**: ✅ Resolved - auth pattern is `req.userId` not `req.user.supplierId`

**Code Fix**: Update CC-1D paste to use `objectStorageClient` instead of `ObjectStorageService`

---

## PHASE 3: COMPLIANCE ENGINE (May 28 - July 11)

### Week 1 - Phase 1: Rules Engine (May 28-Jun 1)
**Deliverables**: 27 tests, rules validation layer

3 rule categories:
- **Eligibility** (8 rules): company registered, phone valid, location, farm data, etc. (min 60/100)
- **Commercial** (5 rules): export experience, capital, relationships, AI score (min 70/100, critical)
- **Compliance** (5 rules): RUT, ICA, fitosanitary, DIAN exportador, gaps ≤3 (min 80/100, all critical)

4 pathways (A/B/C/D) based on score thresholds (85/75/60/<60)

**Files**: 
- `src/services/compliance-engine/rules/` (6 files)
- `src/test/compliance-engine/rules.test.ts`

### Week 2-3 - Phase 2: Evaluator (Jun 2-13)
**Deliverables**: 28 tests, 7 REST endpoints

AI integration + gap analysis:
- `ai-scoring-integration.ts` (fetch/generate scores, Claude Haiku)
- `gap-analysis.ts` (classify gaps: COMPLIANCE/COMMERCIAL/OPERATIONAL)
- `snapshot-creator.ts` (append-only evaluations)
- `document-generator.ts` (Claude Sonnet structured output)
- `compliance-evaluator.ts` (orchestrator)

Endpoints:
- POST /evaluate/:id
- POST /evaluate-and-publish/:id
- GET /evaluations/:id
- GET /document/:evalId
- GET /suppliers/:id/compliance-status
- (2 more)

### Week 4-5 - Phase 3: State Machine (Jun 16-27)
**Deliverables**: 28 tests, 7 endpoints

States: PENDING → ACTIVE → ELIGIBLE → SELLABLE → PUBLISHED (+ INACTIVE)

Valid transitions with milestone tracking + event publishing:
- SupplierActivated, SupplierEligible, SupplierSellable, SupplierPublished, SupplierSuspended

Endpoints:
- POST /evaluate
- GET /graduation-status
- POST /advance
- POST /publish
- GET /history
- POST /suspend
- POST /appeal

### Week 6-7 - Phase 4: Regulatory Integration (Jun 30-Jul 11)
**Deliverables**: 22 tests, 7 endpoints

Colombian regulatory framework:
- DIAN: RUT Registration, Exporter Permission, Customs Registration
- ICA: Agricultural Registration, Fitosanitary Certificate
- Labor: ARL, Social Security
- Environmental: Environmental License

Components:
- `requirements-registry.ts` (by supplier type)
- `compliance-tracker.ts` (expiry management, alerts)
- `audit-logger.ts` (REQUIREMENT_MARKED_COMPLIANT, DOCUMENT_VERIFIED, etc.)
- `reporting.ts` (CSV/PDF export, monthly reports)

---

## PHASE 4: CC-2 & CC-3 (Parallel with Compliance Engine)

### CC-2: ICA Context Flow
**Start**: After Jun 1 (Phase 1 rules engine complete)
**Prerequisite**: Compliance Engine Phase 1 rules working
**Files**: Similar to CC-1D (routes + UI)
- 8 routes (ICA intake)
- 5-screen flow

### CC-3: FNC Coffee Flow
**Start**: After Jun 13 (Phase 2 evaluator complete)
**Prerequisite**: Compliance Engine Phase 2 evaluator working
**Files**: Similar to CC-1D/CC-2
- 8 routes (FNC intake)
- 5-screen flow

---

## TIMELINE OVERVIEW

```
May 8:   Answer blockers (B1 timing decision)
May 9:   CC-1B (Schema) 2-3h
May 9:   CC-1C (Admin Queue) 3-4h
May 10:  CC-1D (Officer DIAN) 5-6h
May 11:  CC-1E (Widget) 2-3h + Final verification
May 12:  Deploy CC-1 Phase I, continue if CC-1A needed

May 28:  Compliance Engine Phase 1 starts (Rules)
Jun 1:   Phase 1 complete → CC-2 begins
Jun 2:   Compliance Engine Phase 2 starts (Evaluator)
Jun 13:  Phase 2 complete → CC-3 begins
Jun 16:  Compliance Engine Phase 3 starts (State Machine)
Jun 27:  Phase 3 complete
Jun 30:  Compliance Engine Phase 4 starts (Regulatory)
Jul 11:  Phase 4 complete, all 105+ tests passing

Jul 14+: Integration testing + production deployment
```

---

## TOTALS

| Component | Tables | Routes | Components | Tests | Lines of Code |
|-----------|--------|--------|------------|-------|---------------|
| **CC-1** | 7 | 11 | 3 | Acceptance criteria | 800-1000 |
| **Compliance Engine Phase 1** | - | - | - | 27 | 400 |
| **Compliance Engine Phase 2** | - | 7 | - | 28 | 500 |
| **Compliance Engine Phase 3** | - | 7 | - | 28 | 600 |
| **Compliance Engine Phase 4** | - | 7 | - | 22 | 400 |
| **CC-2** | - | 8 | 5 | Acceptance criteria | 400 |
| **CC-3** | - | 8 | 5 | Acceptance criteria | 400 |
| **TOTAL** | 7 | 48 | 13 | 105+ | 3500-4000 |

---

## CRITICAL PATH

```
B1 Decision (TODAY)
    ↓
CC-1A (1-2h, if BEFORE decision)
    ↓
CC-1B (2-3h)
    ↓
CC-1C (3-4h)
    ↓
CC-1D (5-6h) [CODE FIX: objectStorageClient]
    ↓
CC-1E (2-3h)
    ↓
CC-1 DEPLOYED (May 12)
    ↓
Compliance Engine Phase 1 (May 28-Jun 1)
    ↓
CC-2 (After Jun 1)
    ↓
Compliance Engine Phase 2 (Jun 2-13)
    ↓
CC-3 (After Jun 13)
    ↓
Compliance Engine Phase 3-4 (Jun 16-Jul 11)
    ↓
COMPLETE (Jul 11)
```

---

## DECISION POINTS

| Point | Decision | Impact |
|-------|----------|--------|
| **B1** | When to run CC-1A? | If BEFORE: blocker resolved, add 1-2h to timeline. If AFTER: graduation reads incomplete data until May 12. **Recommend: BEFORE** |
| **Code Fix** | Update objectStorageClient ref in CC-1D? | Yes - required before CC-1D paste |
| **CC-2/CC-3 Timing** | Run parallel with Compliance Engine? | Yes - each depends on previous Compliance Engine phase |
| **Testing** | Full suite or acceptance criteria only? | Phase I: acceptance criteria. Compliance Engine: 105+ tests. |

---

## SUCCESS CRITERIA

**CC-1 Phase I Complete**:
- ✅ 7 tables created
- ✅ 11 routes working
- ✅ 3 components rendering
- ✅ Admin compliance queue functional
- ✅ Supplier DIAN intake flow complete
- ✅ Dashboard widget visible
- ✅ Data persistence working (CC-1A if run)

**Compliance Engine Complete**:
- ✅ 105+ tests passing
- ✅ All 4 phases integrated
- ✅ Rules engine validating
- ✅ AI scoring working
- ✅ State machine operational
- ✅ Regulatory tracking active

**Overall Compliance System Live**:
- ✅ Suppliers can intake compliance requirements
- ✅ Officers can manage workflows
- ✅ Admin can review and approve
- ✅ System evaluates compliance automatically
- ✅ Regulatory tracking ongoing
- ✅ ICA and FNC flows working

---

## NEXT IMMEDIATE ACTIONS

1. **Today (May 8)**: Decide B1 - when to run CC-1A?
2. **Today (May 8)**: Update CC-1D paste to use `objectStorageClient`
3. **Tomorrow (May 9)**: Execute CC-1B paste
4. **May 9-11**: Complete CC-1C, CC-1D, CC-1E sequentially
5. **May 12**: Deploy CC-1, begin Compliance Engine planning
6. **May 28**: Start Compliance Engine Phase 1

---

**Status**: ✅ Ready for execution
**Codebase**: Clean, 0% CC implemented, all blockers resolved except B1 timing
**Next**: B1 decision + execute CC-1B tomorrow morning
