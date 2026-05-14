// Buyer gap service — Phase 4
// Analyses a buyer profile against the eligible supplier catalog using
// Claude Sonnet 4.6 and writes structured rows to `buyer_gap_briefs`.
// HIGH-priority gaps automatically commission new supplier discovery by
// inserting a `supplier_ingestion_batches` row and calling the existing
// discovery engine. The discovery engine remains ephemeral — its results
// are NOT auto-promoted to suppliers.

import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  buyerProfilesTable,
  buyerGapBriefsTable,
  suppliersTable,
  productsTable,
  supplierIngestionBatchesTable,
  usersTable,
} from "@workspace/db";
import { eq, inArray, and, asc, sql, isNull, count } from "drizzle-orm";
import { z } from "zod";
import { getAnthropicClient } from "../lib/anthropic";
import { BUYER_GAP_SYSTEM_PROMPT } from "../config/buyer-gap-prompts";
import { discoverLeads } from "./discovery-engine";
import { logger } from "../lib/logger";

const GAP_MODEL = "claude-sonnet-4-6";
const MAX_CATALOG_SUPPLIERS = 60;
const DISCOVERY_MAX_RESULTS = 8;

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// ── LLM output schema ────────────────────────────────────────────────────────

const GapRowSchema = z.object({
  gap_type: z.string().min(1).max(30),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  pipeline_action: z.enum([
    "IMMEDIATE_DISCOVERY",
    "ADMIN_REVIEW",
    "NEXT_BATCH",
    "NONE",
  ]),
  is_real_gap: z.boolean(),
  search_category: z.string().max(50).nullable().optional(),
  search_region: z.string().max(200).nullable().optional(),
  required_attributes: z.array(z.string().max(80)).max(20).optional(),
  volume_target_mt: z.number().nonnegative().nullable().optional(),
  buyer_urgency_note: z.string().max(1000).optional(),
  discovery_search_terms: z.array(z.string().max(80)).max(20).optional(),
});

const GapResponseSchema = z.object({ gaps: z.array(GapRowSchema).min(1).max(10) });

type GapRow = z.infer<typeof GapRowSchema>;

// ── Catalog snapshot ─────────────────────────────────────────────────────────
// Keep token cost bounded: SELLABLE/PUBLISHED suppliers only, capped to
// MAX_CATALOG_SUPPLIERS, with one summarised row per supplier.
async function buildCatalogSnapshot(): Promise<
  Array<{
    id: number;
    name: string;
    municipio: string;
    department: string | null;
    supplierType: string;
    sellableStatus: string | null;
    categories: string[];
    subCategories: string[];
    certifications: string[];
  }>
> {
  const supplierRows = await db
    .select({
      id: suppliersTable.id,
      name: suppliersTable.nombreCompleto,
      municipio: suppliersTable.municipio,
      department: suppliersTable.department,
      supplierType: suppliersTable.supplierType,
      sellableStatus: suppliersTable.sellableStatus,
    })
    .from(suppliersTable)
    .where(inArray(suppliersTable.sellableStatus, ["SELLABLE", "PUBLISHED"]))
    .orderBy(
      sql`CASE WHEN ${suppliersTable.sellableStatus} = 'PUBLISHED' THEN 0 ELSE 1 END`,
      sql`${suppliersTable.id} DESC`,
    )
    .limit(MAX_CATALOG_SUPPLIERS);

  if (supplierRows.length === 0) return [];

  const supplierIds = supplierRows.map((s) => s.id);

  const productRows = await db
    .select({
      supplierId: productsTable.supplierId,
      category: productsTable.category,
      subCategory: productsTable.subCategory,
      certifications: productsTable.certifications,
    })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.active, true),
        inArray(productsTable.supplierId, supplierIds),
      ),
    );

  type Agg = {
    categories: Set<string>;
    subCategories: Set<string>;
    certifications: Set<string>;
  };
  const agg = new Map<number, Agg>();
  for (const p of productRows) {
    if (p.supplierId == null) continue;
    const a =
      agg.get(p.supplierId) ??
      ({
        categories: new Set<string>(),
        subCategories: new Set<string>(),
        certifications: new Set<string>(),
      } satisfies Agg);
    if (p.category) a.categories.add(p.category);
    if (p.subCategory) a.subCategories.add(p.subCategory);
    for (const c of p.certifications ?? []) a.certifications.add(c);
    agg.set(p.supplierId, a);
  }

  return supplierRows.map((s) => {
    const a = agg.get(s.id);
    return {
      id: s.id,
      name: s.name,
      municipio: s.municipio,
      department: s.department,
      supplierType: s.supplierType,
      sellableStatus: s.sellableStatus,
      categories: a ? Array.from(a.categories) : [],
      subCategories: a ? Array.from(a.subCategories) : [],
      certifications: a ? Array.from(a.certifications) : [],
    };
  });
}

