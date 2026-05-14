import { db, suppliersTable, farmsTable, economicsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAnthropicClient, SCORING_MODEL } from "../lib/anthropic";
import { logger } from "../lib/logger";

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

export async function generateOriginStory(
  supplierId: number,
  opts: { force?: boolean } = {},
): Promise<{ story: string; written: boolean }> {
  const [supplier] = await db
    .select({
      nombreCompleto: suppliersTable.nombreCompleto,
      municipio: suppliersTable.municipio,
      department: suppliersTable.department,
      description: suppliersTable.description,
    })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!supplier) {
    throw new Error("generateOriginStory: supplier not found");
  }

  if (supplier.description && supplier.description.trim().length > 0 && !opts.force) {
    return { story: supplier.description, written: false };
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
    system: ORIGIN_STORY_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify({ supplier, farm: farm ?? null, economics: economics ?? null }),
      },
    ],
  });

  const block = message.content[0];
  const generatedText = block.type === "text" ? block.text.trim() : "";

  await db
    .update(suppliersTable)
    .set({ description: generatedText })
    .where(eq(suppliersTable.id, supplierId));

  logger.info({ supplierId }, "generateOriginStory: story written");

  return { story: generatedText, written: true };
}
