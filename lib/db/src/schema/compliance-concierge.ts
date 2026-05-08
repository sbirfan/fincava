// CC-1 Compliance Concierge — Additive Layer
// Architecture invariant: no existing table is altered.
// All tables below are new (CC-ARCH-1).

import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { suppliersTable } from "./suppliers";
import { usersTable } from "./users";

// ── 1. supplier_requirement_status ────────────────────────────────────────────
// Tracks each supplier's progress through each compliance requirement.
// Phase I requirement codes: DIAN_RUT | ICA_CONTEXT | FNC_COFFEE
export const supplierRequirementStatusTable = pgTable(
  "supplier_requirement_status",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    requirementCode: text("requirement_code").notNull(),
    // DIAN_RUT | ICA_CONTEXT | FNC_COFFEE
    agency: text("agency").notNull(),
    // DIAN | ICA | FNC
    state: text("state").notNull().default("not_started"),
    // not_started | not_sure | self_serve_in_progress | assisted_in_progress
    // managed_service_candidate | submitted | needs_fix | conditionally_approved
    // verified | rejected
    selectedMode: text("selected_mode"),
    // null | has_rut_ready_to_upload | no_rut_self_serve | assisted | managed
    adminRequired: boolean("admin_required").notNull().default(false),
    confidenceScore: integer("confidence_score"),
    visibleNote: text("visible_note"),
    internalNote: text("internal_note"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    supplierReqUnique: uniqueIndex("srs_supplier_req_unique").on(
      t.supplierId,
      t.requirementCode,
    ),
  }),
);

// ── 2. compliance_enablement_flows ────────────────────────────────────────────
// Step-by-step guidance content for each requirement + mode (Spanish Phase I).
export const complianceEnablementFlowsTable = pgTable(
  "compliance_enablement_flows",
  {
    id: serial("id").primaryKey(),
    requirementCode: text("requirement_code").notNull(),
    stepOrder: integer("step_order").notNull(),
    mode: text("mode").notNull(),
    // self_serve | assisted | managed
    language: text("language").notNull().default("es"),
    title: text("title").notNull(),
    guidance: text("guidance").notNull(),
    expectedOutput: text("expected_output"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

// ── 3. compliance_documents_v2 ────────────────────────────────────────────────
// Compliance documents uploaded by an officer on behalf of a supplier.
// Uses presigned GCS URLs — no binary content stored here.
export const complianceDocumentsV2Table = pgTable("compliance_documents_v2", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliersTable.id, { onDelete: "cascade" }),
  requirementCode: text("requirement_code").notNull(),
  documentType: text("document_type").notNull(),
  evidenceType: text("evidence_type"),
  fileUrl: text("file_url").notNull(),
  extractedFieldsJson: jsonb("extracted_fields_json"),
  validationResultsJson: jsonb("validation_results_json"),
  ocrConfidence: integer("ocr_confidence"),
  uploadedBy: text("uploaded_by").notNull().default("officer"),
  reviewStatus: text("review_status").notNull().default("pending"),
  // pending | accepted | needs_fix | rejected
  // ── Layer A: Document pre-screening results ────────────────────────────────
  prescreeningResult: jsonb("prescreening_result"),
  prescreenedAt: timestamp("prescreened_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── 4. admin_compliance_reviews ───────────────────────────────────────────────
// Admin review decisions — append-only audit log.
export const adminComplianceReviewsTable = pgTable(
  "admin_compliance_reviews",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    requirementCode: text("requirement_code").notNull(),
    documentId: integer("document_id").references(
      () => complianceDocumentsV2Table.id,
    ),
    decision: text("decision").notNull(),
    // verified | needs_fix | conditionally_approved | rejected | escalated
    reasonCode: text("reason_code"),
    visibleNote: text("visible_note"),
    internalNote: text("internal_note"),
    reviewerId: integer("reviewer_id").references(() => usersTable.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

// ── 5. buyer_visibility_signals ───────────────────────────────────────────────
// Controls which compliance signals are shown to buyers (admin-gated toggle).
export const buyerVisibilitySignalsTable = pgTable(
  "buyer_visibility_signals",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    requirementCode: text("requirement_code").notNull(),
    visible: boolean("visible").notNull().default(false),
    badgeLabel: text("badge_label"),
    disclaimer: text("disclaimer"),
    enabledBy: integer("enabled_by").references(() => usersTable.id),
    enabledAt: timestamp("enabled_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    bvsSupplierReqUnique: uniqueIndex("bvs_supplier_req_unique").on(
      t.supplierId,
      t.requirementCode,
    ),
  }),
);

// ── 6. supplier_export_mode ───────────────────────────────────────────────────
// Supplier's export mode declaration (direct / intermediary / not_sure).
export const supplierExportModeTable = pgTable(
  "supplier_export_mode",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    productCategory: text("product_category").notNull().default("coffee"),
    mode: text("mode").notNull(),
    // direct | intermediary | not_sure
    confidence: text("confidence").notNull().default("self_declared"),
    // self_declared | admin_confirmed | admin_overridden
    verifiedBy: integer("verified_by").references(() => usersTable.id),
    partnerName: text("partner_name"),
    partnerRole: text("partner_role"),
    evidenceStatus: text("evidence_status").default("none"),
    // none | uploaded | verified
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("supplier_export_mode_supplier_category_uidx").on(
      t.supplierId,
      t.productCategory,
    ),
  ],
);

// ── 7. managed_service_cases ──────────────────────────────────────────────────
// Managed service cases — officer does compliance work for supplier.
// Fee/payment logic is Phase III only. Phase I behaviour = WhatsApp trigger.
export const managedServiceCasesTable = pgTable("managed_service_cases", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliersTable.id, { onDelete: "cascade" }),
  requirementCode: text("requirement_code").notNull(),
  packageType: text("package_type").notNull(),
  // rut_registration | ica_preparation | fnc_registration
  consentRecord: text("consent_record"),
  consentAt: timestamp("consent_at", { withTimezone: true }),
  feeStatus: text("fee_status").notNull().default("none"),
  // none | quoted | invoiced | paid — payment logic is Phase III only
  assignedStaffId: integer("assigned_staff_id").references(
    () => usersTable.id,
  ),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
