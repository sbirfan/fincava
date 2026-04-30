import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { db, usersTable, profilesTable, companiesTable } from "@workspace/db";
import { loansTable, repaymentsTable } from "@workspace/db";
import { ordersTable, orderItemsTable, productsTable, staffRolesTable, suppliersTable } from "@workspace/db";
import { buyerProfilesTable } from "@workspace/db";
import { supplierIngestionBatchesTable, productPlaceholdersTable, INTERACTION_TYPES } from "@workspace/db";
import { hashPassword } from "../lib/auth";
import { computeTrustScore } from "../services/trust-score-service";
import { adminOnly } from "../middleware/admin";
import { AdminUserEditBody, AdminResetPasswordBody, AdminCreateUserBody, AdminOrderStatusBody, AdminLoanStatusBody, AdminSupplierStatusBody, StaffRoleBody, parsePagination, STAFF_ROLE_VALUES, BatchCreateBody, IngestionSupplierBody, EnrichmentRequestBody, IngestionStatusUpdateBody, DuplicateCheckQuery, DiscoveryRequestBody, BatchConfirmBody } from "../schemas";
import { enrichSupplierWithAI } from "../services/ingestion-structuring-service";
import { checkDuplicate, computeSupplierFingerprint } from "../services/duplicate-detector";
import { discoverLeads } from "../services/discovery-engine";
import { randomUUID } from "crypto";
import { and, desc, eq, inArray, count, sum } from "drizzle-orm";
import { sendEmail, supplierStatusChangeEmail, orderStatusEmail, loanStatusEmail, adminCreatedAccountEmail, adminPasswordResetEmail, adminRoleChangeEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { logInteraction } from "../lib/interaction-logger";
import { FEE_STATUSES } from "../constants/fee-status";
import { runBackup } from "../services/backup-service";
import { incrementAndMaybeLog } from "../lib/volumeCounters";

const router: IRouter = Router();

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get("/admin/stats", ...adminOnly, async (_req, res): Promise<void> => {
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [orderCount] = await db.select({ count: count() }).from(ordersTable);
  const [loanCount] = await db.select({ count: count() }).from(loansTable);

  const [loanTotals] = await db
    .select({
      totalPrincipal: sum(loansTable.principalUSD),
      totalOutstanding: sum(loansTable.totalRepaymentUSD),
    })
    .from(loansTable)
    .where(eq(loansTable.status, "ACTIVE"));

  const [orderTotals] = await db
    .select({ totalValue: sum(ordersTable.totalUSD) })
    .from(ordersTable);

  const [activeLoans] = await db
    .select({ count: count() })
    .from(loansTable)
    .where(eq(loansTable.status, "ACTIVE"));

  const [defaultedLoans] = await db
    .select({ count: count() })
    .from(loansTable)
    .where(eq(loansTable.status, "DEFAULTED"));

  res.json({
    users: Number(userCount.count),
    orders: Number(orderCount.count),
    loans: Number(loanCount.count),
    activeLoans: Number(activeLoans.count),
    defaultedLoans: Number(defaultedLoans.count),
    totalGMV: Number(orderTotals.totalValue ?? 0),
    totalLoanPrincipal: Number(loanTotals?.totalPrincipal ?? 0),
    totalOutstanding: Number(loanTotals?.totalOutstanding ?? 0),
  });
});

// ── GET /api/admin/users ─────────────────────────────────────────────────────
router.get("/admin/users", ...adminOnly, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query);

  const [{ total }] = await db.select({ total: count() }).from(usersTable);

  const data = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
      firstName: profilesTable.firstName,
      lastName: profilesTable.lastName,
      country: profilesTable.country,
      phone: profilesTable.phone,
      companyName: companiesTable.name,
      companyVerified: companiesTable.verified,
    })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .leftJoin(companiesTable, eq(companiesTable.userId, usersTable.id))
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ data, total: Number(total), page, limit, totalPages: Math.max(1, Math.ceil(Number(total) / limit)) });
});

