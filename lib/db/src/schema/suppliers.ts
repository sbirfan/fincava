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
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const supplierTypeEnum = pgEnum("supplier_type", [
  "FARMER",
  "COOPERATIVE",
  "EXPORTER",
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

export const sellableStatusEnum = pgEnum("sellable_status", [
  "NOT_READY",
  "ELIGIBLE",
  "SELLABLE",
  "PUBLISHED",
]);

export const graduationPathwayEnum = pgEnum("graduation_pathway", [
  "A",
  "B",
  "C",
  "D",
]);

// ─────────────────────────────────────────────────────────────────────────────

// ARCHITECTURE NOTE: suppliers is a standalone entity graph (no FK to companies or users).
// Suppliers are onboarded via WhatsApp — they have no user account in Phase 1.
// The bridge column (company_id FK → companies) will be added in Phase 2 when supplier
// login is introduced. Do NOT attempt to JOIN suppliers to products or companies without
// confirming the bridge exists first.
export const suppliersTable = pgTable(
  "suppliers",
  {
    id: serial("id").primaryKey(),
    nombreCompleto: text("nombre_completo").notNull(),
    whatsappNumber: text("whatsapp_number").notNull().unique(),
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
  },
  (t) => [
    index("suppliers_whatsapp_idx").on(t.whatsappNumber),
    // NOTE:
    // Partial index on sellable_status scoped to SELLABLE/PUBLISHED.
    // Optimized for marketplace and admin queries.
    // If new states are introduced or query patterns change,
    // re-evaluate index coverage before modifying.
    index("suppliers_sellable_status_idx")
      .on(t.sellableStatus)
      .where(sql`sellable_status IN ('SELLABLE', 'PUBLISHED')`),
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

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliersTable.$inferSelect;
export type AiOutput = typeof aiOutputsTable.$inferSelect;
