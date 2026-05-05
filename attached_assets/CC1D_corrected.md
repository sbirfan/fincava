# CC-1D — DIAN RUT Supplier Flow (Corrected v3)
**Fixes applied: D1 (import path depth 3→4 levels), D2 (route mounting location specified).**  
**Prerequisite: CC-1C verified — priority queue renders, all 4 admin endpoints pass.**  
**Date:** 2026-05-05

---

## Before You Start — Confirm from Step 0 Output

You need three confirmed facts from your Step 0 inspection before writing any code:

**Fact 1 — Supplier ID derivation from session**
Does `req.user` contain `supplierId` directly, or must you derive it from a join?
```bash
# Search for how other supplier-specific routes identify the current supplier:
grep -r "req.user\|supplierId\|supplier_id" artifacts/api-server/src/routes/suppliers.ts | head -30
```
If `req.user` has only `userId` (not `supplierId`), every route below must derive it:
```typescript
// Pattern A — if req.user.supplierId exists directly:
const supplierId = req.user.supplierId;

// Pattern B — if supplierId must be looked up (more common):
const supplierRow = await db.select({ id: suppliersTable.id })
  .from(suppliersTable)
  .where(eq(suppliersTable.userId, req.user.id))
  .limit(1);
if (!supplierRow.length) return res.status(403).json({ error: 'Not a supplier account' });
const supplierId = supplierRow[0].id;
```
Use whichever pattern applies. Replace every `[GET_SUPPLIER_ID]` placeholder below with the correct derivation.

**Fact 2 — Email helper signature**
Find the correct email function in `artifacts/api-server/src/lib/email.ts`:
```bash
grep -n "export\|async function\|const send" artifacts/api-server/src/lib/email.ts
```
Use whatever function exists. If no suitable function exists, create:
```typescript
// Add to artifacts/api-server/src/lib/email.ts
export async function sendAdminSupportAlert(
  supplierId: number,
  requirementCode: string,
  blocker?: string
): Promise<void> {
  // Use the existing email transport pattern in this file
  // Subject: `[FINCAVA] Supplier ${supplierId} needs assisted support: ${requirementCode}`
  // Body: blocker description or 'No blocker specified'
}
```

**Fact 3 — File upload pattern**
Find how existing routes handle file uploads:
```bash
grep -rn "objectStorage\|multer\|presigned\|upload" artifacts/api-server/src/routes/ | head -20
```
Use the same pattern for the RUT upload route. The implementation below uses presigned URLs (upload to storage, then POST the URL). Adjust to match the actual pattern.

---

## Task CC-1D: DIAN RUT Enablement Flow

### Supplier Auth Helper

First, check if a `requireSupplier` middleware exists. If not, create one:

```bash
grep -rn "requireSupplier" artifacts/api-server/src/
```

If it does not exist, add this to `artifacts/api-server/src/middleware/auth.ts` (or wherever `requireAdmin` is defined):

```typescript
// Ensures the authenticated user has an associated supplier record.
// Attaches supplierId to req for downstream use.
export const requireSupplier = async (
  req: Request, res: Response, next: NextFunction
) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  // Adjust table/column names to match actual schema
  const supplier = await db.select({ id: suppliersTable.id })
    .from(suppliersTable)
    .where(eq(suppliersTable.userId, req.user.id))
    .limit(1);

  if (!supplier.length) return res.status(403).json({ error: 'Supplier account required' });

  req.supplierId = supplier[0].id; // attach for downstream routes
  next();
};
```

Add `supplierId` to the Express `Request` type augmentation. Search for the existing declaration file first:
```bash
find artifacts/api-server/src -name "*.d.ts" | head -10
grep -rn "declare global\|namespace Express" artifacts/api-server/src/
```
Add `supplierId?: number` to the `Request` interface in whichever file augments Express types (commonly `artifacts/api-server/src/types/express.d.ts`).

### New Supplier Compliance Routes

Create `artifacts/api-server/src/routes/supplierCompliance.ts`:

