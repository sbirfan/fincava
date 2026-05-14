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
import { logInteraction } from "../lib/interaction-logger";
import type { OnboardPayload } from "../lib/pipeline-emitter";
import { scoreSupplier } from "./scoring-service";
import { evaluateSupplier } from "./supplier-graduation-service";
import { initSupplierProduct } from "./supplier-product-init";

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

    // Step 3: Seed company + product stub so this supplier is immediately
    // eligible for buyer matching. Non-fatal — a stub creation failure must
    // never abort the pipeline or prevent the supplier from being scored.
    try {
      const initResult = await initSupplierProduct(supplierId);
      if (initResult.skipped) {
        logger.debug({ supplierId, correlationId, reason: initResult.reason },
          "onboard-pipeline: product stub already exists — skipped");
      } else {
        logger.info({ supplierId, correlationId, companyId: initResult.companyId, productId: initResult.productId },
          "onboard-pipeline: product stub seeded for buyer matching");
      }
    } catch (initErr: any) {
      logger.warn({ supplierId, correlationId, err: initErr },
        "onboard-pipeline: product stub creation failed (non-fatal)");
    }

    logInteraction({
      eventType:     "supplier_onboarding",
      actorId:       supplierId,
      actorType:     "supplier",
      referenceId:   supplierId,
      referenceType: "supplier",
      payload:       { correlationId },
    });
  } catch (err: any) {
    logger.error({ supplierId, correlationId, err }, "onboard-pipeline: failed");
    try { (globalThis as any).Sentry?.captureException?.(err); } catch {}
  }
}
