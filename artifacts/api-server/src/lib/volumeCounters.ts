// Best-effort in-memory counters (reset on restart)
export const volumeCounters = {
  suppliers: 0,
  products:  0,
  orders:    0,
};

export function incrementAndMaybeLog(
  logger: { info: (obj: Record<string, unknown>, msg: string) => void },
  type: "suppliers" | "products" | "orders",
  meta: Record<string, unknown> = {},
): void {
  volumeCounters[type]++;

  const count = volumeCounters[type];

  if (count % 10 === 0) {
    logger.info({
      event:       "EVENT_VOLUME_MILESTONE",
      entity:      type,
      count,
      approximate: true,
    }, `Volume milestone reached for ${type}: ${count}`);
  }
}
