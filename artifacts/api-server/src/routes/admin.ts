import { Router, type IRouter } from "express";
import { db, usersTable, profilesTable, companiesTable } from "@workspace/db";
import { loansTable, repaymentsTable } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { hashPassword } from "../lib/auth";
import { adminOnly } from "../middleware/admin";
import { desc, eq, inArray, count, sum } from "drizzle-orm";

const router: IRouter = Router();

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

router.get("/admin/users", ...adminOnly, async (_req, res): Promise<void> => {
  const users = await db
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
    .orderBy(desc(usersTable.createdAt));

  res.json(users);
});

router.get("/admin/loans", ...adminOnly, async (_req, res): Promise<void> => {
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
    .orderBy(desc(loansTable.createdAt));

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

  res.json(
    loans.map((l) => ({
      ...l,
      totalRepaid: repaidByLoan[l.id] ?? 0,
    }))
  );
});

router.get("/admin/orders", ...adminOnly, async (_req, res): Promise<void> => {
  const orders = await db
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
    .orderBy(desc(ordersTable.createdAt));

  res.json(orders);
});

// ── PATCH /api/admin/users/:id ───────────────────────────────────────────────
router.patch("/admin/users/:id", ...adminOnly, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const { email, role, firstName, lastName, country, phone, companyName } = req.body;

  if (email || role) {
    const updates: Record<string, any> = {};
    if (email) updates.email = email;
    if (role && ["BUYER", "SUPPLIER", "ADMIN"].includes(role)) updates.role = role;
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

  const { password } = req.body;
  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  await db.update(usersTable).set({ passwordHash: hashPassword(password) }).where(eq(usersTable.id, userId));
  res.json({ success: true });
});

export default router;
