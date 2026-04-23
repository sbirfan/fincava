/**
 * SupplierOnboardingInput — Structured Onboarding Schema
 *
 * Definition layer only. This interface does NOT modify DB schema or routes.
 * Purpose: improve data quality and provide a typed contract for AI scoring
 * and evaluation inputs.
 *
 * Usage: validate incoming body against this shape before persisting.
 *
 * DB mapping and gap notes are documented per field.
 * See also: ops/onboarding_flow.md, ops/supplier_persona_raw.md
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

/** Supported country of operation. Colombia is the only value in Phase 1. */
export type SupplierCountry = "CO";

/** Primary product category. Maps loosely to farms.cultivo_principal (free text). */
export type ProductType =
  | "coffee"
  | "cacao"
  | "plantain"
  | "banana"
  | "other";

/** Calendar month identifier for harvest cycle. */
export type HarvestMonth =
  | "jan" | "feb" | "mar" | "apr" | "may" | "jun"
  | "jul" | "aug" | "sep" | "oct" | "nov" | "dec";

/**
 * Coffee and crop processing methods.
 * Maps to farms.metodo_secado (drying method — semantic overlap, not identical).
 * Note: DB column name is "drying method", not "processing method".
 */
export type ProcessingMethod =
  | "washed"
  | "natural"
  | "honey"
  | "anaerobic"
  | "semi_washed"
  | "other";

// ── Interface ─────────────────────────────────────────────────────────────────

export interface SupplierOnboardingInput {

  // ── A. Identity ─────────────────────────────────────────────────────────────

  /**
   * Full legal name of the supplier or organization.
   * Required. No validation beyond non-empty.
   *
   * DB: suppliers.nombre_completo (text, NOT NULL)
   * Mapping: direct
   */
  fullName: string;

  /**
   * WhatsApp-capable phone number in E.164 format (e.g. +573001234567).
   * Required. Must be unique — duplicate triggers 409.
   *
   * DB: suppliers.whatsapp_number (text, NOT NULL, UNIQUE)
   * Mapping: direct
   * Validation: non-empty; E.164 format recommended
   */
  phone: string;

  /**
   * Contact email address.
   * Optional.
   *
   * DB: NONE — no email column exists in any table.
   * GAP: Field not yet persisted. Would require schema change or interactions.metadata.
   * Action required: store in interactions.metadata until schema adds column.
   */
  email?: string;

  /**
   * Country of operation. Currently Colombia only.
   * Required.
   *
   * DB: NONE — no country column exists.
   * MISMATCH: DB stores municipio (city) and department, not country.
   * Colombia is structurally implied. This field serves as input validation only.
   * Mapping: no direct column; validate = "CO" only.
   */
  country: SupplierCountry;

  // ── B. Farm Profile ──────────────────────────────────────────────────────────

  /**
   * Total productive farm area in hectares.
   * Required. Must be > 0.
   *
   * DB: farms.hectareas_produccion (decimal 6,2)
   * Mapping: direct; convert number to string for Drizzle decimal insert
   * Validation: number > 0, max reasonable value ~= 10000
   */
  farmSizeHectares: number;

  /**
   * Geographic region — municipio name or department.
   * Required.
   *
   * DB: MISMATCH — maps to TWO columns:
   *   suppliers.municipio (required, text)
   *   suppliers.department (optional, text)
   * Recommendation: split into locationMunicipio + locationDepartment
   * in the next schema iteration. For now, store full value in municipio.
   */
  locationRegion: string;

  /**
   * Farm altitude above sea level in meters.
   * Optional. Relevant for coffee quality assessment.
   *
   * DB: NONE — no altitude column in farms or any table.
   * GAP: Not persisted today. Relevant for AI scoring context.
   * Action required: add farms.altitude_meters or store in interactions.metadata.
   */
  altitudeMeters?: number;

  /**
   * Years of farming experience.
   * Required. Must be >= 0.
   *
   * DB: farms.anos_en_finca (integer) — "years on this farm"
   * Mapping: best available match; semantic overlap (experience ≈ years on farm)
   * Note: farms.edad_plantas_anos (plant age) is a different concept — do not use.
   * Validation: integer >= 0
   */
  yearsOfExperience: number;

  // ── C. Production ────────────────────────────────────────────────────────────

  /**
   * Primary product type.
   * Required.
   *
   * DB: farms.cultivo_principal (text, free-form)
   * Mapping: enum → text; store enum value as-is.
   * Note: DB column is unconstrained text. This enum enforces valid values
   * at the interface layer only.
   */
  productType: ProductType;

  /**
   * Approximate monthly production volume in kilograms.
   * Required. Must be > 0.
   *
   * DB: economics.volumen_kg_ultima_cosecha (integer)
   * SEMANTIC MISMATCH: DB column represents ANNUAL harvest volume (last harvest),
   * not monthly. Monthly × 12 ≠ annual due to harvest cycles.
   * Current code also inserts this as a string (type mismatch risk).
   * Action required: align on annual vs monthly, fix insert type to integer.
   * For now: store as provided; document intent in interaction notes.
   */
  monthlyVolumeKg: number;

  /**
   * Months in which harvest occurs.
   * Optional. One or more calendar months.
   *
   * DB: NONE — no harvest_months column exists.
   * GAP: Currently mismapped to farms.variedad_cafe (coffee variety) — WRONG column.
   * Action required: add farms.harvest_months (text[]) or store in interactions.metadata.
   * Do NOT write to variedad_cafe.
   */
  harvestMonths?: HarvestMonth[];

