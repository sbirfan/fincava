// scripts/src/backfill-cc-requirements.ts
//
// ONE-TIME migration script — run before Phase 3 ships.
//
// Purpose:
//   Suppliers scored before CC-1A shipped have compliance_docs or ai_outputs rows
//   but no supplier_requirement_status rows. Phase 3 will gate eligibility on
//   supplier_requirement_status — without this backfill, pre-CC-1A suppliers have
//   no rows and could pass eligibility silently.
//
// Philosophy (gaps-only):
//   supplier_requirement_status is a REMEDIATION tracker. We only create a row
//   when a gap exists (boolean = false / gap code present). A supplier who already
//   holds the document has nothing to remediate — no row is needed for them.
//   Phase 3's eligibility gate: "no requirement rows exist in a non-terminal state"
//   (i.e. all rows that do exist are verified/conditionally_approved).
//
// Safety:
//   - onConflictDoNothing everywhere — officer progress is NEVER overwritten.
//   - Read-only until INSERT — safe to inspect in --dry-run mode first.
//   - Idempotent — safe to run multiple times.
//
// Two phases:
//   Phase A — compliance_docs boolean columns (primary source):
//     boolean = false → seed requirementCode as state "not_started"
//     boolean = true  → skip (supplier is already compliant, nothing to track)
//
//   Phase B — ai_outputs.compliance_gaps string (fallback for suppliers who were
//     scored but have no compliance_docs row at all):
//     gap code present → seed as state "not_started"
//
// Run:
//   pnpm --filter @workspace/scripts run backfill:cc-requirements              # live
//   pnpm --filter @workspace/scripts run backfill:cc-requirements -- --dry-run  # inspect only
//
// Verify after run:
//   SELECT supplier_id, requirement_code, state
//   FROM supplier_requirement_status ORDER BY supplier_id;
//
//   SELECT COUNT(*) FROM supplier_requirement_status;
//   SELECT COUNT(*) FROM compliance_docs
//     WHERE rut_dian = false OR ica_registro = false
//        OR fitosanitario_cert = false OR dian_exportador = false;
//   -- Both counts should be >= (Phase B suppliers may add more rows).

import { db } from "@workspace/db";
import {
  suppliersTable,
  complianceDocsTable,
  aiOutputsTable,
  supplierRequirementStatusTable,
} from "@workspace/db";
import { eq, notExists, and, desc } from "drizzle-orm";

const DRY_RUN = process.argv.includes("--dry-run");

// Maps compliance_docs boolean column → requirement code + agency.
// A boolean value of FALSE means the gap exists (supplier is NOT compliant).
const GAP_MAP = [
  { column: "rutDian"           as const, code: "DIAN_RUT",        agency: "DIAN" },
  { column: "icaRegistro"       as const, code: "ICA_REGISTRO",    agency: "ICA"  },
  { column: "fitosanitarioCert" as const, code: "FITOSANITARIO",   agency: "ICA"  },
  { column: "dianExportador"    as const, code: "DIAN_EXPORTADOR", agency: "DIAN" },
] as const;

const AGENCY_MAP: Record<string, string> = {
  DIAN_RUT:       "DIAN",
  DIAN_EXPORTADOR: "DIAN",
  ICA_REGISTRO:   "ICA",
  ICA_CONTEXT:    "ICA",
  FITOSANITARIO:  "ICA",
  FNC_COFFEE:     "FNC",
};

type GapRow = { supplierId: number; requirementCode: string; agency: string };

// ── Phase A: seed from compliance_docs boolean columns ────────────────────────

async function phaseA(): Promise<{ inserted: number; skipped: number }> {
  console.log("\n── Phase A: compliance_docs → supplier_requirement_status ──────────");

  const allDocs = await db
    .select({
      supplierId:        complianceDocsTable.supplierId,
      rutDian:           complianceDocsTable.rutDian,
      icaRegistro:       complianceDocsTable.icaRegistro,
      fitosanitarioCert: complianceDocsTable.fitosanitarioCert,
      dianExportador:    complianceDocsTable.dianExportador,
    })
    .from(complianceDocsTable)
    .innerJoin(suppliersTable, eq(complianceDocsTable.supplierId, suppliersTable.id));

  console.log(`   Found ${allDocs.length} compliance_docs rows to process.`);

  let inserted = 0;
  let skipped  = 0;

  for (const doc of allDocs) {
    for (const { column, code, agency } of GAP_MAP) {
      // Only seed when the boolean is false (gap exists) — gaps-only philosophy.
      if (doc[column] === false) {
        if (DRY_RUN) {
          console.log(`   [DRY RUN] Would insert: supplierId=${doc.supplierId} code=${code} state=not_started`);
          inserted++;
        } else {
          const result = await db
            .insert(supplierRequirementStatusTable)
            .values({ supplierId: doc.supplierId, requirementCode: code, agency, state: "not_started" })
            .onConflictDoNothing();
          if (result.rowCount && result.rowCount > 0) {
            inserted++;
          } else {
            skipped++;
          }
        }
      }
    }
  }

  console.log(`   Rows inserted: ${inserted}`);
  console.log(`   Rows skipped (already existed): ${skipped}`);
  return { inserted, skipped };
}

