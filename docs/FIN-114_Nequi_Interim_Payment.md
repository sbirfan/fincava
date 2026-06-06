# FIN-114 — Nequi Interim Payment Flow

**Status:** ✅ Complete  
**Created:** 2026-06-06  
**Last updated:** 2026-06-06  
**Author:** Claude Code (Anthropic)  
**Approved by:** Founder  
**FIN ID:** FIN-114 (interim payment bridge; precedes full Wompi integration)

---

## Context

The retail storefront (`ENABLE_RETAIL`) is architecturally complete but has no payment
integration. Wompi/Stripe require a Colombian NIT which is not yet available. This
document tracks the interim solution: sellers register their Nequi phone number;
buyers transfer manually after placing an order; admin verifies and advances the
8-step fulfilment workflow.

This is not a permanent solution. It is a revenue-unlock bridge until Wompi
credentials are available. All schema changes are additive and forward-compatible
with Wompi integration.

---

## Flow (designed)

```
Seller (admin panel)
  └─ Adds Nequi phone to their supplier profile
        ↓
Buyer (tienda)
  └─ Selects NEQUI at checkout → places order (no charge fires)
  └─ Order status page shows: "Transfer COP X to Nequi [phone] — Ref: #[id]"
  └─ Buyer sends Nequi transfer manually
  └─ Buyer submits their transaction ID on order status page
        ↓
Admin (retail orders panel)
  └─ Sees buyer's submitted reference
  └─ Cross-checks in Nequi app
  └─ Clicks "Mark Authorized"
  └─ Continues existing 8-step fulfilment workflow
```

---

## Task Checklist

### Schema
- [x] **T1** — Migration: add `buyer_payment_ref TEXT` to `retail_order_details` (`0033_retail_buyer_payment_ref.sql`)
- [x] **T1** — Update Drizzle schema: `lib/db/src/schema/retail.ts` — `buyerPaymentRef` added

### Backend
- [x] **T2** — `GET /api/admin/suppliers/:id/payment-method` — returns full supplier_payment_methods row
- [x] **T2** — `PUT /api/admin/suppliers/:id/payment-method` — upserts supplier Nequi phone (Zod-validated `^3\d{9}$`)
- [x] **T3** — `PATCH /api/retail/orders/:id/payment-ref` — buyer submits Nequi transaction ID (auth: session or token)
- [x] **T4** — `GET /api/retail/orders/:id` — joins nequiPhone through product→supplier→payment_methods; returns instrumentType + nequiPhone + buyerPaymentRef
- [x] **T4** — `GET /api/admin/retail/orders/:id` — includes nequiPhone + buyerPaymentRef in response

### Frontend
- [x] **T5** — `checkout.tsx` — info callout when NEQUI selected, explaining manual transfer flow
- [x] **T6** — `order-status.tsx` — Nequi transfer panel (seller phone, amount, ref) + buyer ref submission form; refetch on submit
- [x] **T7** — `retail-orders.tsx` (admin) — fetches single-order detail on expand; shows nequiPhone + buyerPaymentRef (or "not yet submitted" warning)
- [x] **T8** — `suppliers.tsx` (admin detail drawer) — Nequi phone input field with prefill from GET + save via PUT; validated `^3\d{9}$` on server

---

## File Map

| Task | File | Change |
|------|------|--------|
| T1 | `lib/db/drizzle/0033_retail_buyer_payment_ref.sql` | New migration |
| T1 | `lib/db/src/schema/retail.ts` | Add `buyerPaymentRef` to `retailOrderDetailsTable` |
| T2 | `artifacts/api-server/src/routes/admin.ts` | GET + PUT `/admin/suppliers/:id/payment-method` |
| T3 | `artifacts/api-server/src/routes/retail/orders.ts` | PATCH `/retail/orders/:id/payment-ref` |
| T4 | `artifacts/api-server/src/routes/retail/orders.ts` | Extend GET order response |
| T4 | `artifacts/api-server/src/routes/admin.ts` | Extend admin GET retail order response |
| T5 | `artifacts/fincava/src/pages/tienda/checkout.tsx` | Nequi info callout |
| T6 | `artifacts/fincava/src/pages/tienda/order-status.tsx` | Transfer instructions + ref submission |
| T7 | `artifacts/fincava/src/pages/admin/retail-orders.tsx` | Payment ref + nequiPhone in expand panel |
| T8 | `artifacts/fincava/src/pages/admin/suppliers.tsx` | Nequi payment method section in detail drawer |

---

## Progress Log

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-06-06 | Plan created | ✅ Done | Approved by founder |
| 2026-06-06 | T1 — migration 0033 + schema | ✅ Done | `buyer_payment_ref TEXT` on retail_order_details |
| 2026-06-06 | T2 — GET + PUT payment-method | ✅ Done | admin.ts; Zod-validated Colombian mobile regex |
| 2026-06-06 | T3 — PATCH /payment-ref | ✅ Done | retail/orders.ts; dual-auth (session + token) |
| 2026-06-06 | T4 buyer — GET /retail/orders/:id | ✅ Done | joins nequiPhone; returns instrumentType+nequiPhone+buyerPaymentRef |
| 2026-06-06 | T4 admin — GET /admin/retail/orders/:id | ✅ Done | adminOrders.ts; joins supplier_payment_methods |
| 2026-06-06 | T5 — checkout.tsx callout | ✅ Done | Info panel shown when NEQUI selected |
| 2026-06-06 | T6 — order-status.tsx | ✅ Done | Transfer panel + ref submission form; invalidates query on save |
| 2026-06-06 | T7 — admin retail-orders.tsx | ✅ Done | Fetches detail on expand; shows Nequi summary card |
| 2026-06-06 | T8 — admin suppliers.tsx | ✅ Done | Nequi panel in detail drawer; prefills from GET; saves via PUT |

---

## Rollback

All changes are additive:
- Migration: `ALTER TABLE retail_order_details DROP COLUMN IF EXISTS buyer_payment_ref`
- Backend routes: remove the 3 new/modified endpoints
- Frontend: revert 4 page files
- No data deleted; no existing behaviour changed

---

## Dependencies

- `supplier_payment_methods` table exists (migration 0015) — no new table needed
- `retail_payment_transactions.instrumentType` already stores NEQUI — no schema change needed there
- `products.supplier_id` → `supplier_payment_methods.nequi_phone` join path already exists

---

## What this does NOT cover

- Wompi API integration (future FIN item — requires NIT)
- Stripe integration (future FIN item)
- Automated payment confirmation (requires gateway webhook)
- Refund flow (future FIN item)
- SLA void cron (future FIN item)

---

*This document is updated in real time as each task completes.*
