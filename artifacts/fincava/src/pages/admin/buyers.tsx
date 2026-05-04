import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Search,
  Mail,
  Send,
  Building2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Filter,
  RotateCcw,
  Play,
} from "lucide-react";

interface BuyerRow {
  profileId: number;
  userId: number;
  email: string;
  companyName: string | null;
  registeredCompany: string | null;
  companyType: string | null;
  country: string | null;
  destinationPort: string | null;
  state: string;
  p2CompletionPct: number;
  p2SectionsDone: string[];
  p2ApprovalStatus: string;
  marketingOptIn: boolean;
  marketingTopics: string[];
  matchCount: number;
  gapCount: number;
  // Phase 1
  volumeBand: string | null;
  requiredCertsP1: string[];
  timeToFirstOrder: string | null;
  // Phase 1/legacy onboard
  intendedVolumeMt: number | null;
  importFrequency: string | null;
  preferredIncoterm: string | null;
  targetProducts: string[];
  // Phase 2 — Section A
  traceabilityLevel: string | null;
  existingColombiaRel: boolean | null;
  // Phase 2 — Section B
  tradeFinanceOpen: boolean;
  // Phase 2 — Section C
  auditStandard: string | null;
  // Phase 2 — Section D
  logisticsPartner: string | null;
  // Phase 2 — Section E
  prevSourcingChannel: string | null;
  discoveryBudgetBand: string | null;
  supplierDevOpen: boolean;
  supplierTypePref: string[];
  socialImpactReqs: string[];
  earlyStageSupplierOpen: boolean;
  // Phase 2 — Section F
  platformIntent: string[];
  sampleReady: boolean;
  languagePreference: string[];
  onboardedAt: string;
  registeredAt: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

interface BuyerListResponse {
  success: boolean;
  data: {
    rows: BuyerRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const STATE_BADGE: Record<string, string> = {
  REGISTERED: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  ONBOARDING: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  PROFILE_BUILDING: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  MATCHED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  GAP_SCANNED: "bg-purple-500/15 text-purple-300 border-purple-500/20",
};

function StateBadge({ state }: { state: string }) {
  const cls = STATE_BADGE[state] ?? "bg-white/10 text-white/60 border-white/10";
  return (
    <span
      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cls}`}
      data-testid={`badge-state-${state}`}
    >
      {state}
    </span>
  );
}

export default function AdminBuyers() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [companyTypeFilter, setCompanyTypeFilter] = useState("");
  const [marketingOptInFilter, setMarketingOptInFilter] = useState("");
  const [minCompletion, setMinCompletion] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [marketingModalOpen, setMarketingModalOpen] = useState(false);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (q.trim()) params.set("q", q.trim());
  if (stateFilter) params.set("state", stateFilter);
  if (companyTypeFilter) params.set("company_type", companyTypeFilter);
  if (marketingOptInFilter) params.set("marketing_opt_in", marketingOptInFilter);
  if (minCompletion) params.set("min_completion", minCompletion);

  const { data, isLoading, error } = useQuery<BuyerListResponse>({
    queryKey: ["admin-buyers", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/buyers?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return res.json();
    },
  });

  const rows = data?.data?.rows ?? [];
  const totalPages = data?.data?.totalPages ?? 1;
  const total = data?.data?.total ?? 0;

  return (
    <div className="space-y-6" data-testid="page-admin-buyers">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Buyers</h1>
          <p className="text-sm text-white/50 mt-1">
            Phase 5 admin surface — buyer profiles, completion, matches, gaps
            and marketing opt-ins.
          </p>
        </div>
        <button
          onClick={() => setMarketingModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition"
          data-testid="button-open-marketing-send"
        >
          <Send className="h-4 w-4" />
          Marketing send…
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-[#0d1612] border border-white/10 rounded-xl p-4">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Search company / email
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="acme imports"
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              data-testid="input-search"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
            State
          </label>
          <select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            data-testid="select-state"
          >
            <option value="">All</option>
            <option value="REGISTERED">REGISTERED</option>
            <option value="PROFILE_BUILDING">PROFILE_BUILDING</option>
            <option value="MATCHED">MATCHED</option>
            <option value="GAP_SCANNED">GAP_SCANNED</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Company type
          </label>
          <select
            value={companyTypeFilter}
            onChange={(e) => {
              setCompanyTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            data-testid="select-company-type"
          >
            <option value="">All</option>
            <option value="IMPORTER">Importer</option>
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="ROASTER">Roaster</option>
            <option value="MANUFACTURER">Manufacturer</option>
            <option value="EXPORTER">Exporter</option>
            <option value="COOPERATIVE">Cooperative</option>
            <option value="SMALLHOLDER">Smallholder</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Marketing
          </label>
          <select
            value={marketingOptInFilter}
            onChange={(e) => {
              setMarketingOptInFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            data-testid="select-marketing"
          >
            <option value="">All</option>
            <option value="true">Opted in</option>
            <option value="false">Opted out</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Min completion %
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={minCompletion}
            onChange={(e) => {
              setMinCompletion(e.target.value);
              setPage(1);
            }}
            className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            data-testid="input-min-completion"
          />
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">
          Failed to load buyers: {(error as Error).message}
        </div>
      ) : null}

      <div className="bg-[#0d1612] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/50 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Company type</th>
                <th className="text-left px-4 py-3">Country</th>
                <th className="text-left px-4 py-3">State</th>
                <th className="text-left px-4 py-3">Completion</th>
                <th className="text-left px-4 py-3">Approval</th>
                <th className="text-left px-4 py-3">Matches</th>
                <th className="text-left px-4 py-3">Gaps</th>
                <th className="text-left px-4 py-3">Marketing</th>
                <th className="text-left px-4 py-3">Registered at</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-white/40">
                    <Loader2 className="h-5 w-5 mx-auto animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-white/40">
                    No buyers match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((b) => {
                  const fullName = `${b.firstName ?? ""} ${b.lastName ?? ""}`.trim();
                  const companyLabel =
                    b.companyName ?? b.registeredCompany ?? "(no company)";
                  return (
                    <tr
                      key={b.profileId}
                      className="hover:bg-white/5 cursor-pointer transition"
                      onClick={() => setSelectedId(b.profileId)}
                      data-testid={`row-buyer-${b.profileId}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {fullName.length > 0 ? fullName : companyLabel}
                        </div>
                        <div className="text-xs text-white/40">
                          {fullName.length > 0 ? `${companyLabel} • ` : ""}
                          {b.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {b.companyType ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 capitalize">
                            {b.companyType}
                          </span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {b.country ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StateBadge state={b.state} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${b.p2CompletionPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/60 tabular-nums">
                            {b.p2CompletionPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ApprovalBadge status={b.p2ApprovalStatus ?? "PENDING_REVIEW"} />
                      </td>
                      <td className="px-4 py-3 text-white/70 tabular-nums">
                        {b.matchCount}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`tabular-nums ${
                            b.gapCount > 0 ? "text-amber-300" : "text-white/70"
                          }`}
                        >
                          {b.gapCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.marketingOptIn ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                            <Mail className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-xs text-white/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/40">
                        {b.registeredAt
                          ? new Date(b.registeredAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(b.profileId);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 text-xs"
                        >
                          Open →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-xs text-white/40">
            <span>
              Page {page} of {totalPages} • {total} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white/5 border border-white/10 rounded disabled:opacity-30"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-white/5 border border-white/10 rounded disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {selectedId != null ? (
        <BuyerDrawer profileId={selectedId} onClose={() => setSelectedId(null)} />
      ) : null}
      {marketingModalOpen ? (
        <MarketingSendModal onClose={() => setMarketingModalOpen(false)} />
      ) : null}
    </div>
  );
}

// ── Drawer ──────────────────────────────────────────────────────────────────

interface BuyerDetail extends BuyerRow {}
interface MatchRow {
  id: number;
  buyerProfileId: number;
  supplierId: number;
  matchScore: string;
  scoreBreakdown: any;
  disqualifiers: string[] | null;
  matchNotes: string | null;
  isCurrent: boolean;
  createdAt: string;
  supplierName: string | null;
  supplierMunicipio: string | null;
  supplierStatus: string | null;
}
interface GapRow {
  id: number;
  buyerProfileId: number;
  gapType: string;
  priority: string;
  pipelineAction: string;
  isRealGap: boolean;
  searchCategory: string | null;
  searchRegion: string | null;
  requiredAttributes: string[] | null;
  volumeTargetMt: string | null;
  buyerUrgencyNote: string | null;
  ingestionBatchId: number | null;
  resolvedAt: string | null;
  createdAt: string;
}
interface ActivityRow {
  id: number;
  actorAdminId: number;
  buyerProfileId: number;
  actionType: string;
  payload: Record<string, unknown> | null;
  note: string | null;
  createdAt: string;
}

function BuyerDrawer({
  profileId,
  onClose,
}: {
  profileId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "matches" | "gaps" | "profile" | "activity">("overview");
  const [actionResult, setActionResult] = useState<{ ok: boolean; message: string } | null>(null);

  const { data: detailResp, isLoading: detailLoading } = useQuery<{
    success: boolean;
    data: BuyerDetail;
  }>({
    queryKey: ["admin-buyer-detail", profileId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/buyers/${profileId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return res.json();
    },
  });
  const buyer = detailResp?.data;

  const { data: matchesResp, isLoading: matchesLoading } = useQuery<{
    success: boolean;
    data: MatchRow[];
  }>({
    queryKey: ["admin-buyer-matches", profileId],
    enabled: tab === "matches",
    queryFn: async () => {
      const res = await fetch(`/api/admin/buyers/${profileId}/matches?include=all`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return res.json();
    },
  });

  const { data: gapsResp, isLoading: gapsLoading } = useQuery<{
    success: boolean;
    data: GapRow[];
  }>({
    queryKey: ["admin-buyer-gaps", profileId],
    enabled: tab === "gaps",
    queryFn: async () => {
      const res = await fetch(`/api/admin/buyers/${profileId}/gaps`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return res.json();
    },
  });

  const { data: activityResp, isLoading: activityLoading } = useQuery<{
    success: boolean;
    data: ActivityRow[];
  }>({
    queryKey: ["admin-buyer-activity", profileId],
    enabled: tab === "activity",
    queryFn: async () => {
      const res = await fetch(`/api/admin/buyers/${profileId}/activity`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return res.json();
    },
  });

  const suppressMutation = useMutation({
    mutationFn: async (vars: { matchId: number; reason: string }) => {
      const res = await fetch(`/api/admin/buyers/${profileId}/suppress-match`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json?.error ?? `Failed (${res.status})`);
      }
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-buyer-matches", profileId] });
      qc.invalidateQueries({ queryKey: ["admin-buyer-detail", profileId] });
      qc.invalidateQueries({ queryKey: ["admin-buyers"] });
      qc.invalidateQueries({ queryKey: ["admin-buyer-activity", profileId] });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: async (gapId: number) => {
      const res = await fetch(`/api/admin/gaps/${gapId}/escalate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json?.error ?? `Failed (${res.status})`);
      }
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-buyer-gaps", profileId] });
      qc.invalidateQueries({ queryKey: ["admin-buyer-activity", profileId] });
    },
  });

  const resetScoreMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/buyers/${profileId}/reset-score`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json?.error ?? `Failed (${res.status})`);
      }
      return json.data;
    },
    onSuccess: () => {
      setActionResult({ ok: true, message: "Score reset successfully." });
      qc.invalidateQueries({ queryKey: ["admin-buyer-detail", profileId] });
      qc.invalidateQueries({ queryKey: ["admin-buyers"] });
      qc.invalidateQueries({ queryKey: ["admin-buyer-activity", profileId] });
    },
    onError: (err: Error) => {
      setActionResult({ ok: false, message: err.message });
    },
  });

  const runMatchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/buyers/${profileId}/run-match`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json?.error ?? `Failed (${res.status})`);
      }
      return json.data as { matchesInserted: number; candidatesEvaluated: number };
    },
    onSuccess: (data) => {
      const n = data?.matchesInserted ?? 0;
      setActionResult({
        ok: true,
        message: `Matching complete — ${n} match${n === 1 ? "" : "es"} inserted (${data?.candidatesEvaluated ?? 0} candidates evaluated).`,
      });
      qc.invalidateQueries({ queryKey: ["admin-buyer-matches", profileId] });
      qc.invalidateQueries({ queryKey: ["admin-buyer-detail", profileId] });
      qc.invalidateQueries({ queryKey: ["admin-buyers"] });
      qc.invalidateQueries({ queryKey: ["admin-buyer-activity", profileId] });
    },
    onError: (err: Error) => {
      setActionResult({ ok: false, message: err.message });
    },
  });

  function handleResetScore() {
    if (!window.confirm("Reset this buyer's score? This will clear completion % and gap flags.")) return;
    setActionResult(null);
    resetScoreMutation.mutate();
  }

  function handleRunMatch() {
    if (!window.confirm("Run fresh matching for this buyer? Existing matches will be re-evaluated.")) return;
    setActionResult(null);
    runMatchMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="drawer-buyer">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-[#0a140e] border-l border-white/10 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0a140e] border-b border-white/10 px-6 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">
              {buyer?.companyName ?? buyer?.registeredCompany ?? "Buyer"}
            </h2>
            <p className="text-xs text-white/40">#{profileId} • {buyer?.email}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleResetScore}
              disabled={resetScoreMutation.isPending || runMatchMutation.isPending}
              data-testid="button-reset-score"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {resetScoreMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Reset Score
            </button>
            <button
              onClick={handleRunMatch}
              disabled={resetScoreMutation.isPending || runMatchMutation.isPending}
              data-testid="button-run-match"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {runMatchMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Run Matching
            </button>
            <button onClick={onClose} className="text-white/40 hover:text-white ml-1" data-testid="button-close-drawer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {actionResult && (
          <div
            className={`mx-6 mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
              actionResult.ok
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
                : "bg-red-500/10 border border-red-500/30 text-red-300"
            }`}
            data-testid="action-result-banner"
          >
            <span className="flex-1">{actionResult.message}</span>
            <button
              onClick={() => setActionResult(null)}
              className="text-white/30 hover:text-white/70 shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="px-6 pt-4 border-b border-white/10 flex gap-1 overflow-x-auto">
          {(["overview", "matches", "gaps", "profile", "activity"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium rounded-t-md transition whitespace-nowrap ${
                tab === t
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white"
              }`}
              data-testid={`tab-${t}`}
            >
              {t === "overview"
                ? "Overview"
                : t === "matches"
                ? `Matches${buyer?.matchCount != null ? ` (${buyer.matchCount})` : ""}`
                : t === "gaps"
                ? `Gaps${buyer?.gapCount != null ? ` (${buyer.gapCount})` : ""}`
                : t === "profile"
                ? "Profile"
                : "Activity"}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {detailLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          ) : tab === "overview" && buyer ? (
            <OverviewPane buyer={buyer} />
          ) : tab === "matches" ? (
            <MatchesPane
              loading={matchesLoading}
              rows={matchesResp?.data ?? []}
              onSuppress={(matchId, reason) =>
                suppressMutation.mutateAsync({ matchId, reason })
              }
              suppressing={suppressMutation.isPending}
              error={suppressMutation.error as Error | null}
            />
          ) : tab === "gaps" ? (
            <GapsPane
              loading={gapsLoading}
              rows={gapsResp?.data ?? []}
              onEscalate={(id) => escalateMutation.mutateAsync(id)}
              escalating={escalateMutation.isPending}
              error={escalateMutation.error as Error | null}
            />
          ) : tab === "profile" ? (
            <ProfilePane profileId={profileId} />
          ) : tab === "activity" ? (
            <ActivityPane
              loading={activityLoading}
              rows={activityResp?.data ?? []}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Profile tab types and helpers ─────────────────────────────────────────────

interface AdminOnboardingData {
  p2CompletionPct: number;
  p2SectionsDone: string[];
  p2ApprovalStatus: string;
  p2RevisionNote: string | null;
  buyerSegment: string | null;
  locationCount: string | null;
  annualBudgetUsd: string | null;
  coffeeQualityTier: string | null;
  coffeeFlavorProfile: string[] | null;
  cacaoFlavorProfile: string | null;
  fruitForm: string[] | null;
  availabilityRequirement: string | null;
  orderFrequency: string | null;
  coffeeOrderSizeKg: string | null;
  cacaoOrderSizeKg: string | null;
  fruitOrderSizeKg: string | null;
  priceSensitivity: string | null;
  priceTransparency: string[] | null;
  certsNiceToHave: string[] | null;
  traceabilityLevel: string | null;
  qualityDocRequired: string[] | null;
  coffeeDefectRate: string | null;
  cacaoMoldPct: string | null;
  sourceConsistency: string | null;
  qualityVerification: string[] | null;
  sustainabilityImportance: string | null;
  sustainabilityDimensions: string[] | null;
}

const APPROVAL_BADGE_CLS: Record<string, string> = {
  APPROVED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  PENDING_REVIEW: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  REVISION_REQUESTED: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  NEEDS_ATTENTION: "bg-red-500/15 text-red-300 border-red-500/20",
};
const APPROVAL_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  PENDING_REVIEW: "Pending Review",
  REVISION_REQUESTED: "Revision Requested",
  NEEDS_ATTENTION: "Needs Attention",
};
function ApprovalBadge({ status }: { status: string }) {
  const cls = APPROVAL_BADGE_CLS[status] ?? "bg-white/10 text-white/60 border-white/10";
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${cls}`}>
      {APPROVAL_LABELS[status] ?? status}
    </span>
  );
}

function AdminSelectField({
  label, value, options, onChange,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-white/40 uppercase tracking-wider">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
      >
        <option value="">— not set —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function AdminArrayField({
  label, value, onChange,
}: {
  label: string;
  value: string[] | null;
  onChange: (v: string[] | null) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-white/40 uppercase tracking-wider">{label} (comma-separated)</label>
      <input
        type="text"
        value={(value ?? []).join(", ")}
        onChange={(e) => {
          const s = e.target.value.trim();
          onChange(s ? s.split(",").map((x) => x.trim()).filter(Boolean) : null);
        }}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
      />
    </div>
  );
}

function SectionCard({
  title, done, editing, onEdit, onCancel, onSave, saving, error, children,
}: {
  title: string;
  done: boolean | undefined;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-white/40 uppercase tracking-wider">{title}</p>
          {done ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">done</span>
          ) : (
            <span className="text-[10px] text-white/40">pending</span>
          )}
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            {error && <span className="text-xs text-red-300 mr-1">{error}</span>}
            <button onClick={onCancel} className="text-xs text-white/40 hover:text-white transition">Cancel</button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Save
            </button>
          </div>
        ) : (
          <button onClick={onEdit} className="text-xs text-white/40 hover:text-emerald-300 transition">Edit</button>
        )}
      </div>
      {children}
    </div>
  );
}

function ProfilePane({ profileId }: { profileId: number }) {
  const qc = useQueryClient();

  const { data: onboardResp, isLoading } = useQuery<{ success: boolean; data: AdminOnboardingData }>({
    queryKey: ["admin-buyer-onboarding", profileId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/buyers/${profileId}/onboarding`, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return res.json();
    },
  });

  const od = onboardResp?.data;
  type EditSection = "S1" | "S2" | "S3" | "S4";
  const [editSection, setEditSection] = useState<EditSection | null>(null);
  const [editValues, setEditValues] = useState<Partial<AdminOnboardingData>>({});
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const [revisionNote, setRevisionNote] = useState("");
  const [approvalSaving, setApprovalSaving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

  function openEdit(section: EditSection) {
    if (!od) return;
    setSectionError(null);
    setEditSection(section);
    if (section === "S1") {
      setEditValues({ buyerSegment: od.buyerSegment, locationCount: od.locationCount, annualBudgetUsd: od.annualBudgetUsd });
    } else if (section === "S2") {
      setEditValues({ coffeeQualityTier: od.coffeeQualityTier, coffeeFlavorProfile: od.coffeeFlavorProfile, cacaoFlavorProfile: od.cacaoFlavorProfile, fruitForm: od.fruitForm, availabilityRequirement: od.availabilityRequirement, orderFrequency: od.orderFrequency });
    } else if (section === "S3") {
      setEditValues({ coffeeOrderSizeKg: od.coffeeOrderSizeKg, cacaoOrderSizeKg: od.cacaoOrderSizeKg, fruitOrderSizeKg: od.fruitOrderSizeKg, priceSensitivity: od.priceSensitivity, priceTransparency: od.priceTransparency });
    } else {
      setEditValues({ certsNiceToHave: od.certsNiceToHave, traceabilityLevel: od.traceabilityLevel, qualityDocRequired: od.qualityDocRequired, coffeeDefectRate: od.coffeeDefectRate, cacaoMoldPct: od.cacaoMoldPct, sourceConsistency: od.sourceConsistency, qualityVerification: od.qualityVerification, sustainabilityImportance: od.sustainabilityImportance, sustainabilityDimensions: od.sustainabilityDimensions });
    }
  }

  async function saveSection() {
    setSectionSaving(true);
    setSectionError(null);
    try {
      const res = await fetch(`/api/admin/buyers/${profileId}/onboarding`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json?.error ?? `Failed (${res.status})`);
      qc.invalidateQueries({ queryKey: ["admin-buyer-onboarding", profileId] });
      setEditSection(null);
    } catch (err) {
      setSectionError((err as Error).message);
    } finally {
      setSectionSaving(false);
    }
  }

  async function handleApproval(status: string) {
    if (status === "REVISION_REQUESTED" && !revisionNote.trim()) {
      setApprovalError("Revision note is required for REVISION_REQUESTED.");
      return;
    }
    setApprovalSaving(true);
    setApprovalError(null);
    setApprovalSuccess(null);
    try {
      const body: Record<string, unknown> = { status };
      if (status === "REVISION_REQUESTED") body.revisionNote = revisionNote.trim();
      const res = await fetch(`/api/admin/buyers/${profileId}/approval`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json?.error ?? `Failed (${res.status})`);
      setApprovalSuccess(`Status updated to: ${APPROVAL_LABELS[status] ?? status}`);
      if (status !== "REVISION_REQUESTED") setRevisionNote("");
      qc.invalidateQueries({ queryKey: ["admin-buyer-onboarding", profileId] });
      qc.invalidateQueries({ queryKey: ["admin-buyers"] });
      qc.invalidateQueries({ queryKey: ["admin-buyer-detail", profileId] });
    } catch (err) {
      setApprovalError((err as Error).message);
    } finally {
      setApprovalSaving(false);
    }
  }

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-white/40" />;
  if (!od) return <p className="text-sm text-white/40">No onboarding profile found.</p>;

  const curStatus = od.p2ApprovalStatus ?? "PENDING_REVIEW";
  const ev = editValues;
  const set = (k: keyof AdminOnboardingData, v: unknown) =>
    setEditValues((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4 text-sm" data-testid="pane-profile">
      {/* Progress summary */}
      <div className="flex items-center justify-between text-xs text-white/50 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
        <span>P2 Completion: <strong className="text-white">{od.p2CompletionPct}%</strong></span>
        <ApprovalBadge status={curStatus} />
      </div>

      {/* S1 — Company Profile */}
      <SectionCard
        title="S1 — Company Profile"
        done={od.p2SectionsDone?.includes("S1")}
        editing={editSection === "S1"}
        onEdit={() => openEdit("S1")}
        onCancel={() => { setEditSection(null); setSectionError(null); }}
        onSave={saveSection}
        saving={sectionSaving}
        error={editSection === "S1" ? sectionError : null}
      >
        {editSection === "S1" ? (
          <div className="space-y-3 mt-2">
            <AdminSelectField label="Buyer segment" value={ev.buyerSegment as string | null ?? null} onChange={(v) => set("buyerSegment", v)}
              options={[{ value: "specialty_roaster", label: "Specialty roaster" }, { value: "commodity_trader", label: "Commodity trader" }, { value: "craft_chocolatier", label: "Craft chocolatier" }, { value: "food_distributor", label: "Food distributor" }, { value: "grocery_retailer", label: "Grocery retailer" }, { value: "specialty_retailer", label: "Specialty retailer" }, { value: "food_manufacturer", label: "Food manufacturer" }, { value: "restaurant_hospitality", label: "Restaurant / hospitality" }, { value: "other", label: "Other" }]} />
            <AdminSelectField label="Location count" value={ev.locationCount as string | null ?? null} onChange={(v) => set("locationCount", v)}
              options={[{ value: "one", label: "One" }, { value: "two_to_five", label: "2–5" }, { value: "six_to_twenty", label: "6–20" }, { value: "twenty_plus", label: "20+" }]} />
            <AdminSelectField label="Annual budget (USD)" value={ev.annualBudgetUsd as string | null ?? null} onChange={(v) => set("annualBudgetUsd", v)}
              options={[{ value: "under_50k", label: "< $50k" }, { value: "50k_to_250k", label: "$50k–$250k" }, { value: "250k_to_1m", label: "$250k–$1M" }, { value: "1m_to_5m", label: "$1M–$5M" }, { value: "over_5m", label: "> $5M" }]} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Field label="Buyer segment" value={od.buyerSegment ?? "—"} />
            <Field label="Location count" value={od.locationCount ?? "—"} />
            <Field label="Annual budget" value={od.annualBudgetUsd ?? "—"} />
          </div>
        )}
      </SectionCard>

      {/* S2 — Product Interests */}
      <SectionCard
        title="S2 — Product Interests"
        done={od.p2SectionsDone?.includes("S2")}
        editing={editSection === "S2"}
        onEdit={() => openEdit("S2")}
        onCancel={() => { setEditSection(null); setSectionError(null); }}
        onSave={saveSection}
        saving={sectionSaving}
        error={editSection === "S2" ? sectionError : null}
      >
        {editSection === "S2" ? (
          <div className="space-y-3 mt-2">
            <AdminSelectField label="Coffee quality tier" value={ev.coffeeQualityTier as string | null ?? null} onChange={(v) => set("coffeeQualityTier", v)}
              options={[{ value: "specialty_sca80", label: "Specialty SCA 80+" }, { value: "high_commercial_75_79", label: "High commercial 75–79" }, { value: "standard_commercial_70_74", label: "Standard 70–74" }, { value: "bulk_commodity", label: "Bulk commodity" }]} />
            <AdminArrayField label="Coffee flavor profile" value={ev.coffeeFlavorProfile as string[] | null} onChange={(v) => set("coffeeFlavorProfile", v)} />
            <AdminSelectField label="Cacao flavor profile" value={ev.cacaoFlavorProfile as string | null ?? null} onChange={(v) => set("cacaoFlavorProfile", v)}
              options={[{ value: "fruity_floral_citrus", label: "Fruity / floral / citrus" }, { value: "chocolate_nutty_caramel", label: "Chocolate / nutty / caramel" }, { value: "balanced_blending", label: "Balanced / blending" }, { value: "no_preference", label: "No preference" }]} />
            <AdminArrayField label="Fruit form" value={ev.fruitForm as string[] | null} onChange={(v) => set("fruitForm", v)} />
            <AdminSelectField label="Availability requirement" value={ev.availabilityRequirement as string | null ?? null} onChange={(v) => set("availabilityRequirement", v)}
              options={[{ value: "year_round_critical", label: "Year-round critical" }, { value: "seasonal_acceptable", label: "Seasonal acceptable" }, { value: "flexible", label: "Flexible" }]} />
            <AdminSelectField label="Order frequency" value={ev.orderFrequency as string | null ?? null} onChange={(v) => set("orderFrequency", v)}
              options={[{ value: "weekly_biweekly", label: "Weekly / biweekly" }, { value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" }, { value: "annual_contracts", label: "Annual contracts" }, { value: "ad_hoc", label: "Ad hoc" }]} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Field label="Coffee quality tier" value={od.coffeeQualityTier ?? "—"} />
            <Field label="Coffee flavors" value={fmtArr(od.coffeeFlavorProfile)} />
            <Field label="Cacao flavor" value={od.cacaoFlavorProfile ?? "—"} />
            <Field label="Fruit form" value={fmtArr(od.fruitForm)} />
            <Field label="Availability" value={od.availabilityRequirement ?? "—"} />
            <Field label="Order frequency" value={od.orderFrequency ?? "—"} />
          </div>
        )}
      </SectionCard>

      {/* S3 — Volume & Pricing */}
      <SectionCard
        title="S3 — Volume & Pricing"
        done={od.p2SectionsDone?.includes("S3")}
        editing={editSection === "S3"}
        onEdit={() => openEdit("S3")}
        onCancel={() => { setEditSection(null); setSectionError(null); }}
        onSave={saveSection}
        saving={sectionSaving}
        error={editSection === "S3" ? sectionError : null}
      >
        {editSection === "S3" ? (
          <div className="space-y-3 mt-2">
            <AdminSelectField label="Coffee order size (kg)" value={ev.coffeeOrderSizeKg as string | null ?? null} onChange={(v) => set("coffeeOrderSizeKg", v)}
              options={[{ value: "under_500", label: "< 500 kg" }, { value: "500_to_2000", label: "500–2,000 kg" }, { value: "2000_to_10000", label: "2,000–10,000 kg" }, { value: "10000_to_50000", label: "10,000–50,000 kg" }, { value: "over_50000", label: "> 50,000 kg" }]} />
            <AdminSelectField label="Cacao order size (kg)" value={ev.cacaoOrderSizeKg as string | null ?? null} onChange={(v) => set("cacaoOrderSizeKg", v)}
              options={[{ value: "under_500", label: "< 500 kg" }, { value: "500_to_5000", label: "500–5,000 kg" }, { value: "5000_to_20000", label: "5,000–20,000 kg" }, { value: "over_20000", label: "> 20,000 kg" }]} />
            <AdminSelectField label="Fruit order size (kg)" value={ev.fruitOrderSizeKg as string | null ?? null} onChange={(v) => set("fruitOrderSizeKg", v)}
              options={[{ value: "under_500", label: "< 500 kg" }, { value: "500_to_2000", label: "500–2,000 kg" }, { value: "2000_to_10000", label: "2,000–10,000 kg" }, { value: "over_10000", label: "> 10,000 kg" }]} />
            <AdminSelectField label="Price sensitivity" value={ev.priceSensitivity as string | null ?? null} onChange={(v) => set("priceSensitivity", v)}
              options={[{ value: "quality_first", label: "Quality first" }, { value: "balanced", label: "Balanced" }, { value: "cost_driven", label: "Cost-driven" }]} />
            <AdminArrayField label="Price transparency" value={ev.priceTransparency as string[] | null} onChange={(v) => set("priceTransparency", v)} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Field label="Coffee order size" value={od.coffeeOrderSizeKg ?? "—"} />
            <Field label="Cacao order size" value={od.cacaoOrderSizeKg ?? "—"} />
            <Field label="Fruit order size" value={od.fruitOrderSizeKg ?? "—"} />
            <Field label="Price sensitivity" value={od.priceSensitivity ?? "—"} />
            <Field label="Price transparency" value={fmtArr(od.priceTransparency)} />
          </div>
        )}
      </SectionCard>

      {/* S4 — Quality & Sustainability */}
      <SectionCard
        title="S4 — Quality & Sustainability"
        done={od.p2SectionsDone?.includes("S4")}
        editing={editSection === "S4"}
        onEdit={() => openEdit("S4")}
        onCancel={() => { setEditSection(null); setSectionError(null); }}
        onSave={saveSection}
        saving={sectionSaving}
        error={editSection === "S4" ? sectionError : null}
      >
        {editSection === "S4" ? (
          <div className="space-y-3 mt-2">
            <AdminArrayField label="Certs nice to have" value={ev.certsNiceToHave as string[] | null} onChange={(v) => set("certsNiceToHave", v)} />
            <AdminSelectField label="Traceability level" value={ev.traceabilityLevel as string | null ?? null} onChange={(v) => set("traceabilityLevel", v)}
              options={[{ value: "farm_to_cup", label: "Farm to cup" }, { value: "lot_level", label: "Lot level" }, { value: "preferred_not_mandatory", label: "Preferred not mandatory" }, { value: "no_requirement", label: "No requirement" }]} />
            <AdminArrayField label="Quality docs required" value={ev.qualityDocRequired as string[] | null} onChange={(v) => set("qualityDocRequired", v)} />
            <AdminSelectField label="Coffee defect rate" value={ev.coffeeDefectRate as string | null ?? null} onChange={(v) => set("coffeeDefectRate", v)}
              options={[{ value: "under_1pct", label: "< 1%" }, { value: "one_to_5pct", label: "1–5%" }, { value: "five_to_10pct", label: "5–10%" }, { value: "ten_plus_acceptable", label: "10%+ acceptable" }]} />
            <AdminSelectField label="Cacao mold %" value={ev.cacaoMoldPct as string | null ?? null} onChange={(v) => set("cacaoMoldPct", v)}
              options={[{ value: "under_1pct", label: "< 1%" }, { value: "one_to_2pct", label: "1–2%" }, { value: "two_to_5pct", label: "2–5%" }, { value: "no_requirement", label: "No requirement" }]} />
            <AdminSelectField label="Source consistency" value={ev.sourceConsistency as string | null ?? null} onChange={(v) => set("sourceConsistency", v)}
              options={[{ value: "single_source_preferred", label: "Single source preferred" }, { value: "approved_pool", label: "Approved pool" }, { value: "variety_acceptable", label: "Variety acceptable" }, { value: "no_preference", label: "No preference" }]} />
            <AdminArrayField label="Quality verification" value={ev.qualityVerification as string[] | null} onChange={(v) => set("qualityVerification", v)} />
            <AdminSelectField label="Sustainability importance" value={ev.sustainabilityImportance as string | null ?? null} onChange={(v) => set("sustainabilityImportance", v)}
              options={[{ value: "critical_to_brand", label: "Critical to brand" }, { value: "important_to_market", label: "Important to market" }, { value: "secondary", label: "Secondary" }, { value: "not_important", label: "Not important" }]} />
            <AdminArrayField label="Sustainability dimensions" value={ev.sustainabilityDimensions as string[] | null} onChange={(v) => set("sustainabilityDimensions", v)} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Field label="Certs (nice)" value={fmtArr(od.certsNiceToHave)} />
            <Field label="Traceability" value={od.traceabilityLevel ?? "—"} />
            <Field label="Quality docs" value={fmtArr(od.qualityDocRequired)} />
            <Field label="Coffee defect rate" value={od.coffeeDefectRate ?? "—"} />
            <Field label="Cacao mold %" value={od.cacaoMoldPct ?? "—"} />
            <Field label="Source consistency" value={od.sourceConsistency ?? "—"} />
            <Field label="Quality verification" value={fmtArr(od.qualityVerification)} />
            <Field label="Sustainability imp." value={od.sustainabilityImportance ?? "—"} />
            <Field label="Sustainability dims." value={fmtArr(od.sustainabilityDimensions)} />
          </div>
        )}
      </SectionCard>

      {/* Approval controls (M10) */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4" data-testid="panel-approval">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40 uppercase tracking-wider">Approval Status</p>
          <ApprovalBadge status={curStatus} />
        </div>

        {curStatus === "REVISION_REQUESTED" && od.p2RevisionNote && (
          <div className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded p-2">
            <span className="font-semibold">Current note: </span>{od.p2RevisionNote}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] text-white/40 uppercase tracking-wider">
            Revision note (required for "Request Revision")
          </label>
          <textarea
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Describe what the buyer needs to update…"
            className="mt-1 w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
            data-testid="input-revision-note"
          />
        </div>

        {approvalError && <p className="text-xs text-red-300" data-testid="approval-error">{approvalError}</p>}
        {approvalSuccess && <p className="text-xs text-emerald-300" data-testid="approval-success">{approvalSuccess}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleApproval("APPROVED")}
            disabled={approvalSaving || curStatus === "APPROVED"}
            className="px-3 py-1.5 text-xs font-medium rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            data-testid="button-approve"
          >
            {approvalSaving ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}Approve
          </button>
          <button
            onClick={() => handleApproval("REVISION_REQUESTED")}
            disabled={approvalSaving}
            className="px-3 py-1.5 text-xs font-medium rounded border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            data-testid="button-request-revision"
          >
            Request Revision
          </button>
          <button
            onClick={() => handleApproval("NEEDS_ATTENTION")}
            disabled={approvalSaving || curStatus === "NEEDS_ATTENTION"}
            className="px-3 py-1.5 text-xs font-medium rounded border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            data-testid="button-needs-attention"
          >
            Needs Attention
          </button>
          <button
            onClick={() => handleApproval("PENDING_REVIEW")}
            disabled={approvalSaving || curStatus === "PENDING_REVIEW"}
            className="px-3 py-1.5 text-xs font-medium rounded border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            data-testid="button-pending-review"
          >
            Reset to Pending
          </button>
        </div>
      </div>
    </div>
  );
}

const SECTION_LABELS: Record<string, string> = {
  A: "A — Product detail",
  B: "B — Commercial terms",
  C: "C — Quality & compliance",
  D: "D — Logistics",
  E: "E — Sourcing preferences",
  F: "F — Platform intent",
};
const ALL_SECTIONS = ["A", "B", "C", "D", "E", "F"] as const;

function fmtBool(v: boolean | null | undefined): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}
function fmtArr(v: string[] | null | undefined): React.ReactNode {
  if (!v || v.length === 0) return <span className="text-white/40">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {v.map((p) => (
        <span
          key={p}
          className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70"
        >
          {p}
        </span>
      ))}
    </div>
  );
}

function OverviewPane({ buyer }: { buyer: BuyerDetail }) {
  const done = new Set(buyer.p2SectionsDone ?? []);
  return (
    <div className="space-y-5 text-sm" data-testid="pane-overview">
      {/* Top summary */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="State" value={<StateBadge state={buyer.state} />} />
        <Field label="Completion" value={`${buyer.p2CompletionPct}%`} />
        <Field
          label="Company"
          value={buyer.companyName ?? buyer.registeredCompany ?? "—"}
        />
        <Field
          label="Company type"
          value={
            buyer.companyType ? (
              <span className="capitalize">{buyer.companyType}</span>
            ) : (
              "—"
            )
          }
        />
        <Field label="Country" value={buyer.country ?? "—"} />
        <Field label="Match count" value={String(buyer.matchCount)} />
        <Field label="Gap count" value={String(buyer.gapCount)} />
        <Field
          label="Registered at"
          value={
            buyer.registeredAt
              ? new Date(buyer.registeredAt).toLocaleString()
              : "—"
          }
        />
      </div>

      {/* Completeness breakdown */}
      <div
        className="rounded-lg border border-white/10 bg-white/5 p-3"
        data-testid="completeness-breakdown"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            Completeness ({done.size}/{ALL_SECTIONS.length} sections)
          </p>
          <span className="text-xs text-white/60 tabular-nums">
            {buyer.p2CompletionPct}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_SECTIONS.map((s) => {
            const isDone = done.has(s);
            return (
              <div
                key={s}
                className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded border ${
                  isDone
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                    : "bg-white/[0.02] border-white/10 text-white/50"
                }`}
                data-testid={`section-${s}-${isDone ? "done" : "pending"}`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-3.5 w-3.5 inline-block rounded-full border border-white/30" />
                )}
                <span>{SECTION_LABELS[s]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase 1 snapshot */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
        <p className="text-xs text-white/40 uppercase tracking-wider">
          Phase 1 — registration
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Volume band" value={buyer.volumeBand ?? "—"} />
          <Field
            label="Intended volume"
            value={
              buyer.intendedVolumeMt != null
                ? `${buyer.intendedVolumeMt} MT`
                : "—"
            }
          />
          <Field label="Frequency" value={buyer.importFrequency ?? "—"} />
          <Field label="Incoterm" value={buyer.preferredIncoterm ?? "—"} />
          <Field
            label="Destination port"
            value={buyer.destinationPort ?? "—"}
          />
          <Field
            label="Time to first order"
            value={buyer.timeToFirstOrder ?? "—"}
          />
        </div>
        <Field label="Target products" value={fmtArr(buyer.targetProducts)} />
        <Field
          label="Required certifications (P1)"
          value={fmtArr(buyer.requiredCertsP1)}
        />
      </div>

      {/* Phase 2 — Section A */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            {SECTION_LABELS.A}
          </p>
          {done.has("A") ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
              done
            </span>
          ) : (
            <span className="text-[10px] text-white/40">pending</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Traceability level"
            value={buyer.traceabilityLevel ?? "—"}
          />
          <Field
            label="Existing Colombia relationship"
            value={fmtBool(buyer.existingColombiaRel)}
          />
        </div>
      </div>

      {/* Phase 2 — Section B */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            {SECTION_LABELS.B}
          </p>
          {done.has("B") ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
              done
            </span>
          ) : (
            <span className="text-[10px] text-white/40">pending</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Incoterm" value={buyer.preferredIncoterm ?? "—"} />
          <Field
            label="Volume (MT)"
            value={buyer.intendedVolumeMt != null ? String(buyer.intendedVolumeMt) : "—"}
          />
          <Field label="Frequency" value={buyer.importFrequency ?? "—"} />
          <Field
            label="Trade finance open"
            value={fmtBool(buyer.tradeFinanceOpen)}
          />
        </div>
      </div>

      {/* Phase 2 — Section C */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            {SECTION_LABELS.C}
          </p>
          {done.has("C") ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
              done
            </span>
          ) : (
            <span className="text-[10px] text-white/40">pending</span>
          )}
        </div>
        <Field label="Audit standard" value={buyer.auditStandard ?? "—"} />
      </div>

      {/* Phase 2 — Section D */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            {SECTION_LABELS.D}
          </p>
          {done.has("D") ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
              done
            </span>
          ) : (
            <span className="text-[10px] text-white/40">pending</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Destination port"
            value={buyer.destinationPort ?? "—"}
          />
          <Field
            label="Logistics partner"
            value={buyer.logisticsPartner ?? "—"}
          />
        </div>
      </div>

      {/* Phase 2 — Section E */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            {SECTION_LABELS.E}
          </p>
          {done.has("E") ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
              done
            </span>
          ) : (
            <span className="text-[10px] text-white/40">pending</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Previous sourcing channel"
            value={buyer.prevSourcingChannel ?? "—"}
          />
          <Field
            label="Discovery budget band"
            value={buyer.discoveryBudgetBand ?? "—"}
          />
          <Field
            label="Supplier dev open"
            value={fmtBool(buyer.supplierDevOpen)}
          />
          <Field
            label="Early-stage supplier open"
            value={fmtBool(buyer.earlyStageSupplierOpen)}
          />
        </div>
        <Field
          label="Supplier type preference"
          value={fmtArr(buyer.supplierTypePref)}
        />
        <Field
          label="Social impact requirements"
          value={fmtArr(buyer.socialImpactReqs)}
        />
      </div>

      {/* Phase 2 — Section F */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            {SECTION_LABELS.F}
          </p>
          {done.has("F") ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
              done
            </span>
          ) : (
            <span className="text-[10px] text-white/40">pending</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sample ready" value={fmtBool(buyer.sampleReady)} />
          <Field
            label="Languages"
            value={fmtArr(buyer.languagePreference)}
          />
        </div>
        <Field label="Platform intent" value={fmtArr(buyer.platformIntent)} />
      </div>

      {/* Marketing */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider mb-2">
          <Mail className="h-3.5 w-3.5" /> Marketing
        </div>
        <p className="text-sm">
          Opt-in:{" "}
          <span className={buyer.marketingOptIn ? "text-emerald-300" : "text-white/40"}>
            {buyer.marketingOptIn ? "Yes" : "No"}
          </span>
        </p>
        {buyer.marketingOptIn && (buyer.marketingTopics ?? []).length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {buyer.marketingTopics.map((t) => (
              <span
                key={t}
                className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Contact */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider mb-2">
          <Building2 className="h-3.5 w-3.5" /> Contact
        </div>
        <p>
          {buyer.firstName ?? ""} {buyer.lastName ?? ""}
        </p>
        <p className="text-white/60">{buyer.email}</p>
        {buyer.phone ? <p className="text-white/60">{buyer.phone}</p> : null}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <div className="text-sm text-white/90">{value}</div>
    </div>
  );
}

function MatchesPane({
  loading,
  rows,
  onSuppress,
  suppressing,
  error,
}: {
  loading: boolean;
  rows: MatchRow[];
  onSuppress: (matchId: number, reason: string) => Promise<unknown>;
  suppressing: boolean;
  error: Error | null;
}) {
  const [suppressTarget, setSuppressTarget] = useState<MatchRow | null>(null);
  const [reason, setReason] = useState("");

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-white/40" />;
  if (rows.length === 0)
    return <p className="text-sm text-white/40">No matches yet.</p>;

  return (
    <div className="space-y-3" data-testid="pane-matches">
      {rows.map((m) => (
        <div
          key={m.id}
          className={`rounded-lg border p-3 ${
            m.isCurrent ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60"
          }`}
          data-testid={`match-${m.id}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">
                {m.supplierName ?? `Supplier #${m.supplierId}`}
              </p>
              <p className="text-xs text-white/40">
                {m.supplierMunicipio ?? "—"} • {m.supplierStatus ?? ""}
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-semibold text-emerald-300 tabular-nums">
                {Number(m.matchScore).toFixed(2)}
              </span>
              {!m.isCurrent ? (
                <p className="text-[10px] text-amber-300 mt-0.5">SUPPRESSED</p>
              ) : null}
            </div>
          </div>
          {m.disqualifiers && m.disqualifiers.length > 0 ? (
            <div className="mt-2 text-[11px] text-white/50 space-y-0.5">
              {m.disqualifiers.map((d, i) => (
                <p key={i}>• {d}</p>
              ))}
            </div>
          ) : null}
          {m.isCurrent ? (
            <button
              onClick={() => {
                setSuppressTarget(m);
                setReason("");
              }}
              className="mt-2 text-xs text-amber-300 hover:text-amber-200"
              data-testid={`button-suppress-${m.id}`}
            >
              Suppress match…
            </button>
          ) : null}
        </div>
      ))}

      {suppressTarget ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          data-testid="modal-suppress"
        >
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Suppress match — {suppressTarget.supplierName ?? `#${suppressTarget.supplierId}`}
            </h3>
            <p className="text-xs text-white/50">
              The match will be marked as not current and the reason recorded
              on its disqualifier trail.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. supplier no longer producing organic"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              data-testid="input-suppress-reason"
            />
            {error ? (
              <p className="text-xs text-red-400">{error.message}</p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSuppressTarget(null)}
                className="px-3 py-1.5 text-sm text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={suppressing || reason.trim().length === 0}
                onClick={async () => {
                  try {
                    await onSuppress(suppressTarget.id, reason.trim());
                    setSuppressTarget(null);
                  } catch {
                    /* error displayed inline */
                  }
                }}
                className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-md"
                data-testid="button-confirm-suppress"
              >
                {suppressing ? "Suppressing…" : "Suppress"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GapsPane({
  loading,
  rows,
  onEscalate,
  escalating,
  error,
}: {
  loading: boolean;
  rows: GapRow[];
  onEscalate: (id: number) => Promise<unknown>;
  escalating: boolean;
  error: Error | null;
}) {
  const [confirmId, setConfirmId] = useState<number | null>(null);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-white/40" />;
  if (rows.length === 0)
    return <p className="text-sm text-white/40">No gaps recorded.</p>;

  return (
    <div className="space-y-3" data-testid="pane-gaps">
      {rows.map((g) => {
        const escalated = g.ingestionBatchId != null;
        const canEscalate = g.priority === "MEDIUM" && g.isRealGap && !escalated;
        return (
          <div
            key={g.id}
            className="rounded-lg border border-white/10 bg-white/5 p-3"
            data-testid={`gap-${g.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">
                    {g.gapType}
                  </span>
                  <PriorityBadge priority={g.priority} />
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/60">
                    {g.pipelineAction}
                  </span>
                  {escalated ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-300">
                      escalated → batch #{g.ingestionBatchId}
                    </span>
                  ) : null}
                  {!g.isRealGap ? (
                    <span className="text-[10px] text-white/40">(not real gap)</span>
                  ) : null}
                </div>
                <p className="text-xs text-white/50 mt-1">
                  {g.searchCategory ?? "—"} • {g.searchRegion ?? "—"}
                  {g.volumeTargetMt ? ` • ${g.volumeTargetMt} MT` : ""}
                </p>
                {g.buyerUrgencyNote ? (
                  <p className="text-xs text-white/60 mt-2">
                    {g.buyerUrgencyNote}
                  </p>
                ) : null}
              </div>
              {canEscalate ? (
                <button
                  onClick={() => setConfirmId(g.id)}
                  className="text-xs px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded"
                  data-testid={`button-escalate-${g.id}`}
                >
                  Escalate
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      {confirmId != null ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" data-testid="modal-escalate">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Escalate gap #{confirmId}?
            </h3>
            <p className="text-xs text-white/60">
              A new ingestion batch will be created and discovery will run.
              Use this for MEDIUM gaps that warrant immediate sourcing.
            </p>
            {error ? (
              <p className="text-xs text-red-400">{error.message}</p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmId(null)}
                className="px-3 py-1.5 text-sm text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={escalating}
                onClick={async () => {
                  try {
                    await onEscalate(confirmId);
                    setConfirmId(null);
                  } catch {
                    /* shown inline */
                  }
                }}
                className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md"
                data-testid="button-confirm-escalate"
              >
                {escalating ? "Escalating…" : "Confirm escalation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  suppress_match: "Suppressed match",
  escalate_gap: "Escalated gap",
};

function ActivityPane({ loading, rows }: { loading: boolean; rows: ActivityRow[] }) {
  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-white/40" />;
  if (rows.length === 0)
    return <p className="text-sm text-white/40" data-testid="activity-empty">No admin actions recorded.</p>;

  return (
    <div className="space-y-2" data-testid="pane-activity">
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
          data-testid={`activity-${row.id}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-white">
              {ACTION_LABELS[row.actionType] ?? row.actionType}
            </span>
            <span className="text-xs text-white/40">
              {new Date(row.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            Admin #{row.actorAdminId}
          </p>
          {row.note ? (
            <p className="text-xs text-white/70 mt-1 italic">{row.note}</p>
          ) : null}
          {row.payload && Object.keys(row.payload).length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {Object.entries(row.payload).map(([k, v]) => (
                <span
                  key={k}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50"
                >
                  {k}: {String(v)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === "HIGH"
      ? "bg-red-500/15 text-red-300 border-red-500/30"
      : priority === "MEDIUM"
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
        : "bg-white/10 text-white/50 border-white/10";
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border ${cls}`}>
      {priority}
    </span>
  );
}

// ── Marketing send modal ────────────────────────────────────────────────────

type CampaignStatus = {
  id: number;
  status: string;
  totalRecipients: number;
  sent: number;
  failed: number;
  completedAt: string | null;
  failures: { email: string; error: string | null }[];
};

function MarketingSendModal({ onClose }: { onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [topic, setTopic] = useState("");
  const [country, setCountry] = useState("");
  const [stateF, setStateF] = useState("");
  const [dryResult, setDryResult] = useState<{
    recipients: number;
    sample: { email: string; companyName: string | null }[];
  } | null>(null);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    if (campaignId == null) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/buyers/marketing-campaigns/${campaignId}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setCampaignStatus(json.data);
          if (json.data.status === "done" || json.data.status === "failed") {
            stopPolling();
          }
        }
      } catch {
        // keep polling
      }
    };
    poll();
    pollRef.current = setInterval(poll, 2000);
    return stopPolling;
  }, [campaignId]);

  const submit = async (dryRun: boolean) => {
    setSubmitError(null);
    if (dryRun) {
      setDryResult(null);
    } else {
      setCampaignId(null);
      setCampaignStatus(null);
      setSending(true);
    }
    try {
      const res = await fetch("/api/admin/buyers/marketing-send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          html,
          topic: topic || undefined,
          country: country || undefined,
          state: stateF || undefined,
          dryRun,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(
          typeof json?.error === "string"
            ? json.error
            : `Failed (${res.status})`,
        );
      }
      if (dryRun) {
        setDryResult(json.data);
      } else {
        setCampaignId(json.data.campaignId);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Send failed");
    } finally {
      if (!dryRun) setSending(false);
    }
  };

  const isSending = sending || (campaignStatus !== null && campaignStatus.status !== "done" && campaignStatus.status !== "failed");
  const isDone = campaignStatus?.status === "done";
  const total = campaignStatus?.totalRecipients ?? 0;
  const sent = campaignStatus?.sent ?? 0;
  const failed = campaignStatus?.failed ?? 0;
  const progressPct = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-testid="modal-marketing-send">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#111] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Marketing send</h2>
            <p className="text-xs text-white/50 mt-0.5">
              Targets buyers with marketing opt-in. Use Preview to count recipients before sending.
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="New Colombian harvest just landed"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              data-testid="input-subject"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
              HTML body
            </label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={8}
              placeholder="<p>Hello, ...</p>"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 font-mono focus:outline-none focus:border-white/30"
              data-testid="input-html"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Topic (optional)
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="coffee"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                data-testid="input-topic"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Country
              </label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="USA"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                data-testid="input-country"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                State
              </label>
              <select
                value={stateF}
                onChange={(e) => setStateF(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                data-testid="select-state-filter"
              >
                <option value="">Any</option>
                <option value="REGISTERED">REGISTERED</option>
                <option value="PROFILE_BUILDING">PROFILE_BUILDING</option>
                <option value="MATCHED">MATCHED</option>
                <option value="GAP_SCANNED">GAP_SCANNED</option>
              </select>
            </div>
          </div>

          {dryResult ? (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
              <p className="text-blue-200">
                <Filter className="inline h-3.5 w-3.5 mr-1.5" />
                Will reach <span className="font-bold">{dryResult.recipients}</span> buyer(s).
              </p>
              {dryResult.sample.length > 0 ? (
                <div className="mt-2 text-xs text-white/60 space-y-0.5">
                  {dryResult.sample.map((r) => (
                    <p key={r.email}>• {r.email}{r.companyName ? ` (${r.companyName})` : ""}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {campaignStatus ? (
            <div
              className={`rounded-lg p-3 text-sm border ${
                isDone && failed === 0
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                  : isDone && failed > 0
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                    : "bg-white/5 border-white/10 text-white/70"
              }`}
              data-testid="text-send-result"
            >
              {isDone ? (
                <p>
                  <CheckCircle2 className="inline h-3.5 w-3.5 mr-1.5" />
                  Sent <span className="font-bold">{sent}</span> of{" "}
                  <span className="font-bold">{total}</span>
                  {failed > 0 ? ` — ${failed} failed` : ""}.
                </p>
              ) : (
                <p>
                  Sending… {sent + failed} of {total > 0 ? total : "?"} processed
                </p>
              )}
              {total > 0 ? (
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isDone && failed === 0 ? "bg-emerald-500" : isDone ? "bg-amber-500" : "bg-blue-500"}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              ) : null}
              {isDone && campaignStatus.failures.length > 0 ? (
                <div className="mt-2 text-xs space-y-0.5">
                  {campaignStatus.failures.map((f) => (
                    <p key={f.email}>• {f.email}{f.error ? ` — ${f.error}` : ""}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {submitError ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1.5" />
              {submitError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/60 hover:text-white"
            >
              Close
            </button>
            <button
              onClick={() => submit(true)}
              disabled={!subject || !html || isSending}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg"
              data-testid="button-preview-send"
            >
              Preview recipients
            </button>
            <button
              onClick={() => submit(false)}
              disabled={!subject || !html || isSending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium"
              data-testid="button-confirm-send"
            >
              <Send className="h-4 w-4" />
              {isSending ? "Sending…" : "Send now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
