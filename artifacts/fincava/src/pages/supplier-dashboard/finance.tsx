import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Landmark,
  TrendingUp,
  CircleDollarSign,
  Clock,
  CheckCircle2,
  Building2,
  Wallet,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const steps = [
  {
    icon: CheckCircle2,
    title: "Order is confirmed",
    body: "Once a buyer confirms an order with you, it becomes eligible for a working capital advance. You can submit a financing request directly from your Orders page.",
  },
  {
    icon: TrendingUp,
    title: "Fincava reviews your request",
    body: "Our scoring system evaluates your request based on your trading history and sends a recommendation to the Fincava team. The team reviews and approves or adjusts the advance amount — they have full discretion.",
  },
  {
    icon: Wallet,
    title: "Funds are advanced to you",
    body: "Once approved, the advance is transferred to you. This lets you fulfil the order — cover production, logistics, or working capital needs — without waiting for the buyer to pay.",
  },
  {
    icon: ArrowRightLeft,
    title: "Automatic settlement on buyer payment",
    body: "Buyers always pay Fincava. When the buyer's payment arrives, Fincava automatically deducts the advance amount and transfers the remaining balance to you. No manual repayment required.",
  },
  {
    icon: Building2,
    title: "Future fintech partnership",
    body: "Fincava is building partnerships with licensed fintech providers to expand advance capacity. Any fees from those partners will be disclosed upfront and passed through at cost — Fincava earns no margin on financing.",
  },
];

export default function SupplierTradeFinance() {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight flex items-center gap-3">
            <Landmark className="h-8 w-8 text-primary" />
            Trade Finance
          </h1>
          <p className="text-muted-foreground mt-2">
            Working capital advances against your confirmed orders.
          </p>
        </div>
        <Badge
          variant="outline"
          className="self-start sm:self-auto border-amber-300 bg-amber-50 text-amber-800 text-sm px-3 py-1.5 flex items-center gap-1.5 shrink-0"
        >
          <Clock className="h-3.5 w-3.5" />
          Coming Soon
        </Badge>
      </div>

      {/* Coming soon notice */}
      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="pt-5 pb-5">
          <p className="text-amber-900 text-sm leading-relaxed">
            Trade financing is currently in development and not yet available to suppliers.
            This page gives you a preview of how the feature will work once it launches.
            You will be notified when it is activated on your account.
          </p>
        </CardContent>
      </Card>

      {/* Preview tiles — greyed out to signal not-yet-active */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          What your financing dashboard will look like
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 opacity-40 pointer-events-none select-none">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Credit Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">—</div>
              <p className="text-xs text-muted-foreground mt-1">Based on repayment history</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Advance Limit</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground mt-1">Total approved limit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground mt-1">Ready to deploy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground mt-1">Across active advances</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-serif">How Fincava Trade Financing Works</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            A supplier-first model: you get paid immediately, settlement happens automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                  <step.icon className="h-4 w-4" />
                </div>
                {i < steps.length - 1 && (
                  <div className="mt-2 w-px flex-1 bg-border min-h-[20px]" />
                )}
              </div>
              <div className="pb-6 flex-1 min-w-0">
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}

          {/* Fee disclosure */}
          <div className="rounded-lg bg-muted/50 border px-4 py-3 mt-2">
            <p className="text-sm font-medium mb-1">Fee disclosure</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Trade financing is currently offered at no cost to suppliers. Fincava acts as a
              facilitator, not a lender. If and when a fintech partner is introduced, all applicable
              fees will be disclosed clearly before you submit a request. Fincava will not earn a
              margin on financing costs.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Legal disclaimer — collapsible */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setDisclaimerOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
        >
          <span>Legal Disclaimer</span>
          {disclaimerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {disclaimerOpen && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground leading-relaxed pt-3">
              Fincava is a marketplace facilitator and does not provide financial services, credit,
              or lending. Financing eligibility is subject to review and approval, and may be
              declined or adjusted at Fincava's discretion. Advance availability, amounts, and terms
              are subject to change without notice. This facility is currently in a pilot phase and
              is not guaranteed to be available for all orders or suppliers. Any future fintech
              partner services will be subject to that partner's own terms and applicable regulatory
              requirements. Nothing on this page constitutes financial advice or a commitment to
              provide financing.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