// ── GET /api/admin/loans ─────────────────────────────────────────────────────
router.get("/admin/loans", ...adminOnly, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query);

  const [{ total }] = await db.select({ total: count() }).from(loansTable);

  const loans = await db
    .select({
      id: loansTable.id,
      buyerId: loansTable.buyerId,
      buyerEmail: usersTable.email,
      buyerFirstName: profilesTable.firstName,
      buyerLastName: profilesTable.lastName,
      principalUSD: loansTable.principalUSD,
      feeUSD: loansTable.feeUSD,
      totalRepaymentUSD: loansTable.totalRepaymentUSD,
      aprPercent: loansTable.aprPercent,
      termDays: loansTable.termDays,
      status: loansTable.status,
      dueAt: loansTable.dueAt,
      creditScoreAtIssuance: loansTable.creditScoreAtIssuance,
      createdAt: loansTable.createdAt,
    })
    .from(loansTable)
    .leftJoin(usersTable, eq(usersTable.id, loansTable.buyerId))
    .leftJoin(profilesTable, eq(profilesTable.userId, loansTable.buyerId))
    .orderBy(desc(loansTable.createdAt))
    .limit(limit)
    .offset(offset);

  const loanIds = loans.map((l) => l.id);
  const repayments =
    loanIds.length > 0
      ? await db
          .select({ loanId: repaymentsTable.loanId, amountUSD: repaymentsTable.amountUSD })
          .from(repaymentsTable)
          .where(inArray(repaymentsTable.loanId, loanIds))
      : [];

  const repaidByLoan: Record<number, number> = {};
  for (const r of repayments) {
    repaidByLoan[r.loanId] = (repaidByLoan[r.loanId] ?? 0) + r.amountUSD;
  }

  const data = loans.map((l) => ({ ...l, totalRepaid: repaidByLoan[l.id] ?? 0 }));
  res.json({ data, total: Number(total), page, limit, totalPages: Math.max(1, Math.ceil(Number(total) / limit)) });
});

// ── GET /api/admin/orders ────────────────────────────────────────────────────
router.get("/admin/orders", ...adminOnly, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query);

  const [{ total }] = await db.select({ total: count() }).from(ordersTable);

  const data = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      totalUSD: ordersTable.totalUSD,
      incoterm: ordersTable.incoterm,
      destinationPort: ordersTable.destinationPort,
      shippingMethod: ordersTable.shippingMethod,
      createdAt: ordersTable.createdAt,
      buyerId: ordersTable.buyerId,
      buyerEmail: usersTable.email,
      buyerFirstName: profilesTable.firstName,
      buyerLastName: profilesTable.lastName,
      feePercentage: ordersTable.feePercentage,
      feeAmountUSD:  ordersTable.feeAmountUSD,
      feeStatus:     ordersTable.feeStatus,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(usersTable.id, ordersTable.buyerId))
    .leftJoin(profilesTable, eq(profilesTable.userId, ordersTable.buyerId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ data, total: Number(total), page, limit, totalPages: Math.max(1, Math.ceil(Number(total) / limit)) });
});

// ── GET /api/admin/buyers ─────────────────────────────────────────────────────
router.get("/admin/buyers", ...adminOnly, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query);

  const [{ total }] = await db.select({ total: count() }).from(buyerProfilesTable);

  const data = await db
    .select({
      // buyer_profiles fields
      profileId:         buyerProfilesTable.id,
      userId:            buyerProfilesTable.userId,
      companyName:       buyerProfilesTable.companyName,
      country:           buyerProfilesTable.country,
      destinationPort:   buyerProfilesTable.destinationPort,
      targetProducts:    buyerProfilesTable.targetProducts,
      preferredIncoterm: buyerProfilesTable.preferredIncoterm,
      intendedVolumeMt:  buyerProfilesTable.intendedVolumeMt,
      importFrequency:   buyerProfilesTable.importFrequency,
      onboardedAt:       buyerProfilesTable.onboardedAt,
      updatedAt:         buyerProfilesTable.updatedAt,
      // users fields
      email:             usersTable.email,
      role:              usersTable.role,
      createdAt:         usersTable.createdAt,
      // profiles fields
      firstName:         profilesTable.firstName,
      lastName:          profilesTable.lastName,
      phone:             profilesTable.phone,
      // companies fields
      registeredCompany: companiesTable.name,
      companyVerified:   companiesTable.verified,
    })
    .from(buyerProfilesTable)
    .innerJoin(usersTable, eq(usersTable.id, buyerProfilesTable.userId))
    .leftJoin(profilesTable, eq(profilesTable.userId, buyerProfilesTable.userId))
    .leftJoin(companiesTable, eq(companiesTable.userId, buyerProfilesTable.userId))
    .orderBy(desc(buyerProfilesTable.onboardedAt))
    .limit(limit)
    .offset(offset);

  res.json({
    data,
    total: Number(total),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(Number(total) / limit)),
  });
});

