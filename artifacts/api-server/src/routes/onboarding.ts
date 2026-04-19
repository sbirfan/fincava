import { Router, type IRouter } from "express";
import { db, suppliersTable, farmsTable, economicsTable, interactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const OnboardBody = z.object({
  nombre_completo: z.string().min(1),
  whatsapp_number: z.string().regex(/^\+57/),
  municipio: z.string().min(1),
  vereda: z.string().optional(),
  consent_given: z.boolean(),
  supplier_type: z.string().optional(),
  registered_by: z.string().optional(),

  cultivo_principal: z.string().optional(),
  variedad_cafe: z.string().optional(),
  hectareas_produccion: z.number().positive().max(200).optional(),
  edad_plantas_anos: z.number().int().min(0).optional(),
  cosechas_por_ano: z.number().int().min(1).max(3).optional(),
  metodo_secado: z.string().optional(),
  acceso_agua: z.string().optional(),
  tenencia_tierra: z.string().optional(),

  tipo_comprador: z.string().optional(),
  volumen_kg_ultima_cosecha: z.number().int().min(0).optional(),
  precio_venta_banda: z.string().optional(),
  interes_canal_premium: z.boolean().optional(),

  deuda_actual: z.string().optional(),
  uso_capital: z.array(z.string()).optional(),
  personas_dependientes: z.number().int().min(0).optional(),
  situacion_economica: z.string().optional(),

  disposicion_cambiar: z.number().int().min(1).max(5).optional(),
  horizonte_inversion: z.string().optional(),
  meta_principal_12m: z.string().optional(),
  principales_desafios: z.array(z.string()).optional(),

  salud_plantas: z.string().optional(),
  infraestructura_postcosecha: z.string().optional(),
  acceso_vial: z.string().optional(),
  disposicion_agricultor: z.string().optional(),
  potencial_general: z.number().int().min(1).max(5).optional(),
  notas_officer: z.string().optional(),
});

router.post("/suppliers/onboard", async (req, res): Promise<void> => {
  const parsed = OnboardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;

  const existing = await db
    .select({ id: suppliersTable.id })
    .from(suppliersTable)
    .where(eq(suppliersTable.whatsappNumber, data.whatsapp_number))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({
      error: "Este número ya está registrado",
      supplierId: existing[0].id,
    });
    return;
  }

  let supplier: typeof suppliersTable.$inferSelect;
  try {
    const [inserted] = await db
      .insert(suppliersTable)
      .values({
        nombreCompleto: data.nombre_completo,
        whatsappNumber: data.whatsapp_number,
        municipio: data.municipio,
        vereda: data.vereda,
        supplierType: data.supplier_type ?? "farmer",
        registeredBy: data.registered_by ?? "self",
        status: "active",
        consentGiven: data.consent_given,
        consentDate: data.consent_given ? new Date() : undefined,
      })
      .returning();
    supplier = inserted;
  } catch (err: any) {
    if (err?.code === "23505") {
      const [found] = await db
        .select({ id: suppliersTable.id })
        .from(suppliersTable)
        .where(eq(suppliersTable.whatsappNumber, data.whatsapp_number))
        .limit(1);
      res.status(409).json({
        error: "Este número ya está registrado",
        supplierId: found?.id ?? null,
      });
      return;
    }
    throw err;
  }

  await db.insert(farmsTable).values({
    supplierId: supplier.id,
    cultivoPrincipal: data.cultivo_principal,
    variedadCafe: data.variedad_cafe,
    hectareasProduccion: data.hectareas_produccion?.toString(),
    edadPlantasAnos: data.edad_plantas_anos,
    cosechasPorAno: data.cosechas_por_ano,
    metodoSecado: data.metodo_secado,
    accesoAgua: data.acceso_agua,
    tenenciaTierra: data.tenencia_tierra,
  });

  await db.insert(economicsTable).values({
    supplierId: supplier.id,
    tipoComprador: data.tipo_comprador,
    volumenKgUltimaCosecha: data.volumen_kg_ultima_cosecha,
    precioVentaBanda: data.precio_venta_banda,
    deudaActual: data.deuda_actual,
    usoCapital: data.uso_capital ?? [],
    personasDependientes: data.personas_dependientes,
    situacionEconomica: data.situacion_economica,
    interesCanalpremium: data.interes_canal_premium,
  });

  const goalsMeta: Record<string, unknown> = {
    disposicion_cambiar: data.disposicion_cambiar,
    horizonte_inversion: data.horizonte_inversion,
    meta_principal_12m: data.meta_principal_12m,
    principales_desafios: data.principales_desafios,
  };

  const officerMeta: Record<string, unknown> = {};
  const hasOfficerData =
    data.salud_plantas ||
    data.infraestructura_postcosecha ||
    data.acceso_vial ||
    data.disposicion_agricultor ||
    data.potencial_general ||
    data.notas_officer;

  if (hasOfficerData) {
    officerMeta.salud_plantas = data.salud_plantas;
    officerMeta.infraestructura_postcosecha = data.infraestructura_postcosecha;
    officerMeta.acceso_vial = data.acceso_vial;
    officerMeta.disposicion_agricultor = data.disposicion_agricultor;
    officerMeta.potencial_general = data.potencial_general;
    officerMeta.notas_officer = data.notas_officer;
  }

  await db.insert(interactionsTable).values({
    supplierId: supplier.id,
    interactionType: "onboarding",
    actor: data.registered_by ?? "self",
    notes: data.notas_officer,
    metadata: {
      goals: goalsMeta,
      ...(hasOfficerData ? { officer: officerMeta } : {}),
    },
  });

  res.status(201).json({
    success: true,
    supplierId: supplier.id,
    nombre: data.nombre_completo,
  });
});

export default router;
