# CC-1B — Corrected Replit Prompt (v4)
**Fixes applied: B1 (compliance_enablement_flows duplicate seed) + all prior fixes (N1, N2, N3, N4 + 10 original critical errors).**  
**Date:** 2026-05-05

---

## BEFORE YOU WRITE A SINGLE FILE — Step 0: Codebase Inspection

Run these checks first and report back the answers. Do not create any files until Step 0 is complete.

```
1. Open artifacts/api-server/src/index.ts
   → Find where the server startup async block is (the function that calls app.listen)
   → Is there any existing DDL or migration execution block? Copy it here.
   → What imports are at the top of the file (fs, path, sql)?

2. Open lib/db/src/schema/index.ts (or equivalent schema barrel file)
   → What is the exact export pattern (export * from './...' or named exports)?
   → What is the suppliers table export name?

3. Search for 'sellable_status' in lib/db/src/schema/
   → What is the actual column name for the graduation/sellable state on suppliers?
   → What is the actual column for the supplier's display name (farm name, business name)?
   → What is the actual column name for AI quality score used in supplier_evaluations?

4. Open artifacts/api-server/src/middleware/ (or lib/auth.ts, lib/session.ts)
   → What does req.user look like after authentication? Does it have supplierId directly,
     or does it have userId that must be joined to a suppliers table?
   → What is the name of the existing supplier auth check (if any)?

5. Open artifacts/api-server/src/lib/objectStorage.ts (or equivalent)
   → What is the pattern for file uploads? Presigned URLs? Direct multipart?
   → What function do other routes use to handle file uploads?

6. Open artifacts/api-server/src/lib/email.ts (or lib/emailService.ts)
   → What email helper functions exist? Copy the function signatures.

7. Open artifacts/api-server/src/lib/logger.ts (or equivalent pino setup)
   → What is the import and usage pattern? (e.g., import logger from '../lib/logger')

8. Check if lib/db/migrations/ directory exists. If not, note that it must be created.

9. Open db/compliance_requirements table (via schema or seed file)
   → Does this table have a scope, country, or destination column to filter on?
   → How many rows are in the Phase I (Colombian) subset?
```

**Report all answers before proceeding. Then continue from Step 1.**

---

## Step 1 — Create Migration File

Create the directory if it doesn't exist, then create the migration file:

**File:** `lib/db/migrations/cc1_compliance_concierge.sql`

