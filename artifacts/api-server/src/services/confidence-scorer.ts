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

// ── Lookup key normalisation ──────────────────────────────────────────────────
// Applied to BOTH dictionary entries AND inputs so comparisons are consistent:
//   • lowercase
//   • diacritics stripped (NFD + remove combining marks)
//   • underscores → spaces  (handles "exotic_fruit" == "exotic fruit")
function normalizeLookupKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Representative Colombian municipios (major cities, departments, and key
// coffee / cacao / avocado producing municipalities).
// Raw entries may include accented characters — all are normalised at build time.
const RAW_MUNICIPIOS = [
  "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Cúcuta",
  "Bucaramanga", "Pereira", "Manizales", "Ibagué", "Santa Marta",
  "Villavicencio", "Pasto", "Montería", "Sincelejo", "Valledupar",
  "Armenia", "Popayán", "Neiva", "Tunja", "Florencia", "Riohacha",
  "Quibdó", "Mocoa", "San José del Guaviare", "Mitú", "Puerto Carreño",
  "Leticia", "Inírida", "Yopal", "Arauca",
  // Coffee axis
  "Bello", "Envigado", "Itagüí", "Rionegro", "Santa Bárbara", "Andes",
  "Jardín", "La Ceja", "Caldas", "Fredonia", "Jericó", "Urrao",
  "Chinchiná", "Villamaría", "Palestina", "Neira", "La Dorada",
  "Anserma", "Riosucio", "Manzanares", "Pensilvania",
  "Circasia", "Montenegro", "Salento", "Pijao", "Calarcá", "Filandia",
  "Génova", "La Tebaida", "Quimbaya", "Buenavista",
  "La Plata", "Pitalito", "Gigante", "Campoalegre", "Timaná",
  "Garzón", "San Agustín", "Isnos", "Saladoblanco",
  // Cacao / tropical fruit regions
  "Tumaco", "Barbacoas", "San Andrés de Tumaco", "Magangué",
  "San Pablo", "Cantagallo", "Tiquisio", "Hatillo de Loba",
  "El Carmen de Bolívar", "Ovejas", "Colosó", "Chalán",
  "Aracataca", "Ciénaga", "Fundación", "Algarrobo",
  "Caucasia", "Montelíbano", "Planeta Rica", "Tierralta",
  "Apartadó", "Turbo", "Chigorodó", "Carepa", "Mutatá",
  // Avocado regions
  "Granada", "San Carlos", "Guatapé", "San Rafael", "Alejandría",
  "Marinilla", "El Santuario", "El Peñol", "Guarne",
  "Trujillo", "Bugalagrande", "Andalucía", "Tuluá",
  "Zarzal", "La Victoria", "Obando", "Cartago",
  // Sugarcane / panela
  "Palmira", "Pradera", "Florida", "Candelaria", "Miranda", "Corinto",
  "Santander de Quilichao", "Caldono", "El Tambo", "Rosas",
  "La Sierra", "Piendamó", "Toribío",
  // Yuca / plátano (Llanos / Caribe)
  "Restrepo", "Cumaral", "Puerto López", "Puerto Gaitán",
  "Acacías", "Guamal", "Castilla la Nueva", "El Castillo",
];
const KNOWN_MUNICIPIOS = new Set(RAW_MUNICIPIOS.map(normalizeLookupKey));

// Agricultural product taxonomy — matches the platform's category vocabulary
// plus common Colombian crop terms.
// Raw entries may use underscores (canonical forms) or accented characters —
// all normalised at build time so "exotic_fruit" == "exotic fruit" in lookups.
const RAW_TAXONOMY = [
  // Platform canonical categories
  "coffee", "cacao", "cocoa", "avocado", "exotic_fruit", "superfood",
  "processed", "textile", "other",
  // Spanish synonyms and common Colombian terms
  "café", "cacao", "aguacate", "plátano", "banana", "banano",
  "yuca", "mandioca", "panela", "caña", "cana", "azúcar",
  "frijol", "maíz", "papa", "tomate", "arroz",
  "maracuyá", "gulupa", "uchuva", "mora", "lulo",
  "pitahaya", "guanábana", "guayaba", "arándanos",
  "carne", "carne bovina", "leche", "queso", "miel", "beeswax",
  "quinua", "quinoa", "chía", "amaranto",
  "aceite de palma", "palma de aceite", "palm oil",
  "cacao fino", "cacao de aroma", "specialty coffee",
  "chocolate", "mermelada", "frutas deshidratadas",
  "hortalizas", "verduras", "flores", "cut flowers",
  "algodón", "algodon", "cotton", "sisal", "fique",
];
const AGRICULTURAL_TAXONOMY = new Set(RAW_TAXONOMY.map(normalizeLookupKey));

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
  const municipioNorm = normalizeLookupKey(input.municipio);
  if (KNOWN_MUNICIPIOS.has(municipioNorm)) {
    earned++;
  }

  // Factor 4: Category matched agricultural taxonomy
  // normalizeLookupKey handles underscore→space so "exotic_fruit" == "exotic fruit"
  const categoryNorm = normalizeLookupKey(input.categoryHint ?? "");
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
    if (KNOWN_MUNICIPIOS.has(normalizeLookupKey(supplier.municipio))) earned++;
  }

  // Signal 5: Supplier identity claimed (highest-trust signal — owner verified)
  if (supplier.claimStatus === "CLAIMED") {
    earned++;
  }

  return Math.round((earned / 5) * 100) / 100;
}
