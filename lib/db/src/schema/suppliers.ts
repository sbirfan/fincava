/**
 * ENUM VOCABULARY — Phase 1 State Machine (memo v1.0)
 *
 * supplier_status      ACTIVE | INACTIVE | PENDING
 *   Legacy operational flag. Preserved for backward compatibility.
 *   Do NOT use for the Phase 1 graduation flow.
 *
 * eligibility_status   PASS | FAIL
 *   Output of the eligibility gate. Set by the scoring engine after
 *   evaluating compliance docs and farm data.
 *
 * sellable_status      NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED
 *   Canonical Phase 1 state machine. Drives which suppliers appear
 *   on the marketplace and at what commercial readiness level.
 *     NOT_READY  — onboarded but not yet evaluated
 *     ELIGIBLE   — passed eligibility gate, not yet commercially scored
 *     SELLABLE   — commercially scored, ready for buyer matching
 *     PUBLISHED  — live on marketplace
 *
 * graduation_pathway   A | B | C | D
 *   Pathway assigned by the scoring engine. Determines the graduation
 *   roadmap and financing products available to the supplier.
 *   Distinct from ai_outputs.pathway (free-text AI rationale field).
 *
 * Rationale: canonical vocabulary avoids VERIFIED, SCORING_COMPLETE,
 * IN_PROGRESS, EXPORT_READY — those terms are NOT part of this model.
 */

import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
  smallint,
  decimal,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  check,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const supplierTypeEnum = pgEnum("supplier_type", [
  "FARMER",
  "COOPERATIVE",
  "EXPORTER",
  "PROCESSOR",
  "DISTRIBUTOR",
  "OTHER",
]);

export const supplierStatusEnum = pgEnum("supplier_status", [
  "ACTIVE",
  "INACTIVE",
  "PENDING",
]);

// ── Phase 1 state machine enums ───────────────────────────────────────────────

export const eligibilityStatusEnum = pgEnum("eligibility_status", [
  "PASS",
  "FAIL",
]);

// NOTE:
// sellable_status is enforced via PostgreSQL ENUM.
// Allowed values: NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED
// This is the single source of truth for supplier lifecycle.
// Do NOT introduce alternate lifecycle naming or CHECK constraints.
export const sellableStatusEnum = pgEnum("sellable_status", [
  "NOT_READY",
  "ELIGIBLE",
  "SELLABLE",
  "PUBLISHED",
  "INACTIVE",
]);

export const graduationPathwayEnum = pgEnum("graduation_pathway", [
  "A",
  "B",
  "C",
  "D",
]);

// ── Ingestion enums ───────────────────────────────────────────────────────────

export const claimStatusEnum = pgEnum("claim_status", [
  "UNCLAIMED",
  "PENDING_CLAIM",
  "CLAIMED",
]);

export const ingestionSourceEnum = pgEnum("ingestion_source", [
  "FIELD_COLLECTED",
  "ADMIN_ENTRY",
  "WEB_SCRAPE",
  "PARTNER_IMPORT",
]);

export const ingestionStatusEnum = pgEnum("ingestion_status", [
  "DRAFT",
  "ENRICHED",
  "READY",
  "REJECTED",
]);

export const batchStatusEnum = pgEnum("batch_status", [
  "DRAFT",
  "SUBMITTED",
  "ROLLED_BACK",
]);

// ── supplier_ingestion_batches (must be defined before suppliersTable for FK) ─