```sql
-- CC-1 Compliance Concierge: Additive Layer
-- Architecture: CC-ARCH-1 — No existing table is modified.
-- All tables below are new. Running this file twice is safe (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS supplier_requirement_status (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  requirement_code TEXT NOT NULL,
  -- Valid codes: 'DIAN_RUT' | 'ICA_CONTEXT' | 'FNC_COFFEE'
  agency TEXT NOT NULL,
  -- Valid agencies: 'DIAN' | 'ICA' | 'FNC'
  state TEXT NOT NULL DEFAULT 'not_started',
  -- Valid states: not_started | not_sure | self_serve_in_progress | assisted_in_progress
  --               managed_service_candidate | submitted | needs_fix | conditionally_approved
  --               verified | rejected
  selected_mode TEXT,
  -- null | self_serve | assisted | managed
  admin_required BOOLEAN NOT NULL DEFAULT false,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  visible_note TEXT,
  internal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, requirement_code)
);

CREATE TABLE IF NOT EXISTS compliance_enablement_flows (
  id SERIAL PRIMARY KEY,
  requirement_code TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  mode TEXT NOT NULL,
  -- self_serve | assisted | managed
  language TEXT NOT NULL DEFAULT 'es',
  title TEXT NOT NULL,
  guidance TEXT NOT NULL,
  expected_output TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requirement_code, step_order)
  -- B1 FIX: This UNIQUE constraint is required so that the ON CONFLICT DO NOTHING
  -- in the seed block below actually suppresses duplicates. Without it, PostgreSQL
  -- has no constraint to conflict on, so every server restart inserts 5 more rows.
);

CREATE TABLE IF NOT EXISTS compliance_documents_v2 (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  requirement_code TEXT NOT NULL,
  document_type TEXT NOT NULL,
  evidence_type TEXT,
  file_url TEXT NOT NULL,
  extracted_fields_json JSONB,
  validation_results_json JSONB,
  ocr_confidence INTEGER CHECK (ocr_confidence BETWEEN 0 AND 100),
  uploaded_by TEXT NOT NULL DEFAULT 'supplier',
  review_status TEXT NOT NULL DEFAULT 'pending',
  -- pending | accepted | needs_fix | rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_compliance_reviews (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  requirement_code TEXT NOT NULL,
  document_id INTEGER REFERENCES compliance_documents_v2(id),
  decision TEXT NOT NULL,
  -- verified | needs_fix | conditionally_approved | rejected | escalated
  reason_code TEXT,
  visible_note TEXT,
  internal_note TEXT,
  reviewer_id INTEGER,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buyer_visibility_signals (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  requirement_code TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT false,
  badge_label TEXT,
  disclaimer TEXT,
  enabled_by INTEGER,
  enabled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, requirement_code)
);

CREATE TABLE IF NOT EXISTS supplier_export_mode (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_category TEXT NOT NULL DEFAULT 'coffee',
  -- coffee | cacao
  mode TEXT NOT NULL,
  -- direct | intermediary | not_sure
  confidence TEXT NOT NULL DEFAULT 'self_declared',
  -- self_declared | admin_confirmed | admin_overridden
  verified_by INTEGER,
  partner_name TEXT,
  partner_role TEXT,
  evidence_status TEXT DEFAULT 'none',
  -- none | uploaded | verified
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS managed_service_cases (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  requirement_code TEXT NOT NULL,
  package_type TEXT NOT NULL,
  -- rut_registration | ica_preparation | fnc_registration
  consent_record TEXT,
  consent_at TIMESTAMPTZ,
  fee_status TEXT NOT NULL DEFAULT 'none',
  -- none | quoted | invoiced | paid — payment logic is Phase III only
  assigned_staff_id INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_srs_supplier   ON supplier_requirement_status(supplier_id);
CREATE INDEX IF NOT EXISTS idx_srs_state       ON supplier_requirement_status(state);
CREATE INDEX IF NOT EXISTS idx_cef_req         ON compliance_enablement_flows(requirement_code);
CREATE INDEX IF NOT EXISTS idx_cdv2_supplier   ON compliance_documents_v2(supplier_id);
CREATE INDEX IF NOT EXISTS idx_acr_supplier    ON admin_compliance_reviews(supplier_id);
CREATE INDEX IF NOT EXISTS idx_bvs_visible     ON buyer_visibility_signals(visible);
CREATE INDEX IF NOT EXISTS idx_sem_supplier    ON supplier_export_mode(supplier_id);
CREATE INDEX IF NOT EXISTS idx_msc_supplier    ON managed_service_cases(supplier_id);

-- ── PHASE I SEED DATA: DIAN RUT enablement steps ────────────────────────
-- Seed content for compliance_enablement_flows (Spanish, self_serve mode)
-- Phase I only covers DIAN_RUT. ICA and FNC seeded in CC-2 / CC-3.
-- ON CONFLICT DO NOTHING is safe here because UNIQUE(requirement_code, step_order) is
-- defined above. Re-running the server will not produce duplicate rows.
INSERT INTO compliance_enablement_flows
  (requirement_code, step_order, mode, language, title, guidance, expected_output)
VALUES
  ('DIAN_RUT', 1, 'self_serve', 'es',
   'Ingresa al portal DIAN',
   'Entra a https://www.dian.gov.co y busca la opción "Inscripción RUT" en el menú principal.',
   'Tienes el portal de la DIAN abierto en tu navegador o celular.'),
  ('DIAN_RUT', 2, 'self_serve', 'es',
   'Selecciona tu tipo de persona',
   'Elige "Persona Natural" si eres un agricultor individual. Elige "Persona Jurídica" solo si tienes empresa legalmente constituida.',
   'Has seleccionado el tipo de persona correcto.'),
  ('DIAN_RUT', 3, 'self_serve', 'es',
   'Reúne los documentos necesarios',
   'Necesitas: cédula de ciudadanía, correo electrónico activo, número de celular, dirección completa, y la actividad económica relacionada con café o cacao (código CIIU 0121 o 0122).',
   'Tienes todos los documentos listos.'),
  ('DIAN_RUT', 4, 'self_serve', 'es',
   'Completa el formulario y descarga tu RUT',
   'Llena el formulario con tus datos. Al finalizar, descarga el PDF de tu RUT. Asegúrate de que se vean claramente tu nombre, NIT y actividad económica.',
   'Tienes el PDF de tu RUT descargado.'),
  ('DIAN_RUT', 5, 'self_serve', 'es',
   'Sube tu RUT a Fincava',
   'Regresa a esta pantalla y sube el PDF o una foto clara de tu RUT. FINCAVA lo revisará en 1-2 días hábiles.',
   'Tu RUT fue enviado y está en revisión.')
ON CONFLICT DO NOTHING;
```

