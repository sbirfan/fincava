import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

async function dbPing(): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

router.get("/healthz", async (req, res) => {
  const db_result = await dbPing();
  if (!db_result.ok) {
    req.log?.warn({ err: db_result.error }, "health: db probe failed");
    res.status(503).json({ status: "degraded", db: "error" });
    return;
  }
  res.json({ status: "ok", db: "ok" });
});

router.get("/health", async (req, res) => {
  const db_result = await dbPing();
  if (!db_result.ok) {
    req.log?.warn({ err: db_result.error }, "health: db probe failed");
    res.status(503).json({ status: "degraded", db: "error" });
    return;
  }
  res.json({ status: "ok", db: "ok" });
});

export default router;
