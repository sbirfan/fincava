import crypto from "crypto";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, suppliersTable, farmsTable, economicsTable, interactionsTable } from "@workspace/db";
import { pool } from "@workspace/db";
import { eq, desc, asc, ilike, or, and, inArray, sql } from "drizzle-orm";
import * as XLSX from "xlsx";
import { getLockoutState, setLockoutState, sendLockoutAlert } from "../lib/pin-lockout";

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

const DEFAULT_TOKEN_WINDOW_DAYS = parseInt(process.env["OFFICER_TOKEN_WINDOW_DAYS"] ?? "7", 10) || 7;

async function getTokenWindowDays(): Promise<number> {
  try {
    const result = await pool.query<{ value: string }>(
      "SELECT value FROM officer_config WHERE key = 'token_window_days' LIMIT 1",
    );
    const raw = result.rows[0]?.value;
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 365) return parsed;
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_TOKEN_WINDOW_DAYS;
}

function issueOfficerToken(pin: string): string {
  const issuedAt = Date.now();
  const hmac = crypto.createHmac("sha256", pin).update(`officer_v1:${issuedAt}`).digest("hex");
  return `${issuedAt}.${hmac}`;
}

function verifyOfficerToken(pin: string, token: string, windowMs: number): boolean {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return false;
  const issuedAtStr = token.slice(0, dotIdx);
  const providedHmac = token.slice(dotIdx + 1);
  const issuedAt = parseInt(issuedAtStr, 10);
  if (!isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > windowMs) return false;
  const expectedHmac = crypto.createHmac("sha256", pin).update(`officer_v1:${issuedAt}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(providedHmac, "hex"), Buffer.from(expectedHmac, "hex"));
}

async function requireOfficerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const [configuredPin, windowDays] = await Promise.all([getConfiguredPin(), getTokenWindowDays()]);
  if (!configuredPin) {
    res.status(503).json({ error: "Officer authentication is not configured" });
    return;
  }
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const officerToken = req.headers["x-officer-token"];
  if (typeof officerToken === "string") {
    try {
      if (verifyOfficerToken(configuredPin, officerToken, windowMs)) {
        next();
        return;
      }
    } catch {
    }
  }
  res.status(401).json({ error: "Unauthorized: valid officer token required" });
}

const PIN_MAX_ATTEMPTS = 5;
const PIN_BLOCK_MS = 10 * 60 * 1000;
const PIN_CHANGE_MAX_ATTEMPTS = 5;
const PIN_CHANGE_BLOCK_MS = 10 * 60 * 1000;

router.post("/officer/auth", async (req: Request, res: Response): Promise<void> => {
  const configuredPin = await getConfiguredPin();
  if (!configuredPin) {
    res.status(503).json({ error: "Officer authentication is not configured on this server" });
    return;
  }

  const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown");
  const state = getLockoutState("auth", ip);
  if (state.blockedUntil !== null) {
    if (Date.now() < state.blockedUntil) {
      const secondsLeft = Math.ceil((state.blockedUntil - Date.now()) / 1000);
      res.status(429).json({ error: `Demasiados intentos fallidos. Intenta de nuevo en ${secondsLeft} segundos.` });
      return;
    }
    state.count = 0;
    state.blockedUntil = null;
    setLockoutState("auth", ip, state);
  }

  const { pin } = req.body as { pin?: string };
  if (!pin) {
    res.status(400).json({ error: "PIN requerido" });
    return;
  }
  if (pin !== configuredPin) {
    state.count += 1;
    if (state.count >= PIN_MAX_ATTEMPTS) {
      state.blockedUntil = Date.now() + PIN_BLOCK_MS;
      state.count = 0;
      setLockoutState("auth", ip, state);
      void sendLockoutAlert("auth", ip);
      res.status(429).json({ error: "Demasiados intentos fallidos. Espera 10 minutos antes de intentar de nuevo." });
    } else {
      setLockoutState("auth", ip, state);
      const attemptsLeft = PIN_MAX_ATTEMPTS - state.count;
      res.status(401).json({ error: `PIN incorrecto. ${attemptsLeft} intento${attemptsLeft !== 1 ? "s" : ""} restante${attemptsLeft !== 1 ? "s" : ""}.` });
    }
    return;
  }

  state.count = 0;
  state.blockedUntil = null;
  setLockoutState("auth", ip, state);
  res.json({ token: issueOfficerToken(configuredPin) });
});

router.get("/officer/pin/info", requireOfficerAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<{ updated_at: Date | null }>(
      "SELECT updated_at FROM officer_config WHERE key = 'officer_pin' LIMIT 1",
    );
    const row = result.rows[0];
    const lastChanged = row?.updated_at ? row.updated_at.toISOString() : null;
    res.json({ lastChanged });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener información del PIN" });
  }
});

router.post("/officer/pin/change", requireOfficerAuth, async (req: Request, res: Response): Promise<void> => {
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    ?? req.socket.remoteAddress
    ?? "unknown";

  const attempts = getLockoutState("change", ip);
  const now = Date.now();

  if (attempts.blockedUntil !== null && now < attempts.blockedUntil) {
    const retryAfterSeconds = Math.ceil((attempts.blockedUntil - now) / 1000);
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).json({
      error: `Demasiados intentos incorrectos. Intente de nuevo en ${Math.ceil(retryAfterSeconds / 60)} minuto(s).`,
      retryAfterSeconds,
    });
    return;
  }

  if (attempts.blockedUntil !== null && now >= attempts.blockedUntil) {
    attempts.count = 0;
    attempts.blockedUntil = null;
    setLockoutState("change", ip, attempts);
  }

  const { currentPin, newPin } = req.body as { currentPin?: string; newPin?: string };
  if (!currentPin || !currentPin.trim()) {
    res.status(400).json({ error: "El PIN actual es requerido" });
    return;
  }
  if (!newPin || newPin.trim().length < 4) {
    res.status(400).json({ error: "El nuevo PIN debe tener al menos 4 caracteres" });
    return;
  }
  const configuredPin = await getConfiguredPin();
  if (!configuredPin) {
    res.status(503).json({ error: "Officer authentication is not configured on this server" });
    return;
  }
  if (currentPin.trim() !== configuredPin) {
    attempts.count += 1;
    if (attempts.count >= PIN_CHANGE_MAX_ATTEMPTS) {
      attempts.blockedUntil = Date.now() + PIN_CHANGE_BLOCK_MS;
      setLockoutState("change", ip, attempts);
      void sendLockoutAlert("change", ip);
      const retryAfterSeconds = Math.ceil(PIN_CHANGE_BLOCK_MS / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: `Demasiados intentos incorrectos. Intente de nuevo en ${Math.ceil(retryAfterSeconds / 60)} minuto(s).`,
        retryAfterSeconds,
      });
      return;
    }
    setLockoutState("change", ip, attempts);
    const remaining = PIN_CHANGE_MAX_ATTEMPTS - attempts.count;
    res.status(401).json({
      error: "El PIN actual es incorrecto",
      attemptsRemaining: remaining,
    });
    return;
  }

  attempts.count = 0;
  attempts.blockedUntil = null;
  setLockoutState("change", ip, attempts);

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

router.get("/officer/token-window", requireOfficerAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<{ value: string }>(
      "SELECT value FROM officer_config WHERE key = 'token_window_days' LIMIT 1",
    );
    const raw = result.rows[0]?.value;
    const dbDays = raw ? parseInt(raw, 10) : null;
    const dbValid = dbDays !== null && Number.isInteger(dbDays) && dbDays >= 1 && dbDays <= 365;
    const isDefault = !dbValid;
    const days = dbValid ? dbDays : DEFAULT_TOKEN_WINDOW_DAYS;
    res.json({ days, isDefault });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener configuración de sesión" });
  }
});

router.post("/officer/token-window", requireOfficerAuth, async (req: Request, res: Response): Promise<void> => {
  const { days } = req.body as { days?: unknown };
  if (!Number.isInteger(days) || (days as number) < 1 || (days as number) > 365) {
    res.status(400).json({ error: "El valor debe ser un número entero entre 1 y 365 días" });
    return;
  }
  try {
    await pool.query(
      `INSERT INTO officer_config (key, value, updated_at)
       VALUES ('token_window_days', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [String(days)],
    );
    res.json({ days });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar configuración de sesión" });
  }
});

