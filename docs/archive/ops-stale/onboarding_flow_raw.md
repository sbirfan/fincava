# Onboarding Flow — Source of Truth
*Derived from: routes/suppliers.ts, schema files, service layer*
*Validation key: CONFIRMED = in code | PARTIAL = exists but differs | MISSING = not in code | DERIVED = computed*

---

## Overview

Supplier onboarding is a single API call (`POST /api/suppliers/onboard`) that creates rows across 5 tables synchronously, then triggers AI scoring and evaluation asynchronously. The HTTP response is returned before scoring or evaluation completes.

```
Client → POST /api/suppliers/onboard
           │
           ├─ [sync] Insert: suppliers
           ├─ [sync] Insert: farms
           ├─ [sync] Insert: economics
           ├─ [sync] Insert: compliance_docs (DO NOTHING if exists)
           ├─ [sync] Insert: interactions (metadata JSONB)
           ├─ [sync] Return HTTP 201 to client
           │
           ├─ [async, fire-and-forget] scoreSupplier()
           │     ├─ Claude Haiku API call (latency logged)
           │     ├─ Validate export_readiness_score (Number.isFinite)
           │     ├─ Insert: ai_outputs
           │     ├─ Send WhatsApp via Twilio
           │     └─ Retry up to 3x on any error (1s, 2s, 4s backoff)
           │
           └─ [async, setImmediate after scoreSupplier] evaluateSupplier()
                 ├─ Fetch: suppliers, ai_outputs (ONBOARD_SCORE), compliance_docs
                 ├─ Compute eligibility + commercial score → sellable status
                 ├─ Insert: supplier_evaluations (snapshot)
                 ├─ Insert: supplier_state_transitions (if state changed)
                 ├─ Update: suppliers (denormalized state)
                 └─ Retry up to 3x on NotFoundError (1s, 2s backoff)
```

---

## Step-by-Step Data Collection

### Step 1 — Identity & Core Profile
**Stored in: `suppliers` table**

| Field collected | Body key(s) | Column | Required |
|---|---|---|---|
| Full name | `contact_name` or `nombreCompleto` | `nombre_completo` | Yes |
| WhatsApp number | `phone` or `whatsappNumber` | `whatsapp_number` | Yes |
| Municipality | `municipio` | `municipio` | Yes |
| Department | `department` | `department` | No |
| Vereda (hamlet) | `vereda` | `vereda` | No |
| Supplier type | `supplier_type` or `supplierType` | `supplier_type` | No (default: FARMER) |
| Registered by | `officer_name` or `registeredBy` | `registered_by` | No |
| Consent | `consentGiven` | `consent_given` | No (default: true) |

**Unique constraint**: `whatsapp_number` — duplicate triggers HTTP 409.

---

### Step 2 — Farm Data
**Stored in: `farms` table**

| Field collected | Body key(s) | Column | Status |
|---|---|---|---|
| Primary crop | `primary_product` or `farm.cultivoPrincipal` | `cultivo_principal` | CONFIRMED |
| Variety | `harvest_months` or `farm.variedadCafe` | `variedad_cafe` | PARTIAL — field name mismatch (`harvest_months` mapped to variety) |
| Farm size (ha) | `farm_size_hectares` or `farm.hectareasProduccion` | `hectareas_produccion` | CONFIRMED |
| Annual volume (kg) | `annual_volume_kg` or `farm.volumenKgUltimaCosecha` | stored in economics | CONFIRMED |
| Plant age | `farm.edadPlantasAnos` | `edad_plantas_anos` | CONFIRMED |
| Harvests/year | `farm.cosechasPorAno` | `cosechas_por_ano` | CONFIRMED |
| Drying method | `farm.metodoSecado` | `metodo_secado` | CONFIRMED |
| Water access | `farm.accesoAgua` | `acceso_agua` | CONFIRMED |
| Years on farm | `farm.anosEnFinca` | `anos_en_finca` | CONFIRMED |
| Land tenure | `farm.tenenciaTierra` | `tenencia_tierra` | CONFIRMED |
| Technical assistance | `farm.asistenciaTecnica` | `asistencia_tecnica` | CONFIRMED |

---

### Step 3 — Economic Profile
**Stored in: `economics` table**

| Field collected | Body key(s) | Column | Status |
|---|---|---|---|
| Buyer type / export status | `currently_exporting` (yes/no) or `economics.tipoComprador` | `tipo_comprador` | CONFIRMED |
| Annual volume (kg) | `annual_volume_kg` | `volumen_kg_ultima_cosecha` | PARTIAL — schema integer, code passes as String |
| Price band | `economics.precioVentaBanda` | `precio_venta_banda` | CONFIRMED |
| Payment terms (days) | `economics.tiempoPagoDias` | `tiempo_pago_dias` | CONFIRMED |
| Current debt / working capital | `working_capital_needed` or `economics.deudaActual` | `deuda_actual` | CONFIRMED |
| Capital use | `economics.usoCapital` or `export_blocker` | `uso_capital` | CONFIRMED |
| Payment comfort | `economics.comodidadPagos` | `comodidad_pagos` | CONFIRMED |
| Dependents | `economics.personasDependientes` | `personas_dependientes` | CONFIRMED |
| Other income | `economics.otrasFuentesIngreso` | `otras_fuentes_ingreso` | CONFIRMED |
| Economic situation | `economics.situacionEconomica` | `situacion_economica` | CONFIRMED |
| Premium channel interest | `economics.interesCanalPremium` | `interes_canal_premium` | CONFIRMED |
| Knows export price | `economics.conocePrecioExportacion` | `conoce_precio_exportacion` | CONFIRMED |
| Has tried to export | `currently_exporting` or `economics.haIntentadoExportar` | `ha_intentado_exportar` | CONFIRMED |