---

## Step 2 — Create Drizzle Schema File

**IMPORTANT:** Do NOT append to any existing schema file. Create a new file:

**File:** `lib/db/src/schema/compliance-concierge.ts`

```typescript
// CC-1 Compliance Concierge — Additive Layer Schema
// CC-ARCH-1: No existing table is altered. This file only adds new tables.

import {
  pgTable, serial, integer, text, boolean, timestamp, jsonb, uniqueIndex
} from 'drizzle-orm/pg-core';
// N1 FIX: actual export name from lib/db/src/schema/suppliers.ts is suppliersTable, not suppliers.
// If Step 0 revealed a different export name, adjust this import accordingly.
import { suppliersTable } from './suppliers';

export const supplierRequirementStatus = pgTable(
  'supplier_requirement_status',
  {
    id: serial('id').primaryKey(),
    supplierId: integer('supplier_id').notNull().references(() => suppliersTable.id, { onDelete: 'cascade' }),
    requirementCode: text('requirement_code').notNull(),
    agency: text('agency').notNull(),
    state: text('state').notNull().default('not_started'),
    selectedMode: text('selected_mode'),
    adminRequired: boolean('admin_required').notNull().default(false),
    confidenceScore: integer('confidence_score'),
    visibleNote: text('visible_note'),
    internalNote: text('internal_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    supplierRequirementUnique: uniqueIndex('srs_supplier_req_unique').on(
      table.supplierId, table.requirementCode
    ),
  })
);

// B1 FIX: complianceEnablementFlows now uses the two-argument pgTable form with uniqueIndex.
// This mirrors the UNIQUE(requirement_code, step_order) constraint in the SQL DDL.
// Without this, the Drizzle schema is out of sync with the DB and ON CONFLICT DO NOTHING
// in the seed has nothing to act on — causing 5 duplicate rows per server restart.
export const complianceEnablementFlows = pgTable(
  'compliance_enablement_flows',
  {
    id: serial('id').primaryKey(),
    requirementCode: text('requirement_code').notNull(),
    stepOrder: integer('step_order').notNull(),
    mode: text('mode').notNull(),
    language: text('language').notNull().default('es'),
    title: text('title').notNull(),
    guidance: text('guidance').notNull(),
    expectedOutput: text('expected_output'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cefReqStepUnique: uniqueIndex('cef_req_step_unique').on(
      table.requirementCode, table.stepOrder
    ),
  })
);

export const complianceDocumentsV2 = pgTable('compliance_documents_v2', {
  id: serial('id').primaryKey(),
  supplierId: integer('supplier_id').notNull().references(() => suppliersTable.id, { onDelete: 'cascade' }),
  requirementCode: text('requirement_code').notNull(),
  documentType: text('document_type').notNull(),
  evidenceType: text('evidence_type'),
  fileUrl: text('file_url').notNull(),
  extractedFieldsJson: jsonb('extracted_fields_json'),
  validationResultsJson: jsonb('validation_results_json'),
  ocrConfidence: integer('ocr_confidence'),
  uploadedBy: text('uploaded_by').notNull().default('supplier'),
  reviewStatus: text('review_status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adminComplianceReviews = pgTable('admin_compliance_reviews', {
  id: serial('id').primaryKey(),
  supplierId: integer('supplier_id').notNull().references(() => suppliersTable.id, { onDelete: 'cascade' }),
  requirementCode: text('requirement_code').notNull(),
  documentId: integer('document_id').references(() => complianceDocumentsV2.id),
  decision: text('decision').notNull(),
  reasonCode: text('reason_code'),
  visibleNote: text('visible_note'),
  internalNote: text('internal_note'),
  reviewerId: integer('reviewer_id'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const buyerVisibilitySignals = pgTable(
  'buyer_visibility_signals',
  {
    id: serial('id').primaryKey(),
    supplierId: integer('supplier_id').notNull().references(() => suppliersTable.id, { onDelete: 'cascade' }),
    requirementCode: text('requirement_code').notNull(),
    visible: boolean('visible').notNull().default(false),
    badgeLabel: text('badge_label'),
    disclaimer: text('disclaimer'),
    enabledBy: integer('enabled_by'),
    enabledAt: timestamp('enabled_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bvsSupplierReqUnique: uniqueIndex('bvs_supplier_req_unique').on(
      table.supplierId, table.requirementCode
    ),
  })
);

export const supplierExportMode = pgTable('supplier_export_mode', {
  id: serial('id').primaryKey(),
  supplierId: integer('supplier_id').notNull().references(() => suppliersTable.id, { onDelete: 'cascade' }),
  productCategory: text('product_category').notNull().default('coffee'),
  mode: text('mode').notNull(),
  confidence: text('confidence').notNull().default('self_declared'),
  verifiedBy: integer('verified_by'),
  partnerName: text('partner_name'),
  partnerRole: text('partner_role'),
  evidenceStatus: text('evidence_status').default('none'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const managedServiceCases = pgTable('managed_service_cases', {
  id: serial('id').primaryKey(),
  supplierId: integer('supplier_id').notNull().references(() => suppliersTable.id, { onDelete: 'cascade' }),
  requirementCode: text('requirement_code').notNull(),
  packageType: text('package_type').notNull(),
  consentRecord: text('consent_record'),
  consentAt: timestamp('consent_at', { withTimezone: true }),
  feeStatus: text('fee_status').notNull().default('none'),
  assignedStaffId: integer('assigned_staff_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

---

## Step 3 — Register Schema Export

Open `lib/db/src/schema/index.ts`. Add this export line at the end (do not modify anything else):

```typescript
export * from './compliance-concierge';
```

---

## Step 4 — Wire Migration into Server Startup

Open `artifacts/api-server/src/index.ts`.

Add these imports at the top if they are not already present:
```typescript
import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';
```

Add the logger import if not already present (use whatever the existing pino logger import is in this file — look at other files in the same directory for the pattern, e.g. `import { logger } from '../lib/logger'`).

Then, inside the server startup async block — **after any existing DB initialization and before `app.listen()`** — add:

```typescript
// CC-1 Compliance Concierge — additive tables (idempotent)
try {
  // N2 FIX: __dirname at runtime = .../artifacts/api-server/src
  // Monorepo root is THREE levels up: src → api-server → artifacts → root
  // Therefore the correct path uses '../../../' not '../../'
  const cc1SqlPath = path.resolve(__dirname, '../../../lib/db/migrations/cc1_compliance_concierge.sql');
  const cc1Sql = fs.readFileSync(cc1SqlPath, 'utf-8');
  await db.execute(sql.raw(cc1Sql));
  logger.info('[CC-1] Compliance Concierge tables ready');
} catch (err) {
  logger.error({ err }, '[CC-1] Migration failed — check path resolution');
  throw err; // do not swallow: this is a startup blocker
}
```

**IMPORTANT on path resolution:** Log `__dirname` on first run to confirm the path. If you get ENOENT, adjust the number of `../` levels.

---

## Step 5 — Verify

1. **Restart the Replit dev workflow** (do not run `pnpm dev` from terminal — use the Run button or workflow)
2. Check the console for `[CC-1] Compliance Concierge tables ready`
3. Check for `[CC-1] Migration failed` — if you see it, fix the path and restart
4. Run `pnpm tsc --noEmit` from the monorepo root — must pass with zero errors
5. In the Neon dashboard, confirm all 7 tables exist:
   - `supplier_requirement_status`
   - `compliance_enablement_flows` (confirm **exactly 5 rows** — re-running must not add more)
   - `compliance_documents_v2`
   - `admin_compliance_reviews`
   - `buyer_visibility_signals`
   - `supplier_export_mode`
   - `managed_service_cases`
6. Confirm UNIQUE constraints exist on:
   - `supplier_requirement_status(supplier_id, requirement_code)`
   - `compliance_enablement_flows(requirement_code, step_order)`
   - `buyer_visibility_signals(supplier_id, requirement_code)`

---

## HARD RULES

- Do NOT modify `compliance_docs`, `compliance_requirements`, `ai_outputs`, the `suppliers` table, or the graduation machine
- `CREATE TABLE IF NOT EXISTS` — idempotent, safe to re-run
- Do NOT generate a Drizzle migration file — use direct SQL execution only
- Do NOT use `console.log` — use `logger.info` / `logger.error`
- Do NOT use `await` on email sends — always `.catch(err => logger.error({ err }, 'email send failed'))` (fire-and-forget; N3 fix: `console.error` is also banned)

---

## When CC-1B is Done

Report:
1. All 7 tables confirmed in Neon — include the exact row count for `compliance_enablement_flows` (must be exactly 5)
2. `pnpm tsc --noEmit` result (pass or errors)
3. The resolved `__dirname` path (so we can confirm CC-1C path references)
4. The actual `req.user` shape for supplier sessions (from your Step 0 inspection)
5. The actual column name for graduation status and supplier display name on the `suppliers` table

**CC-1C prompt will follow immediately after this report.**
