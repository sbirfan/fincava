import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

const LOAN_STATUSES = ["ACTIVE", "REPAID", "DEFAULTED", "CANCELLED"] as const;
type LoanStatus = typeof LOAN_STATUSES[number];

const statusColor: Record<string, string> = {
  ACTIVE: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  REPAID: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  DEFAULTED: "bg-red-500/15 text-red-300 border-red-500/20",
  CANCELLED: "bg-white/10 text-white/50 border-white/10",
};


function riskLabel(score: number) {
  if (score >= 750) return { label: "Low", cls: "text-emerald-400" };
  if (score >= 600) return { label: "Medium", cls: "text-amber-400" };
  return { label: "High", cls: "text-red-400" };
}

function StatusSelect({ loanId, current }: { loanId: number; current: string }) {
  const qc = useQueryClient();
  const [localStatus, setLocalStatus] = useState(current);

  const mutation = useMutation({
    mutationFn: async (status: LoanStatus) => {
      const res = await fetch(`/api/admin/loans/${loanId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return status;
    },
    onSuccess: (status) => {
      setLocalStatus(status);
      qc.invalidateQueries({ queryKey: ["admin", "loans"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: () => setLocalStatus(current),
  });

  return (
    <select
      value={localStatus}
      disabled={mutation.isPending}
      onChange={(e) => {
        const next = e.target.value as LoanStatus;
        setLocalStatus(next);
        mutation.mutate(next);
      }}
      onClick={(e) => e.stopPropagation()}
      className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none focus:border-white/30 hover:border-white/20 disabled:opacity-50 cursor-pointer"
    >
      {LOAN_STATUSES.map((s) => (
        <option key={s} value={s} className="bg-[#111]">{s}</option>
      ))}
    </select>
  );
}

export default function AdminLoans() {
  const [filter, setFilter] = useState("ALL");

  const { data: resp, isLoading } = useQuery({
    queryKey: ["admin", "loans"],
    queryFn: async () => {
      const res = await fetch("/api/admin/loans", { credentials: "include" });
      return res.json();
    },
  });
  const loans: any[] = resp?.data ?? [];
  const totalLoans: number = resp?.total ?? loans.length;

  const statuses = ["ALL", ...LOAN_STATUSES];
  const filtered = filter === "ALL" ? loans : loans.filter((l: any) => l.status === filter);

  const totalDeployed = filtered.reduce((s: number, l: any) => s + (l.principalUSD ?? 0), 0);
  const totalOwed = filtered
    .filter((l: any) => l.status === "ACTIVE")
    .reduce((s: number, l: any) => s + ((l.totalRepaymentUSD ?? 0) - (l.totalRepaid ?? 0)), 0);

  const defaulted = loans.filter((l: any) => l.status === "DEFAULTED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Loans</h1>
          <p className="text-white/50 text-sm mt-1">
            {isLoading
              ? "Loading…"
              : `${totalLoans} loans — $${totalDeployed.toLocaleString("en-US", { maximumFractionDigits: 0 })} deployed`}
          </p>
        </div>
        {defaulted > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/20 text-red-300 text-sm">
            <AlertTriangle className="h-4 w-4" />
            {defaulted} default{defaulted > 1 ? "s" : ""} on portfolio
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/40 mb-1">Capital Deployed</p>
          <p className="text-xl font-bold text-white">
            ${totalDeployed.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/40 mb-1">Outstanding</p>
          <p className="text-xl font-bold text-amber-300">
            ${totalOwed.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-white/40 mb-1">Default Rate</p>
          <p className="text-xl font-bold text-red-400">
            {totalLoans > 0 ? ((defaulted / totalLoans) * 100).toFixed(1) : "0.0"}%
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === s
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10" style={{ background: "rgba(255,255,255,0.04)" }}>
              <th className="text-left px-4 py-3 text-white/50 font-medium">ID</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Borrower</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Principal</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium hidden md:table-cell">APR</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium hidden md:table-cell">Repaid</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium hidden lg:table-cell">Risk</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium hidden xl:table-cell">Due</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Change Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-white/40">Loading loans…</td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-white/40">No loans found.</td>
              </tr>
            )}
            {filtered.map((l: any, i: number) => {
              const risk = riskLabel(l.creditScoreAtIssuance ?? 500);
              const repaid = l.totalRepaid ?? 0;
              const total = l.totalRepaymentUSD ?? 0;
              const pct = total > 0 ? Math.min(100, (repaid / total) * 100) : 0;
              return (
                <tr
                  key={l.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}
                >
                  <td className="px-4 py-3 text-white/40 font-mono text-xs">#{l.id}</td>
                  <td className="px-4 py-3 text-white">
                    <div>{l.buyerFirstName} {l.buyerLastName}</div>
                    <div className="text-white/40 text-xs">{l.buyerEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">
                    ${(l.principalUSD ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-white/60 hidden md:table-cell">{l.aprPercent}%</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 w-20">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-white/50 text-xs">{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${statusColor[l.status] ?? "bg-white/10 text-white/60"}`}>
                      {l.status === "DEFAULTED" && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {l.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-semibold hidden lg:table-cell ${risk.cls}`}>{risk.label}</td>
                  <td className="px-4 py-3 text-white/40 text-xs hidden xl:table-cell">
                    {new Date(l.dueAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect loanId={l.id} current={l.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
