import crypto from "crypto";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, suppliersTable, farmsTable, economicsTable, interactionsTable } from "@workspace/db";
import { eq, desc, ilike, or, and } from "drizzle-orm";

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

    const onboardingInteractions = await db
      .select({
        supplierId: interactionsTable.supplierId,
        metadata: interactionsTable.metadata,
        createdAt: interactionsTable.createdAt,
      })
      .from(interactionsTable)
      .where(eq(interactionsTable.interactionType, "onboarding"))
      .orderBy(desc(interactionsTable.createdAt));

    const officerMetaMap = new Map<string, Record<string, unknown>>();
    for (const interaction of onboardingInteractions) {
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

    const onboarding = interactions.find((i) => i.interactionType === "onboarding");
    const meta = onboarding?.metadata as Record<string, unknown> | null;

    res.json({
      supplier,
      farm: farm ?? null,
      economics: economics ?? null,
      interactions,
      goalsMeta: (meta?.goals as Record<string, unknown>) ?? null,
      officerMeta: (meta?.officer as Record<string, unknown>) ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener perfil del proveedor" });
  }
});

export default router;
