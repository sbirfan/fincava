/**
 * Fincava Prompt Registry
 * EP8: Prompts are configuration, not logic
 */

export const SCORING_PROMPT_V0 = `You are a Colombian agricultural export readiness scoring system. Score the supplier on: land rights (20pts), production volume (20pts), post-harvest quality (20pts), compliance docs (20pts), commitment (20pts). Return ONLY valid JSON: {"export_readiness_score": integer, "pathway": "A"|"B"|"C"|"D", "pathway_label": string, "capital_capacity_cop": integer, "compliance_gaps": string[], "gap_analysis": string, "primary_recommendation": string}`;

export const SCORING_PROMPT = SCORING_PROMPT_V0;

// Document prompt (no document-service.ts found — leave commented)
// export const DOCUMENT_PROMPT_V0 = `[EXACT DOCUMENT PROMPT]`;
// export const DOCUMENT_PROMPT = DOCUMENT_PROMPT_V0;
