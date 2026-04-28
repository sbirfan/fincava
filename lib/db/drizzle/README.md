# Drizzle Migration Baseline

As of migration snapshot `0006_snapshot.json`, the schema baseline was reset due to snapshot drift.

Key points:

* Database schema is the source of truth
* Snapshot `0006_snapshot.json` reflects the exact current DB state
* Earlier snapshots (0000–0002) were stale and removed
* Migration `0006_officer_applications.sql` was archived and NOT applied

Important rules:

* Do NOT run old migrations (0000–0005) on a fresh database without verification
* Future migrations must be generated from this baseline
* Do NOT manually edit snapshot files unless resolving drift
* Prefer `generate → migrate` over `push` going forward


**Update text**
# Drizzle Migration Baseline

As of migration snapshot `0006_snapshot.json`, the schema baseline was reset due to snapshot drift.

## Key Points

* The **database schema is the source of truth**
* Snapshot `0006_snapshot.json` reflects the exact current DB state
* Earlier snapshots (`0000–0002`) were stale and removed
* Migration `0006_officer_applications.sql` was archived and **NOT applied**
* This baseline assumes the current database already reflects all prior schema changes

---

## Operating Rules (IMPORTANT)

* Do **NOT** run old migrations (`0000–0005`) on a fresh database without verification
* Do **NOT** attempt to “replay” historical migrations to rebuild the schema
* All future migrations must be generated from this baseline
* Prefer `generate → migrate` over `push` going forward
* Do **NOT** manually edit snapshot files unless explicitly resolving drift

---

## For New Environments

When setting up a new database:

1. Use the **current schema (Drizzle + snapshot)** as the starting point
2. Do **NOT** rely on historical migrations alone
3. If needed, create a fresh baseline migration from the current schema

---

## Notes

* Snapshot drift can occur when mixing `push` and `generate/migrate`
* If drift is suspected:

  * Verify DB vs schema first
  * Treat DB as source of truth
  * Re-baseline safely (do NOT apply destructive migrations)

---
