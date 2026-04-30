import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface MatchRow {
  id: number;
  buyerProfileId: number;
  supplierId: number;
  matchScore: string;
  disqualifiers: string[] | null;
  matchNotes: string | null;
  isCurrent: boolean;
  createdAt: string;
  buyerCompany: string | null;
  buyerCountry: string | null;
  buyerEmail: string | null;
  supplierName: string | null;
  supplierMunicipio: string | null;
  supplierStatus: string | null;
}

export default function AdminBuyerMatches() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [minScore, setMinScore] = useState("");
  const [buyerProfileId, setBuyerProfileId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [includeAll, setIncludeAll] = useState(false);
  const [suppressTarget, setSuppressTarget] = useState<MatchRow | null>(null);
  const [reason, setReason] = useState("");

  const params = new URLSearchParams({ page: String(page), limit: "30" });
  if (minScore) params.set("min_score", minScore);
  if (buyerProfileId.trim()) params.set("buyer_profile_id", buyerProfileId.trim());
  if (supplierId.trim()) params.set("supplier_id", supplierId.trim());
  if (includeAll) params.set("include", "all");

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: { rows: MatchRow[]; total: number; totalPages: number };
  }>({
    queryKey: ["admin-buyer-matches-flat", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/buyer-matches?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return res.json();
    },
  });

  const suppressMutation = useMutation({
    mutationFn: async (vars: {
      buyerProfileId: number;
      matchId: number;
      reason: string;
    }) => {
      const res = await fetch(
        `/api/admin/buyers/${vars.buyerProfileId}/suppress-match`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: vars.matchId, reason: vars.reason }),
        },
      );
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(
          typeof json?.error === "string"
            ? json.error
            : `Failed (${res.status})`,
        );
      }
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-buyer-matches-flat"] });
      qc.invalidateQueries({ queryKey: ["admin-buyer-matches"] });
      qc.invalidateQueries({ queryKey: ["admin-buyer-detail"] });
      qc.invalidateQueries({ queryKey: ["admin-buyers"] });
    },
  });

  const rows = data?.data?.rows ?? [];
  const totalPages = data?.data?.totalPages ?? 1;
  const total = data?.data?.total ?? 0;

  return (
    <div className="space-y-6" data-testid="page-admin-buyer-matches">
      <div>
        <h1 className="text-2xl font-bold text-white">Buyer Matches</h1>
        <p className="text-sm text-white/50 mt-1">
          Cross-buyer view of computed buyer ↔ supplier matches.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-[#0d1612] border border-white/10 rounded-xl p-4">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Buyer profile ID
          </label>
          <input
            type="number"
            min={1}
            value={buyerProfileId}
            onChange={(e) => {
              setBuyerProfileId(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. 12"
            className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            data-testid="input-buyer-profile-id"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Supplier ID
          </label>
          <input
            type="number"
            min={1}
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. 4"
            className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            data-testid="input-supplier-id"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Min score
          </label>
          <input
            type="number"
            step="0.05"
            min={0}
            max={1}
            value={minScore}
            onChange={(e) => {
              setMinScore(e.target.value);
              setPage(1);
            }}
            placeholder="0.50"
            className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            data-testid="input-min-score"
          />
        </div>
        {buyerProfileId.trim() || supplierId.trim() ? (
          <button
            onClick={() => {
              setBuyerProfileId("");
              setSupplierId("");
              setPage(1);
            }}
            className="px-3 py-2 text-xs text-white/60 hover:text-white border border-white/10 rounded-lg"
            data-testid="button-clear-id-filters"
          >
            Clear ID filters
          </button>
        ) : null}
        <label className="inline-flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={includeAll}
            onChange={(e) => {
              setIncludeAll(e.target.checked);
              setPage(1);
            }}
            data-testid="checkbox-include-suppressed"
          />
          Include suppressed / non-current
        </label>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">
          {(error as Error).message}
        </div>
      ) : null}

      <div className="bg-[#0d1612] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/50 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Buyer</th>
                <th className="text-left px-4 py-3">Supplier</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Notes / Disqualifiers</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Loader2 className="h-5 w-5 mx-auto animate-spin text-white/40" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                    No matches.
                  </td>
                </tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.id} data-testid={`row-match-${m.id}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">
                        {m.buyerCompany ?? "(no company)"}
                      </div>
                      <div className="text-xs text-white/40">
                        {m.buyerEmail} • {m.buyerCountry ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white">
                        {m.supplierName ?? `#${m.supplierId}`}
                      </div>
                      <div className="text-xs text-white/40">
                        {m.supplierMunicipio ?? "—"} • {m.supplierStatus ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-300 font-semibold tabular-nums">
                        {Number(m.matchScore).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.isCurrent ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-300">
                          current
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-300">
                          suppressed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/60 max-w-xs space-y-1">
                      {m.matchNotes ? (
                        <p
                          className="text-white/80"
                          data-testid={`text-match-notes-${m.id}`}
                        >
                          {m.matchNotes}
                        </p>
                      ) : null}
                      {m.disqualifiers && m.disqualifiers.length > 0 ? (
                        <div className="space-y-0.5 text-white/50">
                          {m.disqualifiers.map((d, i) => (
                            <p key={i}>• {d}</p>
                          ))}
                        </div>
                      ) : null}
                      {!m.matchNotes &&
                      (!m.disqualifiers || m.disqualifiers.length === 0) ? (
                        <span className="text-white/30">—</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.isCurrent ? (
                        <button
                          onClick={() => {
                            setSuppressTarget(m);
                            setReason("");
                          }}
                          className="text-xs text-amber-300 hover:text-amber-200"
                          data-testid={`button-suppress-${m.id}`}
                        >
                          Suppress
                        </button>
                      ) : (
                        <span className="text-xs text-white/30">—</span>
                      )}
                    </td>
                  </tr>
                ))
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

      {suppressTarget ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          data-testid="modal-suppress"
        >
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Suppress match —{" "}
              {suppressTarget.supplierName ?? `#${suppressTarget.supplierId}`}
            </h3>
            <p className="text-xs text-white/50">
              Buyer: {suppressTarget.buyerCompany ?? suppressTarget.buyerEmail}.
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
            {suppressMutation.error ? (
              <p className="text-xs text-red-400">
                {(suppressMutation.error as Error).message}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSuppressTarget(null)}
                className="px-3 py-1.5 text-sm text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={
                  suppressMutation.isPending || reason.trim().length === 0
                }
                onClick={async () => {
                  try {
                    await suppressMutation.mutateAsync({
                      buyerProfileId: suppressTarget.buyerProfileId,
                      matchId: suppressTarget.id,
                      reason: reason.trim(),
                    });
                    setSuppressTarget(null);
                  } catch {
                    /* error displayed inline */
                  }
                }}
                className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-md"
                data-testid="button-confirm-suppress"
              >
                {suppressMutation.isPending ? "Suppressing…" : "Suppress"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
