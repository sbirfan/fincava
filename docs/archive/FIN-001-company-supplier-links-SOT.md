# FIN-001 — Company Supplier Links: Source of Truth

**Status:** In Progress  
**Opened:** 2026-06-06  
**Archive when:** All steps verified complete in both repos (fincava-hub + fincava)  
**Ticket:** FIN-001 in `FINCAVA_MASTER_REGISTER.md`

---

## Problem Statement

FINCAVA has two completely separate identity graphs for suppliers with no FK connecting them:

- **Graph A — Graduation/Compliance:** `suppliers` table (WhatsApp-onboarded farmers, compliance docs, AI scoring, state machine)
- **Graph B — Marketplace/Auth:** `users → companies → products` (web-registered accounts, RFQs, marketplace listings)

The only partial bridge (`suppliers.userId` nullable FK) only applies to web-registered suppliers. WhatsApp-onboarded farmers (the majority) have `userId = NULL`. This forces email-resolution hacks in application code and makes cooperative membership impossible to model.

Field study confirms cooperatives are a primary go-to-market channel. A 1:1 FK (Option 1) would need to be replaced the moment the first cooperative onboards. Zero live data means now is the lowest-cost moment to implement the correct model.

---

## Decision

**Option 3 — `company_supplier_links` join table.**

Reasons:
- Zero suppliers/buyers in production → zero migration or backfill cost
- Cooperatives confirmed as strategically important from field study
- Option 1 (nullable `company_id` FK on `suppliers`) would require replacement at first cooperative onboard
- The join table IS the cooperative layer — no separate entity needed
- Not significantly more complex than Option 1 at greenfield scale

---

## Data Model

```
companies (type='COOPERATIVE' | 'EXPORTER' | etc.)    ← legal entity, RUT, marketplace account
    │
    │  company_supplier_links
    │  (link_type='MEMBER'|'OWNER'|'CONTRACTED', is_primary=true/false)
    │
suppliers (supplier_type='FARMER' | 'COOPERATIVE')    ← graduation pipeline, compliance docs
    ├── farms
    ├── economics
    ├── compliance_docs (1:1)
    ├── ai_outputs
    └── supplier_evaluations
```

### Key design decisions

| Question | Answer |
|----------|--------|
| Who gets graduated? | Individual farmers — each has their own `sellable_status`. Cooperative aggregate readiness derived from members |
| Who holds RUT/DIAN export licence? | The cooperative company — in `companies`, not `suppliers` |
| Whose products appear in marketplace? | Listed under cooperative's company account; `supplier_id` on products traces to the specific farmer lot |
| Can a farmer sell through multiple coops? | Yes — multiple links; `is_primary` distinguishes primary channel |
| Does a cooperative itself get scored? | Not initially — score members, surface aggregate metrics to buyers |

---

## Affected Files

| File | Change |
|------|--------|
| `lib/db/src/schema/companies.ts` | Add `linkTypeEnum` + `companySupplierLinksTable` |
| `lib/db/src/schema/index.ts` | Export new table and type |
| `lib/db/drizzle/0028_company_supplier_links.sql` | New migration (generated) |
| `lib/db/drizzle/meta/_journal.json` | Updated by drizzle-kit |
| `artifacts/api-server/src/routes/admin.ts` | 3 new CRUD endpoints + simplify email resolution in introduce route |

No changes to `suppliers.ts`, `users.ts`, `products.ts`, `orders.ts`, or any existing migration.

---

## Schema Definition

### `linkTypeEnum`

```ts
export const linkTypeEnum = pgEnum("company_supplier_link_type", [
  "MEMBER",      // farmer member of a cooperative
  "OWNER",       // sole-trader who owns the company (1:1 case)
  "CONTRACTED",  // independent supplier under a supply agreement
]);
```

### `companySupplierLinksTable`

```ts
export const companySupplierLinksTable = pgTable(
  "company_supplier_links",
  {
    id:               serial("id").primaryKey(),
    companyId:        integer("company_id").notNull().references(() => companiesTable.id),
    supplierId:       integer("supplier_id").notNull().references(() => suppliersTable.id),
    linkType:         linkTypeEnum("link_type").notNull().default("MEMBER"),
    isPrimary:        boolean("is_primary").notNull().default(true),
    linkedByAdminId:  integer("linked_by_admin_id").references(() => usersTable.id),
    linkedAt:         timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
    notes:            text("notes"),
  },
  (t) => [
    uniqueIndex("csl_company_supplier_type_uidx").on(t.companyId, t.supplierId, t.linkType),
    index("csl_company_idx").on(t.companyId),
    index("csl_supplier_idx").on(t.supplierId),
  ],
);
```