```typescript
// artifacts/api-server/src/routes/supplierCompliance.ts
// CC-1D: Supplier-facing compliance flows (DIAN RUT — Phase I)

import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
// D1 FIX: supplierCompliance.ts lives at artifacts/api-server/src/routes/supplierCompliance.ts
// Path depth from routes/: routes → src → api-server → artifacts → root = 4 levels (../../../../)
// The previous version used '../../../' (3 levels) which resolves to artifacts/, not the root.
// If the codebase imports lib/db via workspace package name (e.g. '@workspace/db'),
// use that pattern instead — check how other files in routes/ import from lib/db.
import { db } from '../../../../lib/db/src'; // adjust to actual db import path or package name
import {
  supplierRequirementStatus,
  complianceDocumentsV2,
  managedServiceCases,
} from '../../../../lib/db/src/schema/compliance-concierge';
// Path depth: routes/ → src/ → api-server/ → artifacts/ → root (4 levels)
// Use workspace package pattern if other route files use '@workspace/db'
import { requireAuth } from '../middleware/auth';
import { requireSupplier } from '../middleware/auth'; // created above
import { logger } from '../lib/logger'; // use actual import pattern from Step 0
import { sendAdminSupportAlert } from '../lib/email'; // use actual or create per Fact 2

const router = Router();

// ── VALID STATES ──────────────────────────────────────────────────────────
const VALID_STATES = [
  'not_started', 'not_sure', 'self_serve_in_progress', 'assisted_in_progress',
  'managed_service_candidate', 'submitted', 'needs_fix',
  'conditionally_approved', 'verified', 'rejected',
] as const;

// ── GET /api/supplier/compliance/dian-rut/status ─────────────────────────
// Returns current DIAN RUT requirement status for the authenticated supplier.
router.get('/dian-rut/status', requireAuth, requireSupplier, async (req, res) => {
  const supplierId = req.supplierId!; // set by requireSupplier

  let statusRows = await db.select()
    .from(supplierRequirementStatus)
    .where(and(
      eq(supplierRequirementStatus.supplierId, supplierId),
      eq(supplierRequirementStatus.requirementCode, 'DIAN_RUT')
    ))
    .limit(1);

  // Auto-create on first access
  if (!statusRows.length) {
    const [created] = await db.insert(supplierRequirementStatus)
      .values({
        supplierId,
        requirementCode: 'DIAN_RUT',
        agency: 'DIAN',
        state: 'not_started',
      })
      .returning();
    statusRows = [created];
  }

  const latestDoc = await db.select()
    .from(complianceDocumentsV2)
    .where(and(
      eq(complianceDocumentsV2.supplierId, supplierId),
      eq(complianceDocumentsV2.requirementCode, 'DIAN_RUT')
    ))
    .orderBy(desc(complianceDocumentsV2.createdAt))
    .limit(1);

  res.json({ status: statusRows[0], latestDocument: latestDoc[0] ?? null });
});

// ── POST /api/supplier/compliance/dian-rut/answer ────────────────────────
// Supplier answers: has_rut | no_rut | not_sure
// N4 FIX: has_rut maps to 'self_serve_in_progress' (upload-ready state)
//         NOT to 'has_rut' which is not a valid state in the SoT.
const answerSchema = z.object({
  answer: z.enum(['has_rut', 'no_rut', 'not_sure']),
});

const ANSWER_STATE_MAP: Record<string, typeof VALID_STATES[number]> = {
  has_rut:  'self_serve_in_progress',  // supplier has RUT → go to upload screen
  no_rut:   'self_serve_in_progress',  // supplier needs RUT → go to self-serve guide
  not_sure: 'not_sure',               // supplier unclear → assisted path
};

// We need to differentiate has_rut vs no_rut in the UI without storing 'has_rut' as a state.
// Store the answer as selectedMode instead:
const ANSWER_MODE_MAP: Record<string, string> = {
  has_rut:  'has_rut_ready_to_upload',
  no_rut:   'no_rut_self_serve',
  not_sure: 'assisted',
};

router.post('/dian-rut/answer', requireAuth, requireSupplier, async (req, res) => {
  const supplierId = req.supplierId!;

  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid answer', details: parsed.error.issues });

  const { answer } = parsed.data;
  const newState      = ANSWER_STATE_MAP[answer];
  const selectedMode  = ANSWER_MODE_MAP[answer];

  await db.update(supplierRequirementStatus)
    .set({ state: newState, selectedMode, updatedAt: new Date() })
    .where(and(
      eq(supplierRequirementStatus.supplierId, supplierId),
      eq(supplierRequirementStatus.requirementCode, 'DIAN_RUT')
    ));

  res.json({ ok: true, newState, selectedMode });
});

// ── POST /api/supplier/compliance/dian-rut/upload ────────────────────────
// Supplier uploads RUT document.
// Uses the objectStorage pattern from this codebase — adjust to match actual pattern.
router.post('/dian-rut/upload', requireAuth, requireSupplier, async (req, res) => {
  const supplierId = req.supplierId!;

  // Use the actual upload pattern from objectStorage.ts.
  // Option A (presigned URL pattern): client uploads directly to storage,
  //   then POSTs the resulting file_url to this endpoint.
  // Option B (server-side multipart): use existing multer/upload middleware.
  // Whichever pattern exists in the codebase — use that.
  const fileUrl = req.body.fileUrl as string | undefined;
  if (!fileUrl) return res.status(400).json({ error: 'fileUrl is required' });

  const [doc] = await db.insert(complianceDocumentsV2)
    .values({
      supplierId,
      requirementCode: 'DIAN_RUT',
      documentType:    'RUT',
      fileUrl,
      uploadedBy:      'supplier',
      reviewStatus:    'pending',
    })
    .returning();

  await db.update(supplierRequirementStatus)
    .set({ state: 'submitted', updatedAt: new Date() })
    .where(and(
      eq(supplierRequirementStatus.supplierId, supplierId),
      eq(supplierRequirementStatus.requirementCode, 'DIAN_RUT')
    ));

  res.json({ ok: true, documentId: doc.id });
});

// ── POST /api/supplier/compliance/dian-rut/support ───────────────────────
// Supplier requests assisted support. Triggers admin alert (fire-and-forget).
const supportSchema = z.object({
  blocker: z.string().max(500).optional(),
});

router.post('/dian-rut/support', requireAuth, requireSupplier, async (req, res) => {
  const supplierId = req.supplierId!;

  const parsed = supportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { blocker } = parsed.data;

  await db.update(supplierRequirementStatus)
    .set({
      state:        'assisted_in_progress',
      internalNote: blocker ?? 'Supplier requested support',
      updatedAt:    new Date(),
    })
    .where(and(
      eq(supplierRequirementStatus.supplierId, supplierId),
      eq(supplierRequirementStatus.requirementCode, 'DIAN_RUT')
    ));

  // N3 FIX: fire-and-forget uses logger.error, NOT console.error
  sendAdminSupportAlert(supplierId, 'DIAN_RUT', blocker)
    .catch(err => logger.error({ err }, 'sendAdminSupportAlert failed'));

  res.json({
    ok: true,
    message: 'Un asesor de FINCAVA se pondrá en contacto contigo pronto.',
  });
});

export default router;
```

