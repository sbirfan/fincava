// discovery-engine.ts
// Accepts a product category + region, calls Claude Haiku, returns candidate leads.
// T3: Optional 1-level link traversal enriches lead quality (categoryHint).
// Results are EPHEMERAL — nothing is written to the database.
// Caller is responsible for routing selected leads into the T1 ingestion form.

import { getAnthropicClient, DISCOVERY_MODEL } from "../lib/anthropic";
import { DISCOVERY_PROMPT } from "../config/ingestion-prompts";
import { logger } from "../lib/logger";
import { z } from "zod";

// ── Hard limits — NOT configurable via env or API params ──────────────────────
// MAX_DEPTH is conceptual: we always fetch only the homepage (depth = 1).
// MAX_LINKS_PER_RESULT caps how many URLs are attempted per single lead.
// MAX_TOTAL_LINKS is the safety cap on total outbound HTTP requests per discovery call.
const MAX_DEPTH = 1;             // One level only — no recursive traversal
const MAX_LINKS_PER_RESULT = 3;  // Max URL candidates tried per lead
const MAX_TOTAL_LINKS = 10;      // Safety cap across all leads in one call
const LINK_TIMEOUT_MS = 5_000;   // Per-link fetch timeout (ms)

// Domains that may require auth or are social media — never follow (pre- and post-redirect)
const BLOCKED_DOMAINS = [
  "facebook.com", "instagram.com", "twitter.com", "x.com",
  "linkedin.com", "youtube.com", "tiktok.com", "pinterest.com",
  "whatsapp.com", "t.me", "wa.me",
];

// Hostnames / patterns that indicate SSRF risk — block these before any fetch
// Covers: loopback, link-local, private RFC1918, cloud metadata endpoints, .local
const SSRF_BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,       // IPv4 loopback
  /^::1$/,                        // IPv6 loopback
  /^0\.0\.0\.0$/,                 // unspecified
  /^10\.\d+\.\d+\.\d+$/,         // RFC1918 10.x
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // RFC1918 172.16-31
  /^192\.168\.\d+\.\d+$/,        // RFC1918 192.168.x
  /^169\.254\.\d+\.\d+$/,        // link-local
  /^fd[0-9a-f]{2}:/i,            // IPv6 unique-local (fd00::/8)
  /^fe80:/i,                      // IPv6 link-local
  /^metadata\.google\.internal$/i,
  /\.local$/i,                    // .local mDNS
  /\.internal$/i,                 // .internal TLD
  /^\[/,                          // IPv6 literal in URL host (e.g. [::1])
];

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

  // ── T3: 1-level link expansion (transparent to caller) ────────────────────
  const expandedLeads = await expandLeadsWithLinks(leads);

  return expandedLeads;
}

// ── T3: Link expansion ────────────────────────────────────────────────────────
// Flat loop, no recursion. Stops as soon as MAX_TOTAL_LINKS is reached.
// Fetches each lead's homepage and uses text content to refine categoryHint.
// Failures are silent — the original lead is returned unchanged on any error.
//
// Latency note: worst-case ~50 s (MAX_TOTAL_LINKS × LINK_TIMEOUT_MS).
// All links are fetched sequentially in the request path; consider moving to
// background processing if P99 latency becomes unacceptable in production.

async function expandLeadsWithLinks(
  leads: CandidateLead[],
  depth: number = 0,
): Promise<CandidateLead[]> {
  // Enforce MAX_DEPTH: this function must never be called recursively.
  // depth is always 0 on external calls; a defensive guard ensures correctness.
  if (depth >= MAX_DEPTH) {
    logger.warn({ depth }, "discovery-engine: MAX_DEPTH reached — returning leads unexpanded");
    return leads;
  }

  let linksFollowed = 0;
  const enhanced: CandidateLead[] = [];

  for (const lead of leads) {
    // Safety cap — stop traversal immediately when global limit is reached
    if (linksFollowed >= MAX_TOTAL_LINKS) {
      enhanced.push(lead);
      continue;
    }

    if (!lead.website) {
      enhanced.push(lead);
      continue;
    }

    // Build candidate URL list for this lead (homepage variants only)
    const candidateUrls = buildCandidateUrls(lead.website).slice(0, MAX_LINKS_PER_RESULT);
    let fetched = false;

    for (const url of candidateUrls) {
      if (linksFollowed >= MAX_TOTAL_LINKS) break;
      if (isBlockedUrl(url)) {
        logger.info({ url }, "discovery-engine: link expansion skipped — blocked domain");
        continue;
      }

      const html = await fetchPageHtml(url);
      linksFollowed++;

      if (!html) continue;

      const info = extractPageInfo(html);
      const refinedHint = refineCategory(lead.categoryHint, info);

      enhanced.push({ ...lead, categoryHint: refinedHint });
      fetched = true;
      break;
    }

    if (!fetched) {
      enhanced.push(lead);
    }
  }

  // Always log expansion result — linksFollowed = 0 means no qualifying URLs were found
  logger.info(
    { linksFollowed },
    "discovery-engine: DISCOVERY_EXPANSION_USED",
  );

  return enhanced;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractJsonArray(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) return arr[0];
  return text.trim();
}

