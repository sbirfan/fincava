// pipeline-emitter.ts
// Singleton EventEmitter for post-request async pipelines.
//
// Design rules:
//   - One global instance, created once at module load (Node module cache guarantees this).
//   - All handlers are registered in index.ts at startup — never inside route handlers.
//   - Emitting always happens inside setImmediate so the HTTP response is sent first.
//   - If no handler is registered when an event fires, execution falls back to the
//     direct-call path supplied by the caller (no silent failure).

import { EventEmitter } from "node:events";
import { logger } from "./logger";

class PipelineEmitter extends EventEmitter {}

export const pipelineEmitter = new PipelineEmitter();

// Cap at 5 — more than one listener per event is almost certainly a bug.
pipelineEmitter.setMaxListeners(5);

// ── Event name constants ──────────────────────────────────────────────────────
export const SUPPLIER_ONBOARD_EVENT = "supplier:onboarded" as const;

export type OnboardPayload = {
  supplierId: number;
  correlationId: string;
};

// ── Startup diagnostics ───────────────────────────────────────────────────────
export function logListenerCounts(): void {
  const count = pipelineEmitter.listenerCount(SUPPLIER_ONBOARD_EVENT);
  logger.info(
    { event: SUPPLIER_ONBOARD_EVENT, listenerCount: count },
    "pipeline-emitter: registered listeners",
  );
  if (count === 0) {
    logger.warn(
      { event: SUPPLIER_ONBOARD_EVENT },
      "pipeline-emitter: WARNING — no listeners registered at startup",
    );
  }
}

// ── Safe registration helper ─────────────────────────────────────────────────
// Prevents duplicate listeners. Call once per handler per event at startup.
export function registerOnce(
  event: string,
  handler: (...args: any[]) => void,
): void {
  const existing = pipelineEmitter.rawListeners(event);
  const alreadyRegistered = existing.some(
    (fn) => fn === handler || (fn as any).listener === handler,
  );
  if (alreadyRegistered) {
    logger.warn({ event }, "pipeline-emitter: duplicate handler registration skipped");
    return;
  }
  pipelineEmitter.on(event, handler);
  logger.info(
    { event, listenerCount: pipelineEmitter.listenerCount(event) },
    "pipeline-emitter: handler registered",
  );
}
