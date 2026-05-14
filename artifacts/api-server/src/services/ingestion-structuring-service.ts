// ingestion-structuring-service.ts
// Accepts sparse admin input, calls Claude Sonnet, validates output via Zod.
// Does NOT write to the database — caller is responsible for persistence.
// Throws with a user-facing message on API or validation failure.

import { getAnthropicClient, ENRICHMENT_MODEL } from "../lib/anthropic";
import { logger } from "../lib/logger";
import { logInteraction } from "../lib/interaction-logger";
import { INTERACTION_TYPES } from "@workspace/db";
import { computeConfidenceScore } from "./confidence-scorer";
import { z } from "zod";

// ── AI output schema — extra fields discarded by .strip() (default) ───────────

const AiEnrichmentOutput = z.object({
  normalizedName: z.string().max(200),
  description: z.string().max(2000),
  categoryHints: z.array(z.string().max(100)).max(10).default([]),
  exportReadinessNarrative: z.string().max(1000).nullable().optional(),
  estimatedAnnualVolumeKg: z.number().nonnegative().nullable().optional(),
  likelyCertifications: z.array(z.string().max(100)).max(20).default([]),
  dataCompletenessScore: z.number().min(0).max(100).nullable().optional(),
});

type AiEnrichmentBase = z.infer<typeof AiEnrichmentOutput>;

// T5: Extended return type — includes confidence score computed after AI validation.
export interface AiEnrichmentResult extends AiEnrichmentBase {
  confidenceScore: number;
}

export interface IngestionEnrichmentInput {
  nombreCompleto: string;
  municipio: string;
  department?: string | null;
  vereda?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  supplierType?: string;
  description?: string | null;
  sourceUrl?: string | null;
  country?: string;
  categoryHint?: string | null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function enrichSupplierWithAI(
  input: IngestionEnrichmentInput,
): Promise<AiEnrichmentResult> {
  const client = getAnthropicClient();
  const prompt = buildEnrichmentPrompt(input);

  let rawText: string;
  try {
    const message = await client.messages.create({
      model: ENRICHMENT_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content[0];
    if (block.type !== "text") {
      throw new Error(`Unexpected content block type: ${block.type}`);
    }
    rawText = block.text;
  } catch (err) {
    logger.error({ err }, "ingestion-structuring-service: Anthropic API call failed");
    throw new Error(
      "AI enrichment is temporarily unavailable — save without enrichment or try again.",
    );
  }

  let parsed: unknown;
  let aiRawFieldCount: number | undefined;
  try {
    const parsedJson = JSON.parse(extractJson(rawText));
    parsed = parsedJson;
    // Count raw AI fields before Zod strips extras — used by confidence scorer.
    if (parsedJson && typeof parsedJson === "object" && !Array.isArray(parsedJson)) {
      aiRawFieldCount = Object.keys(parsedJson as Record<string, unknown>).length;
    }
  } catch {
    logger.error({ rawText }, "ingestion-structuring-service: AI output was not valid JSON");
    throw new Error(
      "AI enrichment returned an unexpected format — save without enrichment or try again.",
    );
  }

  const result = AiEnrichmentOutput.safeParse(parsed);
  if (!result.success) {
    logger.error(
      { issues: result.error.issues },
      "ingestion-structuring-service: AI output failed Zod validation",
    );
    throw new Error(
      "AI enrichment returned incomplete data — save without enrichment or try again.",
    );
  }

  // T5: Compute confidence score from all available signals.
  const confidenceScore = computeConfidenceScore({
    nombreCompleto: input.nombreCompleto,
    municipio: input.municipio,
    sourceUrl: input.sourceUrl,
    whatsappNumber: input.whatsappNumber,
    email: input.email,
    categoryHint: input.categoryHint,
    normalizedName: result.data.normalizedName,
    aiRawFieldCount,
  });

  logInteraction({
    eventType: INTERACTION_TYPES.SUPPLIER_STRUCTURED,
    payload: {
      nombreCompleto: input.nombreCompleto,
      categoryHint: input.categoryHint ?? null,
      dataCompletenessScore: result.data.dataCompletenessScore ?? null,
      confidenceScore,
      fieldsEnriched: Object.keys(result.data).filter(
        (k) => result.data[k as keyof typeof result.data] !== null,
      ),
    },
  });

  return { ...result.data, confidenceScore };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) return obj[0];
  return text.trim();
}

function buildEnrichmentPrompt(input: IngestionEnrichmentInput): string {
  return `You are an agricultural supply-chain analyst cataloguing Colombian agro-export suppliers for a B2B marketplace called Fincava.

Analyze the following sparse supplier data and return a structured JSON profile.

Input data:
- Name: ${input.nombreCompleto}
- Municipality: ${input.municipio}
- Department: ${input.department ?? "unknown"}
- Vereda/locality: ${input.vereda ?? "not provided"}
- Country: ${input.country ?? "Colombia"}
- Supplier type: ${input.supplierType ?? "FARMER"}
- Category hint: ${input.categoryHint ?? "not specified"}
- Source URL: ${input.sourceUrl ?? "none"}
- Existing description: ${input.description ?? "none"}

Instructions:
1. Identify likely agricultural products from the name, region, and category hint.
   ALL output fields are AI_INFERRED from sparse data — treat as preliminary draft only.
2. Write a brief 2-3 sentence professional description suitable for a B2B marketplace.
3. Write a brief export readiness narrative based ONLY on explicit signals in the
   input data — organisation type, region, and category hint. Do not assign numerical
   scores. Label the narrative as an AI_INFERRED preliminary estimate.

IMPORTANT: Do NOT include a certifications field in your output. Certifications are
verified documents — they must never be inferred from a supplier's name, region, or
product category. If certifications are mentioned in the existing description field,
you may reference them in the description text with the qualifier 'reportedly' only.
Never place inferred certifications in a structured array field.

Return ONLY valid JSON with exactly these fields — no extra fields, no markdown prose:
{
  "normalizedName": "string (English-friendly, Title Case, ≤ 80 chars)",
  "description": "string (2-3 sentences B2B profile, ≤ 300 chars)",
  "categoryHints": ["string", ...],
  "exportReadinessNarrative": "string (1 sentence, labelled as AI_INFERRED preliminary estimate) or null",
  "estimatedAnnualVolumeKg": number or null,
  "likelyCertifications": ["string", ...],
  "dataCompletenessScore": number (0-100)
}

ALL fields in this output are AI_INFERRED from sparse public and admin data.
They form a DRAFT PROFILE only. The consuming system must store and display these
values with AI_INFERRED labelling. No field should be treated as a verified fact.`;
}
