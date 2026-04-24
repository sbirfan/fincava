import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, CreditCard, TrendingUp, AlertCircle, CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { format, isPast } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreditInfo {
  score: number;
  limit: number;
  available: number;
  totalOwed: number;
}

interface Loan {
  id: number;
  orderId: number | null;
  orderRef: string | null;
  principalUSD: number;
  feeUSD: number;
  totalRepaymentUSD: number;
  aprPercent: number;
  termDays: number;
  status: "ACTIVE" | "REPAID" | "DEFAULTED" | "CANCELLED";
  dueAt: string;
  creditScoreAtIssuance: number;
  totalPaid: number;
  remaining: number;
  repaymentProgress: number;
  createdAt: string;
  repayments: Array<{ id: number; amountUSD: number; createdAt: string; note: string | null }>;
}

function creditScoreColor(score: number) {
  if (score >= 750) return "text-green-600";
  if (score >= 600) return "text-amber-600";
  return "text-red-600";
}

function creditScoreLabel(score: number) {
  if (score >= 750) return "Excellent";
  if (score >= 650) return "Good";
  if (score >= 500) return "Fair";
  return "Building";
}

function statusBadge(status: string, dueAt: string) {
  if (status === "REPAID") return <Badge className="bg-green-100 text-green-700 border-green-200">Repaid</Badge>;
  if (status === "DEFAULTED") return <Badge variant="destructive">Defaulted</Badge>;
  if (status === "CANCELLED") return <Badge variant="outline">Cancelled</Badge>;
  if (isPast(new Date(dueAt))) return <Badge variant="destructive">Overdue</Badge>;
  return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Active</Badge>;
}