export const supplierIngestionBatchesTable = pgTable(
  "supplier_ingestion_batches",
  {
    id: serial("id").primaryKey(),
    batchUuid: varchar("batch_uuid", { length: 36 }).notNull().unique(),
    createdByAdminId: integer("created_by_admin_id")
      .notNull()
      .references(() => usersTable.id),
    status: batchStatusEnum("status").notNull().default("DRAFT"),
    batchSize: integer("batch_size"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
);

// ─────────────────────────────────────────────────────────────────────────────

// ARCHITECTURE NOTE: suppliers was originally a standalone entity (no FK to users).
// Phase 1 suppliers are onboarded via WhatsApp with no user account.
// userId is added as a nullable FK: set during web self-registration and backfilled
// by email match for existing suppliers. NULL = legacy / field-collected supplier.
// Do NOT make userId non-null or unique — field-collected suppliers never have one.
export const suppliersTable = pgTable(
  "suppliers",
  {
    id: serial("id").primaryKey(),
    // Nullable FK to users. Set during supplier self-registration;
    // NULL for field-collected / ingested suppliers without a user account.
    userId: integer("user_id").references(() => usersTable.id),
    nombreCompleto: text("nombre_completo").notNull(),
    // Nullable: ingested suppliers may not have a WhatsApp number yet.
    // Partial UNIQUE index (non-null rows only) enforced in the table callback below.
    whatsappNumber: text("whatsapp_number"),
    email: text("email"),
    municipio: text("municipio").notNull(),
    department: text("department"),
    vereda: text("vereda"),
    supplierType: supplierTypeEnum("supplier_type").notNull().default("FARMER"),
    registeredBy: text("registered_by"),
    status: supplierStatusEnum("status").notNull().default("ACTIVE"),
    consentGiven: boolean("consent_given").notNull().default(false),
    consentDate: timestamp("consent_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // ── Phase 1 state machine columns (all nullable for existing rows) ─────
    eligibilityStatus: eligibilityStatusEnum("eligibility_status"),
    commercialScore: integer("commercial_score"),
    sellableStatus: sellableStatusEnum("sellable_status"),
    graduationPathway: graduationPathwayEnum("graduation_pathway"),
    nextActions: jsonb("next_actions"),
    commercialScoreAtOnboarding: integer("commercial_score_at_onboarding"),
    lastEvaluatedAt: timestamp("last_evaluated_at", { withTimezone: true }),
    thresholdVersion: varchar("threshold_version", { length: 64 }),

    // ── Ingestion columns (all nullable — invisible to existing field-collected suppliers) ──
    normalizedName: text("normalized_name"),
    description: text("description"),
    sourceUrl: text("source_url"),
    sourceType: text("source_type"),
    supplierFingerprint: text("supplier_fingerprint"),
    claimStatus: claimStatusEnum("claim_status").default("UNCLAIMED"),
    claimToken: text("claim_token"),
    ingestionSource: ingestionSourceEnum("ingestion_source").default("FIELD_COLLECTED"),
    ingestionStatus: ingestionStatusEnum("ingestion_status"),
    createdByAdminId: integer("created_by_admin_id").references(() => usersTable.id),
    batchId: integer("batch_id").references(() => supplierIngestionBatchesTable.id),
    country: text("country").default("Colombia"),
    dataCompletenessScore: decimal("data_completeness_score", { precision: 5, scale: 2 }),
    confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
    // Free-text label populated when supplierType = 'OTHER'.
    // Used to track what admins are entering so new enum values can be added over time.
    customSupplierType: varchar("custom_supplier_type", { length: 120 }),

    // ── Origin Stories publishing ─────────────────────────────────────────────
    // Set to true when an admin explicitly publishes this ingestion-sourced
    // supplier to the public /origin-stories page.
    publishedToOriginStories: boolean("published_to_origin_stories").notNull().default(false),
    originStoryImageUrl: text("origin_story_image_url"),
  },
  (t) => [
    // Partial unique index: enforces uniqueness only for non-null WhatsApp numbers.
    // Ingested suppliers without a number can coexist without violating the constraint.
    uniqueIndex("suppliers_whatsapp_unique_idx")
      .on(t.whatsappNumber)
      .where(sql`whatsapp_number IS NOT NULL`),
    // NOTE:
    // Partial index on sellable_status scoped to SELLABLE/PUBLISHED.
    // Optimized for marketplace and admin queries.
    // If new states are introduced or query patterns change,
    // re-evaluate index coverage before modifying.
    index("suppliers_sellable_status_idx")
      .on(t.sellableStatus)
      .where(sql`sellable_status = ANY (ARRAY['SELLABLE'::sellable_status, 'PUBLISHED'::sellable_status])`),
    check(
      "data_completeness_score_range",
      sql`data_completeness_score IS NULL OR (data_completeness_score >= 0 AND data_completeness_score <= 100)`,
    ),
    check(
      "confidence_score_range",
      sql`confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)`,
    ),
  ],
);

export const farmsTable = pgTable("farms", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliersTable.id),
  cultivoPrincipal: text("cultivo_principal"),
  variedadCafe: text("variedad_cafe"),
  hectareasProduccion: decimal("hectareas_produccion", {
    precision: 6,
    scale: 2,
  }),
  edadPlantasAnos: integer("edad_plantas_anos"),
  cosechasPorAno: integer("cosechas_por_ano"),
  metodoSecado: text("metodo_secado"),
  accesoAgua: text("acceso_agua"),
  anosEnFinca: integer("anos_en_finca"),
  tenenciaTierra: text("tenencia_tierra"),
  asistenciaTecnica: text("asistencia_tecnica"),
});

export const economicsTable = pgTable("economics", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliersTable.id),
  tipoComprador: text("tipo_comprador"),
  volumenKgUltimaCosecha: integer("volumen_kg_ultima_cosecha"),
  precioVentaBanda: text("precio_venta_banda"),
  tiempoPagoDias: integer("tiempo_pago_dias"),
  deudaActual: text("deuda_actual"),
  usoCapital: text("uso_capital").array(),
  comodidadPagos: text("comodidad_pagos"),
  personasDependientes: integer("personas_dependientes"),
  otrasFuentesIngreso: text("otras_fuentes_ingreso"),
  situacionEconomica: text("situacion_economica"),
  interesCanalPremium: boolean("interes_canal_premium"),
  conocePrecioExportacion: boolean("conoce_precio_exportacion"),
  haIntentadoExportar: boolean("ha_intentado_exportar"),
});

