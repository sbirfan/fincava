// discovery-engine.ts
// Accepts a product category + region, calls Claude Haiku, returns candidate leads.
// T3: Optional 1-level link traversal enriches lead quality (categoryHint).
// Results are EPHEMERAL — nothing is written to the database.
// Caller is responsible for routing selected leads into the T1 ingestion form.

import dns from "dns";
import http from "http";
import https from "https";
import { getAnthropicClient, DISCOVERY_MODEL } from "../lib/anthropic";
import { DISCOVERY_PROMPT } from "../config/ingestion-prompts";
import { logger } from "../lib/logger";
import { z } from "zod";

// ── Private IP / SSRF helpers ─────────────────────────────────────────────────

/**
 * Returns true if the given IP address (v4 or v6) falls within a private,
 * loopback, link-local, or otherwise non-routable range.  Used after DNS
 * resolution so that rebinding domains (e.g. 169-254-169-254.nip.io) are
 * caught even though their *hostname* passes the string-based blocklist.
 */
function isPrivateIp(ip: string): boolean {
  // IPv4
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0) return true;                              // unspecified
    if (a === 10) return true;                             // RFC1918 10.x
    if (a === 127) return true;                            // loopback
    if (a === 100 && b >= 64 && b <= 127) return true;    // CGNAT RFC6598
    if (a === 169 && b === 254) return true;               // link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;     // RFC1918 172.16-31
    if (a === 192 && b === 168) return true;               // RFC1918 192.168.x
    if (a === 198 && (b === 18 || b === 19)) return true;  // benchmarking RFC2544
    if (a === 240) return true;                            // reserved
    return false;
  }
  // IPv6
  const v6 = ip.toLowerCase().replace(/\[|\]/g, "");
  if (v6 === "::1") return true;                          // loopback
  if (v6 === "::" || v6 === "0:0:0:0:0:0:0:0") return true; // unspecified
  if (v6.startsWith("fe80:")) return true;                // link-local
  if (v6.startsWith("fc") || v6.startsWith("fd")) return true; // unique-local
  // IPv4-mapped IPv6 (::ffff:a.b.c.d)
  const mapped = v6.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIp(mapped[1]);
  return false;
}

/**
 * Custom lookup function passed directly to Node's http/https request options.
 * Node calls this at actual socket-connect time (not pre-flight), which closes
 * the TOCTOU window: the IP we validate IS the IP the socket connects to.
 *
 * If the resolved address is private/non-routable, we inject an ECONNREFUSED
 * error so the request fails before any bytes leave the box.
 * Fail-closed: DNS failure also results in an error.
 */
function safeLookupFn(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
): void {
  dns.lookup(hostname, { ...options, all: false }, (err, address, family) => {
    if (err) return callback(err, "", 0);
    if (isPrivateIp(String(address))) {
      const ssrfErr = Object.assign(
        new Error(`SSRF_BLOCKED: ${hostname} resolves to private IP ${String(address)}`),
        { code: "ECONNREFUSED" },
      ) as NodeJS.ErrnoException;
      return callback(ssrfErr, "", 0);
    }
    callback(null, String(address), Number(family));
  });
}

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

// ── Entity-type → human-readable exclusion rule ───────────────────────────────

const EXCLUDE_TYPE_RULES: Record<string, string> = {
  cooperative:
    "HARD EXCLUDE — Cooperatives (cooperativas, asociaciones de productores): do not return any entity whose name or description indicates it is a cooperative or producer association.",
  exporter:
    "HARD EXCLUDE — Exporters and traders (exportadoras, comercializadoras, brokers): do not return any entity that acts as a middleman, trader, or export house without owning its own farm.",
  processor:
    "HARD EXCLUDE — Processors and manufacturers (procesadoras, beneficiaderos, transformadoras): do not return entities that only process or transform product without owning the farm where it is grown.",
  distributor:
    "HARD EXCLUDE — Distributors and wholesalers (distribuidoras, mayoristas): do not return entities that only distribute product sourced from third-party farms.",
};

// ── Input ─────────────────────────────────────────────────────────────────────

