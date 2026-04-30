// confidence-scorer.ts
// Pure function — no DB calls, no side effects, no I/O.
// Computes a 6-factor heuristic confidence score (0.00–1.00) for AI-structured
// supplier profiles. Score reflects data quality and completeness; used to
// prioritise review queues and feed public_trust_score.
//
// Factors (each contributes 1/6):
//   1. Website resolvable    — sourceUrl present and valid http(s) URL
//   2. Name normalised       — normalizedName set and differs meaningfully from raw input
//   3. Location recognised   — municipio matches a known Colombian municipio
//   4. Category matched      — categoryHint maps to the agricultural taxonomy
//   5. Contact info present  — whatsappNumber or email provided
//   6. AI output clean       — AI returned ≤ expected field count (no discarded extras)

export interface ConfidenceScorerInput {
  nombreCompleto: string;
  municipio: string;
  sourceUrl?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  categoryHint?: string | null;
  normalizedName?: string | null;
  aiRawFieldCount?: number;
}

// Expected top-level field count from the AI enrichment schema prompt.
const EXPECTED_AI_FIELD_COUNT = 7;

// Representative Colombian municipios (major cities, departments, and key
// coffee / cacao / avocado producing municipalities).
// Normalised: lowercase ASCII (diacritics stripped) for comparison.
const KNOWN_MUNICIPIOS = new Set([
  "bogota", "medellin", "cali", "barranquilla", "cartagena", "cucuta",
  "bucaramanga", "pereira", "manizales", "ibague", "santa marta",
  "villavicencio", "pasto", "monteria", "sincelejo", "valledupar",
  "armenia", "popayan", "neiva", "tunja", "florencia", "riohacha",
  "quibdo", "mocoa", "san jose del guaviare", "mitu", "puerto carreno",
  "leticia", "inirida", "yopal", "arauca",
  // Coffee axis
  "bello", "envigado", "itagui", "rionegro", "santa barbara", "andes",
  "jardin", "la ceja", "caldas", "fredonia", "jerico", "urrao",
  "chinchina", "villamaria", "palestina", "neira", "la dorada",
  "anserma", "riosucio", "manzanares", "pensilvania",
  "circasia", "montenegro", "salento", "pijao", "calarca", "filandia",
  "genova", "la tebaida", "quimbaya", "buenavista",
  "la plata", "pitalito", "gigante", "campoalegre", "timana",
  "garzon", "san agustin", "isnos", "saladoblanco",
  // Cacao / tropical fruit regions
  "tumaco", "barbacoas", "san andres de tumaco", "magangue",
  "san pablo", "cantagallo", "tiquisio", "hatillo de loba",
  "el carmen de bolivar", "ovejas", "colosso", "chalan",
  "aracataca", "cienaga", "fundacion", "algarrobo",
  "caucasia", "montelibano", "planeta rica", "tierralta",
  "apartado", "turbo", "chigorodo", "carepa", "mutata",
  // Avocado regions
  "granada", "san carlos", "guatape", "san rafael", "alejandria",
  "marinilla", "el santuario", "el penol", "guarne",
  "trujillo", "bugalagrande", "andalucia", "tuluá",
  "zarzal", "la victoria", "obando", "cartago",
  // Sugarcane / panela
  "palmira", "pradera", "florida", "candelaria", "miranda", "corinto",
  "santander de quilichao", "caldono", "el tambo", "rosas",
  "la sierra", "piendamo", "toribio",
  // Yuca / platano (Llanos / Caribe)
  "restrepo", "cumaral", "puerto lopez", "puerto gaitan",
  "acacias", "guamal", "castilla la nueva", "el castillo",
]);