### Register the New Route File

**D2 FIX:** Check `artifacts/api-server/src/routes/index.ts` first — this is where other supplier
routes are likely imported and mounted. Look for where `suppliers.ts` is imported to confirm
the correct file and mounting style:

```bash
grep -rn "suppliers\|supplier" artifacts/api-server/src/routes/index.ts | head -20
# If routes/index.ts doesn't exist, check the main entry point:
grep -rn "suppliers\|supplierRouter" artifacts/api-server/src/index.ts | head -20
```

Once you have confirmed the file and mounting style, add the new router following the same pattern:

```typescript
import supplierComplianceRouter from './supplierCompliance';

// Mount alongside other supplier routes — match the style used for the existing suppliers router.
// Common patterns:
router.use('/supplier/compliance', supplierComplianceRouter);
// or:
// app.use('/api/supplier/compliance', supplierComplianceRouter);
```

The routes inside `supplierCompliance.ts` are defined relative to the router
(e.g. `/dian-rut/status`), so the final URL is determined by where the router is mounted.
Target URL: `GET /api/supplier/compliance/dian-rut/status`.

### Supplier UI — DIAN RUT Flow

Create `artifacts/fincava/src/pages/supplier/compliance/DianRutFlow.tsx`:

```tsx
// artifacts/fincava/src/pages/supplier/compliance/DianRutFlow.tsx
// All copy is Spanish. No English in supplier-facing UI.

import { useEffect, useState } from 'react';

type RutState =
  | 'not_started' | 'not_sure'
  | 'self_serve_in_progress' | 'assisted_in_progress'
  | 'submitted' | 'needs_fix' | 'verified';

interface StatusResponse {
  status: {
    state: RutState;
    selectedMode: string | null;
    visibleNote: string | null;
  };
  latestDocument: { fileUrl: string; reviewStatus: string } | null;
}

export default function DianRutFlow() {
  const [data, setData]       = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState('');

  const reload = async () => {
    setLoading(true);
    const res = await fetch('/api/supplier/compliance/dian-rut/status');
    setData(await res.json());
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const answer = async (ans: 'has_rut' | 'no_rut' | 'not_sure') => {
    await fetch('/api/supplier/compliance/dian-rut/answer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: ans }),
    });
    reload();
  };

  const upload = async () => {
    if (!fileUrl) return;
    await fetch('/api/supplier/compliance/dian-rut/upload', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl }),
    });
    reload();
  };

  const requestSupport = async (blocker?: string) => {
    await fetch('/api/supplier/compliance/dian-rut/support', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocker }),
    });
    reload();
  };

  if (loading || !data) return <p className="p-4 text-gray-400">Cargando…</p>;

  const { state, selectedMode, visibleNote } = data.status;

  // ── Screen 1: not_started ──────────────────────────────────────────────
  if (state === 'not_started') return (
    <div className="p-4 max-w-md">
      <h2 className="text-lg font-bold mb-2">Tu registro DIAN (RUT)</h2>
      <p className="text-gray-600 mb-4 text-sm">
        El RUT es tu registro ante la DIAN. Lo usamos para revisar si puedes
        avanzar hacia compradores formales.
      </p>
      <div className="flex flex-col gap-3">
        <button onClick={() => answer('has_rut')}
          className="bg-green-600 text-white px-4 py-3 rounded font-medium">
          Sí, tengo RUT
        </button>
        <button onClick={() => answer('no_rut')}
          className="border border-gray-300 px-4 py-3 rounded font-medium">
          No tengo RUT
        </button>
        <button onClick={() => answer('not_sure')}
          className="text-gray-500 text-sm underline">
          No estoy seguro
        </button>
      </div>
    </div>
  );

  // ── Screen 2A: upload-ready (has RUT — selectedMode = has_rut_ready_to_upload) ──
  if (state === 'self_serve_in_progress' && selectedMode === 'has_rut_ready_to_upload') return (
    <div className="p-4 max-w-md">
      <h2 className="text-lg font-bold mb-2">Sube tu RUT</h2>
      <p className="text-gray-600 mb-4 text-sm">
        Sube una foto clara donde se vea tu nombre, NIT y actividad económica.
        Puede ser el PDF del portal DIAN o una foto nítida.
      </p>
      {/* In the actual implementation, wire fileUrl to the objectStorage upload result */}
      <input
        type="text" placeholder="URL del archivo subido"
        value={fileUrl} onChange={e => setFileUrl(e.target.value)}
        className="border p-2 w-full mb-3 rounded text-sm"
      />
      <button onClick={upload} disabled={!fileUrl}
        className="bg-green-600 text-white px-4 py-3 rounded w-full font-medium disabled:opacity-40">
        Enviar RUT
      </button>
      <button onClick={() => requestSupport('Necesita ayuda para subir el RUT')}
        className="text-gray-500 text-sm underline mt-3 w-full text-center block">
        Pedir ayuda
      </button>
    </div>
  );

  // ── Screen 2B: self-serve guide (no RUT — selectedMode = no_rut_self_serve) ──
  if (state === 'self_serve_in_progress' && selectedMode === 'no_rut_self_serve') return (
    <div className="p-4 max-w-md">
      <h2 className="text-lg font-bold mb-2">Cómo sacar tu RUT</h2>
      <p className="text-gray-600 mb-3 text-sm">Para inscribirte necesitas:</p>
      <ul className="text-sm text-gray-700 mb-4 list-disc pl-4 space-y-1">
        <li>Cédula de ciudadanía</li>
        <li>Correo electrónico activo</li>
        <li>Número de celular</li>
        <li>Dirección completa</li>
        <li>Actividad relacionada con café o cacao (CIIU 0121 o 0122)</li>
      </ul>
      <a href="https://www.dian.gov.co" target="_blank" rel="noreferrer"
        className="block bg-blue-600 text-white text-center px-4 py-3 rounded mb-3 font-medium">
        Ir al portal DIAN
      </a>
      <button onClick={() => answer('has_rut')}
        className="border border-gray-300 px-4 py-3 rounded w-full mb-2 font-medium">
        Ya tengo mi RUT — subirlo
      </button>
      <button onClick={() => requestSupport('No puede completar RUT por su cuenta')}
        className="text-gray-500 text-sm underline w-full text-center">
        Necesito ayuda
      </button>
    </div>
  );

  // ── Screen 2C: not_sure ────────────────────────────────────────────────
  if (state === 'not_sure') return (
    <div className="p-4 max-w-md">
      <h2 className="text-lg font-bold mb-2">Te orientamos</h2>
      <p className="text-gray-600 mb-4 text-sm">
        FINCAVA revisará contigo cuál paso aplica a tu caso.
      </p>
      <button onClick={() => requestSupport()}
        className="bg-green-600 text-white px-4 py-3 rounded w-full font-medium">
        Solicitar orientación
      </button>
    </div>
  );

  // ── Screen 3: submitted ────────────────────────────────────────────────
  if (state === 'submitted') return (
    <div className="p-4 max-w-md">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="font-bold text-yellow-800">En revisión</p>
        <p className="text-sm text-yellow-700 mt-1">
          Tu RUT fue enviado. FINCAVA lo revisará en 1-2 días hábiles.
        </p>
      </div>
    </div>
  );

  // ── Screen 4: needs_fix ────────────────────────────────────────────────
  if (state === 'needs_fix') return (
    <div className="p-4 max-w-md">
      <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
        <p className="font-bold text-red-800">Corrección necesaria</p>
        {visibleNote && (
          <p className="text-sm text-red-700 mt-1">{visibleNote}</p>
        )}
      </div>
      <button onClick={() => answer('has_rut')}
        className="bg-green-600 text-white px-4 py-3 rounded w-full font-medium">
        Subir nuevo documento
      </button>
    </div>
  );

  // ── Screen 5: verified ────────────────────────────────────────────────
  if (state === 'verified') return (
    <div className="p-4 max-w-md">
      <div className="bg-green-50 border border-green-200 rounded p-4">
        <p className="font-bold text-green-800">✓ RUT verificado</p>
        <p className="text-sm text-green-700 mt-1">
          Siguiente paso: contexto ICA
        </p>
      </div>
    </div>
  );

  // Fallback — assisted_in_progress or other states
  return (
    <div className="p-4 max-w-md">
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="font-bold text-blue-800">En proceso</p>
        <p className="text-sm text-blue-700 mt-1">
          Un asesor de FINCAVA está revisando tu caso y se pondrá en contacto pronto.
        </p>
      </div>
    </div>
  );
}
```

