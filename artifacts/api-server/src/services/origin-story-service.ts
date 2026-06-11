import {
  db,
  suppliersTable,
  farmsTable,
  economicsTable,
  originStoriesTable,
} from "@workspace/db";
import { and, eq, isNotNull } from "drizzle-orm";
import { getAnthropicClient, SCORING_MODEL } from "../lib/anthropic";
import { logger } from "../lib/logger";

// ── Prompt 2 — Full Origin Narrative ─────────────────────────────────────────
// Requires farm + economics data (elevation, drying method, variety, hectares,
// years farming). Called manually by admin after field officer onboarding.
// Writes to origin_stories.story — NOT suppliers.description.

const ORIGIN_STORY_PROMPT = `You are a storytelling specialist for Fincava, a Colombian agricultural export marketplace.
Write a compelling 150–200 word origin story for a smallholder farmer based strictly on the structured data provided.
The story should be warm, specific, and human — written in the third person, suitable for an international buyer audience.

Structure:
1. Opening: name the farmer and their region (1 sentence)
2. Their farm: crop, scale, and something specific about how they grow it (2–3 sentences)
3. Their journey: years of experience, what drives them (1–2 sentences)
4. Why this matters: what makes their product distinctive for export buyers (1–2 sentences)

CRITICAL CONSTRAINTS:
1. Only use facts explicitly present in the structured data. Do not invent details.
2. Do not mention prices, specific export deals, certifications not present in the data, or government programs.
3. Write in English. Keep it under 220 words.
4. Do not use markdown — plain prose paragraphs only.
5. If a field is null or missing, simply omit that detail rather than guessing.`;

// ── Prompt 4 — Seed Story ─────────────────────────────────────────────────────
// Lightweight placeholder written at publish time using only the data available
// at ingestion (name, region, supplier type, category hint). Produces a warm
// but explicitly provisional 2–3 sentence narrative. Writes directly to
// origin_stories.story with originStoryStatus = "SEED_DRAFT".

const SEED_STORY_PROMPT = `You are a storytelling specialist for Fincava, a Colombian agricultural export marketplace.
Write a short 2–3 sentence warm introduction for a Colombian agricultural producer.
You have only basic information: name, location, supplier type, and crop category.

RULES:
1. Write in the third person.
2. Be warm and human — this will be shown to international buyers.
3. Do not invent specific details about farm size, certifications, prices, or volume.
4. Acknowledge the limited information gracefully — e.g. "Fincava is currently learning more about their farm."
5. Keep it under 80 words.
6. Do not use markdown — plain prose only.
7. End with a forward-looking sentence about connecting with global buyers.`;

// ── Prompt 4 public entry point ───────────────────────────────────────────────

export interface SeedStoryInput {
  supplierId: number;
  nombreCompleto: string;
  region: string;
  supplierType: string;
  categoryHint: string | null;
  farmerName: string;
  farmerPhoto: string | null;
  imageUrl: string | null;
}

/**
 * Generates a warm but provisional 2–3 sentence origin story placeholder using
 * only ingestion-time data. Inserts (or updates) the origin_stories row identified
 * by supplierId, setting originStoryStatus = "SEED_DRAFT".
 *
 * Safe to call on re-publish — if a row with a status of GENERATED or EDITED
 * already exists it is left untouched.
 */
