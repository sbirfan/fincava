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
