### H4 — Public Supplier Dataset Exposure (SECURITY)

CURRENT_STATE:

* `/api/suppliers` publicly accessible
* includes internal fields: commercialScore, eligibilityStatus, graduationPathway, lastEvaluatedAt

GAP:

* unintended exposure of internal supplier evaluation data to any unauthenticated caller

TARGET_STATE:

* restrict to ADMIN-only; buyer surface via /suppliers/marketplace

Fix Applied (P0.2 — Epic 2 Precondition)
- GET /api/suppliers restricted to ADMIN-only
- Middleware: requireAuth + requireAdmin (in that order)
- Public buyer access served via /suppliers/marketplace (unchanged)
- Internal evaluation fields no longer externally accessible
- Date: 2026-04-23

---

### H4-B — GET /suppliers/:id Unguarded (SECURITY)

CURRENT_STATE:
- GET /suppliers/:id has no auth middleware (line 691)
- Returns full supplier row via db.select() with no field restriction
- Exposes commercialScore, eligibilityStatus, graduationPathway
  for any supplier by ID to any unauthenticated caller

GAP:
- Same class of exposure as H4
- Any caller with a valid supplier ID can retrieve internal data

TARGET_STATE:
- requireAuth + requireAdmin applied (same pattern as H4 fix)
- Fix before any external-facing supplier detail work in Epic 2

SEVERITY: High
STATUS: Open — fix in P0.4