export const complianceDocsTable = pgTable("compliance_docs", {
  id: serial("id").primaryKey(),
  // 1:1 relationship with supplier
  // This table represents the CURRENT compliance state (not historical)
  // Enforced via UNIQUE constraint on supplier_id
  // If compliance history is required in future:
  // → introduce compliance_docs_history table instead of removing constraint
  supplierId: integer("supplier_id")
    .notNull()
    .unique()
    .references(() => suppliersTable.id),
  rutDian: boolean("rut_dian").notNull().default(false),
  icaRegistro: boolean("ica_registro").notNull().default(false),
  fitosanitarioCert: boolean("fitosanitario_cert").notNull().default(false),
  dianExportador: boolean("dian_exportador").notNull().default(false),
  complianceScore: smallint("compliance_score"),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
});

export const aiOutputsTable = pgTable(
  "ai_outputs",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    aiModel: text("ai_model"),
    callType: text("call_type"),
    exportReadinessScore: smallint("export_readiness_score"),
    pathway: text("pathway"),
    capitalCapacityCop: integer("capital_capacity_cop"),
    complianceGaps: text("compliance_gaps"),
    gapAnalysis: text("gap_analysis"),
    documentContent: text("document_content"),
    whatsappMessageSent: text("whatsapp_message_sent"),
  },
  (t) => [index("ai_outputs_supplier_idx").on(t.supplierId)],
);

export const interactionsTable = pgTable(
  "interactions",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    interactionType: text("interaction_type"),
    actor: text("actor"),
    notes: text("notes"),
    metadata: jsonb("metadata"),
  },
  (t) => [index("interactions_supplier_idx").on(t.supplierId)],
);

// ── supplier_contacts ─────────────────────────────────────────────────────────
// Stores individual contact details (phone, email, social) per supplier.
// UNIQUE on (supplier_id, contact_type) — one canonical value per channel.

export const supplierContactsTable = pgTable(
  "supplier_contacts",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id),
    contactType: text("contact_type").notNull(), // e.g. "whatsapp" | "email" | "phone"
    contactValue: text("contact_value"),
    source: text("source"),                    // where this contact was found
    consentStatus: text("consent_status").default("UNKNOWN"),
    approvedForOutreach: boolean("approved_for_outreach").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("supplier_contacts_type_unique_idx").on(t.supplierId, t.contactType),
  ],
);

// ── product_placeholders ──────────────────────────────────────────────────────
// Lightweight product hints inferred from ingestion data.
// No price, MOQ, or quantity — those require supplier confirmation in T2.

export const productPlaceholdersTable = pgTable("product_placeholders", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliersTable.id),
  categoryHint: text("category_hint"),         // e.g. "coffee" | "cacao"
  dataOrigin: text("data_origin").notNull().default("inferred"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Zod + TypeScript exports ──────────────────────────────────────────────────

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliersTable.$inferSelect;
export type AiOutput = typeof aiOutputsTable.$inferSelect;
export type SupplierIngestionBatch = typeof supplierIngestionBatchesTable.$inferSelect;
export type SupplierContact = typeof supplierContactsTable.$inferSelect;
export type ProductPlaceholder = typeof productPlaceholdersTable.$inferSelect;
