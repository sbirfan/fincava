import { Router, type IRouter } from "express";
import { db, usersTable, profilesTable, companiesTable } from "@workspace/db";
import { loansTable, repaymentsTable } from "@workspace/db";
import { ordersTable, staffRolesTable } from "@workspace/db";
import { hashPassword } from "../lib/auth";
import { adminOnly } from "../middleware/admin";
import { AdminUserEditBody, AdminResetPasswordBody, StaffRoleBody, parsePagination, STAFF_ROLE_VALUES } from "../schemas";
import { and, desc, eq, inArray, count, sum } from "drizzle-orm";

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
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(usersTable.id, ordersTable.buyerId))
    .leftJoin(profilesTable, eq(profilesTable.userId, ordersTable.buyerId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ data, total: Number(total), page, limit, totalPages: Math.max(1, Math.ceil(Number(total) / limit)) });
});

// ── PATCH /api/admin/users/:id ───────────────────────────────────────────────
router.patch("/admin/users/:id", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const parsed = AdminUserEditBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, role, firstName, lastName, country, phone, companyName } = parsed.data;

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
    const [existingCo] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
    if (existingCo) {
      await db.update(companiesTable).set({ name: companyName }).where(eq(companiesTable.userId, userId));
    }
  }

  res.json({ success: true });
});

// ── POST /api/admin/users/:id/reset-password ─────────────────────────────────
router.post("/admin/users/:id/reset-password", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const parsed = AdminResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  await db.update(usersTable).set({ passwordHash: hashPassword(parsed.data.password) }).where(eq(usersTable.id, userId));
  res.json({ success: true });
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
  const userId = parseInt(req.params.userId, 10);
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
  const userId = parseInt(req.params.userId, 10);
  const { role } = req.params;

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

export default router;