  /**
   * Post-harvest processing method.
   * Optional.
   *
   * DB: farms.metodo_secado (text, free-form) — "drying method"
   * SEMANTIC MISMATCH: column is named for drying specifically, not full
   * processing method. Washed/natural/honey are common values.
   * Mapping: enum → text; store enum value as-is.
   */
  processingMethod?: ProcessingMethod;

  // ── D. Compliance Signals ────────────────────────────────────────────────────
  // These EXACTLY match compliance_docs columns. No mismatches.
  // These are written to compliance_docs at onboarding creation time.
  // They are ALSO what the eligibility gate reads (all four must be true).

  /**
   * Registro Único Tributario (RUT) issued by DIAN — tax registration.
   * Required for eligibility gate.
   *
   * DB: compliance_docs.rut_dian (boolean, NOT NULL, default false)
   * Mapping: direct
   */
  rutDian: boolean;

  /**
   * ICA (Instituto Colombiano Agropecuario) registration.
   * Required for eligibility gate.
   *
   * DB: compliance_docs.ica_registro (boolean, NOT NULL, default false)
   * Mapping: direct (icaRegistro → ica_registro)
   * Note: also captured in interactions.metadata.ica_registered (now synced at creation)
   */
  icaRegistro: boolean;

  /**
   * Fitosanitario (phytosanitary) certificate.
   * Required for eligibility gate.
   *
   * DB: compliance_docs.fitosanitario_cert (boolean, NOT NULL, default false)
   * Mapping: direct (fitosanitarioCert → fitosanitario_cert)
   */
  fitosanitarioCert: boolean;

  /**
   * DIAN exporter registration (habilitación como exportador).
   * Optional for eligibility gate — not currently in gate check.
   *
   * DB: compliance_docs.dian_exportador (boolean, NOT NULL, default false)
   * Mapping: direct
   */
  dianExportador: boolean;

  // ── E. Economics ─────────────────────────────────────────────────────────────

  /**
   * Price received per kilogram (in COP or USD — specify unit).
   * Optional.
   *
   * DB: economics.precio_venta_banda (text)
   * TYPE MISMATCH: interface is number; DB is a text "band" (e.g. "800-1000 COP/kg").
   * Action required: either normalise to number in DB or accept text range.
   * For now: convert to string on insert.
   */
  pricePerKg?: number;

  /**
   * Production cost per kilogram.
   * Optional. Useful for margin and viability scoring.
   *
   * DB: NONE — no cost column exists in any table.
   * GAP: Not persisted. Store in interactions.metadata until schema adds column.
   */
  costPerKg?: number;

  /**
   * Minimum order quantity the supplier can fulfill (in kg).
   * Optional. Relevant for buyer matching.
   *
   * DB: NONE — no minimum order column exists.
   * GAP: Not persisted today. Store in interactions.metadata.
   */
  minimumOrderKg?: number;
}

// ── Field Mapping Summary ─────────────────────────────────────────────────────

/**
 * DB_MAPPING — authoritative reference for interface field → DB column
 *
 * Section A — Identity
 *   fullName           → suppliers.nombre_completo          CONFIRMED
 *   phone              → suppliers.whatsapp_number          CONFIRMED
 *   email              → (none)                             GAP
 *   country            → (none — implied Colombia)          MISMATCH (no column)
 *
 * Section B — Farm Profile
 *   farmSizeHectares   → farms.hectareas_produccion         CONFIRMED
 *   locationRegion     → suppliers.municipio (+ department) MISMATCH (1 field → 2 columns)
 *   altitudeMeters     → (none)                             GAP
 *   yearsOfExperience  → farms.anos_en_finca                PARTIAL (semantic)
 *
 * Section C — Production
 *   productType        → farms.cultivo_principal            PARTIAL (enum → free text)
 *   monthlyVolumeKg    → economics.volumen_kg_ultima_cosecha MISMATCH (monthly ≠ annual)
 *   harvestMonths      → (none — currently misrouted)       GAP
 *   processingMethod   → farms.metodo_secado                PARTIAL (semantic)
 *
 * Section D — Compliance (EXACT MATCH — all four confirmed)
 *   rutDian            → compliance_docs.rut_dian           CONFIRMED
 *   icaRegistro        → compliance_docs.ica_registro       CONFIRMED
 *   fitosanitarioCert  → compliance_docs.fitosanitario_cert CONFIRMED
 *   dianExportador     → compliance_docs.dian_exportador    CONFIRMED
 *
 * Section E — Economics
 *   pricePerKg         → economics.precio_venta_banda       MISMATCH (number → text)
 *   costPerKg          → (none)                             GAP
 *   minimumOrderKg     → (none)                             GAP
 */

// ── Gap Registry ─────────────────────────────────────────────────────────────

/**
 * GAPS — fields in this interface with no DB home
 *
 * G1  email            → store in interactions.metadata until column added
 * G2  altitudeMeters   → store in interactions.metadata until farms.altitude_meters added
 * G3  harvestMonths    → store in interactions.metadata (do NOT use variedad_cafe)
 * G4  costPerKg        → store in interactions.metadata
 * G5  minimumOrderKg   → store in interactions.metadata
 *
 * MISMATCHES — fields that map but with semantic or type differences
 *
 * M1  country          → no column; validate = "CO" only; do not persist
 * M2  locationRegion   → split into municipio + department before insert
 * M3  monthlyVolumeKg  → DB is annual; document intent; fix type (number, not string)
 * M4  pricePerKg       → DB is text band; stringify on insert
 * M5  processingMethod → DB is metodo_secado (drying); store enum value as text
 * M6  yearsOfExperience→ DB is anos_en_finca; acceptable semantic overlap
 */
