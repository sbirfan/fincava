import { pgTable, text, uuid, decimal, integer, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { suppliersTable } from "./suppliers";

export const farmsTable = pgTable(
  "farms",
  {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliersTable.id),
    cultivoPrincipal: text("cultivo_principal"),
    variedadCafe: text("variedad_cafe"),
    hectareasProduccion: decimal("hectareas_produccion", { precision: 10, scale: 2 }),
    edadPlantasAnos: integer("edad_plantas_anos"),
    cosechasPorAno: integer("cosechas_por_ano"),
    metodoSecado: text("metodo_secado"),
    accesoAgua: text("acceso_agua"),
    anosEnFinca: integer("anos_en_finca"),
    tenenciaTierra: text("tenencia_tierra"),
    asistenciaTecnica: text("asistencia_tecnica"),
  },
  (t) => [index("farms_supplier_id_idx").on(t.supplierId)]
);

export type Farm = typeof farmsTable.$inferSelect;
export type InsertFarm = typeof farmsTable.$inferInsert;