---

## Migration SQL (`0028_company_supplier_links.sql`)

```sql
CREATE TYPE "company_supplier_link_type" AS ENUM('MEMBER', 'OWNER', 'CONTRACTED');

CREATE TABLE "company_supplier_links" (
  "id"                  serial PRIMARY KEY,
  "company_id"          integer NOT NULL REFERENCES "companies"("id"),
  "supplier_id"         integer NOT NULL REFERENCES "suppliers"("id"),
  "link_type"           "company_supplier_link_type" NOT NULL DEFAULT 'MEMBER',
  "is_primary"          boolean NOT NULL DEFAULT true,
  "linked_by_admin_id"  integer REFERENCES "users"("id"),
  "linked_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "notes"               text
);

CREATE UNIQUE INDEX "csl_company_supplier_type_uidx"
  ON "company_supplier_links"("company_id", "supplier_id", "link_type");
CREATE INDEX "csl_company_idx"  ON "company_supplier_links"("company_id");
CREATE INDEX "csl_supplier_idx" ON "company_supplier_links"("supplier_id");
```

Additive only. No existing tables touched. Zero-downtime apply.

---

## Admin API Endpoints

### `GET /api/admin/suppliers/:id/links`
List all company links for a supplier.

**Response:**
```json
[{ "id": 1, "companyId": 3, "companyName": "Cooperativa Huilas", "linkType": "MEMBER", "isPrimary": true, "linkedAt": "...", "notes": null }]
```

### `POST /api/admin/suppliers/:id/links`
Create a new link. If `isPrimary: true`, existing primary link is demoted in the same transaction.

**Body:**
```json
{ "companyId": 3, "linkType": "MEMBER", "isPrimary": true, "notes": "Onboarded June 2026" }
```

**Response:**
```json
{ "id": 1, "companyId": 3, "supplierId": 7, "linkType": "MEMBER", "isPrimary": true, "linkedAt": "..." }
```

### `DELETE /api/admin/suppliers/:id/links/:linkId`
Remove a link.

**Response:** `{ "success": true }`

---

## Email Resolution Improvement (introduce route)

Current two-step fallback in `POST /api/admin/rfqs/:id/introduce` (admin.ts lines 196–217):
```
supplier → products.supplierId → company → user → email
         ↘ (fallback) supplier.userId → user → email
```

After FIN-001:
```
supplier → company_supplier_links (is_primary=true) → company → user → email
         ↘ (fallback if no link) supplier.userId → user → email
```

Fallback preserved for transition period before all suppliers are linked.

---

## Out of Scope for This PR

| Item | When |
|------|------|
| `products.ts` — set `supplier_id` on insert via link lookup | Phase 2, after first link exists in prod |
| Retire marketplace visibility bridge (Path B in `products.ts`) | Phase 3, after all products have `supplier_id` |
| Backfill `part_of_cooperative` from `interactions.metadata` | Phase 4, at first cooperative onboard |
| Cooperative aggregate scoring / reporting | Future |

---

## Test Plan

- [ ] `drizzle-kit generate` produces clean `0028_company_supplier_links.sql`
- [ ] Migration applies cleanly: `drizzle-kit migrate`
- [ ] DB package builds: `pnpm --filter @workspace/db run build`
- [ ] API typechecks: `pnpm --filter @workspace/api-server run typecheck`
- [ ] Existing test suite passes: `pnpm --filter @workspace/api-server run test`
- [ ] Manual: `POST /admin/suppliers/1/links` creates link
- [ ] Manual: `GET /admin/suppliers/1/links` returns it
- [ ] Manual: `DELETE` removes it
- [ ] Manual: `POST /admin/rfqs/:id/introduce` resolves email via link (linked supplier) and via fallback (unlinked supplier)

---

## Rollback

```sql
DROP TABLE company_supplier_links;
DROP TYPE company_supplier_link_type;
```

Zero impact on existing data.

---

## Completion Checklist

- [ ] Schema change merged to fincava-hub
- [ ] Schema change synced to fincava (prod repo)
- [ ] Migration applied in staging
- [ ] Migration applied in production
- [ ] All test plan items verified
- [ ] `FINCAVA_CHANGE_LOG.md` updated — FIN-001 closed
- [ ] `FINCAVA_MASTER_REGISTER.md` — FIN-001 marked Resolved
- [ ] `FINCAVA_EXECUTION_BACKLOG.md` — FIN-001 moved to Completed
- [ ] This document moved to `docs/archive/`
