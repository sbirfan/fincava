import Anthropic from "@anthropic-ai/sdk";

export const SCORING_MODEL = process.env["ANTHROPIC_SCORING_MODEL"] ?? "claude-haiku-4-5";
export const DOCUMENT_MODEL = process.env["ANTHROPIC_DOCUMENT_MODEL"] ?? "claude-sonnet-4-6";
export const ENRICHMENT_MODEL = process.env["ANTHROPIC_ENRICHMENT_MODEL"] ?? "claude-sonnet-4-6";
export const DISCOVERY_MODEL = process.env["ANTHROPIC_DISCOVERY_MODEL"] ?? "claude-haiku-4-5";

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}