// ── PATCH /api/admin/users/:id ───────────────────────────────────────────────
router.patch("/admin/users/:id", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const parsed = AdminUserEditBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, role, firstName, lastName, country, phone, companyName } = parsed.data;

  // Fetch current user state before applying changes so we can detect a role change
  const [currentUser] = await db
    .select({ email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!currentUser) { res.status(404).json({ error: "User not found" }); return; }

  // Record whether a role change is happening before we apply the update
  const roleChanged = role !== undefined && role !== currentUser.role;
  const oldRole = currentUser.role;

  if (email || role) {
    const updates: Record<string, any> = {};
    if (email) updates.email = email;
    if (role) updates.role = role;
    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
  }

  if (firstName !== undefined || lastName !== undefined || country !== undefined || phone !== undefined) {
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
    const profileUpdates: Record<string, any> = {};
    if (firstName !== undefined) profileUpdates.firstName = firstName;
    if (lastName !== undefined) profileUpdates.lastName = lastName;
    if (country !== undefined) profileUpdates.country = country;
    if (phone !== undefined) profileUpdates.phone = phone;
    if (existing) {
      await db.update(profilesTable).set(profileUpdates).where(eq(profilesTable.userId, userId));
    } else {
      await db.insert(profilesTable).values({ userId, firstName: firstName ?? "", lastName: lastName ?? "", ...profileUpdates });
    }
  }

  if (companyName !== undefined) {
    const [existingCo] = await db.select({ id: companiesTable.id }).from(companiesTable).where(eq(companiesTable.userId, userId));
    if (existingCo) {
      await db.update(companiesTable).set({ name: companyName }).where(eq(companiesTable.userId, userId));
    } else {
      // Need a country for the NOT NULL column — fall back to profile country or empty string
      const [profile] = await db.select({ country: profilesTable.country }).from(profilesTable).where(eq(profilesTable.userId, userId));
      await db.insert(companiesTable).values({
        userId,
        name: companyName,
        country: profile?.country ?? "",
        type: "EXPORTER",
        description: "",
      });
    }
  }

  res.json({ success: true });

  // Fire-and-forget: notify the affected user if their role was changed
  if (roleChanged && role) {
    Promise.resolve().then(async () => {
      try {
        const recipientEmail = email ?? currentUser.email;
        if (!recipientEmail) return;
        const [profile] = await db
          .select({ firstName: profilesTable.firstName, lastName: profilesTable.lastName })
          .from(profilesTable)
          .where(eq(profilesTable.userId, userId));
        const name = profile?.firstName
          ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ""}`
          : recipientEmail;
        const appBaseUrl = process.env["FRONTEND_URL"]
          ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");
        const emailContent = adminRoleChangeEmail({
          name,
          oldRole,
          newRole: role,
          loginUrl: `${appBaseUrl}/login`,
        });
        await sendEmail({ to: recipientEmail, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
      } catch (err) {
        logger.error({ err, userId }, "Failed to send role-change email");
      }
    });
  }
});

// ── POST /api/admin/users/:id/reset-password ─────────────────────────────────
router.post("/admin/users/:id/reset-password", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const parsed = AdminResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  await db.update(usersTable).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(usersTable.id, userId));
  res.json({ success: true });

  // Fire-and-forget: security notice to the user whose password was reset
  Promise.resolve().then(async () => {
    try {
      const [targetUser] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
      if (!targetUser?.email) return;
      const [targetProfile] = await db.select({ firstName: profilesTable.firstName }).from(profilesTable).where(eq(profilesTable.userId, userId));
      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");
      const emailContent = adminPasswordResetEmail({
        firstName: targetProfile?.firstName || "there",
        loginUrl: `${appBaseUrl}/login`,
      });
      await sendEmail({ to: targetUser.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
    } catch (err) {
      logger.warn({ err, userId }, "Admin password reset security email failed");
    }
  });
});

// ── POST /api/admin/users ─────────────────────────────────────────────────────
router.post("/admin/users", ...adminOnly, async (req, res): Promise<void> => {
  const parsed = AdminCreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password, role, firstName, lastName, country, phone, companyName } = parsed.data;

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash: await hashPassword(password), role })
    .returning();

  if (firstName || lastName || country || phone) {
    await db.insert(profilesTable).values({
      userId: user.id,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      country: country ?? null,
      phone: phone ?? null,
      language: "en",
    });
  }

  if (companyName) {
    await db.insert(companiesTable).values({
      userId: user.id,
      name: companyName,
      country: country ?? "",
      type: "EXPORTER",
      description: "",
    });
  }

  res.status(201).json({ success: true, id: user.id });

  // Fire-and-forget: tell the new user their account was created
  Promise.resolve().then(async () => {
    try {
      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");
      const emailContent = adminCreatedAccountEmail({
        firstName: firstName || "there",
        email,
        forgotPasswordUrl: `${appBaseUrl}/forgot-password`,
      });
      await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
    } catch (err) {
      logger.warn({ err, userId: user.id }, "Admin-created account email failed");
    }
  });
});

// ── DELETE /api/admin/users/:id ──────────────────────────────────────────────
router.delete("/admin/users/:id", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const requesterId = (req as any).userId;
  if (userId === requesterId) {
    res.status(400).json({ error: "You cannot delete your own account" });
    return;
  }

  try {
    await db.delete(staffRolesTable).where(eq(staffRolesTable.userId, userId));
    await db.delete(profilesTable).where(eq(profilesTable.userId, userId));
    await db.delete(companiesTable).where(eq(companiesTable.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch (err: any) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === "23503") {
      res.status(409).json({
        error:
          "Cannot delete user: they have associated orders, RFQs, messages, or other records. Deactivate the account instead.",
      });
    } else {
      throw err;
    }
  }
});

// ── PATCH /api/admin/orders/:id/status ───────────────────────────────────────
router.patch("/admin/orders/:id/status", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const parsed = AdminOrderStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return; }

  const [updated] = await db.update(ordersTable).set({ status: parsed.data.status as any }).where(eq(ordersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }
  res.json({ success: true, status: updated.status });

  // Fire-and-forget: notify buyer of order status change
  Promise.resolve().then(async () => {
    try {
      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");

      const [buyerUser] = await db.select({ email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, updated.buyerId));
      if (!buyerUser?.email) return;

      const [buyerProfile] = await db.select({ firstName: profilesTable.firstName, lastName: profilesTable.lastName })
        .from(profilesTable).where(eq(profilesTable.userId, updated.buyerId));
      const buyerName = buyerProfile
        ? `${buyerProfile.firstName} ${buyerProfile.lastName}`.trim()
        : "Customer";

      const emailContent = orderStatusEmail({
        buyerName,
        orderId: updated.id,
        newStatus: updated.status,
        totalUSD: updated.totalUSD,
        incoterm: updated.incoterm ?? null,
        destinationPort: updated.destinationPort ?? null,
        orderUrl: `${appBaseUrl}/dashboard/orders/${updated.id}`,
      });

      if (emailContent) {
        await sendEmail({ to: buyerUser.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
      }
    } catch (err) {
      logger.warn({ err, orderId: id }, "Admin order status email failed");
    }
  });
});

// ── PATCH /api/admin/orders/:id/fee-status ───────────────────────────────────
const AdminOrderFeeStatusBody = z.object({
  feeStatus: z.enum(FEE_STATUSES),
});

router.patch("/admin/orders/:id/fee-status", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const parsed = AdminOrderFeeStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return; }

  const [updated] = await db
    .update(ordersTable)
    .set({ feeStatus: parsed.data.feeStatus, updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }

  logInteraction({
    eventType:     "fee_status_updated",
    actorType:     "admin",
    referenceId:   updated.id,
    referenceType: "order",
    payload:       { newStatus: parsed.data.feeStatus },
  });

  res.json({ success: true, id: updated.id, feeStatus: updated.feeStatus });
});

// ── PATCH /api/admin/loans/:id/status ────────────────────────────────────────
router.patch("/admin/loans/:id/status", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid loan id" }); return; }

  const parsed = AdminLoanStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return; }

  const [updated] = await db.update(loansTable).set({ status: parsed.data.status as any }).where(eq(loansTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Loan not found" }); return; }
  res.json({ success: true, status: updated.status });

  // Fire-and-forget: notify supplier(s) of loan status change via linked order
  Promise.resolve().then(async () => {
    try {
      if (!updated.orderId) {
        logger.info({ loanId: id }, "Loan status changed but no linked order — skipping supplier notification");
        return;
      }

      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");

      const orderRef = `ORD-${String(updated.orderId).padStart(4, "0")}`;

      // Resolve supplier(s) from order items → products → companies → users
      const items = await db.select({ productId: orderItemsTable.productId })
        .from(orderItemsTable).where(eq(orderItemsTable.orderId, updated.orderId));
      if (items.length === 0) return;

      const productIds = items.map(i => i.productId);
      const supplierCompanies = await db
        .selectDistinct({ companyId: productsTable.companyId })
        .from(productsTable)
        .where(inArray(productsTable.id, productIds));

      for (const { companyId } of supplierCompanies) {
        const [company] = await db.select({ name: companiesTable.name, userId: companiesTable.userId })
          .from(companiesTable).where(eq(companiesTable.id, companyId));
        if (!company) continue;

        const [supplierUser] = await db.select({ email: usersTable.email })
          .from(usersTable).where(eq(usersTable.id, company.userId));
        if (!supplierUser?.email) continue;

        const emailContent = loanStatusEmail({
          supplierName: company.name,
          orderId: updated.orderId,
          orderRef,
          newStatus: updated.status,
          principalUSD: updated.principalUSD,
          orderUrl: `${appBaseUrl}/supplier-dashboard/orders`,
        });

        if (emailContent) {
          await sendEmail({ to: supplierUser.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
        }
      }
    } catch (err) {
      logger.warn({ err, loanId: id }, "Admin loan status supplier email failed");
    }
  });
});

// ── PATCH /api/admin/suppliers/:id/status ────────────────────────────────────
router.patch("/admin/suppliers/:id/status", ...adminOnly, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid supplier id" }); return; }

  const parsed = AdminSupplierStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return; }

  const [updated] = await db
    .update(suppliersTable)
    .set({ status: parsed.data.status as any })
    .where(eq(suppliersTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Supplier not found" }); return; }

  res.json({ success: true, status: updated.status });

  // Fire status-change email if supplier has an email address (fire-and-forget)
  if (updated.email) {
    const appBaseUrl = process.env["FRONTEND_URL"]
      ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");
    const emailContent = supplierStatusChangeEmail({
      name: updated.nombreCompleto,
      newStatus: updated.status,
      reason: parsed.data.reason ?? null,
      appUrl: appBaseUrl,
    });
    if (emailContent) {
      sendEmail({
        to: updated.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }).catch((err) => logger.warn({ err, supplierId: id }, "Supplier status-change email failed"));
    }
  }
});

// ── GET /api/admin/team ───────────────────────────────────────────────────────
router.get("/admin/team", ...adminOnly, async (_req, res): Promise<void> => {
  const allRoles = await db
    .select({
      userId: staffRolesTable.userId,
      role: staffRolesTable.role,
      createdAt: staffRolesTable.createdAt,
      assignedByEmail: usersTable.email,
    })
    .from(staffRolesTable)
    .leftJoin(usersTable, eq(usersTable.id, staffRolesTable.assignedBy));

  const rolesByUser: Record<number, { role: string; assignedByEmail: string | null; createdAt: Date }[]> = {};
  for (const r of allRoles) {
    if (!rolesByUser[r.userId]) rolesByUser[r.userId] = [];
    rolesByUser[r.userId].push({ role: r.role, assignedByEmail: r.assignedByEmail, createdAt: r.createdAt });
  }

  const userIds = Object.keys(rolesByUser).map(Number);
  if (userIds.length === 0) {
    res.json([]);
    return;
  }

  const members = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
      firstName: profilesTable.firstName,
      lastName: profilesTable.lastName,
    })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .where(inArray(usersTable.id, userIds))
    .orderBy(desc(usersTable.createdAt));

  res.json(members.map((m) => ({ ...m, staffRoles: rolesByUser[m.id] ?? [] })));
});

// ── GET /api/admin/team/users ─────────────────────────────────────────────────
// Returns all users (for the assignment dropdown)
router.get("/admin/team/users", ...adminOnly, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query);
  const [{ total }] = await db.select({ total: count() }).from(usersTable);

  const data = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      firstName: profilesTable.firstName,
      lastName: profilesTable.lastName,
    })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .orderBy(usersTable.email)
    .limit(limit)
    .offset(offset);

  const existingRoles = await db
    .select({ userId: staffRolesTable.userId, role: staffRolesTable.role })
    .from(staffRolesTable)
    .where(inArray(staffRolesTable.userId, data.map((u) => u.id)));

  const roleMap: Record<number, string[]> = {};
  for (const r of existingRoles) {
    if (!roleMap[r.userId]) roleMap[r.userId] = [];
    roleMap[r.userId].push(r.role);
  }

  res.json({
    data: data.map((u) => ({ ...u, staffRoles: roleMap[u.id] ?? [] })),
    total: Number(total),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(Number(total) / limit)),
  });
});

// ── POST /api/admin/team/:userId/roles ─────────────────────────────────────────
router.post("/admin/team/:userId/roles", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const parsed = StaffRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const adminId = (req as any).userId;

  await db
    .insert(staffRolesTable)
    .values({ userId, role: parsed.data.role, assignedBy: adminId })
    .onConflictDoNothing();

  res.json({ success: true });
});

// ── DELETE /api/admin/team/:userId/roles/:role ────────────────────────────────
router.delete("/admin/team/:userId/roles/:role", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId as string, 10);
  const role = req.params.role as string;

  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }
  if (!(STAFF_ROLE_VALUES as readonly string[]).includes(role)) {
    res.status(400).json({ error: `Invalid role. Must be one of: ${STAFF_ROLE_VALUES.join(", ")}` });
    return;
  }

  await db
    .delete(staffRolesTable)
    .where(and(eq(staffRolesTable.userId, userId), eq(staffRolesTable.role, role as any)));

  res.json({ success: true });
});

// ── POST /api/admin/suppliers/:companyId/recompute-trust ─────────────────────
router.post("/admin/suppliers/:companyId/recompute-trust", ...adminOnly, async (req, res): Promise<void> => {
  const companyId = parseInt(req.params.companyId as string, 10);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid company id" }); return; }

  const score = await computeTrustScore(companyId);
  res.json({ companyId, score });
});

// ── POST /api/admin/suppliers/:id/create-product ─────────────────────────────
const AdminCreateProductBody = z.object({
  name:          z.string().min(1),
  pricePerKgUSD: z.number().positive(),
});

router.post("/admin/suppliers/:id/create-product", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const supplierId = parseInt(req.params.id as string, 10);
  if (isNaN(supplierId)) {
    res.status(400).json({ error: "Invalid supplier id" });
    return;
  }

  const parsed = AdminCreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const [supplier] = await db
    .select({ id: suppliersTable.id, municipio: suppliersTable.municipio })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!supplier) {
    logger.error({ event: "PRODUCT_CREATE_SUPPLIER_MISSING", supplierId },
      "Supplier not found during product creation");
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  // Derive companyId: env-var override takes priority; falls through to strict
  // fail-fast name lookup if the var is absent. Both paths abort on any
  // ambiguity or missing row — no silent fallbacks.
  let companyId: number;

  const envCompanyId = process.env.FINCAVA_COMPANY_ID;

  if (envCompanyId !== undefined) {
    const parsed = parseInt(envCompanyId, 10);
    if (isNaN(parsed)) {
      logger.error({ event: "COMPANY_RESOLUTION_FAILED", supplierId,
        envCompanyId }, "Company resolution failed");
      res.status(500).json({ error: "Configured FINCAVA_COMPANY_ID not found" });
      return;
    }

    const [envRow] = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.id, parsed))
      .limit(1);

    if (!envRow) {
      logger.error({ event: "COMPANY_RESOLUTION_FAILED", supplierId,
        envCompanyId }, "Company resolution failed");
      res.status(500).json({ error: "Configured FINCAVA_COMPANY_ID not found" });
      return;
    }

    logger.info({ event: "COMPANY_RESOLUTION_ENV", companyId: envCompanyId });
    companyId = envRow.id;
  } else {
    // Strict fail-fast name lookup — requires exactly one match.
    const fincavaRows = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.name, "FINCAVA"));

    const matchCount = fincavaRows.length;

    if (matchCount === 0) {
      logger.error({ event: "COMPANY_RESOLUTION_FAILED", supplierId, matchCount },
        "Company resolution failed");
      res.status(500).json({ error: "FINCAVA company not found — cannot create product" });
      return;
    }

    if (matchCount > 1) {
      logger.error({ event: "COMPANY_RESOLUTION_FAILED", supplierId, matchCount },
        "Company resolution failed");
      res.status(500).json({ error: "Ambiguous company match — aborting product creation" });
      return;
    }

    companyId = fincavaRows[0].id;
  }

  const origin = supplier.municipio?.trim() || "Colombia";

  const [product] = await db
    .insert(productsTable)
    .values({
      companyId,
      supplierId,
      name:          parsed.data.name,
      pricePerKgUSD: parsed.data.pricePerKgUSD,
      description:   "Initial product",
      origin,
      certifications: [],
      organic:        false,
      directTrade:    false,
    })
    .returning();

  logInteraction({
    eventType:     "product_created",
    actorType:     "admin",
    referenceType: "product",
    referenceId:   product.id,
    payload:       { supplierId },
  });

  logger.info({ event: "PRODUCT_CREATED", supplierId, productId: product.id },
    "Admin created product for supplier");
  incrementAndMaybeLog(logger, "products", { supplierId, productId: product.id });

  res.status(201).json({
    id:            product.id,
    name:          product.name,
    pricePerKgUSD: product.pricePerKgUSD,
    supplierId:    product.supplierId,
  });
});

// ── POST /api/admin/backup/run ────────────────────────────────────────────────
// Two valid auth paths:
//   1. X-Backup-Token: <BACKUP_SECRET_V2>  — external cron caller (cron-job.org)
//   2. Standard admin JWT                  — manual trigger by admin user
// ── INGESTION ROUTES ─────────────────────────────────────────────────────────

// POST /api/admin/ingestion/batches — create a new ingestion batch
router.post("/admin/ingestion/batches", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const body = BatchCreateBody.safeParse(req.body);
  if (!body.success) {
    res.status(422).json({ error: "Invalid batch data", issues: body.error.issues });
    return;
  }
  const adminId = (req as any).userId as number;
  const batchUuid = randomUUID();

  const [batch] = await db
    .insert(supplierIngestionBatchesTable)
    .values({
      batchUuid,
      createdByAdminId: adminId,
      status: "DRAFT",
      batchSize: body.data.batchSize ?? null,
      notes: body.data.notes ?? null,
    })
    .returning();

  logInteraction({
    eventType: INTERACTION_TYPES.INGESTION_BATCH_CREATED,
    actorId: adminId,
    actorType: "admin",
    referenceId: batch.id,
    referenceType: "ingestion_batch",
    payload: { batchId: batch.id, batchUuid },
  });

  res.status(201).json(batch);
});

// GET /api/admin/ingestion/batches — list ingestion batches
router.get("/admin/ingestion/batches", ...adminOnly, async (_req: Request, res: Response): Promise<void> => {
  const batches = await db
    .select()
    .from(supplierIngestionBatchesTable)
    .orderBy(desc(supplierIngestionBatchesTable.createdAt))
    .limit(100);
  res.json(batches);
});

// GET /api/admin/ingestion/duplicate-check — check for duplicate supplier
router.get("/admin/ingestion/duplicate-check", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const query = DuplicateCheckQuery.safeParse(req.query);
  if (!query.success) {
    res.status(422).json({ error: "Missing nombre query param", issues: query.error.issues });
    return;
  }
  const result = await checkDuplicate(query.data.nombre, query.data.country);
  res.json(result);
});

// POST /api/admin/ingestion/enrich — call Claude Sonnet enrichment (does NOT save to DB)
router.post("/admin/ingestion/enrich", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const body = EnrichmentRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(422).json({ error: "Invalid enrichment request", issues: body.error.issues });
    return;
  }
  const adminId = (req as any).userId as number;

  let enriched;
  try {
    enriched = await enrichSupplierWithAI(body.data.input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI enrichment failed";
    res.status(502).json({ error: msg });
    return;
  }

  logInteraction({
    eventType: INTERACTION_TYPES.SUPPLIER_ENRICHED,
    actorId: adminId,
    actorType: "admin",
    referenceId: body.data.supplierId ?? null,
    referenceType: "supplier",
    payload: { supplierId: body.data.supplierId, fieldsAdded: Object.keys(enriched) },
  });

  res.json(enriched);
});

// POST /api/admin/ingestion/suppliers — create an ingested supplier
router.post("/admin/ingestion/suppliers", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const body = IngestionSupplierBody.safeParse(req.body);
  if (!body.success) {
    res.status(422).json({ error: "Invalid supplier data", issues: body.error.issues });
    return;
  }
  const adminId = (req as any).userId as number;
  const { nombreCompleto, municipio, department, vereda, whatsappNumber, email, supplierType,
          description, normalizedName, sourceUrl, country, categoryHint, batchId,
          overrideDuplicateId, overrideJustification } = body.data;

  // Duplicate check — block save unless admin explicitly overrides
  const dupResult = await checkDuplicate(nombreCompleto, country);
  if (dupResult.hasDuplicate && !overrideDuplicateId) {
    res.status(409).json({
      error: "Potential duplicate supplier detected",
      duplicate: dupResult,
    });
    return;
  }
  if (dupResult.hasDuplicate && overrideDuplicateId && !overrideJustification) {
    res.status(422).json({ error: "overrideJustification is required when overriding a duplicate" });
    return;
  }

  const fingerprint = computeSupplierFingerprint(nombreCompleto, country);

  const [supplier] = await db
    .insert(suppliersTable)
    .values({
      nombreCompleto,
      whatsappNumber: whatsappNumber ?? null,
      email: email ?? null,
      municipio,
      department: department ?? null,
      vereda: vereda ?? null,
      supplierType: supplierType ?? "FARMER",
      status: "ACTIVE",
      consentGiven: false,
      normalizedName: normalizedName ?? null,
      description: description ?? null,
      sourceUrl: sourceUrl ?? null,
      country: country ?? "Colombia",
      supplierFingerprint: fingerprint,
      ingestionSource: "ADMIN_ENTRY",
      ingestionStatus: "DRAFT",
      claimStatus: "UNCLAIMED",
      createdByAdminId: adminId,
      batchId: batchId ?? null,
    })
    .returning();

  // Create product placeholder if a category hint was supplied
  if (categoryHint) {
    await db.insert(productPlaceholdersTable).values({
      supplierId: supplier.id,
      categoryHint,
      dataOrigin: "inferred",
      verificationStatus: "unverified",
    });
  }

  logInteraction({
    eventType: INTERACTION_TYPES.SUPPLIER_INGESTED,
    actorId: adminId,
    actorType: "admin",
    referenceId: supplier.id,
    referenceType: "supplier",
    payload: {
      batchId: batchId ?? null,
      source: "ADMIN_ENTRY",
      fingerprint,
      overriddenDuplicateId: overrideDuplicateId ?? null,
    },
  });

  res.status(201).json(supplier);
});

// PATCH /api/admin/ingestion/suppliers/:id/ingestion-status — update ingestion status
router.patch("/admin/ingestion/suppliers/:id/ingestion-status", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const supplierId = Number(req.params.id);
  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    res.status(400).json({ error: "Invalid supplier id" });
    return;
  }
  const body = IngestionStatusUpdateBody.safeParse(req.body);
  if (!body.success) {
    res.status(422).json({ error: "Invalid status", issues: body.error.issues });
    return;
  }
  const adminId = (req as any).userId as number;

  const [updated] = await db
    .update(suppliersTable)
    .set({ ingestionStatus: body.data.ingestionStatus, updatedAt: new Date() })
    .where(eq(suppliersTable.id, supplierId))
    .returning({ id: suppliersTable.id, ingestionStatus: suppliersTable.ingestionStatus });

  if (!updated) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  logInteraction({
    eventType: INTERACTION_TYPES.INGESTION_BATCH_SUBMITTED,
    actorId: adminId,
    actorType: "admin",
    referenceId: supplierId,
    referenceType: "supplier",
    payload: { newStatus: body.data.ingestionStatus },
  });

  res.json(updated);
});

// POST /api/admin/ingestion/batches/:id/submit — submit an ingestion batch
router.post("/admin/ingestion/batches/:id/submit", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const batchId = Number(req.params.id);
  if (!Number.isInteger(batchId) || batchId <= 0) {
    res.status(400).json({ error: "Invalid batch id" });
    return;
  }
  const adminId = (req as any).userId as number;

  const [batch] = await db
    .update(supplierIngestionBatchesTable)
    .set({ status: "SUBMITTED", submittedAt: new Date() })
    .where(eq(supplierIngestionBatchesTable.id, batchId))
    .returning();

  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }

  logInteraction({
    eventType: INTERACTION_TYPES.INGESTION_BATCH_SUBMITTED,
    actorId: adminId,
    actorType: "admin",
    referenceId: batchId,
    referenceType: "ingestion_batch",
    payload: { batchId, batchUuid: batch.batchUuid },
  });

  res.json(batch);
});

// ── POST /api/admin/ingestion/discover — ephemeral lead discovery via Claude Haiku ──
router.post("/admin/ingestion/discover", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const parsed = DiscoveryRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const adminId = (req as any).userId as number;
  const { category, region, maxResults } = parsed.data;

  try {
    const leads = await discoverLeads({ category, region, maxResults });
    logInteraction({
      eventType: "SUPPLIER_DISCOVERED",
      actorId: adminId,
      actorType: "admin",
      payload: { category, region, maxResults, count: leads.length },
    });
    res.json({ leads, count: leads.length });
  } catch (err) {
    req.log.warn({ err, category, region }, "admin/ingestion/discover: discovery failed");
    const message = err instanceof Error ? err.message : "Discovery failed — please try again.";
    res.status(502).json({ error: message });
  }
});

// ── Helper: confirmSingleIngestion ────────────────────────────────────────────
// Extracted T1 confirm logic — transitions a DRAFT/ENRICHED supplier to READY.
// Idempotent: if already READY or SUBMITTED, returns the supplierId without error.
// Throws on not-found or unexpected DB errors — callers handle partial failures.

async function confirmSingleIngestion(supplierId: number, adminId: number): Promise<number> {
  const [existing] = await db
    .select({ id: suppliersTable.id, ingestionStatus: suppliersTable.ingestionStatus })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId));

  if (!existing) {
    throw new Error(`Supplier ${supplierId} not found`);
  }

  // Idempotent: already confirmed — skip silently and return the ID
  if (existing.ingestionStatus === "READY" || existing.ingestionStatus === "ENRICHED") {
    return existing.id;
  }

  const [updated] = await db
    .update(suppliersTable)
    .set({ ingestionStatus: "READY", updatedAt: new Date() })
    .where(eq(suppliersTable.id, supplierId))
    .returning({ id: suppliersTable.id });

  if (!updated) {
    throw new Error(`Failed to confirm supplier ${supplierId}`);
  }

  logInteraction({
    eventType: "INGESTION_SUBMITTED",
    actorId: adminId,
    actorType: "admin",
    referenceId: updated.id,
    referenceType: "supplier",
    payload: { source: "BATCH_CONFIRM", supplierId: updated.id },
  });

  return updated.id;
}

// ── POST /api/admin/ingestion/batch-confirm ────────────────────────────────────
// Accepts supplier IDs (DRAFT suppliers created via T1 form or quick-create) and
// transitions each to ingestionStatus = READY via the extracted T1 confirm logic.
// One failing lead does not abort others — always returns partial success.
router.post("/admin/ingestion/batch-confirm", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const parsed = BatchConfirmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Invalid batch-confirm request", issues: parsed.error.issues });
    return;
  }

  const adminId = (req as any).userId as number;
  const { leadIds } = parsed.data;

  const successIds: number[] = [];
  const failed: { leadId: number; error: string }[] = [];

  for (const leadId of leadIds) {
    try {
      const confirmedId = await confirmSingleIngestion(leadId, adminId);
      successIds.push(confirmedId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      req.log.warn({ err, leadId }, "admin/ingestion/batch-confirm: lead confirmation failed");
      failed.push({ leadId, error: message });
    }
  }

  logInteraction({
    eventType: "BATCH_CONFIRM_EXECUTED",
    actorId: adminId,
    actorType: "admin",
    payload: {
      total: leadIds.length,
      successCount: successIds.length,
      failureCount: failed.length,
    },
  });

  res.status(failed.length === leadIds.length ? 422 : 201).json({
    success: successIds,
    failed,
  });
});

// ─────────────────────────────────────────────────────────────────────────────

router.post("/admin/backup/run", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const backupSecret = process.env.BACKUP_SECRET_V2;
  const tokenHeader  = req.headers["x-backup-token"];

  if (backupSecret && tokenHeader === backupSecret) {
    // Cron path — bypass JWT middleware
    try {
      const result = await runBackup();
      res.json({ success: true, file: result.filename, fileSizeBytes: result.fileSizeBytes });
    } catch (err) {
      logger.error({ err }, "Backup failed (cron path)");
      res.status(500).json({ error: "Backup failed" });
    }
    return;
  }

  // Admin JWT path — run adminOnly middleware chain then execute backup
  adminOnly[0](req, res, () => {
    adminOnly[1](req, res, async () => {
      try {
        const result = await runBackup();
        res.json({ success: true, file: result.filename, fileSizeBytes: result.fileSizeBytes });
      } catch (err) {
        logger.error({ err }, "Backup failed (admin path)");
        res.status(500).json({ error: "Backup failed" });
      }
    });
  });
});

export default router;
