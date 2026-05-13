# Marketplace Visibility Compatibility Bridge

**Status:** Active temporary compatibility layer  
**Introduced:** 2026-05-12  
**Affects:** `GET /api/products` public listing endpoint

---

## 1. Exact Query Logic Added

The public product listing query (`GET /api/products`) previously used an `INNER JOIN` on `suppliersTable` via `products.supplier_id`. This was changed to a `LEFT JOIN` on both `companiesTable` and `suppliersTable`, with a dual-path visibility condition replacing the original single-path filter.

**Before (single path, broke seeded products):**

```sql
FROM products
LEFT JOIN companies ON products.company_id = companies.id
INNER JOIN suppliers ON products.supplier_id = suppliers.id
WHERE
  products.active = true
  AND suppliers.sellable_status IN ('SELLABLE', 'PUBLISHED')
```

**After (dual-path compatibility bridge):**

```sql
FROM products
LEFT JOIN companies ON products.company_id = companies.id
LEFT JOIN suppliers ON products.supplier_id = suppliers.id
WHERE
  products.active = true
  AND (
    -- Path A (future authoritative): product linked to a graduated supplier
    (products.supplier_id IS NOT NULL
      AND suppliers.sellable_status::text = ANY(ARRAY['SELLABLE', 'PUBLISHED']))
    OR
    -- Path B (legacy/compatibility): unlinked product from a verified company
    (products.supplier_id IS NULL
      AND companies.verified = true)
  )
```

The same dual-path condition is applied identically to the `countQuery` used to calculate `total` and `totalPages` in the response, using the same LEFT JOINs.

---

## 2. Files Changed

| File | Change |
|---|---|
| `artifacts/api-server/src/routes/products.ts` | Main listing query: `INNER JOIN suppliers` → `LEFT JOIN suppliers`; added dual-path `WHERE` condition (lines ~107–128). Count query: `INNER JOIN suppliers` → `LEFT JOIN companies + LEFT JOIN suppliers`; same `WHERE` condition applied (lines ~155–161). |

No schema changes. No migration files. No frontend changes.

---

## 3. Legacy Path (Temporary)

**Condition:**
```sql
products.supplier_id IS NULL AND companies.verified = true
```

This path exists solely to keep seeded/pre-linkage products visible in the marketplace. It is a compatibility bridge for products that were created before the `supplier_id` column was populated as part of the supplier onboarding pipeline.

It is **not** the intended visibility model. It relies on `companies.verified` as a proxy for supplier graduation, which is a weaker and less precise gate than the suppliers table's `sellable_status` enum.

---

## 4. Future Authoritative Model

**Condition:**
```sql
products.supplier_id IS NOT NULL
AND suppliers.sellable_status::text = ANY(ARRAY['SELLABLE', 'PUBLISHED'])
```

Every product must carry a valid `supplier_id` pointing to a row in the `suppliers` table. That supplier record must have reached `SELLABLE` or `PUBLISHED` status (defined by `sellableStatusEnum` in `@workspace/db`; values are derived from the enum at runtime — no raw string literals hardcoded in application logic).

This model is already enforced for all new products created through the supplier onboarding pipeline once a `supplier_id` is assigned. Path A is already the correct and active gate for those products.

---

## 5. Criteria for Removing the Compatibility Bridge

The legacy path (Path B) can be removed when **all** of the following are true:

1. **All products in the `products` table have a non-null `supplier_id`** pointing to a valid row in `suppliers`.
2. **All linked supplier records have a `sellable_status`** of `SELLABLE` or `PUBLISHED` (i.e., they have completed the graduation pipeline).
3. **The product creation flow** (`POST /supplier/products`) always sets `supplier_id` at insert time, not just `company_id`. (Currently noted as an arch gap in the route's inline comment.)
4. **A verification query** confirms zero rows match the legacy path condition:
   ```sql
   SELECT COUNT(*) FROM products
   LEFT JOIN companies ON products.company_id = companies.id
   WHERE products.supplier_id IS NULL AND companies.verified = true AND products.active = true;
   -- Must return 0 before removing the bridge.
   ```

Once all criteria are met, remove Path B from the `WHERE` condition in `GET /api/products` and restore the `INNER JOIN` on `suppliersTable` for the main query and the count query.

---

## 6. Seeded Products Without Supplier Linkage

All 8 seeded products have `supplier_id = NULL`. Their visibility under the current bridge depends on whether their linked company has `verified = true`.

| Product ID | Name | Company ID | Company | `company.verified` | Visible via bridge? |
|---|---|---|---|---|---|
| 1 | Huila Natural Geisha AAA | 1 | Café Huilas Premium | `true` | Yes |
| 2 | Huila Washed Castillo SCA 87 | 1 | Café Huilas Premium | `true` | Yes |
| 3 | Tumaco Fine Flavor Cacao Nacional | 2 | Cooperativa Cacao del Pacífico | `true` | Yes |
| 4 | Cacao Fino CCN-51 Fermentado | 2 | Cooperativa Cacao del Pacífico | `true` | Yes |
| 5 | Avocado Hass Colombia Premium | 3 | Exportaciones Andinas Colombia | `true` | Yes |
| 6 | Uchuva (Cape Gooseberry) IQF Frozen | 3 | Exportaciones Andinas Colombia | `true` | Yes |
| 7 | Goldenberry Freeze-Dried Powder | 4 | Santero Premium Superfoods | `false` | **No** |
| 8 | Maca Andina Gelatinizada Powder | 4 | Santero Premium Superfoods | `false` | **No** |

**Summary:** 6 of 8 seeded products are currently visible in the marketplace (products 1–6). Products 7 and 8 are hidden because their company (`Santero Premium Superfoods`, company ID 4) has `verified = false`. This is consistent with the intent of the bridge — only products from companies that have been vetted are shown. Products 7 and 8 will become visible when either (a) their company is marked verified, or (b) they are linked to a graduated supplier record via `supplier_id`.

---

## 7. Whether a Backfill Should Eventually Link Legacy Products to Suppliers

**Yes.** A future backfill should populate `supplier_id` on all existing legacy products. The goal is to retire the compatibility bridge entirely.

The backfill is a **separate, deliberate operation** and should not be done opportunistically. It requires the following prerequisite work:

1. **Establish the company → supplier bridge.** There is currently no FK or join column linking `companies.id` to `suppliers.id`. The `suppliers` table has no `company_id` column, and the `companies` table has no `supplier_id` column. The bridge must be designed and agreed on before any backfill can be written. Options include: adding a `company_id` FK to `suppliers`, adding a `supplier_id` FK to `companies`, or maintaining a separate join table.

2. **Ensure all target suppliers have a graduation status.** Before linking products, each supplier record must have `sellable_status` set to `SELLABLE` or `PUBLISHED`. Without this, linking products would immediately hide them (Path A requires a graduated status; Path B would no longer apply once `supplier_id` is set).

3. **Write and test the backfill as a migration.** It should be idempotent (`UPDATE ... WHERE supplier_id IS NULL`) and run against a non-production environment before production.

4. **Verify zero legacy-path rows** using the query in Section 5 before removing the bridge.

The backfill does not need to happen before the bridge is removed from code — it *is* the prerequisite for removal. Until it is complete, the bridge must stay.
