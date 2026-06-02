// flags.ts — frontend feature flags
// Mirrors the backend lib/flags.ts contract.
// All flags default to false; set the corresponding VITE_* env var to "true" or "1" to enable.

export const ENABLE_TRANSACTIONS: boolean =
  import.meta.env.VITE_ENABLE_TRANSACTIONS === "true" ||
  import.meta.env.VITE_ENABLE_TRANSACTIONS === "1";

export const ENABLE_FINANCE: boolean =
  import.meta.env.VITE_ENABLE_FINANCE === "true" ||
  import.meta.env.VITE_ENABLE_FINANCE === "1";

export const ENABLE_LOGISTICS: boolean =
  import.meta.env.VITE_ENABLE_LOGISTICS === "true" ||
  import.meta.env.VITE_ENABLE_LOGISTICS === "1";

/** Layer IV — retail storefront (domestic Colombian catalog + checkout). */
export const ENABLE_RETAIL: boolean =
  import.meta.env.VITE_ENABLE_RETAIL === "true" ||
  import.meta.env.VITE_ENABLE_RETAIL === "1";
