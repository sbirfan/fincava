// CC-1E: Compliance Widget — reusable component
// Two display modes:
//   "badges" — buyer-facing: shows verified compliance badges for a supplier
//   "progress" — supplier-facing: shows own requirement progress on dashboard

import { useState, useEffect } from "react";
import { ShieldCheck, Clock, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";

// ── Buyer-facing badge strip ──────────────────────────────────────────────────

interface ComplianceSignal {
  requirementCode: string;
  badgeLabel: string | null;
  disclaimer: string | null;
  state: string | null;
  agency: string | null;
}

interface ComplianceBadgesProps {
  supplierId: number;
  className?: string;
}

export function ComplianceBadges({ supplierId, className = "" }: ComplianceBadgesProps) {
  const [signals, setSignals] = useState<ComplianceSignal[]>([]);

  useEffect(() => {
    fetch(`/api/suppliers/${supplierId}/compliance-signals`)
      .then((r) => r.ok ? r.json() : { signals: [] })
      .then((data) => setSignals(data.signals ?? []))
      .catch(() => {});
  }, [supplierId]);

  if (signals.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {signals.map((sig) => {
        const label = sig.badgeLabel ?? sig.requirementCode;
        const isConditional = sig.state === "conditionally_approved";
        return (
          <span
            key={sig.requirementCode}
            title={sig.disclaimer ?? undefined}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
              isConditional
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            <ShieldCheck className="h-3 w-3 shrink-0" />
            {label}
          </span>
        );
      })}
    </div>
  );
}

// ── Supplier-facing progress card ─────────────────────────────────────────────

interface ComplianceRequirement {
  id: number;
  requirementCode: string;
  agency: string;
  state: string;
  selectedMode: string | null;
  visibleNote: string | null;
}

interface ComplianceProgressProps {
  className?: string;
}

const STATE_LABELS: Record<string, string> = {
  not_started: "Not started",
  not_sure: "Not sure",
  self_serve_in_progress: "In progress",
  assisted_in_progress: "Officer assisting",
  managed_service_candidate: "Managed service",
  submitted: "Submitted for review",
  needs_fix: "Correction needed",
  conditionally_approved: "Conditionally approved",
  verified: "Verified",
  rejected: "Rejected",
};

function StateIcon({ state }: { state: string }) {
  if (state === "verified" || state === "conditionally_approved")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (state === "needs_fix" || state === "rejected")
    return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
  if (state === "submitted")
    return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
  if (state === "not_sure")
    return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />;
  return <Clock className="h-4 w-4 text-gray-300 shrink-0" />;
}

export function ComplianceProgressWidget({ className = "" }: ComplianceProgressProps) {
  const [data, setData] = useState<{
    found: boolean;
    requirements: ComplianceRequirement[];
    supplierName?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/supplier/compliance-progress", { credentials: "include" })
      .then((r) => r.ok ? r.json() : { found: false, requirements: [] })
      .then(setData)
      .catch(() => setData({ found: false, requirements: [] }));
  }, []);

  if (!data || !data.found || data.requirements.length === 0) return null;

  const total = data.requirements.length;
  const verified = data.requirements.filter(
    (r) => r.state === "verified" || r.state === "conditionally_approved",
  ).length;
  const pct = Math.round((verified / total) * 100);

  return (
    <div className={`rounded-lg border border-l-4 border-l-emerald-600 ${className}`}>
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-base font-serif font-bold">Compliance Readiness</span>
          </div>
          <span className="text-xs font-semibold text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
            {verified}/{total} verified
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Requirement rows */}
        <ul className="space-y-2">
          {data.requirements.map((req) => (
            <li key={req.id} className="flex items-start gap-3 text-sm">
              <StateIcon state={req.state} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800">{req.requirementCode}</span>
                  <span className="text-xs text-gray-400">{req.agency}</span>
                </div>
                <p className="text-xs text-muted-foreground">{STATE_LABELS[req.state] ?? req.state}</p>
                {req.visibleNote && (
                  <p className="text-xs text-amber-700 mt-0.5 bg-amber-50 rounded px-2 py-1">
                    {req.visibleNote}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