// ── System admin id resolver ─────────────────────────────────────────────────
// No new env var: re-use SYSTEM_ADMIN_USER_ID if set, else fall back to the
// first user with role = 'ADMIN' (created via seed.ts).
async function resolveSystemAdminId(): Promise<number> {
  const fromEnv = process.env["SYSTEM_ADMIN_USER_ID"];
  if (fromEnv) {
    const n = Number.parseInt(fromEnv, 10);
    if (Number.isInteger(n) && n > 0) return n;
  }
  const [admin] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "ADMIN"))
    .orderBy(asc(usersTable.id))
    .limit(1);
  if (!admin) {
    throw new Error(
      "buyer-gap-service: no ADMIN user found to own auto-created ingestion batch",
    );
  }
  return admin.id;
}

// ── HIGH-gap invariant: ensure category/region are non-empty ─────────────────
// HIGH gaps MUST always result in a discovery run. If the model omits
// search_category, fall back to the buyer's first targetProducts entry
// (or "OTHER" as a last resort). For region we ALWAYS fall back to
// "Colombia" — the buyer's own country (e.g. UAE, US, EU) is the import
// destination, but Fincava only sources from Colombia, so region must
// describe a Colombian sub-region. The region argument intentionally
// ignores buyer.country.
function deriveDiscoveryTargets(
  brief: { searchCategory: string | null; searchRegion: string | null },
  profile: { targetProducts: string[] },
): { category: string; region: string } {
  const category =
    brief.searchCategory?.trim() ||
    profile.targetProducts?.[0]?.trim() ||
    "OTHER";
  const region = brief.searchRegion?.trim() || "Colombia";
  return { category, region };
}

// ── escalateGap ───────────────────────────────────────────────────────────
// Shared helper used by both auto-escalation (HIGH gaps from analyseGaps)
// and the admin manual MEDIUM escalation path. Insert a DRAFT ingestion
// batch, kick off a discovery run, and link the batch back to the gap brief.
// Returns the new ingestion batch id, or null if the gap is missing / not
// a real gap / already escalated.
export async function escalateGap(
  gapBriefId: number,
  profile: { targetProducts: string[] },
  opts: { manual?: boolean; actorAdminId?: number } = {},
): Promise<number | null> {
  const [brief] = await db
    .select()
    .from(buyerGapBriefsTable)
    .where(eq(buyerGapBriefsTable.id, gapBriefId));
  if (!brief) return null;
  if (!brief.isRealGap) return null;
  if (brief.ingestionBatchId != null) return brief.ingestionBatchId; // already escalated

  const adminId = opts.actorAdminId ?? (await resolveSystemAdminId());
  const batchUuid = randomUUID();
  const [batch] = await db
    .insert(supplierIngestionBatchesTable)
    .values({
      batchUuid,
      createdByAdminId: adminId,
      status: "DRAFT",
      notes: `Auto-created from buyer gap brief #${brief.id} (buyer_profile=${brief.buyerProfileId}, type=${brief.gapType})`,
    })
    .returning();

  // Link the gap brief to the new batch BEFORE the discovery call so the
  // FK is recorded even if discovery throws.
  await db
    .update(buyerGapBriefsTable)
    .set({ ingestionBatchId: batch.id })
    .where(eq(buyerGapBriefsTable.id, brief.id));

  // Discovery is ALWAYS invoked for HIGH gaps — when the model omitted
  // category/region we derive them from the buyer profile instead of
  // skipping (preserves the "HIGH ⇒ immediate discovery" invariant).
  // Results are ephemeral by design; failures are logged but never
  // rethrown — the batch + linkage remain so an admin can retry manually.
  const { category, region } = deriveDiscoveryTargets(brief, profile);
  try {
    const leads = await discoverLeads({
      category,
      region,
      maxResults: DISCOVERY_MAX_RESULTS,
    });
    logger.info(
      {
        gapBriefId: brief.id,
        batchId: batch.id,
        category,
        region,
        leadCount: leads.length,
        derived:
          !brief.searchCategory?.trim() || !brief.searchRegion?.trim(),
      },
      opts.manual
        ? "buyer-gap-service: discovery run completed for manual escalation"
        : "buyer-gap-service: discovery run completed for HIGH gap",
    );
  } catch (err) {
    logger.warn(
      { err, gapBriefId: brief.id, batchId: batch.id, category, region },
      "buyer-gap-service: discovery call failed (non-fatal — batch retained)",
    );
  }

  return batch.id;
}

