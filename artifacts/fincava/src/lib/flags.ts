// flags.ts — frontend feature flags
// Mirrors the backend lib/flags.ts contract.
// Most flags default to false; set the corresponding VITE_* env var to "true" or "1" to enable.
// ENABLE_RETAIL defaults to true (Sprint 3 complete); set VITE_ENABLE_RETAIL="false" to disable.

export const ENABLE_TRANSACTIONS: boolean =
  import.meta.env.VITE_ENABLE_TRANSACTIONS === "true" ||
  import.meta.env.VITE_ENABLE_TRANSACTIONS === "1";

export const ENABLE_FINANCE: boolean =
  import.meta.env.VITE_ENABLE_FINANCE === "true" ||
  import.meta.env.VITE_ENABLE_FINANCE === "1";

export const ENABLE_LOGISTICS: boolean =
  import.meta.env.VITE_ENABLE_LOGISTICS === "true" ||
  import.meta.env.VITE_ENABLE_LOGISTICS === "1";

/** Layer IV — retail storefront (domestic Colombian catalog + checkout).
 *  Defaults ON — Sprint 3 complete and live. Set VITE_ENABLE_RETAIL=false to kill-switch. */
export const ENABLE_RETAIL: boolean =
  import.meta.env.VITE_ENABLE_RETAIL !== "false";

/** Layer IV — retail cart and multi-supplier checkout. Defaults OFF until 1B ships. */
export const ENABLE_CART: boolean =
  import.meta.env.VITE_ENABLE_CART === "true" ||
  import.meta.env.VITE_ENABLE_CART === "1";
