import { pgTable, text, uuid, integer, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { suppliersTable } from "./suppliers";

export const economicsTable = pgTable(
  "economics",
  {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    supplierId: uuid("supplier_id")
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
    interesCanalpremium: boolean("interes_canal_premium"),
    conocePrecioExportacion: boolean("conoce_precio_exportacion"),
    haIntentadoExportar: boolean("ha_intentado_exportar"),
  },
  (t) => [index("economics_supplier_id_idx").on(t.supplierId)]
);

export type Economics = typeof economicsTable.$inferSelect;
export type InsertEconomics = typeof economicsTable.$inferInsert;
