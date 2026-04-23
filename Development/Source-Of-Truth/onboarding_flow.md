## 14. ICA Sync Fix (P0.1 — Epic 2 Precondition)

PROBLEM:
- Onboarding Step 3 captures ica_registered in interactions.metadata
- compliance_docs.ica_registro defaulted to false and was never updated
- Eligibility gate reads compliance_docs — supplier ICA declaration
  was silently ignored
- Eligibility was effectively admin-controlled only

FIX APPLIED (2026-04-23):
- POST /api/suppliers/onboard now syncs ica_registered to
  compliance_docs after the interactions insert
- const icaRegisteredTrue = body.ica_registered === true
      || body.ica_registered === "yes"
- If icaRegisteredTrue: UPDATE compliance_docs SET ica_registro = true
  WHERE supplier_id = [new id]
- Fix is upgrade-only — never downgrades an admin-set value
- If UPDATE fails: logged as warning, onboarding still returns 201

SCOPE:
- Only ica_registered → ica_registro is synced
- rutDian, fitosanitarioCert remain admin-only (by design, v0)
- Re-onboarding not supported in v0 — single POST path only
- Full compliance unification deferred to Phase 4

BODY FIELD NOTE:
- Frontend submits body.ica_registered as string "yes" | "no"
- Direct API callers may send boolean true
- Both forms handled by icaRegisteredTrue const
