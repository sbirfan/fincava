import crypto from "crypto";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, suppliersTable, farmsTable, economicsTable, interactionsTable } from "@workspace/db";
import { pool } from "@workspace/db";
import { eq, desc, ilike, or, and, inArray, sql } from "drizzle-orm";
import * as XLSX from "xlsx";

const router: IRouter = Router();

async function getOfficerPinFromDb(): Promise<string | null> {
  try {
    const result = await pool.query<{ value: string }>(
      "SELECT value FROM officer_config WHERE key = 'officer_pin' LIMIT 1",
    );
    return result.rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

async function getConfiguredPin(): Promise<string | null> {
  const dbPin = await getOfficerPinFromDb();
  if (dbPin) return dbPin;
  return process.env["OFFICER_PIN"] ?? null;
}

const TOKEN_WINDOW_DAYS = parseInt(process.env["OFFICER_TOKEN_WINDOW_DAYS"] ?? "7", 10) || 7;
const TOKEN_WINDOW_MS = TOKEN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function issueOfficerToken(pin: string): string {
  const issuedAt = Date.now();
  const hmac = crypto.createHmac("sha256", pin).update(`officer_v1:${issuedAt}`).digest("hex");
  return `${issuedAt}.${hmac}`;
}

function verifyOfficerToken(pin: string, token: string): boolean {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return false;
  const issuedAtStr = token.slice(0, dotIdx);
  const providedHmac = token.slice(dotIdx + 1);
  const issuedAt = parseInt(issuedAtStr, 10);
  if (!isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > TOKEN_WINDOW_MS) return false;
  const expectedHmac = crypto.createHmac("sha256", pin).update(`officer_v1:${issuedAt}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(providedHmac, "hex"), Buffer.from(expectedHmac, "hex"));
}

async function requireOfficerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const configuredPin = await getConfiguredPin();
  if (!configuredPin) {
    res.status(503).json({ error: "Officer authentication is not configured" });
    return;
  }
  const officerToken = req.headers["x-officer-token"];
  if (typeof officerToken === "string") {
    try {
      if (verifyOfficerToken(configuredPin, officerToken)) {
        next();
        return;
      }
    } catch {
    }
  }
  res.status(401).json({ error: "Unauthorized: valid officer token required" });
}

router.post("/officer/auth", async (req: Request, res: Response): Promise<void> => {
  const configuredPin = await getConfiguredPin();
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
  res.json({ token: issueOfficerToken(configuredPin) });
});

router.post("/officer/pin/change", requireOfficerAuth, async (req: Request, res: Response): Promise<void> => {
  const { newPin } = req.body as { newPin?: string };
  if (!newPin || newPin.trim().length < 4) {
    res.status(400).json({ error: "El nuevo PIN debe tener al menos 4 caracteres" });
    return;
  }
  const trimmed = newPin.trim();
  try {
    await pool.query(
      `INSERT INTO officer_config (key, value, updated_at)
       VALUES ('officer_pin', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [trimmed],
    );
    res.json({ token: issueOfficerToken(trimmed) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cambiar el PIN" });
  }
});

function buildSupplierConditions(search: string, cultivo: string) {
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
  return conditions;
}

async function buildOfficerMetaMap(supplierIds: string[]): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (supplierIds.length === 0) return map;

  const relevantInteractions = await db
    .select({
      supplierId: interactionsTable.supplierId,
      metadata: interactionsTable.metadata,
    })
    .from(interactionsTable)
    .where(inArray(interactionsTable.supplierId, supplierIds))
    .orderBy(desc(interactionsTable.createdAt));

  for (const interaction of relevantInteractions) {
    if (map.has(interaction.supplierId)) continue;
    const meta = interaction.metadata as Record<string, unknown> | null;
    if (meta?.officer) {
      map.set(interaction.supplierId, meta.officer as Record<string, unknown>);
    }
  }
  return map;
}

router.get("/officer/suppliers", requireOfficerAuth, async (req, res): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const cultivo = typeof req.query.cultivo === "string" ? req.query.cultivo.trim() : "";
    const potencialFilter = typeof req.query.potencial === "string" ? parseInt(req.query.potencial, 10) : NaN;

    const conditions = buildSupplierConditions(search, cultivo);

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

    const supplierIds = suppliers.map((s) => s.id);
    const officerMetaMap = await buildOfficerMetaMap(supplierIds);

    let results = suppliers.map((s) => ({
      ...s,
      potencialGeneral: (officerMetaMap.get(s.id)?.potencial_general as number | null) ?? null,
    }));

    if (!isNaN(potencialFilter) && potencialFilter >= 1 && potencialFilter <= 5) {
      results = results.filter((s) => s.potencialGeneral === potencialFilter);
    }

    res.json({ suppliers: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener proveedores" });
  }
});

const ALL_CSV_COLUMNS = ["nombre", "whatsapp", "municipio", "cultivo", "fecha_registro", "potencial_general"] as const;
type CsvColumn = typeof ALL_CSV_COLUMNS[number];

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

router.get("/officer/suppliers/export", requireOfficerAuth, async (req, res): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const cultivo = typeof req.query.cultivo === "string" ? req.query.cultivo.trim() : "";
    const potencialFilter = typeof req.query.potencial === "string" ? parseInt(req.query.potencial, 10) : NaN;

    const rawColumns = typeof req.query.columns === "string" ? req.query.columns.split(",").map((c) => c.trim()) : [];
    const selectedColumns: CsvColumn[] = rawColumns.length > 0
      ? rawColumns.filter((c): c is CsvColumn => ALL_CSV_COLUMNS.includes(c as CsvColumn))
      : [...ALL_CSV_COLUMNS];

    const conditions = buildSupplierConditions(search, cultivo);

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
    const officerMetaMap = await buildOfficerMetaMap(supplierIds);

    let rows = suppliers.map((s) => {
      const potencial = (officerMetaMap.get(s.id)?.potencial_general as number | null) ?? null;
      return { ...s, potencial };
    });

    if (!isNaN(potencialFilter) && potencialFilter >= 1 && potencialFilter <= 5) {
      rows = rows.filter((r) => r.potencial === potencialFilter);
    }

    const columnLabels: Record<CsvColumn, string> = {
      nombre: "nombre",
      whatsapp: "whatsapp",
      municipio: "municipio",
      cultivo: "cultivo",
      fecha_registro: "fecha de registro",
      potencial_general: "potencial_general",
    };

    const header = selectedColumns.map((c) => columnLabels[c]).join(",");

    const csvRows = rows.map((s) => {
      const fecha = new Date(s.createdAt).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const colValues: Record<CsvColumn, string> = {
        nombre: escCsv(s.nombreCompleto),
        whatsapp: escCsv(s.whatsappNumber),
        municipio: escCsv(s.municipio),
        cultivo: escCsv(s.cultivoPrincipal),
        fecha_registro: escCsv(fecha),
        potencial_general: s.potencial != null ? String(s.potencial) : "",
      };
      return selectedColumns.map((c) => colValues[c]).join(",");
    });

    const csv = [header, ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="proveedores.csv"');
    res.send("\uFEFF" + csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al exportar proveedores" });
  }
});

router.get("/officer/suppliers/export.xlsx", requireOfficerAuth, async (req, res): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const cultivo = typeof req.query.cultivo === "string" ? req.query.cultivo.trim() : "";
    const potencialFilter = typeof req.query.potencial === "string" ? parseInt(req.query.potencial, 10) : NaN;

    const conditions = buildSupplierConditions(search, cultivo);

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
    const officerMetaMap = await buildOfficerMetaMap(supplierIds);

    let rows = suppliers.map((s) => {
      const potencial = (officerMetaMap.get(s.id)?.potencial_general as number | null) ?? null;
      return { ...s, potencial };
    });

    if (!isNaN(potencialFilter) && potencialFilter >= 1 && potencialFilter <= 5) {
      rows = rows.filter((r) => r.potencial === potencialFilter);
    }

    const sheetData = rows.map((s) => ({
      Nombre: s.nombreCompleto,
      WhatsApp: s.whatsappNumber,
      Municipio: s.municipio ?? "",
      Cultivo: s.cultivoPrincipal ?? "",
      "Fecha de Registro": new Date(s.createdAt).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      "Potencial General": s.potencial ?? "",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);

    ws["!cols"] = [
      { wch: 30 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Proveedores");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="proveedores.xlsx"');
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al exportar proveedores a Excel" });
  }
});

router.get("/officer/stats", requireOfficerAuth, async (_req, res): Promise<void> => {
  try {
    const totalResult = await pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM suppliers",
    );
    const totalSuppliers = parseInt(totalResult.rows[0]?.count ?? "0", 10);

    const weeklyRegistrationsResult = await pool.query<{ week: string; count: string }>(
      `SELECT DATE_TRUNC('week', created_at) AS week, COUNT(*) AS count
         FROM suppliers
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY week
        ORDER BY week DESC`,
    );

    const activeDraftsResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
         FROM onboarding_drafts
        WHERE updated_at >= NOW() - INTERVAL '${process.env["DRAFT_EXPIRY_DAYS"] ?? "30"} days'`,
    );
    const activeDrafts = parseInt(activeDraftsResult.rows[0]?.count ?? "0", 10);

    const weeklyDraftsResult = await pool.query<{ week: string; count: string }>(
      `SELECT DATE_TRUNC('week', created_at) AS week, COUNT(*) AS count
         FROM onboarding_drafts
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY week
        ORDER BY week DESC`,
    );

    const duplicateAttemptsResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM registration_events WHERE event_type = 'duplicate_attempt'`,
    );
    const duplicateAttempts = parseInt(duplicateAttemptsResult.rows[0]?.count ?? "0", 10);

    const expiringDraftsResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
         FROM onboarding_drafts
        WHERE updated_at >= NOW() - INTERVAL '${process.env["DRAFT_EXPIRY_DAYS"] ?? "30"} days'
          AND updated_at < NOW() - INTERVAL '${Number(process.env["DRAFT_EXPIRY_DAYS"] ?? 30) - 7} days'`,
    );
    const expiringDrafts = parseInt(expiringDraftsResult.rows[0]?.count ?? "0", 10);

    res.json({
      totalSuppliers,
      activeDrafts,
      expiringDrafts,
      duplicateAttempts,
      weeklyRegistrations: weeklyRegistrationsResult.rows.map((r) => ({
        week: r.week,
        count: parseInt(r.count, 10),
      })),
      weeklyDrafts: weeklyDraftsResult.rows.map((r) => ({
        week: r.week,
        count: parseInt(r.count, 10),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener estadísticas" });
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

    if (body.supplier) {
      if (body.supplier.nombreCompleto !== undefined) {
        if (!body.supplier.nombreCompleto.trim() || body.supplier.nombreCompleto.trim().length < 2) {
          res.status(400).json({ error: "El nombre completo no puede estar vacío (mínimo 2 caracteres)" });
          return;
        }
      }
      if (body.supplier.whatsappNumber !== undefined && !/^\+57[0-9]{10}$/.test(body.supplier.whatsappNumber)) {
        res.status(400).json({ error: "El número de WhatsApp debe tener el formato +57XXXXXXXXXX" });
        return;
      }
    }

    if (body.farm) {
      if (body.farm.hectareasProduccion !== undefined && body.farm.hectareasProduccion !== null) {
        const haStr = String(body.farm.hectareasProduccion).trim();
        const ha = Number(haStr);
        if (!/^(\d+\.?\d*|\.\d+)$/.test(haStr) || isNaN(ha) || ha < 0) {
          res.status(400).json({ error: "Las hectáreas en producción deben ser un número positivo" });
          return;
        }
      }
      if (body.farm.edadPlantasAnos !== undefined && body.farm.edadPlantasAnos !== null) {
        if (typeof body.farm.edadPlantasAnos !== "number" || !Number.isInteger(body.farm.edadPlantasAnos) || body.farm.edadPlantasAnos < 0) {
          res.status(400).json({ error: "La edad de las plantas debe ser un número entero no negativo" });
          return;
        }
      }
      if (body.farm.cosechasPorAno !== undefined && body.farm.cosechasPorAno !== null) {
        if (typeof body.farm.cosechasPorAno !== "number" || !Number.isInteger(body.farm.cosechasPorAno) || body.farm.cosechasPorAno < 0) {
          res.status(400).json({ error: "Las cosechas por año deben ser un número entero no negativo" });
          return;
        }
      }
    }

    if (body.economics) {
      if (body.economics.volumenKgUltimaCosecha !== undefined && body.economics.volumenKgUltimaCosecha !== null) {
        if (typeof body.economics.volumenKgUltimaCosecha !== "number" || isNaN(body.economics.volumenKgUltimaCosecha) || body.economics.volumenKgUltimaCosecha < 0) {
          res.status(400).json({ error: "El volumen de la última cosecha no puede ser negativo" });
          return;
        }
      }
      if (body.economics.personasDependientes !== undefined && body.economics.personasDependientes !== null) {
        if (typeof body.economics.personasDependientes !== "number" || !Number.isInteger(body.economics.personasDependientes) || body.economics.personasDependientes < 0) {
          res.status(400).json({ error: "Las personas dependientes deben ser un número entero no negativo" });
          return;
        }
      }
    }

    if (body.goalsMeta) {
      if (body.goalsMeta.disposicion_cambiar !== undefined && body.goalsMeta.disposicion_cambiar !== null) {
        if (
          typeof body.goalsMeta.disposicion_cambiar !== "number" ||
          !Number.isInteger(body.goalsMeta.disposicion_cambiar) ||
          body.goalsMeta.disposicion_cambiar < 1 ||
          body.goalsMeta.disposicion_cambiar > 5
        ) {
          res.status(400).json({ error: "La disposición al cambio debe ser un valor entre 1 y 5" });
          return;
        }
      }
    }

    if (body.officerMeta) {
      if (body.officerMeta.potencial_general !== undefined && body.officerMeta.potencial_general !== null) {
        if (
          typeof body.officerMeta.potencial_general !== "number" ||
          !Number.isInteger(body.officerMeta.potencial_general) ||
          body.officerMeta.potencial_general < 1 ||
          body.officerMeta.potencial_general > 5
        ) {
          res.status(400).json({ error: "El potencial general debe ser un número entre 1 y 5" });
          return;
        }
      }
    }

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
