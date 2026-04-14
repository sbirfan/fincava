import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, loansTable, repaymentsTable, ordersTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function calculateCreditScore(loans: Array<{ status: string }>): number {
  let score = 500;
  for (const loan of loans) {
    if (loan.status === "REPAID") score += 20;
    if (loan.status === "DEFAULTED") score -= 50;
  }
  return Math.max(100, Math.min(1000, score));
}

function creditLimitFromScore(score: number): number {
  if (score >= 800) return 50000;
  if (score >= 650) return 25000;
  if (score >= 500) return 10000;
  if (score >= 350) return 5000;
  return 2000;
}

async function getCreditScore(userId: number): Promise<{ score: number; limit: number }> {
  const loans = await db.select({ status: loansTable.status })
    .from(loansTable)
    .where(eq(loansTable.buyerId, userId));
  const score = calculateCreditScore(loans);
  return { score, limit: creditLimitFromScore(score) };
}

router.get("/finance/credit", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { score, limit } = await getCreditScore(userId);
  const activeLoans = await db.select().from(loansTable)
    .where(and(eq(loansTable.buyerId, userId), eq(loansTable.status, "ACTIVE")));
  const totalOwed = activeLoans.reduce((sum, l) => sum + l.totalRepaymentUSD, 0);
  res.json({ score, limit, available: Math.max(0, limit - totalOwed), totalOwed });
});

router.get("/finance/loans", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const loans = await db.select().from(loansTable)
    .where(eq(loansTable.buyerId, userId))
    .orderBy(loansTable.createdAt);

  const loansWithRepayments = await Promise.all(loans.map(async (loan) => {
    const repayments = await db.select().from(repaymentsTable)
      .where(eq(repaymentsTable.loanId, loan.id));
    const totalPaid = repayments.reduce((sum, r) => sum + r.amountUSD, 0);
    const remaining = Math.max(0, loan.totalRepaymentUSD - totalPaid);

    let orderRef: string | null = null;
    try {
      const [order] = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.id, loan.orderId));
      if (order) orderRef = `ORD-${String(order.id).padStart(4, "0")}`;
    } catch {}

    return {
      id: loan.id,
      orderId: loan.orderId,
      orderRef,
      principalUSD: loan.principalUSD,
      feeUSD: loan.feeUSD,
      totalRepaymentUSD: loan.totalRepaymentUSD,
      aprPercent: loan.aprPercent,
      termDays: loan.termDays,
      status: loan.status,
      dueAt: loan.dueAt.toISOString(),
      creditScoreAtIssuance: loan.creditScoreAtIssuance,
      totalPaid,
      remaining,
      repaymentProgress: loan.totalRepaymentUSD > 0 ? Math.min(100, (totalPaid / loan.totalRepaymentUSD) * 100) : 0,
      createdAt: loan.createdAt.toISOString(),
      repayments: repayments.map(r => ({ id: r.id, amountUSD: r.amountUSD, createdAt: r.createdAt.toISOString(), note: r.note })),
    };
  }));

  res.json(loansWithRepayments);
});

router.post("/finance/loan", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { orderId, principalUSD, termDays = 30, aprPercent = 12 } = req.body;

  if (!principalUSD || principalUSD <= 0) {
    res.status(400).json({ error: "Principal amount is required" });
    return;
  }

  const { score, limit } = await getCreditScore(userId);

  const activeLoans = await db.select().from(loansTable)
    .where(and(eq(loansTable.buyerId, userId), eq(loansTable.status, "ACTIVE")));
  const totalOwed = activeLoans.reduce((sum, l) => sum + l.totalRepaymentUSD, 0);
  const available = Math.max(0, limit - totalOwed);

  if (principalUSD > available) {
    res.status(400).json({ error: `Insufficient credit. Available: $${available.toFixed(2)}` });
    return;
  }

  const feeUSD = principalUSD * (aprPercent / 100) * (termDays / 365);
  const totalRepaymentUSD = principalUSD + feeUSD;

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + termDays);

  const [loan] = await db.insert(loansTable).values({
    buyerId: userId,
    orderId: orderId ?? null,
    principalUSD,
    feeUSD,
    totalRepaymentUSD,
    aprPercent,
    termDays,
    status: "ACTIVE",
    dueAt,
    creditScoreAtIssuance: score,
  }).returning();

  res.status(201).json({
    id: loan.id,
    principalUSD: loan.principalUSD,
    feeUSD: loan.feeUSD,
    totalRepaymentUSD: loan.totalRepaymentUSD,
    aprPercent: loan.aprPercent,
    termDays: loan.termDays,
    dueAt: loan.dueAt.toISOString(),
    status: loan.status,
    creditScore: score,
  });
});

router.post("/finance/repay", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { loanId, amountUSD, note } = req.body;

  if (!loanId || !amountUSD || amountUSD <= 0) {
    res.status(400).json({ error: "loanId and amountUSD are required" });
    return;
  }

  const [loan] = await db.select().from(loansTable)
    .where(and(eq(loansTable.id, loanId), eq(loansTable.buyerId, userId)));

  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }

  if (loan.status !== "ACTIVE") {
    res.status(400).json({ error: `Loan is already ${loan.status.toLowerCase()}` });
    return;
  }

  await db.insert(repaymentsTable).values({
    loanId,
    amountUSD,
    note: note ?? null,
  });

  const allRepayments = await db.select().from(repaymentsTable).where(eq(repaymentsTable.loanId, loanId));
  const totalPaid = allRepayments.reduce((sum, r) => sum + r.amountUSD, 0);

  if (totalPaid >= loan.totalRepaymentUSD) {
    await db.update(loansTable)
      .set({ status: "REPAID", updatedAt: new Date() })
      .where(eq(loansTable.id, loanId));
  }

  const { score, limit } = await getCreditScore(userId);

  res.json({
    success: true,
    totalPaid,
    remaining: Math.max(0, loan.totalRepaymentUSD - totalPaid),
    loanStatus: totalPaid >= loan.totalRepaymentUSD ? "REPAID" : "ACTIVE",
    newCreditScore: score,
    newCreditLimit: limit,
  });
});

export default router;