// Agricultural product taxonomy — matches the platform's category vocabulary
// plus common Colombian crop terms.
const AGRICULTURAL_TAXONOMY = new Set([
  // Platform canonical categories
  "coffee", "cacao", "cocoa", "avocado", "exotic_fruit", "superfood",
  "processed", "textile", "other",
  // Spanish synonyms and common Colombian terms
  "cafe", "cacao", "aguacate", "platano", "banana", "banano",
  "yuca", "mandioca", "panela", "caña", "cana", "azucar",
  "frijol", "maiz", "papa", "tomate", "arroz",
  "maracuya", "gulupa", "uchuva", "mora", "lulo",
  "pitahaya", "guanabana", "guayaba", "arandanos",
  "carne", "carne bovina", "leche", "queso", "miel", "beeswax",
  "quinua", "quinoa", "chia", "amaranto",
  "aceite de palma", "palma de aceite", "palm oil",
  "cacao fino", "cacao de aroma", "specialty coffee",
  "chocolate", "mermelada", "frutas deshidratadas",
  "hortalizas", "verduras", "flores", "cut flowers",
  "algodón", "algodon", "cotton", "sisal", "fique",
]);

// ── Public API ────────────────────────────────────────────────────────────────

export function computeConfidenceScore(input: ConfidenceScorerInput): number {
  let earned = 0;

  // Factor 1: Website resolvable
  if (input.sourceUrl && /^https?:\/\/.{3,}/.test(input.sourceUrl.trim())) {
    earned++;
  }

  // Factor 2: Name normalised cleanly
  // normalizedName must be present, trimmed, and differ from the raw input
  // (indicating the AI actually reformatted it, not just echoed it).
  if (
    input.normalizedName &&
    input.normalizedName.trim() &&
    input.normalizedName.trim().toLowerCase() !==
      input.nombreCompleto.trim().toLowerCase()
  ) {
    earned++;
  }

  // Factor 3: Location matches a known Colombian municipio
  const municipioNorm = stripDiacritics(input.municipio.trim().toLowerCase());
  if (KNOWN_MUNICIPIOS.has(municipioNorm)) {
    earned++;
  }

  // Factor 4: Category matched agricultural taxonomy
  const categoryNorm = stripDiacritics(
    (input.categoryHint ?? "").trim().toLowerCase().replace(/_/g, " "),
  );
  if (categoryNorm && AGRICULTURAL_TAXONOMY.has(categoryNorm)) {
    earned++;
  }

  // Factor 5: Contact info present (WhatsApp or email)
  if (input.whatsappNumber || input.email) {
    earned++;
  }

  // Factor 6: AI output had no discarded extra fields
  // If aiRawFieldCount is not provided (enrichment skipped) the factor is omitted
  // from scoring (denominator stays 6 to avoid inflating scores for unenriched suppliers).
  if (
    input.aiRawFieldCount !== undefined &&
    input.aiRawFieldCount <= EXPECTED_AI_FIELD_COUNT
  ) {
    earned++;
  }

  return Math.round((earned / 6) * 100) / 100;
}

// ── computePublicTrustScore ───────────────────────────────────────────────────
// Derived from signals safe for public display — no internal admin/AI metadata.
// Inputs are columns already present on the supplier record (no extra DB query needed).

export function computePublicTrustScore(supplier: {
  sourceUrl?: string | null;
  normalizedName?: string | null;
  description?: string | null;
  municipio?: string | null;
  claimStatus?: string | null;
}): number {
  let earned = 0;

  // Signal 1: Has a verified web presence
  if (supplier.sourceUrl && /^https?:\/\/.{3,}/.test(supplier.sourceUrl.trim())) {
    earned++;
  }

  // Signal 2: AI-normalised name available (structured profile)
  if (supplier.normalizedName && supplier.normalizedName.trim()) {
    earned++;
  }

  // Signal 3: Profile description available (enriched)
  if (supplier.description && supplier.description.trim().length > 20) {
    earned++;
  }

  // Signal 4: Located in a recognised Colombian municipio
  if (supplier.municipio) {
    const norm = stripDiacritics(supplier.municipio.trim().toLowerCase());
    if (KNOWN_MUNICIPIOS.has(norm)) earned++;
  }

  // Signal 5: Supplier identity claimed (highest-trust signal — owner verified)
  if (supplier.claimStatus === "CLAIMED") {
    earned++;
  }

  return Math.round((earned / 5) * 100) / 100;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