// Backwards-compatible alias used by the auto-escalation path inside
// analyseGaps. Skips non-HIGH gaps so the batch order matches the priority.
async function escalateIfHigh(
  gapBriefId: number,
  profile: { targetProducts: string[] },
): Promise<void> {
  const [brief] = await db
    .select({ priority: buyerGapBriefsTable.priority })
    .from(buyerGapBriefsTable)
    .where(eq(buyerGapBriefsTable.id, gapBriefId));
  if (!brief || brief.priority !== "HIGH") return;
  await escalateGap(gapBriefId, profile);
}

// ── analyseGaps ──────────────────────────────────────────────────────────────

export async function analyseGaps(buyerProfileId: number): Promise<{
  gapsInserted: number;
  highPriorityCount: number;
}> {
  const [profile] = await db
    .select()
    .from(buyerProfilesTable)
    .where(eq(buyerProfilesTable.id, buyerProfileId));

  if (!profile) {
    throw new NotFoundError(`Buyer profile ${buyerProfileId} not found`);
  }

  const catalog = await buildCatalogSnapshot();

  const buyerPayload = {
    id: profile.id,
    companyName: profile.companyName,
    country: profile.country,
    destinationPort: profile.destinationPort,
    targetProducts: profile.targetProducts,
    requiredCertsP1: profile.requiredCertsP1,
    volumeBand: profile.volumeBand,
    intendedVolumeMt: profile.intendedVolumeMt,
    importFrequency: profile.importFrequency,
    timeToFirstOrder: profile.timeToFirstOrder,
    preferredIncoterm: profile.preferredIncoterm,
    traceabilityLevel: profile.traceabilityLevel,
    existingColombiaRel: profile.existingColombiaRel,
    auditStandard: profile.auditStandard,
    // Section E — the gap-sourcing answers
    prevSourcingChannel: profile.prevSourcingChannel,
    discoveryBudgetBand: profile.discoveryBudgetBand,
    supplierDevOpen: profile.supplierDevOpen,
    supplierTypePref: profile.supplierTypePref,
    socialImpactReqs: profile.socialImpactReqs,
    earlyStageSupplierOpen: profile.earlyStageSupplierOpen,
    // Phase 1.5 extended signals — sharpen gap analysis
    ...(profile.buyerSegment != null && { buyerSegment: profile.buyerSegment }),
    ...(profile.coffeeQualityTier != null && { coffeeQualityTier: profile.coffeeQualityTier }),
    ...(profile.coffeeFlavorProfile != null &&
      (profile.coffeeFlavorProfile as string[]).length > 0 && {
        coffeeFlavorProfile: profile.coffeeFlavorProfile }),
    ...(profile.cacaoFlavorProfile != null && { cacaoFlavorProfile: profile.cacaoFlavorProfile }),
    ...(profile.priceSensitivity != null && { priceSensitivity: profile.priceSensitivity }),
    ...(profile.annualBudgetUsd != null && { annualBudgetUsd: profile.annualBudgetUsd }),
    ...(profile.coffeeOrderSizeKg != null && { coffeeOrderSizeKg: profile.coffeeOrderSizeKg }),
    ...(profile.cacaoOrderSizeKg != null && { cacaoOrderSizeKg: profile.cacaoOrderSizeKg }),
    ...(profile.certsNiceToHave != null &&
      (profile.certsNiceToHave as string[]).length > 0 && {
        certsNiceToHave: profile.certsNiceToHave }),
    ...(profile.qualityDocRequired != null &&
      (profile.qualityDocRequired as string[]).length > 0 && {
        qualityDocRequired: profile.qualityDocRequired }),
    ...(profile.coffeeDefectRate != null && { coffeeDefectRate: profile.coffeeDefectRate }),
    ...(profile.cacaoMoldPct != null && { cacaoMoldPct: profile.cacaoMoldPct }),
    ...(profile.sourceConsistency != null && { sourceConsistency: profile.sourceConsistency }),
    ...(profile.sustainabilityImportance != null && {
      sustainabilityImportance: profile.sustainabilityImportance }),
    ...(profile.sustainabilityDimensions != null &&
      (profile.sustainabilityDimensions as string[]).length > 0 && {
        sustainabilityDimensions: profile.sustainabilityDimensions }),
  };

  let gapRows: GapRow[] = [];
  try {
    const client = getAnthropicClient();
    const start = Date.now();
    const message = await client.messages.create({
      model: GAP_MODEL,
      max_tokens: 4096,
      system: BUYER_GAP_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ buyer: buyerPayload, catalog }),
        },
      ],
    });
    logger.info(
      {
        buyerProfileId,
        durationMs: Date.now() - start,
        catalogSize: catalog.length,
      },
      "buyer-gap-service: Claude latency",
    );

    const firstBlock = message.content[0];
    if (!firstBlock || firstBlock.type !== "text") {
      throw new Error(
        `Claude returned non-text content block: ${firstBlock?.type ?? "none"}`,
      );
    }
    const raw = firstBlock.text;
    const jsonStr = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    const parsedRaw = JSON.parse(jsonStr);
    const validated = GapResponseSchema.safeParse(parsedRaw);
    if (!validated.success) {
      throw new Error(
        `buyer-gap-service: Claude output failed Zod validation — ${validated.error.message}`,
      );
    }
    gapRows = validated.data.gaps;
  } catch (err) {
    logger.error({ err, buyerProfileId }, "buyer-gap-service: Claude call failed");
    throw err;
  }

  // Persist atomically: insert all gap rows + update profile state/counters
  // in one transaction. Either everything lands or nothing does.
  // gap_flag_count is REPLACED (not incremented) with the count of currently
  // unresolved real gaps, so the field always reflects current platform state.
  const insertedIds = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(buyerGapBriefsTable)
      .values(
        gapRows.map((g) => ({
          buyerProfileId,
          gapType: g.gap_type,
          priority: g.priority,
          pipelineAction: g.pipeline_action,
          isRealGap: g.is_real_gap,
          searchCategory: g.search_category ?? null,
          searchRegion: g.search_region ?? null,
          requiredAttributes: g.required_attributes ?? [],
          volumeTargetMt:
            g.volume_target_mt != null ? g.volume_target_mt.toFixed(2) : null,
          buyerUrgencyNote: g.buyer_urgency_note ?? null,
          discoverySearchTerms: g.discovery_search_terms ?? [],
        })),
      )
      .returning({
        id: buyerGapBriefsTable.id,
        priority: buyerGapBriefsTable.priority,
        isRealGap: buyerGapBriefsTable.isRealGap,
      });

    const [{ unresolvedCount }] = await tx
      .select({ unresolvedCount: count() })
      .from(buyerGapBriefsTable)
      .where(
        and(
          eq(buyerGapBriefsTable.buyerProfileId, buyerProfileId),
          eq(buyerGapBriefsTable.isRealGap, true),
          isNull(buyerGapBriefsTable.resolvedAt),
        ),
      );

    await tx
      .update(buyerProfilesTable)
      .set({
        state: "GAP_SCANNED",
        gapFlagCount: unresolvedCount,
        updatedAt: new Date(),
      })
      .where(eq(buyerProfilesTable.id, buyerProfileId));

    return inserted;
  });

  const highIds = insertedIds
    .filter((r) => r.priority === "HIGH" && r.isRealGap)
    .map((r) => r.id);

  // Escalate HIGH gaps OUTSIDE the transaction — discovery is a long-running
  // network call and must not hold a DB lock.
  const profileForEscalation = {
    targetProducts: (profile.targetProducts ?? []) as string[],
  };
  for (const gapBriefId of highIds) {
    try {
      await escalateIfHigh(gapBriefId, profileForEscalation);
    } catch (err) {
      logger.error(
        { err, gapBriefId, buyerProfileId },
        "buyer-gap-service: HIGH gap escalation failed (non-fatal)",
      );
    }
  }

  logger.info(
    {
      buyerProfileId,
      gapsInserted: insertedIds.length,
      highPriorityCount: highIds.length,
      catalogSize: catalog.length,
    },
    "buyer-gap-service: analysis complete",
  );

  return {
    gapsInserted: insertedIds.length,
    highPriorityCount: highIds.length,
  };
}
