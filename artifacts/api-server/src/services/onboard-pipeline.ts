// onboard-pipeline.ts
// Handler for the post-supplier-onboarding async pipeline.
//
// Execution contract:
//   - Called by pipeline-emitter after the HTTP response is sent.
//   - Sequential: scoreSupplier must succeed before evaluateSupplier runs,
//     because evaluateSupplier reads the ai_outputs row that scoring writes.
//   - Never throws — all errors are caught and logged here.

import { db, aiOutputsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import type { OnboardPayload } from "../lib/pipeline-emitter";
import { scoreSupplier } from "./scoring-service";
import { evaluateSupplier } from "./supplier-graduation-service";

export async function runOnboardPipeline(payload: OnboardPayload): Promise<void> {
  const { supplierId, correlationId } = payload;
  try {
    await scoreSupplier(supplierId);

    const hasScore = await db
      .select({ id: aiOutputsTable.id })
      .from(aiOutputsTable)
      .where(eq(aiOutputsTable.supplierId, supplierId))
      .limit(1);

    if (!hasScore.length) {
      logger.warn({ supplierId, correlationId }, "onboard-pipeline: skipping evaluation — no AI score written");
      return;
    }

    await evaluateSupplier(supplierId);
    logger.info({ supplierId, correlationId }, "onboard-pipeline: succeeded");
  } catch (err: any) {
    logger.error({ supplierId, correlationId, err }, "onboard-pipeline: failed");
    try { (globalThis as any).Sentry?.captureException?.(err); } catch {}
  }
}