---

### Step 4 — Extended Compliance Assessment
**Stored in: `interactions.metadata` (JSONB)**

These are NOT stored in `compliance_docs`. They are richer categorical answers captured once at onboarding.

| Field | Body key | Status |
|---|---|---|
| Officer code | `officer_code` | CONFIRMED |
| Department | `department` | CONFIRMED |
| Organic certified | `organic_certified` | CONFIRMED |
| RUT status (5-choice) | `has_rut` | CONFIRMED |
| Bank account (3-choice) | `has_bank_account` | CONFIRMED |
| Business structure | `business_structure` | CONFIRMED |
| Part of cooperative | `part_of_cooperative` | CONFIRMED |
| VUCE registered | `vuce_registered` | CONFIRMED |
| INVIMA required | `invima_required` | CONFIRMED |
| INVIMA approved | `invima_approved` | CONFIRMED |
| ICA registered | `ica_registered` | CONFIRMED |

> **Gap**: `ica_registered` here does NOT sync to `compliance_docs.ica_registro`. These are parallel records with no reconciliation.

---

### Step 5 — Compliance Docs Initialization (automatic)
**Stored in: `compliance_docs` table**

All boolean fields initialized to `false`. Done idempotently:
```sql
INSERT INTO compliance_docs (supplier_id) VALUES ($1)
ON CONFLICT (supplier_id) DO NOTHING;
```
Updating requires an explicit `UPDATE` by admin. No API endpoint exists for this yet.

---

### Step 6 — Interaction Log (automatic)
**Stored in: `interactions` table**

Type: `FORM_SUBMISSION`. Actor: officer name or `"SELF"`. Notes: `visit_notes` field or default text. Metadata: all Step 4 fields.

---

### Step 7 — AI Scoring (async, fire-and-forget)
**Writes to: `ai_outputs` table**

Triggered immediately after HTTP 201 response. Does NOT block the response.

| Behaviour | Detail |
|---|---|
| Model | `claude-haiku-4-5` (configurable via `ANTHROPIC_SCORING_MODEL`) |
| Input | Full supplier, farm, economics, compliance_docs rows as JSON |
| Output validation | `Number.isFinite(export_readiness_score)` — throws and retries if invalid |
| Retry policy | Max 3 attempts, exponential backoff: 1s → 2s → 4s, retries ALL errors |
| Failure handling | `logger.error` + Sentry capture after 3 failures — no silent drop |
| WhatsApp | Sent to supplier on success; failure is isolated (doesn't block insert) |
| Latency logging | `logger.info { supplierId, duration }` around Claude API call |

---

### Step 8 — Graduation Evaluation (async, after scoring)
**Writes to: `supplier_evaluations`, `supplier_state_transitions`, `suppliers`**

Triggered via `setImmediate` after onboarding response. Retries on `NotFoundError` (score not yet available) — up to 3 attempts (1s, 2s backoff).

| Action | Detail |
|---|---|
| Reads | `suppliers`, latest `ai_outputs` (ONBOARD_SCORE), `compliance_docs` |
| Computes | eligibilityStatus, sellableStatus, nextActions |
| Writes | `supplier_evaluations` snapshot (always), `supplier_state_transitions` (if state changed), `suppliers` update |
| Idempotency | Previous evaluation compared — transition only written if state changed |
| Threshold version | Always stamped (`v0_pre_buyer_calls`) |

---

## Who Can Access Onboarding Data

| Data | Self-registered supplier | Officer (registeredBy) | Admin | Public |
|---|---|---|---|---|
| suppliers row | — | At creation | Yes | Via `/suppliers` ⚠ (no auth) |
| farms / economics | — | At creation | Yes | — |
| compliance_docs | — | — | Yes | — |
| interactions | — | — | Yes | — |
| ai_outputs | — | — | Yes (admin-list) | — |
| evaluations | — | — | Yes | Via `/suppliers/:id/evaluations` ⚠ (no auth) |
| transitions | — | — | Yes | Via `/suppliers/:id/transitions` ⚠ (no auth) |

---

## What Triggers the Next Step

| Step | Trigger |
|---|---|
| HTTP 201 response | Sync inserts complete |
| AI scoring starts | Immediately after HTTP 201 (fire-and-forget) |
| Evaluation starts | `setImmediate` after score insert completes |
| Evaluation retry | `NotFoundError` — no ai_outputs row yet |
| State transition | `evaluateSupplier` detects state change from previous evaluation |
| WhatsApp | Successful ai_outputs insert |
| Admin publish | Explicit `POST /admin/suppliers/:id/publish` (requires SELLABLE state) |
