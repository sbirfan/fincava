// interaction-logger.ts
// Fire-and-forget platform interaction signal logger.
//
// Contract:
//   - logInteraction() returns void — callers MUST NOT await it.
//   - Primary sink:  interaction_logs DB table (append-only INSERT).
//   - Fallback sink: pino structured logger (writes to file / stdout).
//   - The fallback activates if the DB insert throws for any reason
//     (pool exhausted, network, schema mismatch, etc.).
//   - Never throws, never blocks, never delays the HTTP response.
//
// Usage:
//   logInteraction({ eventType: "order_created", actorId: userId,
//                    actorType: "buyer", referenceId: order.id,
//                    referenceType: "order", payload: { totalUSD } });

import { db, interactionLogsTable } from "@workspace/db";
import { logger } from "./logger";

export interface InteractionEvent {
  eventType:     string;
  actorId?:      number | null;
  actorType?:    string | null;
  referenceId?:  number | null;
  referenceType?: string | null;
  payload?:      Record<string, unknown> | null;
}

export function logInteraction(event: InteractionEvent): void {
  // setImmediate pushes the work past the current call stack so it can never
  // block the HTTP response path — even a synchronous throw won't reach the caller.
  setImmediate(() => {
    (async () => {
      try {
        await db.insert(interactionLogsTable).values({
          eventType:     event.eventType,
          actorId:       event.actorId    ?? null,
          actorType:     event.actorType  ?? null,
          referenceId:   event.referenceId  ?? null,
          referenceType: event.referenceType ?? null,
          payload:       event.payload ?? null,
        });
      } catch (dbErr) {
        // DB unavailable or insert failed — fall back to pino so the signal
        // is never silently dropped.
        try {
          logger.warn(
            { err: dbErr, interaction: event },
            "interaction-logger: DB write failed — logging to console fallback",
          );
        } catch {
          // pino itself failed (extremely unlikely) — swallow silently.
        }
      }
    })();
  });
}
