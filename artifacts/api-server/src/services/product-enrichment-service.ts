import { db, productsTable, originStoriesTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { z } from "zod/v4";
import { getAnthropicClient, DOCUMENT_MODEL } from "../lib/anthropic";
import { PROVENANCE_PREAMBLE } from "../config/provenance";
import { logger } from "../lib/logger";
import { getSchemaForType } from "../lib/product-type-schemas";

// ── Output shape ──────────────────────────────────────────────────────────────

const AiContentSchema = z.object({
  enrichedAt:      z.string(),
  model:           z.string(),
  productTypeKey:  z.string().nullable(),
  evidenceTier:    z.literal("AI_INFERRED"),
  shortEs:         z.string(),
  shortEn:         z.string(),
  longEs:          z.string(),
  longEn:          z.string(),
  buyerHighlights: z.array(z.string()).min(1),
});

export type AiContent = z.infer<typeof AiContentSchema>;

export type EnrichmentResult =
  | { success: true; enrichment: AiContent }
  | { success: false; error: string; cached: AiContent | null };

// ── Freshness guard ───────────────────────────────────────────────────────────

const FRESHNESS_MS = 24 * 60 * 60 * 1000; // 24 hours

function isFresh(cached: AiContent | null): boolean {
  if (!cached?.enrichedAt) return false;
  return Date.now() - new Date(cached.enrichedAt).getTime() < FRESHNESS_MS;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function enrichProduct(
  productId: number,
  options: { force?: boolean } = {},
): Promise<EnrichmentResult> {
  let cachedContent: AiContent | null = null;

  try {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId));

    if (!product) {
      return { success: false, error: "product_not_found", cached: null };
    }

    // Validate cached content if it exists
    if (product.aiContent) {
      const parsed = AiContentSchema.safeParse(product.aiContent);
      if (parsed.success) cachedContent = parsed.data;
    }

    if (!options.force && isFresh(cachedContent)) {
      return { success: true, enrichment: cachedContent! };
    }

    // Load origin story if supplier is linked
    let story: typeof originStoriesTable.$inferSelect | null = null;
    if (product.supplierId) {
      const [row] = await db
        .select()
        .from(originStoriesTable)
        .where(
          and(
            eq(originStoriesTable.supplierId, product.supplierId),
            eq(originStoriesTable.published, true),
            isNotNull(originStoriesTable.farmerApprovedAt),
          ),
        )
        .limit(1);
      story = row ?? null;
    }

    // Build human-labeled typeAttributes using template field labels
    const typeSchema = product.productTypeKey ? getSchemaForType(product.productTypeKey) : null;
    const labeledAttributes: Record<string, unknown> = {};
    if (typeSchema && product.typeAttributes && typeof product.typeAttributes === "object") {
      const attrs = product.typeAttributes as Record<string, unknown>;
      for (const field of typeSchema.typeAttributes) {
        if (attrs[field.key] !== undefined) {
          labeledAttributes[field.labelEn] = attrs[field.key];
        }
      }
    }

    const promptContext = {
      product: {
        name:           product.name,
        category:       product.category,
        productTypeKey: product.productTypeKey ?? null,
        origin:         product.origin,
        altitude:       product.altitude ?? null,
        variety:        product.variety ?? null,
        process:        product.process ?? null,
        cupping:        product.cupping ?? null,
        certifications: product.certifications ?? [],
        smallholder:    product.smallholder,
        womenLed:       product.womenLed,
        directTrade:    product.directTrade,
        organic:        product.organic,
        pricePerKgUSD:  product.pricePerKgUSD,
        retailPriceCop: product.retailPriceCop ?? null,
        typeAttributes: Object.keys(labeledAttributes).length > 0 ? labeledAttributes : null,
      },
      originStory: story ? {
        farmerName:    story.farmerName,
        farmName:      story.farmName,
        region:        story.region,
        elevation:     story.elevation ?? null,
        farmSizeHa:    story.farmSizeHa ?? null,
        yearsFarming:  story.yearsFarming ?? null,
        story:         story.story,
        challenges:    story.challenges,
        impact:        story.impact,
      } : null,
      targetLanguages:  ["es", "en"],
      wholesalePersona: typeSchema?.aiPromptHints.wholesalePersona ?? "specialty agricultural buyer",
      retailPersona:    typeSchema?.aiPromptHints.retailPersona ?? "conscious consumer",
      keySellingPoints: typeSchema?.aiPromptHints.keySellingPoints ?? [],
    };

    const systemPrompt = `${PROVENANCE_PREAMBLE}

You are generating product descriptions for FINCAVA, a Colombian agricultural trade platform.
Write compelling, factual descriptions based ONLY on the provided product data.

Rules (non-negotiable):
- Do not invent certifications, contact details, URLs, prices, or addresses.
- Spanish must use Colombia-appropriate register (not European Spanish).
- shortEs/shortEn: 50-80 words each.
- longEs/longEn: 150-200 words each.
- buyerHighlights: exactly 3 concise bullet strings (no leading dash or bullet character).
- Output raw JSON only — no markdown, no preamble, no trailing text.

Output schema (all fields required):
{
  "shortEs": "string",
  "shortEn": "string",
  "longEs": "string",
  "longEn": "string",
  "buyerHighlights": ["string", "string", "string"]
}`;

    const client = getAnthropicClient();
    const start = Date.now();

    const message = await client.messages.create(
      {
        model: DOCUMENT_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: JSON.stringify(promptContext) }],
      },
      { signal: AbortSignal.timeout(30_000) },
    );

    const duration = Date.now() - start;
    logger.info({ productId, duration }, "enrichProduct: Claude latency");

    const firstBlock = message.content[0];
    if (!firstBlock || firstBlock.type !== "text") {
      logger.warn({ productId, stopReason: message.stop_reason }, "enrichProduct: unexpected content block type or empty response");
      return { success: false, error: "empty_response", cached: cachedContent };
    }
    const jsonStr = firstBlock.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    let claudeOutput: unknown;
    try {
      claudeOutput = JSON.parse(jsonStr);
    } catch {
      logger.warn({ productId }, "enrichProduct: Claude returned unparseable JSON");
      return { success: false, error: "invalid_json", cached: cachedContent };
    }

    // Validate the 5 user-visible fields Claude returned
    const OutputSchema = z.object({
      shortEs:         z.string().min(1),
      shortEn:         z.string().min(1),
      longEs:          z.string().min(1),
      longEn:          z.string().min(1),
      buyerHighlights: z.array(z.string()).min(1),
    });

    const validated = OutputSchema.safeParse(claudeOutput);
    if (!validated.success) {
      logger.warn({ productId, error: validated.error.message }, "enrichProduct: Claude output failed Zod validation");
      return { success: false, error: "invalid_enrichment_output", cached: cachedContent };
    }

    const aiContent: AiContent = {
      ...validated.data,
      enrichedAt:     new Date().toISOString(),
      model:          DOCUMENT_MODEL,
      productTypeKey: product.productTypeKey ?? null,
      evidenceTier:   "AI_INFERRED",
    };

    await db
      .update(productsTable)
      .set({ aiContent })
      .where(eq(productsTable.id, productId));

    return { success: true, enrichment: aiContent };

  } catch (err) {
    logger.error({ productId, err }, "enrichProduct: failed");
    return { success: false, error: "enrichment_failed", cached: cachedContent };
  }
}
