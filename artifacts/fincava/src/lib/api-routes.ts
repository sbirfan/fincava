export const API = {
  AUTH_LOGIN: "/api/auth/login",
  AUTH_REGISTER: "/api/auth/register",
  AUTH_LOGOUT: "/api/auth/logout",
  AUTH_FORGOT_PASSWORD: "/api/auth/forgot-password",
  AUTH_RESET_PASSWORD: "/api/auth/reset-password",
  AUTH_VERIFY_EMAIL: "/api/auth/verify-email",
  AUTH_RESEND_VERIFICATION: "/api/auth/resend-verification",
  BUYER_ONBOARDING: "/api/buyer/onboarding",
  SUPPLIER_ONBOARD: "/api/suppliers/onboard",
  PRODUCTS: "/api/products",
  ORDERS: "/api/buyer/orders",
} as const;
