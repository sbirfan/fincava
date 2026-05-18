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
import { useLanguage } from "@/contexts/LanguageContext";

const STEP_ICONS = [CheckCircle2, TrendingUp, Wallet, ArrowRightLeft, Building2];

export default function SupplierTradeFinance() {
  const { t } = useLanguage();
  const f = t.supplierDash.finance;
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight flex items-center gap-3">
            <Landmark className="h-8 w-8 text-primary" />
            {f.heading}
          </h1>
          <p className="text-muted-foreground mt-2">{f.description}</p>
        </div>
        <Badge
          variant="outline"
          className="self-start sm:self-auto border-amber-300 bg-amber-50 text-amber-800 text-sm px-3 py-1.5 flex items-center gap-1.5 shrink-0"
        >
          <Clock className="h-3.5 w-3.5" />
          {f.comingSoon}
        </Badge>
      </div>

      {/* Coming soon notice */}
      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="pt-5 pb-5">
          <p className="text-amber-900 text-sm leading-relaxed">{f.comingSoonDesc}</p>
        </CardContent>
      </Card>

      {/* Preview tiles */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {f.dashboardPreview}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 opacity-40 pointer-events-none select-none">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{f.creditScore}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">—</div>
              <p className="text-xs text-muted-foreground mt-1">{f.creditScoreDesc}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{f.advanceLimit}</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground mt-1">{f.advanceLimitDesc}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{f.available}</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground mt-1">{f.availableDesc}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{f.outstanding}</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground mt-1">{f.outstandingDesc}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-serif">{f.howItWorksHeading}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{f.howItWorksDesc}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {f.steps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  {i < f.steps.length - 1 && (
                    <div className="mt-2 w-px flex-1 bg-border min-h-[20px]" />
                  )}
                </div>
                <div className="pb-6 flex-1 min-w-0">
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.body}</p>
                </div>
              </div>
            );
          })}

          {/* Fee disclosure */}
          <div className="rounded-lg bg-muted/50 border px-4 py-3 mt-2">
            <p className="text-sm font-medium mb-1">{f.feeDisclosure}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.feeDisclosureDesc}</p>
          </div>
        </CardContent>
      </Card>

      {/* Legal disclaimer — collapsible */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setDisclaimerOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
        >
          <span>{f.legalDisclaimer}</span>
          {disclaimerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {disclaimerOpen && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground leading-relaxed pt-3">{f.legalText}</p>
          </div>
        )}
      </div>

    </div>
  );
}