router.post("/officer/token-window/reset", requireOfficerAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(
      "DELETE FROM officer_config WHERE key = 'token_window_days'",
    );
    res.json({ days: DEFAULT_TOKEN_WINDOW_DAYS, isDefault: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al restablecer configuración de sesión" });
  }
});

function parseIntParam(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

function parsePotencialRangeFilter(query: Record<string, unknown>): { min: number | null; max: number | null } {
  const min = parseIntParam(query.potencial_min);
  const max = parseIntParam(query.potencial_max);
  if (min !== null || max !== null) {
    return { min, max };
  }
  const exact = parseIntParam(query.potencial);
  if (exact !== null) return { min: exact, max: exact };
  return { min: null, max: null };
}

function applyPotencialRange<T extends { potencialGeneral?: number | null; potencial?: number | null }>(
  rows: T[],
  range: { min: number | null; max: number | null },
): T[] {
  if (range.min === null && range.max === null) return rows;
  return rows.filter((r) => {
    const score = r.potencialGeneral ?? r.potencial ?? null;
    if (score === null) return false;
    if (range.min !== null && score < range.min) return false;
    if (range.max !== null && score > range.max) return false;
    return true;
  });
}

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

router.get("/officer/suppliers/potential-counts", requireOfficerAuth, async (req, res): Promise<void> => {
  try {
    const suppliers = await db
      .select({ id: suppliersTable.id })
      .from(suppliersTable)
      .orderBy(desc(suppliersTable.createdAt));

    const supplierIds = suppliers.map((s) => s.id);
    const officerMetaMap = await buildOfficerMetaMap(supplierIds);
    const counts: Record<string, number> = { total: supplierIds.length };
    for (let i = 1; i <= 5; i++) counts[String(i)] = 0;
    for (const id of supplierIds) {
      const score = (officerMetaMap.get(id)?.potencial_general as number | null) ?? null;
      if (score !== null && score >= 1 && score <= 5) {
        counts[String(score)] = (counts[String(score)] ?? 0) + 1;
      }
    }
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al contar potenciales" });
  }
});

router.get("/officer/suppliers", requireOfficerAuth, async (req, res): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const cultivo = typeof req.query.cultivo === "string" ? req.query.cultivo.trim() : "";
    const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy.trim() : "date_desc";
    const potencialRange = parsePotencialRangeFilter(req.query as Record<string, unknown>);

    const conditions = buildSupplierConditions(search, cultivo);

    const dbOrder =
      sortBy === "date_asc" ? asc(suppliersTable.createdAt) : desc(suppliersTable.createdAt);

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
      .orderBy(dbOrder);

    const supplierIds = suppliers.map((s) => s.id);
    const officerMetaMap = await buildOfficerMetaMap(supplierIds);

    let results = applyPotencialRange(
      suppliers.map((s) => ({
        ...s,
        potencialGeneral: (officerMetaMap.get(s.id)?.potencial_general as number | null) ?? null,
      })),
      potencialRange,
    );

    if (sortBy === "potential_desc") {
      results = results.sort((a, b) => (b.potencialGeneral ?? 0) - (a.potencialGeneral ?? 0));
    } else if (sortBy === "potential_asc") {
      results = results.sort((a, b) => (a.potencialGeneral ?? 0) - (b.potencialGeneral ?? 0));
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
    const potencialRange = parsePotencialRangeFilter(req.query as Record<string, unknown>);

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

    const rows = applyPotencialRange(
      suppliers.map((s) => ({
        ...s,
        potencial: (officerMetaMap.get(s.id)?.potencial_general as number | null) ?? null,
      })),
      potencialRange,
    );

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

const XLSX_COLUMN_DEFS: { key: CsvColumn; label: string; width: number }[] = [
  { key: "nombre", label: "Nombre", width: 30 },
  { key: "whatsapp", label: "WhatsApp", width: 18 },
  { key: "municipio", label: "Municipio", width: 18 },
  { key: "cultivo", label: "Cultivo", width: 14 },
  { key: "fecha_registro", label: "Fecha de Registro", width: 18 },
  { key: "potencial_general", label: "Potencial General", width: 18 },
];

router.get("/officer/suppliers/export.xlsx", requireOfficerAuth, async (req, res): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const cultivo = typeof req.query.cultivo === "string" ? req.query.cultivo.trim() : "";
    const potencialRange = parsePotencialRangeFilter(req.query as Record<string, unknown>);

    const rawColumns = typeof req.query.columns === "string" ? req.query.columns.split(",").map((c) => c.trim()) : [];
    const selectedCols: CsvColumn[] = rawColumns.length > 0
      ? rawColumns.filter((c): c is CsvColumn => ALL_CSV_COLUMNS.includes(c as CsvColumn))
      : [...ALL_CSV_COLUMNS];
    const activeCols = XLSX_COLUMN_DEFS.filter((d) => selectedCols.includes(d.key));

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

    const rows = applyPotencialRange(
      suppliers.map((s) => ({
        ...s,
        potencial: (officerMetaMap.get(s.id)?.potencial_general as number | null) ?? null,
      })),
      potencialRange,
    );

    const fecha = (s: { createdAt: string }) => new Date(s.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
    const colValueGetters: Record<CsvColumn, (s: typeof rows[number]) => string | number> = {
      nombre: (s) => s.nombreCompleto,
      whatsapp: (s) => s.whatsappNumber ?? "",
      municipio: (s) => s.municipio ?? "",
      cultivo: (s) => s.cultivoPrincipal ?? "",
      fecha_registro: (s) => fecha(s),
      potencial_general: (s) => s.potencial ?? "",
    };

    const headerRow = activeCols.map((c) => c.label);
    const dataRows = rows.map((s) => activeCols.map((c) => colValueGetters[c.key](s)));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

    ws["!cols"] = activeCols.map((c) => ({ wch: c.width }));

    const headerStyle = {
      font: { bold: true, color: { rgb: "1E3A5F" } },
      fill: { patternType: "solid", fgColor: { rgb: "DBEAFE" } },
      alignment: { horizontal: "center" },
    };
    for (let col = 0; col < activeCols.length; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[cellAddr]) ws[cellAddr].s = headerStyle;
    }

    XLSX.utils.book_append_sheet(wb, ws, "Proveedores");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellStyles: true });

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

    const abandonedLast7Result = await pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(deleted_count), 0) AS total
         FROM draft_cleanup_log
        WHERE swept_at >= NOW() - INTERVAL '7 days'`,
    );
    const abandonedLast7 = parseInt(abandonedLast7Result.rows[0]?.total ?? "0", 10);

    const abandonedLast30Result = await pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(deleted_count), 0) AS total
         FROM draft_cleanup_log
        WHERE swept_at >= NOW() - INTERVAL '30 days'`,
    );
    const abandonedLast30 = parseInt(abandonedLast30Result.rows[0]?.total ?? "0", 10);

    const lastCleanupResult = await pool.query<{ swept_at: Date; deleted_count: string }>(
      `SELECT swept_at, deleted_count FROM draft_cleanup_log ORDER BY swept_at DESC LIMIT 1`,
    );
    const lastCleanup = lastCleanupResult.rows[0]
      ? { at: lastCleanupResult.rows[0].swept_at.toISOString(), count: parseInt(lastCleanupResult.rows[0].deleted_count, 10) }
      : null;

    const weeklyDuplicatesResult = await pool.query<{ week: string; count: string }>(
      `SELECT DATE_TRUNC('week', created_at) AS week, COUNT(*) AS count
         FROM registration_events
        WHERE event_type = 'duplicate_attempt'
          AND created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY week
        ORDER BY week ASC`,
    );

    const weeklyAbandonmentsResult = await pool.query<{ week: string; count: string }>(
      `SELECT DATE_TRUNC('week', swept_at) AS week, COALESCE(SUM(deleted_count), 0) AS count
         FROM draft_cleanup_log
        WHERE swept_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY week
        ORDER BY week ASC`,
    );

    const totalDraftsAndSuppliers = activeDrafts + totalSuppliers;
    const abandonmentRate = totalDraftsAndSuppliers > 0
      ? abandonedLast30 / (abandonedLast30 + totalDraftsAndSuppliers)
      : null;

    const whatsappConfigured = !!(
      process.env["TWILIO_ACCOUNT_SID"] &&
      process.env["TWILIO_AUTH_TOKEN"] &&
      process.env["TWILIO_WHATSAPP_FROM"]
    );

    res.json({
      totalSuppliers,
      activeDrafts,
      expiringDrafts,
      duplicateAttempts,
      abandonedLast7,
      abandonedLast30,
      lastCleanup,
      abandonmentRate,
      whatsappConfigured,
      weeklyRegistrations: weeklyRegistrationsResult.rows.map((r) => ({
        week: r.week,
        count: parseInt(r.count, 10),
      })),
      weeklyDrafts: weeklyDraftsResult.rows.map((r) => ({
        week: r.week,
        count: parseInt(r.count, 10),
      })),
      weeklyDuplicates: weeklyDuplicatesResult.rows.map((r) => ({
        week: r.week,
        count: parseInt(r.count, 10),
      })),
      weeklyAbandonments: weeklyAbandonmentsResult.rows.map((r) => ({
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

    const [currentSupplier] = await db
      .select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, id))
      .limit(1);

    if (!currentSupplier) {
      res.status(404).json({ error: "Proveedor no encontrado" });
      return;
    }

    const [currentFarm] = await db.select().from(farmsTable).where(eq(farmsTable.supplierId, id)).limit(1);
    const [currentEcon] = await db.select().from(economicsTable).where(eq(economicsTable.supplierId, id)).limit(1);

    const existingInteractions = await db
      .select({ metadata: interactionsTable.metadata })
      .from(interactionsTable)
      .where(eq(interactionsTable.supplierId, id))
      .orderBy(desc(interactionsTable.createdAt));

    let currentGoalsMeta: Record<string, unknown> | null = null;
    let currentOfficerMeta: Record<string, unknown> | null = null;
    for (const row of existingInteractions) {
      const m = row.metadata as Record<string, unknown> | null;
      if (!m) continue;
      if (!currentGoalsMeta && m.goals) currentGoalsMeta = m.goals as Record<string, unknown>;
      if (!currentOfficerMeta && m.officer) currentOfficerMeta = m.officer as Record<string, unknown>;
      if (currentGoalsMeta && currentOfficerMeta) break;
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

    const SUPPLIER_LABELS: Record<string, string> = {
      nombreCompleto: "Nombre completo",
      whatsappNumber: "WhatsApp",
      municipio: "Municipio",
      vereda: "Vereda",
      supplierType: "Tipo de proveedor",
    };
    const FARM_LABELS: Record<string, string> = {
      cultivoPrincipal: "Cultivo principal",
      variedadCafe: "Variedad de café",
      hectareasProduccion: "Hectáreas en producción",
      edadPlantasAnos: "Edad de plantas (años)",
      cosechasPorAno: "Cosechas por año",
      metodoSecado: "Método de secado",
      accesoAgua: "Acceso al agua",
      tenenciaTierra: "Tenencia de tierra",
    };
    const ECON_LABELS: Record<string, string> = {
      tipoComprador: "Tipo de comprador",
      volumenKgUltimaCosecha: "Volumen última cosecha (kg)",
      precioVentaBanda: "Precio de venta",
      deudaActual: "Deuda actual",
      usoCapital: "Uso del capital",
      personasDependientes: "Personas dependientes",
      situacionEconomica: "Situación económica",
      interesCanalpremium: "Interés en canal premium",
    };
    const GOALS_LABELS: Record<string, string> = {
      disposicion_cambiar: "Disposición al cambio (1–5)",
      horizonte_inversion: "Horizonte de inversión",
      meta_principal_12m: "Meta principal (12 meses)",
      principales_desafios: "Principales desafíos",
    };
    const OFFICER_LABELS: Record<string, string> = {
      salud_plantas: "Salud de plantas",
      infraestructura_postcosecha: "Infraestructura postcosecha",
      acceso_vial: "Acceso vial",
      disposicion_agricultor: "Disposición del agricultor",
      potencial_general: "Potencial general (1–5)",
      notas_officer: "Notas del officer",
    };

    const changes: Record<string, { before: unknown; after: unknown }> = {};
    function str(v: unknown): string {
      if (v === null || v === undefined) return "";
      if (Array.isArray(v)) return v.join(", ");
      return String(v);
    }
    if (body.supplier) {
      for (const [key, val] of Object.entries(body.supplier)) {
        const prev = (currentSupplier as Record<string, unknown>)[key];
        if (str(prev) !== str(val)) {
          changes[SUPPLIER_LABELS[key] ?? key] = { before: prev ?? null, after: val };
        }
      }
    }
    if (body.farm) {
      for (const [key, val] of Object.entries(body.farm)) {
        const prev = currentFarm ? (currentFarm as Record<string, unknown>)[key] : undefined;
        if (str(prev) !== str(val)) {
          changes[FARM_LABELS[key] ?? key] = { before: prev ?? null, after: val };
        }
      }
    }
    if (body.economics) {
      for (const [key, val] of Object.entries(body.economics)) {
        const prev = currentEcon ? (currentEcon as Record<string, unknown>)[key] : undefined;
        if (str(prev) !== str(val)) {
          changes[ECON_LABELS[key] ?? key] = { before: prev ?? null, after: val };
        }
      }
    }
    if (body.goalsMeta) {
      for (const [key, val] of Object.entries(body.goalsMeta)) {
        const prev = currentGoalsMeta ? currentGoalsMeta[key] : undefined;
        if (str(prev) !== str(val)) {
          changes[GOALS_LABELS[key] ?? key] = { before: prev ?? null, after: val };
        }
      }
    }
    if (body.officerMeta) {
      for (const [key, val] of Object.entries(body.officerMeta)) {
        const prev = currentOfficerMeta ? currentOfficerMeta[key] : undefined;
        if (str(prev) !== str(val)) {
          changes[OFFICER_LABELS[key] ?? key] = { before: prev ?? null, after: val };
        }
      }
    }

    await db.insert(interactionsTable).values({
      supplierId: id,
      interactionType: "update",
      actor: "officer",
      notes: body.notes?.trim() || "Perfil actualizado por officer",
      metadata: {
        goals: body.goalsMeta ?? null,
        officer: body.officerMeta ?? null,
        changes: Object.keys(changes).length > 0 ? changes : null,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar proveedor" });
  }
});

export default router;
