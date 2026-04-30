import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Landmark,
  TrendingUp,
  CircleDollarSign,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";

type CreditInfo = {
  score: number;
  limit: number;
  available: number;
  totalOwed: number;
};

type Repayment = {
  id: number;
  amountUSD: number;
  createdAt: string;
  note: string | null;
};

type Loan = {
  id: number;
  orderId: number | null;
  orderRef: string | null;
  principalUSD: number;
  feeUSD: number;
  totalRepaymentUSD: number;
  aprPercent: number;
  termDays: number;
  status: string;
  dueAt: string;
  creditScoreAtIssuance: number;
  totalPaid: number;
  remaining: number;
  repaymentProgress: number;
  createdAt: string;
  repayments: Repayment[];
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE:    { label: "Active",    variant: "default" },
  REPAID:    { label: "Repaid",    variant: "secondary" },
  DEFAULTED: { label: "Defaulted", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
};

function scoreColor(score: number): string {
  if (score >= 750) return "text-emerald-600";
  if (score >= 600) return "text-yellow-600";
  return "text-red-600";
}

function scoreLabel(score: number): string {
  if (score >= 750) return "Excellent";
  if (score >= 650) return "Good";
  if (score >= 500) return "Fair";
  return "Poor";
}

function RepaymentRow({ loan, onRepaid }: { loan: Loan; onRepaid: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRepay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (amt > loan.remaining) { setError(`Max remaining is $${loan.remaining.toFixed(2)}`); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/repay", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId: loan.id, amountUSD: amt }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setSuccess(true);
      setAmount("");
      setTimeout(() => { setSuccess(false); onRepaid(); }, 1500);
    } catch (e: any) {
      setError(e.message ?? "Failed to submit repayment");
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = Math.min(100, loan.repaymentProgress);
  const badge = STATUS_BADGE[loan.status] ?? { label: loan.status, variant: "outline" as const };
  const dueDate = new Date(loan.dueAt);
  const isOverdue = loan.status === "ACTIVE" && dueDate < new Date();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                Loan #{loan.id}{loan.orderRef ? ` · ${loan.orderRef}` : ""}
              </span>
              <Badge variant={badge.variant}>{badge.label}</Badge>
              {isOverdue && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Overdue
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1 space-x-3">
              <span>Principal: ${loan.principalUSD.toFixed(2)}</span>
              <span>APR: {loan.aprPercent}%</span>
              <span>Term: {loan.termDays} days</span>
              <span>Due: {dueDate.toLocaleDateString()}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">${loan.remaining.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">remaining of ${loan.totalRepaymentUSD.toFixed(2)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Repayment progress</span>
            <span>{progressPct.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${loan.status === "REPAID" ? "bg-emerald-500" : "bg-primary"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Expand / repay panel */}
        {loan.status === "ACTIVE" && (
          <div className="border-t">
            <button
              onClick={() => setOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span>Make a repayment</span>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {open && (
              <div className="px-4 pb-4 space-y-3 bg-muted/20 border-t">
                <div className="pt-3 flex items-end gap-3">
                  <div className="flex-1">
                    <Label htmlFor={`repay-${loan.id}`} className="text-xs mb-1 block">
                      Amount (USD) — remaining ${loan.remaining.toFixed(2)}
                    </Label>
                    <Input
                      id={`repay-${loan.id}`}
                      type="number"
                      min="0.01"
                      max={loan.remaining}
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => { setAmount(e.target.value); setError(null); }}
                      className="h-9"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleRepay}
                    disabled={submitting || success}
                    className="shrink-0 h-9"
                  >
                    {success ? (
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Paid</span>
                    ) : submitting ? "Submitting…" : "Submit"}
                  </Button>
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
              </div>
            )}
          </div>
        )}

        {/* Repayment history */}
        {loan.repayments.length > 0 && (
          <div className="border-t px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Payment history</p>
            <div className="space-y-1">
              {loan.repayments.map(r => (
                <div key={r.id} className="flex justify-between text-xs text-muted-foreground">
                  <span>{new Date(r.createdAt).toLocaleDateString()}{r.note ? ` · ${r.note}` : ""}</span>
                  <span className="font-medium text-foreground">${r.amountUSD.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TradeFinance() {
  const [credit, setCredit] = useState<CreditInfo | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [creditRes, loansRes] = await Promise.all([
        fetch("/api/finance/credit", { credentials: "include" }),
        fetch("/api/finance/loans", { credentials: "include" }),
      ]);
      if (!creditRes.ok || !loansRes.ok) throw new Error("Failed to load financing data");
      const [creditData, loansData] = await Promise.all([creditRes.json(), loansRes.json()]);
      setCredit(creditData);
      setLoans(loansData);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeLoans = loans.filter(l => l.status === "ACTIVE");
  const pastLoans = loans.filter(l => l.status !== "ACTIVE");

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight flex items-center gap-3">
          <Landmark className="h-8 w-8 text-primary" />
          Trade Finance
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor your credit standing, active financing, and repayment history.
        </p>
      </div>

      {/* Credit summary tiles */}
      {credit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Credit Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${scoreColor(credit.score)}`}>{credit.score}</div>
              <p className="text-xs text-muted-foreground mt-1">{scoreLabel(credit.score)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Credit Limit</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${credit.limit.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total approved limit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Available Credit</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${credit.available > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                ${credit.available.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ready to deploy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Owed</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${credit.totalOwed > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                ${credit.totalOwed.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across active loans</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active loans */}
      <div className="space-y-4">
        <h2 className="text-lg font-serif font-semibold">Active Financing</h2>
        {activeLoans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <Landmark className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm">No active loans.</p>
              <p className="text-xs text-muted-foreground">
                Trade finance is available when you place an order. Contact your account manager to learn more.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeLoans.map(loan => (
              <RepaymentRow key={loan.id} loan={loan} onRepaid={fetchData} />
            ))}
          </div>
        )}
      </div>

      {/* Past loans */}
      {pastLoans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-serif font-semibold">Financing History</h2>
          <div className="space-y-3">
            {pastLoans.map(loan => (
              <RepaymentRow key={loan.id} loan={loan} onRepaid={fetchData} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