// ── Phase B: ai_outputs.compliance_gaps fallback ──────────────────────────────
// For suppliers who have an AI score but no compliance_docs row at all.
// After Phase A runs those suppliers still have no CC rows — Phase B catches them.

async function phaseB(): Promise<{ inserted: number; skipped: number }> {
  console.log("\n── Phase B: ai_outputs gaps → supplier_requirement_status ─────────");

  // Only targets suppliers who STILL have no CC rows after Phase A.
  const scored = await db
    .selectDistinctOn([aiOutputsTable.supplierId], {
      supplierId:     aiOutputsTable.supplierId,
      complianceGaps: aiOutputsTable.complianceGaps,
    })
    .from(aiOutputsTable)
    .where(
      and(
        eq(aiOutputsTable.callType, "ONBOARD_SCORE"),
        notExists(
          db
            .select({ id: supplierRequirementStatusTable.id })
            .from(supplierRequirementStatusTable)
            .where(eq(supplierRequirementStatusTable.supplierId, aiOutputsTable.supplierId)),
        ),
      ),
    )
    .orderBy(aiOutputsTable.supplierId, desc(aiOutputsTable.createdAt));

  console.log(`   Found ${scored.length} suppliers with AI score but no CC rows.`);

  let inserted = 0;
  let skipped  = 0;

  for (const row of scored) {
    // complianceGaps is stored as a comma-separated string e.g. "DIAN_RUT, ICA_REGISTRO"
    const gapCodes: string[] = row.complianceGaps
      ? row.complianceGaps
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter((s) => s in AGENCY_MAP && s !== "FNC_COFFEE") // FNC_COFFEE is coffee-only
      : [];

    if (gapCodes.length === 0) {
      console.log(`   supplierId=${row.supplierId}: no gap codes found — skipping`);
      continue;
    }

    for (const code of gapCodes) {
      const agency = AGENCY_MAP[code]!;
      if (DRY_RUN) {
        console.log(`   [DRY RUN] Would insert: supplierId=${row.supplierId} code=${code} state=not_started`);
        inserted++;
      } else {
        const result = await db
          .insert(supplierRequirementStatusTable)
          .values({ supplierId: row.supplierId!, requirementCode: code, agency, state: "not_started" })
          .onConflictDoNothing();
        if (result.rowCount && result.rowCount > 0) {
          inserted++;
        } else {
          skipped++;
        }
      }
    }
  }

  console.log(`   Rows inserted: ${inserted}`);
  console.log(`   Rows skipped (already existed): ${skipped}`);
  return { inserted, skipped };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function backfill(): Promise<void> {
  console.log(`\nBackfill: compliance_docs → supplier_requirement_status`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}\n`);

  const a = await phaseA();
  const b = await phaseB();

  const totalInserted = a.inserted + b.inserted;
  const totalSkipped  = a.skipped  + b.skipped;

  console.log(`\n── Summary ─────────────────────────────────────────────────────────`);
  console.log(`   Total rows inserted:              ${totalInserted}`);
  console.log(`   Total rows skipped (existed):     ${totalSkipped}`);

  if (DRY_RUN) {
    console.log(`\n   Re-run without --dry-run to apply changes.`);
  } else {
    console.log(`\n   Verification queries:`);
    console.log(`   SELECT supplier_id, requirement_code, state`);
    console.log(`   FROM supplier_requirement_status ORDER BY supplier_id;`);
    console.log(`\n   SELECT COUNT(*) FROM supplier_requirement_status;`);
    console.log(`   SELECT COUNT(*) FROM compliance_docs`);
    console.log(`     WHERE rut_dian = false OR ica_registro = false`);
    console.log(`        OR fitosanitario_cert = false OR dian_exportador = false;`);
    console.log(`   -- Phase A count should be >= second query (Phase B adds more).`);
  }
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
