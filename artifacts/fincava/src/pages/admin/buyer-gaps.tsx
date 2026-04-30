import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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
  buyerCompany: string | null;
  buyerCountry: string | null;
  buyerEmail: string | null;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === "HIGH"
      ? "bg-red-500/15 text-red-300 border-red-500/30"
      : priority === "MEDIUM"
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
        : "bg-white/10 text-white/50 border-white/10";
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border ${cls}`} data-testid={`badge-priority-${priority}`}>
      {priority}
    </span>
  );
}

export default function AdminBuyerGaps() {
  const [page, setPage] = useState(1);
  const [priority, setPriority] = useState("");
  const [pipelineAction, setPipelineAction] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [escalateId, setEscalateId] = useState<number | null>(null);
  const qc = useQueryClient();

  const params = new URLSearchParams({ page: String(page), limit: "30" });
  if (priority) params.set("priority", priority);
  if (pipelineAction) params.set("pipeline_action", pipelineAction);
  if (showResolved) params.set("only_unresolved", "false");

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: { rows: GapRow[]; total: number; totalPages: number };
  }>({
    queryKey: ["admin-buyer-gaps-flat", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/buyer-gaps?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return res.json();
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
      qc.invalidateQueries({ queryKey: ["admin-buyer-gaps-flat"] });
    },
  });

  const rows = data?.data?.rows ?? [];
  const totalPages = data?.data?.totalPages ?? 1;
  const total = data?.data?.total ?? 0;

  return (
    <div className="space-y-6" data-testid="page-admin-buyer-gaps">
      <div>
        <h1 className="text-2xl font-bold text-white">Buyer Gaps</h1>
        <p className="text-sm text-white/50 mt-1">
          Cross-buyer view of supplier gap briefs. Escalate MEDIUM gaps to spin
          up an immediate discovery batch.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-[#0d1612] border border-white/10 rounded-xl p-4">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            data-testid="select-priority"
          >
            <option value="">All</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Pipeline action
          </label>
          <select
            value={pipelineAction}
            onChange={(e) => {
              setPipelineAction(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            data-testid="select-pipeline-action"
          >
            <option value="">All</option>
            <option value="IMMEDIATE_DISCOVERY">IMMEDIATE_DISCOVERY</option>
            <option value="ADMIN_REVIEW">ADMIN_REVIEW</option>
            <option value="NEXT_BATCH">NEXT_BATCH</option>
            <option value="NONE">NONE</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => {
              setShowResolved(e.target.checked);
              setPage(1);
            }}
            data-testid="checkbox-show-resolved"
          />
          Include resolved
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
                <th className="text-left px-4 py-3">Gap</th>
                <th className="text-left px-4 py-3">Priority</th>
                <th className="text-left px-4 py-3">Pipeline action</th>
                <th className="text-left px-4 py-3">Region / Category</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <Loader2 className="h-5 w-5 mx-auto animate-spin text-white/40" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                    No gaps.
                  </td>
                </tr>
              ) : (
                rows.map((g) => {
                  const escalated = g.ingestionBatchId != null;
                  const canEscalate = g.priority === "MEDIUM" && g.isRealGap && !escalated && !g.resolvedAt;
                  return (
                    <tr
                      key={g.id}
                      data-testid={`row-gap-${g.id}`}
                      className="align-top"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {g.buyerCompany ?? "(no company)"}
                        </div>
                        <div className="text-xs text-white/40">{g.buyerEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-white/80">
                        <div className="font-medium">{g.gapType}</div>
                        {g.buyerUrgencyNote ? (
                          <p
                            className="text-xs text-white/60 mt-1 max-w-xs whitespace-pre-wrap"
                            data-testid={`text-urgency-note-${g.id}`}
                          >
                            {g.buyerUrgencyNote}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={g.priority} />
                      </td>
                      <td className="px-4 py-3 text-xs text-white/60">
                        {g.pipelineAction}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/60">
                        {g.searchCategory ?? "—"} / {g.searchRegion ?? "—"}
                        {g.volumeTargetMt ? (
                          <div className="text-white/40 mt-0.5">
                            {g.volumeTargetMt} MT target
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {escalated ? (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-300"
                            data-testid={`badge-escalated-${g.id}`}
                          >
                            escalated → batch #{g.ingestionBatchId}
                          </span>
                        ) : g.resolvedAt ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/60">
                            resolved
                          </span>
                        ) : !g.isRealGap ? (
                          <span className="text-[10px] text-white/40">not real gap</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-300">
                            open
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/40">
                        {new Date(g.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEscalate ? (
                          <button
                            onClick={() => setEscalateId(g.id)}
                            className="text-xs px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded"
                            data-testid={`button-escalate-${g.id}`}
                          >
                            Escalate
                          </button>
                        ) : null}
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

      {escalateId != null ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" data-testid="modal-escalate-flat">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Escalate gap #{escalateId}?
            </h3>
            <p className="text-xs text-white/60">
              A new ingestion batch will be created and discovery will run.
            </p>
            {escalateMutation.error ? (
              <p className="text-xs text-red-400">
                {(escalateMutation.error as Error).message}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEscalateId(null)}
                className="px-3 py-1.5 text-sm text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={escalateMutation.isPending}
                onClick={async () => {
                  try {
                    await escalateMutation.mutateAsync(escalateId);
                    setEscalateId(null);
                  } catch {
                    /* shown inline */
                  }
                }}
                className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md"
                data-testid="button-confirm-escalate-flat"
              >
                {escalateMutation.isPending ? "Escalating…" : "Confirm escalation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
