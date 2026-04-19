import crypto from "crypto";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, suppliersTable, farmsTable, economicsTable, interactionsTable } from "@workspace/db";
import { eq, desc, ilike, or, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

function getConfiguredPin(): string | null {
  return process.env["OFFICER_PIN"] ?? null;
}

function computeOfficerToken(pin: string): string {
  return crypto.createHmac("sha256", pin).update("officer_v1").digest("hex");
}

function requireOfficerAuth(req: Request, res: Response, next: NextFunction): void {
  const configuredPin = getConfiguredPin();
  if (!configuredPin) {
    res.status(503).json({ error: "Officer authentication is not configured" });
    return;
  }
  const officerToken = req.headers["x-officer-token"];
  if (typeof officerToken === "string" && officerToken === computeOfficerToken(configuredPin)) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized: valid officer token required" });
}

router.post("/officer/auth", (req: Request, res: Response): void => {
  const configuredPin = getConfiguredPin();
  if (!configuredPin) {
    res.status(503).json({ error: "Officer authentication is not configured on this server" });
    return;
  }
  const { pin } = req.body as { pin?: string };
  if (!pin) {
    res.status(400).json({ error: "PIN requerido" });
    return;
  }
  if (pin !== configuredPin) {
    res.status(401).json({ error: "PIN incorrecto" });
    return;
  }
  res.json({ token: computeOfficerToken(configuredPin) });
});

router.get("/officer/suppliers", requireOfficerAuth, async (req, res): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const cultivo = typeof req.query.cultivo === "string" ? req.query.cultivo.trim() : "";

    const conditions = [];

    if (cultivo) {
      conditions.push(ilike(farmsTable.cultivoPrincipal, cultivo));
    }

    if (search) {
      conditions.push(
        or(
          ilike(suppliersTable.nombreCompleto, `%${search}%`),
          ilike(suppliersTable.municipio, `%${search}%`)
        )
      );
    }

    const suppliers = await db
      .select({
        id: suppliersTable.id,
        nombreCompleto: suppliersTable.nombreCompleto,
        municipio: suppliersTable.municipio,
        registeredBy: suppliersTable.registeredBy,
        status: suppliersTable.status,
        createdAt: suppliersTable.createdAt,
        cultivoPrincipal: farmsTable.cultivoPrincipal,
      })
      .from(suppliersTable)
      .leftJoin(farmsTable, eq(farmsTable.supplierId, suppliersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(suppliersTable.createdAt));

    const allInteractions = await db
      .select({
        supplierId: interactionsTable.supplierId,
        metadata: interactionsTable.metadata,
        createdAt: interactionsTable.createdAt,
      })
      .from(interactionsTable)
      .orderBy(desc(interactionsTable.createdAt));

    const officerMetaMap = new Map<string, Record<string, unknown>>();
    for (const interaction of allInteractions) {
      if (officerMetaMap.has(interaction.supplierId)) continue;
      const meta = interaction.metadata as Record<string, unknown> | null;
      if (meta?.officer) {
        officerMetaMap.set(interaction.supplierId, meta.officer as Record<string, unknown>);
      }
    }

    const results = suppliers.map((s) => ({
      ...s,
      potencialGeneral: (officerMetaMap.get(s.id)?.potencial_general as number | null) ?? null,
    }));

    res.json({ suppliers: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener proveedores" });
  }
});

router.get("/officer/suppliers/export", requireOfficerAuth, async (req, res): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const cultivo = typeof req.query.cultivo === "string" ? req.query.cultivo.trim() : "";

    const conditions = [];

    if (cultivo) {
      conditions.push(ilike(farmsTable.cultivoPrincipal, cultivo));
    }

    if (search) {
      conditions.push(
        or(
          ilike(suppliersTable.nombreCompleto, `%${search}%`),
          ilike(suppliersTable.municipio, `%${search}%`)
        )
      );
    }

    const suppliers = await db
      .select({
        id: suppliersTable.id,
        nombreCompleto: suppliersTable.nombreCompleto,
        whatsappNumber: suppliersTable.whatsappNumber,
        municipio: suppliersTable.municipio,
        createdAt: suppliersTable.createdAt,
        cultivoPrincipal: farmsTable.cultivoPrincipal,
      })
      .from(suppliersTable)
      .leftJoin(farmsTable, eq(farmsTable.supplierId, suppliersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(suppliersTable.createdAt));

    const supplierIds = suppliers.map((s) => s.id);

    const officerMetaMap = new Map<string, Record<string, unknown>>();

    if (supplierIds.length > 0) {
      const relevantInteractions = await db
        .select({
          supplierId: interactionsTable.supplierId,
          metadata: interactionsTable.metadata,
        })
        .from(interactionsTable)
        .where(inArray(interactionsTable.supplierId, supplierIds))
        .orderBy(desc(interactionsTable.createdAt));

      for (const interaction of relevantInteractions) {
        if (officerMetaMap.has(interaction.supplierId)) continue;
        const meta = interaction.metadata as Record<string, unknown> | null;
        if (meta?.officer) {
          officerMetaMap.set(interaction.supplierId, meta.officer as Record<string, unknown>);
        }
      }
    }

    function escCsv(val: string | null | undefined): string {
      if (val == null) return "";
      let s = String(val);
      if (/^[=+\-@\t\r]/.test(s)) {
        s = "'" + s;
      }
      if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("'")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }

    const rows = suppliers.map((s) => {
      const potencial = (officerMetaMap.get(s.id)?.potencial_general as number | null) ?? null;
      const fecha = new Date(s.createdAt).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return [
        escCsv(s.nombreCompleto),
        escCsv(s.whatsappNumber),
        escCsv(s.municipio),
        escCsv(s.cultivoPrincipal),
        escCsv(fecha),
        potencial != null ? String(potencial) : "",
      ].join(",");
    });

    const header = "nombre,whatsapp,municipio,cultivo,fecha de registro,potencial_general";
    const csv = [header, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="proveedores.csv"');
    res.send("\uFEFF" + csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al exportar proveedores" });
  }
});

router.get("/officer/suppliers/:id", requireOfficerAuth, async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const [supplier] = await db
      .select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, id))
      .limit(1);

    if (!supplier) {
      res.status(404).json({ error: "Proveedor no encontrado" });
      return;
    }

    const [farm] = await db
      .select()
      .from(farmsTable)
      .where(eq(farmsTable.supplierId, id))
      .limit(1);

    const [economics] = await db
      .select()
      .from(economicsTable)
      .where(eq(economicsTable.supplierId, id))
      .limit(1);

    const interactions = await db
      .select()
      .from(interactionsTable)
      .where(eq(interactionsTable.supplierId, id))
      .orderBy(desc(interactionsTable.createdAt));

    // Find the most recent interaction that contains goals or officer metadata
    let goalsMeta: Record<string, unknown> | null = null;
    let officerMeta: Record<string, unknown> | null = null;

    for (const interaction of interactions) {
      const meta = interaction.metadata as Record<string, unknown> | null;
      if (!meta) continue;
      if (!goalsMeta && meta.goals) {
        goalsMeta = meta.goals as Record<string, unknown>;
      }
      if (!officerMeta && meta.officer) {
        officerMeta = meta.officer as Record<string, unknown>;
      }
      if (goalsMeta && officerMeta) break;
    }

    res.json({
      supplier,
      farm: farm ?? null,
      economics: economics ?? null,
      interactions,
      goalsMeta,
      officerMeta,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener perfil del proveedor" });
  }
});

interface PatchSupplierBody {
  supplier?: {
    nombreCompleto?: string;
    whatsappNumber?: string;
    municipio?: string;
    vereda?: string;
    supplierType?: string;
  };
  farm?: {
    cultivoPrincipal?: string;
    variedadCafe?: string;
    hectareasProduccion?: string;
    edadPlantasAnos?: number | null;
    cosechasPorAno?: number | null;
    metodoSecado?: string;
    accesoAgua?: string;
    tenenciaTierra?: string;
  };
  economics?: {
    tipoComprador?: string;
    volumenKgUltimaCosecha?: number | null;
    precioVentaBanda?: string;
    deudaActual?: string;
    usoCapital?: string[];
    personasDependientes?: number | null;
    situacionEconomica?: string;
    interesCanalpremium?: boolean | null;
  };
  goalsMeta?: {
    disposicion_cambiar?: number | null;
    horizonte_inversion?: string;
    meta_principal_12m?: string;
    principales_desafios?: string[];
  };
  officerMeta?: {
    salud_plantas?: string;
    infraestructura_postcosecha?: string;
    acceso_vial?: string;
    disposicion_agricultor?: string;
    potencial_general?: number | null;
    notas_officer?: string;
  };
  notes?: string;
}

router.patch("/officer/suppliers/:id", requireOfficerAuth, async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as PatchSupplierBody;

    const [existing] = await db
      .select({ id: suppliersTable.id })
      .from(suppliersTable)
      .where(eq(suppliersTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Proveedor no encontrado" });
      return;
    }

    if (body.supplier && Object.keys(body.supplier).length > 0) {
      await db
        .update(suppliersTable)
        .set(body.supplier)
        .where(eq(suppliersTable.id, id));
    }

    if (body.farm && Object.keys(body.farm).length > 0) {
      const [existingFarm] = await db
        .select({ id: farmsTable.id })
        .from(farmsTable)
        .where(eq(farmsTable.supplierId, id))
        .limit(1);

      if (existingFarm) {
        await db
          .update(farmsTable)
          .set(body.farm)
          .where(eq(farmsTable.supplierId, id));
      } else {
        await db
          .insert(farmsTable)
          .values({ supplierId: id, ...body.farm });
      }
    }

    if (body.economics && Object.keys(body.economics).length > 0) {
      const [existingEcon] = await db
        .select({ id: economicsTable.id })
        .from(economicsTable)
        .where(eq(economicsTable.supplierId, id))
        .limit(1);

      if (existingEcon) {
        await db
          .update(economicsTable)
          .set(body.economics)
          .where(eq(economicsTable.supplierId, id));
      } else {
        await db
          .insert(economicsTable)
          .values({ supplierId: id, ...body.economics });
      }
    }

    await db.insert(interactionsTable).values({
      supplierId: id,
      interactionType: "update",
      actor: "officer",
      notes: body.notes ?? "Perfil actualizado por officer",
      metadata: {
        goals: body.goalsMeta ?? null,
        officer: body.officerMeta ?? null,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar proveedor" });
  }
});

export default router;
