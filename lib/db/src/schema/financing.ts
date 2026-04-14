import { pgTable, text, serial, timestamp, real, pgEnum, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const loanStatusEnum = pgEnum("loan_status", [
  "ACTIVE", "REPAID", "DEFAULTED", "CANCELLED"
]);

export const loansTable = pgTable("loans", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  principalUSD: real("principal_usd").notNull(),
  feeUSD: real("fee_usd").notNull(),
  totalRepaymentUSD: real("total_repayment_usd").notNull(),
  aprPercent: real("apr_percent").notNull().default(12),
  termDays: integer("term_days").notNull().default(30),
  status: loanStatusEnum("status").notNull().default("ACTIVE"),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  creditScoreAtIssuance: integer("credit_score_at_issuance").notNull().default(500),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const repaymentsTable = pgTable("repayments", {
  id: serial("id").primaryKey(),
  loanId: serial("loan_id").notNull().references(() => loansTable.id),
  amountUSD: real("amount_usd").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Loan = typeof loansTable.$inferSelect;
export type Repayment = typeof repaymentsTable.$inferSelect;
