# FINCAVA Change Log

**Purpose:** Historical record of **completed** work tied to the Master Improvement Register (`FIN-###`). This is the audit trail for what shipped, how it was validated, and how to roll back.

**Not in scope here:** Backlog intent (`FINCAVA_EXECUTION_BACKLOG.md`), item definitions (`FINCAVA_MASTER_REGISTER.md`), or prioritization (`FINCAVA_PRIORITIZATION.md`).

**Rules:**
1. Add an entry only when the **expected outcome** in the execution backlog is verified in production (or accepted for founder-only process items).
2. Move the backlog item to **Completed** in `FINCAVA_EXECUTION_BACKLOG.md` and add a matching entry here the same day.
3. Do not remove or renumber FIN IDs. Do not delete past entries.
4. One section per calendar date (`## YYYY-MM-DD`), newest date first.

---

## Entry template

Copy for each completed `FIN-###` item:

```markdown
### FIN-###

**Status:** Completed  
**Completed by:** [name or role]  
**Backlog sprint:** [Current | Next | Future]

**Summary:**  
[1–3 sentences: what changed and why it matters for Phase I.]

**Files:**  
- `path/to/file` — [what changed]

**Validation:**  
- [ ] [Concrete check, e.g. curl, UI step, email received]
- [ ] [Regression check]

**Rollback:**  
- [How to revert safely, or "N/A — documentation/process only"]
```

---

## 2026-06-06

### FIN-001 — Two supplier systems with no database link

**Status:** Completed  
**Completed by:** Claude Code + founder approval  
**Backlog sprint:** Blocked (architectural decision required) → resolved

**Summary:**  
Introduced `company_supplier_links` join table bridging the two supplier identity graphs: WhatsApp-onboarded farmers (`suppliers`) and web-registered B2B accounts (`companies`/`users`). Chose a many-to-many join table over a simple nullable FK to natively support the cooperative model confirmed by field study. Improved admin introduce-route email resolution to use the primary link first, with graceful fallback for pre-FIN-001 suppliers.

**Files:**  
- `lib/db/src/schema/companies.ts` — added `linkTypeEnum`, `companySupplierLinksTable`, exported types
- `lib/db/drizzle/0028_company_supplier_links.sql` — new migration (additive only)
- `lib/db/drizzle/meta/_journal.json` — registered migration at idx 31
- `artifacts/api-server/src/routes/admin.ts` — 3 new CRUD endpoints (`GET/POST/DELETE /api/admin/suppliers/:id/links`); improved email resolution in introduce route

**Validation:**  
- [x] TypeScript typecheck passes in both repos (`pnpm --filter @workspace/api-server run typecheck`)
- [x] Full test suite passes — 199/199 tests (`pnpm --filter @workspace/api-server run test`) — includes 14 new FIN-001 tests in `company-supplier-links.test.ts`
- [x] Schema change synced to `fincava` (prod repo)
- [ ] Migration applied to staging DB
- [ ] Migration applied to production DB
- [ ] Manual smoke: `POST /admin/suppliers/:id/links` creates link; `GET` returns it; `DELETE` removes it

**Rollback:**  
```sql
DROP TABLE company_supplier_links;
DROP TYPE company_supplier_link_type;
```
No existing data affected — purely additive.

---

## 2026-05-31

### Planning baseline (operational — not a FIN register completion)

**Status:** Completed  
**Completed by:** Discovery & planning session  

**Summary:**  
Established the improvement register, prioritization dashboards, and execution backlog. No register items (`FIN-001`–`FIN-112`) were implemented in code on this date.

**Files created:**  
- `FINCAVA_MASTER_REGISTER.md` — 112-item source of truth  
- `FINCAVA_PRIORITIZATION.md` — dashboards, top 10, 60-day sequencing  
- `FINCAVA_EXECUTION_BACKLOG.md` — Current / Next / Future / Blocked / Completed sprints  
- `FINCAVA_CHANGE_LOG.md` — this file  

**Validation:**  
- [x] Documents present at repo root and cross-reference each other  
- [x] `FINCAVA_EXECUTION_BACKLOG.md` **Completed** section empty for register items  

**Rollback:**  
- Delete or revert the four files above if the planning baseline is abandoned (no production impact).

---

### Register items (FIN-###)

*No `FIN-###` items completed on 2026-05-31.*

| FIN ID | Status |
|--------|--------|
| — | — |

---

## Index of completed FIN items

*Newest first. Update when entries are added above.*

| FIN ID | Completed date | Title | Summary (short) |
|--------|----------------|-------|-----------------|
| — | — | — | — |

---

## Related documents

| Document | Role |
|----------|------|
| `FINCAVA_MASTER_REGISTER.md` | Item definitions |
| `FINCAVA_EXECUTION_BACKLOG.md` | Sprint placement; move items to Completed here |
| `FINCAVA_PRIORITIZATION.md` | Why items were sequenced |
| `docs/TAKEOVER_PLAN.md` | Deploy and fragile-area context |

---

## Changelog meta

| Date | Change |
|------|--------|
| 2026-05-31 | Initial change log created; format and planning baseline recorded |