export default function FinanceDashboard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [loanOpen, setLoanOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState<number | null>(null);
  const [expandedLoan, setExpandedLoan] = useState<number | null>(null);

  const [loanAmount, setLoanAmount] = useState("");
  const [loanTerm, setLoanTerm] = useState("30");
  const [loanApr, setLoanApr] = useState("12");
  const [loanNote, setLoanNote] = useState("");

  const [repayAmount, setRepayAmount] = useState("");
  const [repayNote, setRepayNote] = useState("");

  const { data: credit, isLoading: loadingCredit } = useQuery<CreditInfo>({
    queryKey: ["/api/finance/credit"],
    queryFn: () => fetch("/api/finance/credit", { credentials: "include" }).then(r => r.json()),
  });

  const { data: loans, isLoading: loadingLoans } = useQuery<Loan[]>({
    queryKey: ["/api/finance/loans"],
    queryFn: () => fetch("/api/finance/loans", { credentials: "include" }).then(r => r.json()),
  });

  const createLoan = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/finance/loan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ principalUSD: parseFloat(loanAmount), termDays: parseInt(loanTerm), aprPercent: parseFloat(loanApr) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Loan approved", description: "Funds are available in your trade account." });
      setLoanOpen(false);
      setLoanAmount("");
      qc.invalidateQueries({ queryKey: ["/api/finance/credit"] });
      qc.invalidateQueries({ queryKey: ["/api/finance/loans"] });
    },
    onError: (e: any) => toast({ title: "Loan failed", description: e.message, variant: "destructive" }),
  });

  const makeRepayment = useMutation({
    mutationFn: async (loanId: number) => {
      const res = await fetch("/api/finance/repay", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId, amountUSD: parseFloat(repayAmount), note: repayNote || null }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.loanStatus === "REPAID" ? "Loan fully repaid!" : "Repayment recorded",
        description: data.loanStatus === "REPAID"
          ? `Your credit score is now ${data.newCreditScore}. New limit: $${data.newCreditLimit.toLocaleString()}`
          : `$${data.remaining.toFixed(2)} remaining on this loan.`,
      });
      setRepayOpen(null);
      setRepayAmount("");
      setRepayNote("");
      qc.invalidateQueries({ queryKey: ["/api/finance/credit"] });
      qc.invalidateQueries({ queryKey: ["/api/finance/loans"] });
    },
    onError: (e: any) => toast({ title: "Repayment failed", description: e.message, variant: "destructive" }),
  });

  const activeLoans = loans?.filter(l => l.status === "ACTIVE") ?? [];
  const completedLoans = loans?.filter(l => l.status !== "ACTIVE") ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Embedded Finance</h1>
          <p className="text-muted-foreground mt-1">Trade financing, repayments, and your credit profile.</p>
        </div>
        <Button onClick={() => setLoanOpen(true)} className="bg-primary hover:bg-primary/90">
          <DollarSign className="w-4 h-4 mr-2" /> Request Financing
        </Button>
      </div>

      {/* Credit Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingCredit ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : credit ? (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Credit Score</p>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className={`text-3xl font-bold ${creditScoreColor(credit.score)}`}>{credit.score}</p>
                <p className="text-xs text-muted-foreground mt-1">{creditScoreLabel(credit.score)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Credit Limit</p>
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold">${credit.limit.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Trade credit line</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Available</p>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-green-600">${credit.available.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Ready to deploy</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Total Owed</p>
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold">${credit.totalOwed.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Active loans</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Credit score bar */}
      {credit && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Credit Utilization</p>
              <span className="text-sm text-muted-foreground">
                ${credit.totalOwed.toLocaleString()} / ${credit.limit.toLocaleString()} used
              </span>
            </div>
            <Progress value={credit.limit > 0 ? (credit.totalOwed / credit.limit) * 100 : 0} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              Each on-time repayment increases your credit score by +20 points. Defaults reduce it by −50.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active loans */}
      <div>
        <h2 className="text-xl font-serif font-semibold mb-4">Active Loans ({activeLoans.length})</h2>
        {loadingLoans ? (
          Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-36 w-full mb-3 rounded-xl" />)
        ) : activeLoans.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active loans. Request financing to fund your next trade order.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeLoans.map(loan => (
              <Card key={loan.id} className={cn("border", isPast(new Date(loan.dueAt)) && "border-destructive/50")}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {statusBadge(loan.status, loan.dueAt)}
                        {loan.orderRef && (
                          <span className="text-xs text-muted-foreground">Linked to {loan.orderRef}</span>
                        )}
                      </div>
                      <p className="text-xl font-bold">${loan.principalUSD.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {loan.aprPercent}% APR · {loan.termDays}-day term · Fee: ${loan.feeUSD.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Total to repay</p>
                      <p className="text-lg font-bold">${loan.totalRepaymentUSD.toFixed(2)}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        Due {format(new Date(loan.dueAt), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>${loan.totalPaid.toFixed(2)} paid</span>
                      <span>${loan.remaining.toFixed(2)} remaining</span>
                    </div>
                    <Progress value={loan.repaymentProgress} className="h-2" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => { setRepayOpen(loan.id); setRepayAmount(loan.remaining.toFixed(2)); }}>
                      Make Repayment
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedLoan(expandedLoan === loan.id ? null : loan.id)}
                      className="text-muted-foreground"
                    >
                      {expandedLoan === loan.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                      {loan.repayments.length} payments
                    </Button>
                  </div>

                  {expandedLoan === loan.id && loan.repayments.length > 0 && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      {loan.repayments.map(r => (
                        <div key={r.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy")}</span>
                          <span className="font-medium text-green-600">+${r.amountUSD.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Loan history */}
      {completedLoans.length > 0 && (
        <div>
          <h2 className="text-xl font-serif font-semibold mb-4">Loan History</h2>
          <div className="space-y-2">
            {completedLoans.map(loan => (
              <Card key={loan.id} className="border-muted">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusBadge(loan.status, loan.dueAt)}
                    <div>
                      <p className="text-sm font-medium">${loan.principalUSD.toLocaleString()} · {loan.aprPercent}% APR</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(loan.createdAt), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${loan.totalPaid.toFixed(2)} paid</p>
                    <p className="text-xs text-muted-foreground">of ${loan.totalRepaymentUSD.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Request Loan Dialog */}
      <Dialog open={loanOpen} onOpenChange={setLoanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Request Trade Financing</DialogTitle>
            <DialogDescription>
              Funds are disbursed immediately and can be used against any pending trade order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {credit && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available credit</span>
                  <span className="font-semibold text-primary">${credit.available.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Credit score</span>
                  <span className={`font-semibold ${creditScoreColor(credit.score)}`}>{credit.score} — {creditScoreLabel(credit.score)}</span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="loanAmount">Loan Amount (USD) *</Label>
              <Input
                id="loanAmount"
                type="number"
                placeholder={`Max $${credit?.available.toLocaleString() ?? "10,000"}`}
                value={loanAmount}
                onChange={e => setLoanAmount(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Term (days)</Label>
                <Select value={loanTerm} onValueChange={setLoanTerm}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["14", "30", "60", "90"].map(t => <SelectItem key={t} value={t}>{t} days</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>APR (%)</Label>
                <Select value={loanApr} onValueChange={setLoanApr}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["8", "10", "12", "15", "18"].map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loanAmount && parseFloat(loanAmount) > 0 && (
              <div className="bg-primary/5 rounded-lg p-3 text-sm space-y-1 border border-primary/10">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Principal</span>
                  <span>${parseFloat(loanAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Finance fee ({loanApr}% APR, {loanTerm}d)</span>
                  <span>${(parseFloat(loanAmount) * (parseFloat(loanApr) / 100) * (parseInt(loanTerm) / 365)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                  <span>Total repayment</span>
                  <span>${(parseFloat(loanAmount) * (1 + (parseFloat(loanApr) / 100) * (parseInt(loanTerm) / 365))).toFixed(2)}</span>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={() => createLoan.mutate()} disabled={!loanAmount || createLoan.isPending}>
              {createLoan.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : "Confirm Loan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Repayment Dialog */}
      <Dialog open={repayOpen !== null} onOpenChange={() => setRepayOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Make Repayment</DialogTitle>
            <DialogDescription>
              Record a repayment against this loan. On-time repayments increase your credit score.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="repayAmount">Amount (USD) *</Label>
              <Input
                id="repayAmount"
                type="number"
                value={repayAmount}
                onChange={e => setRepayAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="repayNote">Note (optional)</Label>
              <Textarea
                id="repayNote"
                placeholder="Wire transfer ref, bank note..."
                value={repayNote}
                onChange={e => setRepayNote(e.target.value)}
                className="mt-1 h-16"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => repayOpen !== null && makeRepayment.mutate(repayOpen)}
              disabled={!repayAmount || makeRepayment.isPending}
            >
              {makeRepayment.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : "Confirm Repayment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
