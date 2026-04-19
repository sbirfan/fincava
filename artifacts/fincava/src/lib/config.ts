// VITE_SUPPORT_WHATSAPP_NUMBER must be digits only — no '+', spaces, or dashes.
// Example: 573101234567 (country code 57 + local number, no leading +)
// This is used to build wa.me deep links for farmers to contact support.
export const SUPPORT_WHATSAPP_NUMBER =
  import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER ?? "573001234567";
