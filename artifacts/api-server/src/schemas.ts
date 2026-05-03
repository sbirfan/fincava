import { z } from "zod";

// ── Admin user edit ──────────────────────────────────────────────────────────
export const AdminUserEditBody = z.object({
  email: z.string().email().optional(),
  role: z.enum(["BUYER", "SUPPLIER", "ADMIN"]).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  country: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  companyName: z.string().min(1).max(200).optional(),
});

// ── Admin reset password ─────────────────────────────────────────────────────
export const AdminResetPasswordBody = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// ── Admin create user ─────────────────────────────────────────────────────────
export const AdminCreateUserBody = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["BUYER", "SUPPLIER", "ADMIN"]),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  country: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  companyName: z.string().min(1).max(200).optional(),
});

// ── Officer registration ─────────────────────────────────────────────────────
export const OfficerRegistrationBody = z.object({
  full_name: z.string().min(2).max(150),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(7).max(30),
  department: z.string().min(1).max(100),
  municipio: z.string().min(1).max(100),
  languages: z.array(z.string()).optional().default([]),
  experience_years: z.number().int().min(0).max(50).optional().nullable(),
  has_motorcycle: z.boolean().optional().nullable(),
  available_days: z.array(z.string()).optional().nullable(),
  motivation: z.string().max(2000).optional().nullable(),
  referral_code: z.string().max(50).optional().nullable(),
});

// ── Staff role assignment ────────────────────────────────────────────────────
export const STAFF_ROLE_VALUES = ["employee", "field_officer", "admin"] as const;
export type StaffRoleValue = typeof STAFF_ROLE_VALUES[number];

export const StaffRoleBody = z.object({
  role: z.enum(STAFF_ROLE_VALUES),
});

// ── Admin status updates ──────────────────────────────────────────────────────
export const AdminOrderStatusBody = z.object({
  status: z.enum(["INQUIRY", "SAMPLE_REQUESTED", "QUOTED", "CONFIRMED", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"]),
});

export const AdminLoanStatusBody = z.object({
  status: z.enum(["ACTIVE", "REPAID", "DEFAULTED", "CANCELLED"]),
});

// Admin edit supplier profile (basic info + farm primary product).
// Every field is optional — only the keys included in the body are updated.
export const AdminSupplierEditBody = z
  .object({
    nombreCompleto: z.string().trim().min(1).max(200).optional(),
    whatsappNumber: z
      .string()
      .trim()
      .max(30)
      .optional()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    email: z
      .union([z.literal(""), z.string().email().max(200)])
      .optional()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    municipio: z.string().trim().min(1).max(100).optional(),
    department: z
      .string()
      .trim()
      .max(100)
      .optional()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    vereda: z
      .string()
      .trim()
      .max(100)
      .optional()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    supplierType: z.enum(["FARMER", "COOPERATIVE", "EXPORTER", "PROCESSOR", "DISTRIBUTOR", "OTHER"]).optional(),
    customSupplierType: z.string().max(120).optional(),
    registeredBy: z
      .string()
      .trim()
      .max(150)
      .optional()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    primaryProduct: z
      .string()
      .trim()
      .max(100)
      .optional()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    originStoryPublished: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });

export const AdminSupplierStatusBody = z
  .object({
    status: z.enum(["PENDING", "ACTIVE", "INACTIVE"]),
    reason: z.enum(["REJECTED", "SUSPENDED"]).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === "INACTIVE" && !val.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "reason is required when setting status to INACTIVE (REJECTED or SUSPENDED)",
      });
    }
  });

// ── Pagination query params ──────────────────────────────────────────────────
export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type PaginationParams = z.infer<typeof PaginationQuery>;

export function parsePagination(query: unknown): { page: number; limit: number; offset: number } {
  const { page, limit } = PaginationQuery.parse(query);
  return { page, limit, offset: (page - 1) * limit };
}

// ── Ingestion ─────────────────────────────────────────────────────────────────

export const IngestionSupplierBody = z.object({
  nombreCompleto: z.string().min(1).max(200),
  municipio: z.string().min(1).max(100),
  department: z.string().max(100).optional().nullable(),
  vereda: z.string().max(100).optional().nullable(),
  whatsappNumber: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  supplierType: z.enum(["FARMER", "COOPERATIVE", "EXPORTER", "PROCESSOR", "DISTRIBUTOR", "OTHER"]).optional().default("FARMER"),
  customSupplierType: z.string().max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  normalizedName: z.string().max(200).optional().nullable(),
  sourceUrl: z.string().max(1000).optional().nullable(),
  country: z.string().max(100).optional().default("Colombia"),
  categoryHint: z.string().max(100).optional().nullable(),
  batchId: z.number().int().positive().optional().nullable(),
  overrideDuplicateId: z.number().int().positive().optional().nullable(),
  overrideJustification: z.string().max(500).optional().nullable(),
});

export type IngestionSupplierInput = z.infer<typeof IngestionSupplierBody>;

export const EnrichmentRequestBody = z.object({
  supplierId: z.number().int().positive().optional().nullable(),
  input: IngestionSupplierBody,
});

export const IngestionStatusUpdateBody = z.object({
  ingestionStatus: z.enum(["DRAFT", "ENRICHED", "READY", "REJECTED"]),
});

export const BatchCreateBody = z.object({
  notes: z.string().max(1000).optional().nullable(),
  batchSize: z.number().int().min(1).max(500).optional().nullable(),
});

export const DuplicateCheckQuery = z.object({
  nombre: z.string().min(1).max(200),
  country: z.string().max(100).optional().default("Colombia"),
});

// Known entity types an admin can explicitly hard-exclude from discovery results.
export const EXCLUDE_TYPE_VALUES = [
  "cooperative",
  "exporter",
  "processor",
  "distributor",
] as const;
export type ExcludeType = (typeof EXCLUDE_TYPE_VALUES)[number];

export const DiscoveryRequestBody = z.object({
  category: z.string().min(1).max(100),
  region: z.string().min(1).max(100),
  maxResults: z.number().int().min(1).max(20).optional().default(10),
  // Optional hard exclusions — each value maps to a HARD RULE appended to the
  // AI prompt so the model never surfaces that entity type in results.
  excludeTypes: z.array(z.enum(EXCLUDE_TYPE_VALUES)).max(4).optional().default([]),
});

// ── Batch confirm (T4) ────────────────────────────────────────────────────────
// Accepts supplier IDs (already created as DRAFT via T1 form or quick-create)
// and transitions each to ingestionStatus = READY. Limit of 20 (Zod only).

export const BatchConfirmBody = z.object({
  leadIds: z.array(z.number().int().positive()).min(1).max(20),
});