export async function seedOriginStory(
  input: SeedStoryInput,
  values: {
    productCategory: string | null;
    farmName: string;
    region: string;
    challenges: string;
    impact: string;
    images: string[];
    published: boolean;
  },
): Promise<string> {
  const client = getAnthropicClient();

  const userContent = JSON.stringify({
    name: input.nombreCompleto,
    location: input.region,
    supplierType: input.supplierType,
    cropCategory: input.categoryHint ?? "Colombian agricultural products",
  });

  let storyText: string;
  try {
    const message = await client.messages.create({
      model: SCORING_MODEL,
      max_tokens: 256,
      system: [{ type: "text", text: SEED_STORY_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    });

    const block = message.content[0];
    if (!block || block.type !== "text" || !block.text.trim()) {
      logger.warn({ supplierId: input.supplierId }, "seedOriginStory: Claude returned empty block — using fallback text");
      storyText = `${input.nombreCompleto} is a Colombian agricultural producer based in ${input.region}. Fincava is currently learning more about their farm and operations. We look forward to connecting them with international buyers soon.`;
    } else {
      storyText = block.text.trim();
    }
  } catch (err) {
    logger.error({ supplierId: input.supplierId, err }, "seedOriginStory: AI call failed — using fallback text");
    storyText = `${input.nombreCompleto} is a Colombian agricultural producer based in ${input.region}. Fincava is currently learning more about their farm and operations. We look forward to connecting them with international buyers soon.`;
  }

  // Check for an existing row — respect GENERATED/EDITED status (never overwrite human/full AI work).
  const [existing] = await db
    .select({ id: originStoriesTable.id, originStoryStatus: originStoriesTable.originStoryStatus })
    .from(originStoriesTable)
    .where(eq(originStoriesTable.supplierId, input.supplierId))
    .limit(1);

  if (existing) {
    const status = existing.originStoryStatus;
    if (status === "GENERATED" || status === "EDITED") {
      // Story text is protected — but always sync the cover image in case the
      // admin re-published with a new photo.
      if (input.farmerPhoto !== undefined || input.imageUrl !== undefined) {
        await db
          .update(originStoriesTable)
          .set({
            farmerPhoto: input.farmerPhoto ?? null,
            images: input.imageUrl ? [input.imageUrl] : [],
          })
          .where(eq(originStoriesTable.id, existing.id));
      }
      logger.info(
        { supplierId: input.supplierId, status },
        "seedOriginStory: existing row has status %s — story text preserved, image updated",
        status,
      );
      return storyText;
    }
    // SEED_DRAFT or NULL — safe to overwrite
    await db
      .update(originStoriesTable)
      .set({
        story: storyText,
        originStoryStatus: "SEED_DRAFT",
        farmerPhoto: input.farmerPhoto ?? null,
        images: input.imageUrl ? [input.imageUrl] : existing ? values.images : [],
        published: values.published,
      })
      .where(eq(originStoriesTable.id, existing.id));
  } else {
    await db.insert(originStoriesTable).values({
      supplierId: input.supplierId,
      productId: null,
      productCategory: values.productCategory,
      farmerName: input.farmerName,
      farmerPhoto: input.farmerPhoto ?? null,
      farmName: values.farmName,
      region: values.region,
      story: storyText,
      challenges: values.challenges,
      impact: values.impact,
      images: input.imageUrl ? [input.imageUrl] : [],
      published: values.published,
      originStoryStatus: "SEED_DRAFT",
    });
  }

  logger.info({ supplierId: input.supplierId }, "seedOriginStory: SEED_DRAFT written");
  return storyText;
}

// ── Prompt 2 public entry point ───────────────────────────────────────────────

/**
 * Generates a full 150–200 word origin story using farm and economics data.
 * Requires field officer onboarding to have been completed.
 *
 * Guard: skips Claude if the origin_stories row for this supplier already has
 * originStoryStatus = "GENERATED" or "EDITED" (unless force = true).
 * A SEED_DRAFT or NULL status allows the full story to be generated.
 *
 * Writes to origin_stories.story (NOT suppliers.description).
 * Sets originStoryStatus = "GENERATED".
 */
export async function generateOriginStory(
  supplierId: number,
  opts: { force?: boolean } = {},
): Promise<{ story: string; written: boolean }> {
  const [supplier] = await db
    .select({
      nombreCompleto: suppliersTable.nombreCompleto,
      municipio: suppliersTable.municipio,
      department: suppliersTable.department,
    })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!supplier) {
    throw new Error("generateOriginStory: supplier not found");
  }

  // Guard: check originStoryStatus on the origin_stories row for this supplier.
  // Only skip if already GENERATED or EDITED — SEED_DRAFT or NULL allows overwrite.
  if (!opts.force) {
    const [storyRow] = await db
      .select({ id: originStoriesTable.id, originStoryStatus: originStoriesTable.originStoryStatus, story: originStoriesTable.story })
      .from(originStoriesTable)
      .where(and(eq(originStoriesTable.supplierId, supplierId), isNotNull(originStoriesTable.originStoryStatus)))
      .limit(1);

    if (storyRow && (storyRow.originStoryStatus === "GENERATED" || storyRow.originStoryStatus === "EDITED")) {
      logger.info({ supplierId, status: storyRow.originStoryStatus }, "generateOriginStory: story already at status — skipping");
      return { story: storyRow.story, written: false };
    }
  }

  const [farm] = await db
    .select({
      cultivoPrincipal: farmsTable.cultivoPrincipal,
      variedadCafe: farmsTable.variedadCafe,
      hectareasProduccion: farmsTable.hectareasProduccion,
      anosEnFinca: farmsTable.anosEnFinca,
      metodoSecado: farmsTable.metodoSecado,
      altitudeMeters: farmsTable.altitudeMeters,
      cosechasPorAno: farmsTable.cosechasPorAno,
      tenenciaTierra: farmsTable.tenenciaTierra,
    })
    .from(farmsTable)
    .where(eq(farmsTable.supplierId, supplierId))
    .limit(1);

  const [economics] = await db
    .select({
      haIntentadoExportar: economicsTable.haIntentadoExportar,
      interesCanalPremium: economicsTable.interesCanalPremium,
      tipoComprador: economicsTable.tipoComprador,
    })
    .from(economicsTable)
    .where(eq(economicsTable.supplierId, supplierId))
    .limit(1);

  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: SCORING_MODEL,
    max_tokens: 512,
    system: [{ type: "text", text: ORIGIN_STORY_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: JSON.stringify({ supplier, farm: farm ?? null, economics: economics ?? null }),
      },
    ],
  });

  const block = message.content[0];
  if (!block || block.type !== "text" || !block.text.trim()) {
    logger.warn(
      { supplierId, blockType: block?.type ?? "none" },
      "generateOriginStory: Claude returned non-text or empty block — story not written",
    );
    return { story: "", written: false };
  }
  const generatedText = block.text.trim();

  // Write to origin_stories.story (by supplierId FK), NOT suppliers.description.
  const [existingRow] = await db
    .select({ id: originStoriesTable.id })
    .from(originStoriesTable)
    .where(eq(originStoriesTable.supplierId, supplierId))
    .limit(1);

  if (existingRow) {
    await db
      .update(originStoriesTable)
      .set({ story: generatedText, originStoryStatus: "GENERATED" })
      .where(eq(originStoriesTable.id, existingRow.id));
  } else {
    // No seeded row yet — insert one. This can happen if generate-story is
    // called before publish (e.g. via the API directly).
    const region = supplier.department
      ? `${supplier.municipio}, ${supplier.department}`
      : (supplier.municipio ?? "Colombia");

    await db.insert(originStoriesTable).values({
      supplierId,
      productId: null,
      farmerName: supplier.nombreCompleto,
      farmName: supplier.nombreCompleto,
      region,
      story: generatedText,
      challenges: "",
      impact: "",
      images: [],
      published: false,
      originStoryStatus: "GENERATED",
    });
  }

  logger.info({ supplierId }, "generateOriginStory: GENERATED story written to origin_stories");

  return { story: generatedText, written: true };
}
