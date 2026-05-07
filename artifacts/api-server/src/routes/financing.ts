import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, loansTable, repaymentsTable, ordersTable, usersTable, profilesTable } from "@workspace/db";
import { requireAuth, requireVerifiedEmail } from "../lib/auth";
import { sendEmail, loanRepaidBuyerEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { ENABLE_FINANCE } from "../lib/flags";

const router: IRouter = Router();

router.use("/finance", (_req, res, next): void => {
  if (!ENABLE_FINANCE) { res.status(404).json({ error: "Not found" }); return; }
  next();
});

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
      if (loan.orderId != null) {
        const [order] = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.id, loan.orderId));
        if (order) orderRef = `ORD-${String(order.id).padStart(4, "0")}`;
      }
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

router.post("/finance/loan", requireAuth, requireVerifiedEmail, async (req, res): Promise<void> => {
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

  // Wrap read-check-update in a transaction with FOR UPDATE so concurrent
  // repayment requests on the same loan queue rather than race.
  const txResult = await db.transaction(async (tx) => {
    // Acquire an exclusive row lock before reading — any concurrent request
    // for the same loanId blocks here until this transaction commits/rolls back.
    const [loan] = await tx.select().from(loansTable)
      .where(and(eq(loansTable.id, loanId), eq(loansTable.buyerId, userId)))
      .for("update");

    if (!loan) {
      return { ok: false as const, httpStatus: 404, message: "Loan not found" };
    }
    if (loan.status !== "ACTIVE") {
      return { ok: false as const, httpStatus: 400, message: `Loan is already ${loan.status.toLowerCase()}` };
    }

    await tx.insert(repaymentsTable).values({
      loanId,
      amountUSD,
      note: note ?? null,
    });

    const allRepayments = await tx.select().from(repaymentsTable)
      .where(eq(repaymentsTable.loanId, loanId));
    const totalPaid = allRepayments.reduce((sum, r) => sum + r.amountUSD, 0);

    const fullyRepaid = totalPaid >= loan.totalRepaymentUSD;

    if (fullyRepaid) {
      await tx.update(loansTable)
        .set({ status: "REPAID", updatedAt: new Date() })
        .where(eq(loansTable.id, loanId));
    }

    return { ok: true as const, loan, totalPaid, fullyRepaid };
  });

  if (!txResult.ok) {
    res.status(txResult.httpStatus).json({ error: txResult.message });
    return;
  }

  const { loan, totalPaid, fullyRepaid } = txResult;

  const { score, limit } = await getCreditScore(userId);

  res.json({
    success: true,
    totalPaid,
    remaining: Math.max(0, loan.totalRepaymentUSD - totalPaid),
    loanStatus: fullyRepaid ? "REPAID" : "ACTIVE",
    newCreditScore: score,
    newCreditLimit: limit,
  });

  // Fire-and-forget: notify buyer when loan is fully repaid
  if (fullyRepaid) {
    try {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (!user?.email) return;

      const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
      const buyerName = profile ? `${profile.firstName} ${profile.lastName}` : user.email;

      let orderRef: string | null = null;
      if (loan.orderId != null) {
        const [order] = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.id, loan.orderId));
        if (order) orderRef = `ORD-${String(order.id).padStart(4, "0")}`;
      }

      const appBaseUrl = process.env["FRONTEND_URL"]
        ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");

      const emailContent = loanRepaidBuyerEmail({
        buyerName,
        orderRef,
        principalUSD: loan.principalUSD,
        newCreditScore: score,
        newCreditLimit: limit,
        loansUrl: `${appBaseUrl}/dashboard`,
      });

      await sendEmail({ to: user.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
    } catch (err) {
      logger.warn({ err, loanId, userId }, "Loan repaid buyer email failed");
    }
  }
});

export default router;
