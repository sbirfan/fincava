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
} from "drizzle-orm/pg-core";
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

export const suppliersTable = pgTable(
  "suppliers",
  {
    id: serial("id").primaryKey(),
    nombreCompleto: text("nombre_completo").notNull(),
    whatsappNumber: text("whatsapp_number").notNull().unique(),
    municipio: text("municipio").notNull(),
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
  },
  (t) => [index("suppliers_whatsapp_idx").on(t.whatsappNumber)],
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
  supplierId: integer("supplier_id")
    .notNull()
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