export interface DiscoveryInput {
  category: string;
  region: string;
  maxResults: number;
  /** Entity types to hard-exclude from results. Each maps to an explicit rule
   *  injected into the AI prompt so the model never surfaces that type. */
  excludeTypes?: string[];
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function discoverLeads(input: DiscoveryInput): Promise<CandidateLead[]> {
  const { category, region, maxResults, excludeTypes = [] } = input;
  const client = getAnthropicClient();

  // Build the exclusion clause — one numbered rule per excluded type.
  // Injected into the {exclude_clause} placeholder in the prompt template.
  const exclusionLines = excludeTypes
    .filter((t) => EXCLUDE_TYPE_RULES[t])
    .map((t, i) => `${6 + i}. ${EXCLUDE_TYPE_RULES[t]}`);
  const excludeClause = exclusionLines.length > 0
    ? exclusionLines.join("\n") + "\n"
    : "";

  const userMessage = `Product category: ${category}
Region: ${region}
Max results: ${maxResults}
${excludeTypes.length > 0 ? `Excluded entity types: ${excludeTypes.join(", ")}` : ""}

Generate up to ${maxResults} Colombian agricultural supplier leads for the category "${category}" in the "${region}" region of Colombia.`;

  const systemPrompt = DISCOVERY_PROMPT
    .replace(/\{max_results\}/g, String(maxResults))
    .replace(/\{exclude_clause\}/g, excludeClause);

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

// Maximum redirect hops before aborting
const MAX_REDIRECT_HOPS = 5;
// Maximum bytes to buffer from the response body (64 KB)
const MAX_BODY_BYTES = 65_536;

/**
 * Fetches the HTML of a page with two defence layers:
 *
 * 1. connect-time IP validation (safeLookupFn) — validated on every hop,
 *    eliminates TOCTOU between our DNS check and the actual socket connect.
 * 2. manual redirect handling — each hop's URL is re-checked through both the
 *    string-based isSsrfRisk/isBlockedDomain guards AND the connect-time
 *    safeLookupFn before a new connection is made.
 *
 * Uses Node's http/https modules directly so we can pass `lookup: safeLookupFn`
 * in request options; built-in `fetch()` does not expose this hook.
 */
async function fetchPageHtml(url: string): Promise<string | null> {
  let currentUrl = url;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    // Too many redirects
    if (hop === MAX_REDIRECT_HOPS) {
      logger.warn({ url }, "discovery-engine: too many redirects — skipping");
      return null;
    }

    // Parse URL — unparseable → abort
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      logger.warn({ url: currentUrl }, "discovery-engine: unparseable URL — skipping");
      return null;
    }

    // String-based gate: blocked domain OR SSRF risk (IP literals, .local, etc.)
    if (isBlockedUrl(currentUrl)) {
      logger.warn({ url: currentUrl }, "discovery-engine: blocked URL — skipping");
      return null;
    }

    // Only http / https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      logger.warn({ url: currentUrl }, "discovery-engine: non-http URL — skipping");
      return null;
    }

    const isHttps = parsed.protocol === "https:";
    const port = parsed.port
      ? parseInt(parsed.port, 10)
      : isHttps ? 443 : 80;
    const requester = isHttps ? https : http;

    // Make one hop; safeLookupFn validates the resolved IP AT connect time.
    type HopResult =
      | { kind: "redirect"; location: string }
      | { kind: "body"; html: string }
      | { kind: "skip" };

    const result = await new Promise<HopResult>((resolve) => {
      let settled = false;
      const done = (r: HopResult) => {
        if (!settled) { settled = true; resolve(r); }
      };

      const timer = setTimeout(() => {
        req.destroy(new Error("timeout"));
        done({ kind: "skip" });
      }, LINK_TIMEOUT_MS);

      const req = requester.request(
        {
          hostname: parsed.hostname,
          port,
          path: (parsed.pathname || "/") + parsed.search,
          method: "GET",
          headers: {
            "User-Agent": "Fincava-Discovery-Bot/1.0 (agro-export research; +https://fincava.com)",
            Accept: "text/html,application/xhtml+xml",
            Host: parsed.host,
          },
          // safeLookupFn is called by Node at actual socket-connect time,
          // binding IP validation to the connection rather than a separate
          // pre-flight call. This eliminates TOCTOU.
          lookup: safeLookupFn,
        },
        (res) => {
          clearTimeout(timer);
          const status = res.statusCode ?? 0;

          // Redirect — drain body and return Location for next hop
          if (status >= 300 && status < 400) {
            res.resume();
            const location = res.headers["location"];
            if (typeof location === "string" && location.length > 0) {
              done({ kind: "redirect", location });
            } else {
              done({ kind: "skip" });
            }
            return;
          }

          // Non-200 or non-HTML → skip
          if (status < 200 || status >= 300) {
            res.resume();
            done({ kind: "skip" });
            return;
          }
          const ct = res.headers["content-type"] ?? "";
          if (!ct.includes("html")) {
            res.resume();
            done({ kind: "skip" });
            return;
          }

          // Collect up to MAX_BODY_BYTES then stop reading
          const chunks: Buffer[] = [];
          let totalBytes = 0;
          let truncated = false;

          res.on("data", (chunk: Buffer) => {
            if (truncated) return;
            totalBytes += chunk.length;
            if (totalBytes > MAX_BODY_BYTES) {
              truncated = true;
              // Keep only as many bytes as we need from the last chunk
              const overflow = totalBytes - MAX_BODY_BYTES;
              chunks.push(chunk.subarray(0, chunk.length - overflow));
              res.destroy(); // stop the stream; triggers 'close', not 'end'
              done({ kind: "body", html: Buffer.concat(chunks).toString("utf8") });
              return;
            }
            chunks.push(chunk);
          });

          res.on("end", () => {
            if (!truncated) {
              done({ kind: "body", html: Buffer.concat(chunks).toString("utf8") });
            }
          });

          res.on("error", () => done({ kind: "skip" }));
        },
      );

      req.on("error", (err: Error) => {
        clearTimeout(timer);
        const isSsrf = err.message.startsWith("SSRF_BLOCKED");
        if (isSsrf) {
          logger.warn({ url: currentUrl }, "discovery-engine: SSRF blocked at connect time — skipping");
        } else {
          logger.warn({ url: currentUrl, msg: err.message }, "discovery-engine: link fetch failed");
        }
        done({ kind: "skip" });
      });

      req.end();
    });

    if (result.kind === "skip") return null;

    if (result.kind === "redirect") {
      // Resolve relative redirect against the current URL, then loop
      try {
        currentUrl = new URL(result.location, currentUrl).toString();
      } catch {
        logger.warn({ location: result.location }, "discovery-engine: invalid redirect Location — skipping");
        return null;
      }
      continue;
    }

    // result.kind === "body"
    return result.html;
  }

  return null;
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