### Route Registration (Frontend)

Open `artifacts/fincava/src/App.tsx`. Add:
```tsx
import DianRutFlow from './pages/supplier/compliance/DianRutFlow';
// ...
<Route path="/supplier/compliance/dian-rut" component={DianRutFlow} />
```

### Acceptance Criteria for CC-1D

- [ ] `GET /api/supplier/compliance/dian-rut/status` auto-creates row on first call
- [ ] `POST .../answer` with `has_rut` → state becomes `self_serve_in_progress`, selectedMode `has_rut_ready_to_upload`
- [ ] `POST .../answer` with `no_rut` → state becomes `self_serve_in_progress`, selectedMode `no_rut_self_serve`
- [ ] `POST .../answer` with `not_sure` → state becomes `not_sure`
- [ ] `POST .../upload` creates `compliance_documents_v2` row, sets state to `submitted`
- [ ] `POST .../support` sets state to `assisted_in_progress`, fires email (fire-and-forget, non-blocking)
- [ ] All 4 endpoints return 400 for invalid bodies (Zod)
- [ ] UI renders correct screen for each state
- [ ] Spanish copy only in UI — no English text in supplier-facing components
- [ ] `pnpm tsc --noEmit` passes clean

**Stop here. Report results. CC-1E prompt follows.**