// Returns true if the URL is on a blocked domain (social media / requires auth)
function isBlockedDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return BLOCKED_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return true;
  }
}

// Returns true if the URL poses SSRF risk: non-http(s), IP literals,
// loopback, private/link-local, metadata endpoints, or .local/.internal.
function isSsrfRisk(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true; // unparseable — reject
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;
  const h = parsed.hostname;
  return SSRF_BLOCKED_PATTERNS.some((re) => re.test(h));
}

// Combined safety gate: blocked domain OR SSRF risk → not safe
function isBlockedUrl(url: string): boolean {
  return isBlockedDomain(url) || isSsrfRisk(url);
}

// Returns homepage variant URLs to try (www and non-www).
// Keeps to MAX_LINKS_PER_RESULT candidates.
function buildCandidateUrls(website: string): string[] {
  try {
    const u = new URL(website);
    const base = `${u.protocol}//${u.hostname}`;
    const withWww = u.hostname.startsWith("www.")
      ? null
      : `${u.protocol}//www.${u.hostname}`;
    return [base, ...(withWww ? [withWww] : [])].slice(0, MAX_LINKS_PER_RESULT);
  } catch {
    return [];
  }
}

async function fetchPageHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Fincava-Discovery-Bot/1.0 (agro-export research; +https://fincava.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      // Follow redirects but cap at browser default (20); we validate final URL below
      redirect: "follow",
    });

    // Re-check the FINAL URL after redirects — this guards against redirect chains
    // that land on social media, login-gated pages, or internal/SSRF targets.
    if (isBlockedUrl(res.url)) {
      logger.warn({ originalUrl: url, finalUrl: res.url }, "discovery-engine: redirect landed on blocked URL — skipping");
      return null;
    }

    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return null;
    // Read up to ~64 KB — enough for title/meta/headings
    const text = await res.text();
    return text.slice(0, 65_536);
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    logger.warn({ url, isAbort }, "discovery-engine: link fetch failed");
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface PageInfo {
  title: string | null;
  description: string | null;
  headings: string[];
}

function extractPageInfo(html: string): PageInfo {
  const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']{1,300})["'][^>]+name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : null;

  const headingMatches = html.matchAll(/<h[12][^>]*>([^<]{1,150})<\/h[12]>/gi);
  const headings = Array.from(headingMatches, (m) => m[1].trim()).slice(0, 5);

  return { title, description, headings };
}

// Agricultural keyword taxonomy for category refinement
const AGRO_KEYWORDS: Record<string, string> = {
  café: "Specialty Coffee",
  coffee: "Specialty Coffee",
  cacao: "Cacao / Chocolate",
  cocoa: "Cacao / Chocolate",
  chocolate: "Cacao / Chocolate",
  aguacate: "Avocado",
  avocado: "Avocado",
  banano: "Bananas / Plantains",
  banana: "Bananas / Plantains",
  plátano: "Bananas / Plantains",
  plantain: "Bananas / Plantains",
  panela: "Panela / Sugarcane",
  caña: "Panela / Sugarcane",
  "palm oil": "Palm Oil",
  palma: "Palm Oil",
  mora: "Fruits & Berries",
  fresa: "Fruits & Berries",
  berry: "Fruits & Berries",
  flores: "Flowers",
  flower: "Flowers",
  rose: "Flowers",
  carnation: "Flowers",
  arroz: "Rice",
  rice: "Rice",
};

function refineCategory(existing: string, info: PageInfo): string {
  const corpus = [
    info.title ?? "",
    info.description ?? "",
    ...info.headings,
  ]
    .join(" ")
    .toLowerCase();

  for (const [keyword, refined] of Object.entries(AGRO_KEYWORDS)) {
    if (corpus.includes(keyword)) {
      // Only replace if the refined value is more specific than existing
      if (refined.toLowerCase() !== existing.toLowerCase()) {
        return refined;
      }
    }
  }

  return existing;
}
