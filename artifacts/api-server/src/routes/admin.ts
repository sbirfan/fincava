import { Router, type IRouter } from "express";
import { db, usersTable, profilesTable, companiesTable } from "@workspace/db";
import { loansTable, repaymentsTable } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { desc, eq, inArray, count, sum } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = (req as any).userRole;
  if (role !== "ADMIN") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}

const adminOnly = [requireAuth, requireAdmin];

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

router.post("/admin/officer-pin", ...adminOnly, async (req: Request, res: Response): Promise<void> => {
  const { newPin } = req.body as { newPin?: string };
  if (!newPin || newPin.trim().length < 4) {
    res.status(400).json({ error: "El nuevo PIN debe tener al menos 4 caracteres" });
    return;
  }
  const trimmed = newPin.trim();
  try {
    await pool.query(
      `INSERT INTO officer_config (key, value, updated_at)
       VALUES ('officer_pin', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [trimmed],
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cambiar el PIN del officer" });
  }
});

export default router;
