// discovery-engine.ts
// Accepts a product category + region, calls Claude Haiku, returns candidate leads.
// Results are EPHEMERAL — nothing is written to the database.
// Caller is responsible for routing selected leads into the T1 ingestion form.

import { getAnthropicClient, DISCOVERY_MODEL } from "../lib/anthropic";
import { DISCOVERY_PROMPT } from "../config/ingestion-prompts";
import { logger } from "../lib/logger";
import { z } from "zod";

// ── Output schema — exactly 4 allowed fields; extras discarded by .strip() ────

const CandidateLeadSchema = z.object({
  name: z.string().min(1).max(150),
  location: z.string().min(1).max(100),
  website: z.string().url().nullable(),
  categoryHint: z.string().min(1).max(80),
});

export type CandidateLead = z.infer<typeof CandidateLeadSchema>;

const CandidateLeadArraySchema = z.array(CandidateLeadSchema);

// ── Input ─────────────────────────────────────────────────────────────────────

export interface DiscoveryInput {
  category: string;
  region: string;
  maxResults: number;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function discoverLeads(input: DiscoveryInput): Promise<CandidateLead[]> {
  const { category, region, maxResults } = input;
  const client = getAnthropicClient();

  const userMessage = `Product category: ${category}
Region: ${region}
Max results: ${maxResults}

Generate up to ${maxResults} Colombian agricultural supplier leads for the category "${category}" in the "${region}" region of Colombia.`;

  const systemPrompt = DISCOVERY_PROMPT
    .replace(/\{max_results\}/g, String(maxResults));

  let rawText: string;
  try {
    const message = await client.messages.create({
      model: DISCOVERY_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = message.content[0];
    if (!block || block.type !== "text") {
      throw new Error(`Unexpected content block type: ${block?.type ?? "none"}`);
    }
    rawText = block.text;
  } catch (err) {
    logger.error({ err, category, region }, "discovery-engine: Anthropic API call failed");
    throw new Error(
      "Discovery is temporarily unavailable — please try again in a moment.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonArray(rawText));
  } catch {
    logger.error({ rawText }, "discovery-engine: AI output was not valid JSON");
    throw new Error(
      "Discovery returned an unexpected format — please try again.",
    );
  }

  if (!Array.isArray(parsed)) {
    logger.error({ parsed }, "discovery-engine: AI output was not a JSON array");
    throw new Error("Discovery returned an unexpected format — please try again.");
  }

  const result = CandidateLeadArraySchema.safeParse(parsed);
  if (!result.success) {
    logger.error(
      { issues: result.error.issues },
      "discovery-engine: AI output failed Zod validation",
    );
    throw new Error("Discovery returned incomplete data — please try again.");
  }

  const leads = result.data.slice(0, maxResults);

  logger.info(
    { category, region, maxResults, count: leads.length },
    "discovery-engine: DISCOVERED",
  );

  return leads;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractJsonArray(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) return arr[0];
  return text.trim();
}
