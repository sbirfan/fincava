import { useState } from "react";
import { useLocation } from "wouter";
import { ClipboardCheck, ChevronRight, CheckCircle2, AlertTriangle, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QueueItem {
  supplierId: number;
  nombreCompleto: string;
  municipio: string;
  department: string | null;
  sellableStatus: string | null;
  supplierType: string;
  totalRequirements: number;
  pendingCount: number;
  verifiedCount: number;
}

interface Requirement {
  id: number;
  requirementCode: string;
  agency: string;
  state: string;
  selectedMode: string | null;
  adminRequired: boolean;
  visibleNote: string | null;
  internalNote: string | null;
  updatedAt: string;
}

interface Document {
  id: number;
  requirementCode: string;
  documentType: string;
  fileUrl: string;
  reviewStatus: string;
  createdAt: string;
}

interface Review {
  id: number;
  requirementCode: string;
  decision: string;
  visibleNote: string | null;
  reviewedAt: string;
}

interface SupplierDetail {
  supplier: Record<string, unknown>;
  requirements: Requirement[];
  documents: Document[];
  reviews: Review[];
}

const STATE_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  not_started: { label: "Not Started", color: "text-white/40", icon: Clock },
  not_sure: { label: "Not Sure", color: "text-amber-400", icon: AlertTriangle },
  self_serve_in_progress: { label: "Self-Serve", color: "text-blue-400", icon: Clock },
  assisted_in_progress: { label: "Assisted", color: "text-blue-400", icon: Clock },
  managed_service_candidate: { label: "Managed", color: "text-purple-400", icon: Clock },
  submitted: { label: "Submitted", color: "text-amber-400", icon: Clock },
  needs_fix: { label: "Needs Fix", color: "text-red-400", icon: XCircle },
  conditionally_approved: { label: "Conditional", color: "text-amber-400", icon: CheckCircle2 },
  verified: { label: "Verified", color: "text-emerald-400", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-500", icon: XCircle },
};

const VALID_DECISIONS = [
  { value: "verified", label: "Verified" },
  { value: "needs_fix", label: "Needs Fix" },
  { value: "conditionally_approved", label: "Conditionally Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "escalated", label: "Escalate to Assisted" },
] as const;

function StatePill({ state }: { state: string }) {
  const cfg = STATE_CONFIG[state] ?? { label: state, color: "text-white/40", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function SellableBadge({ status }: { status: string | null }) {
  const colors: Record<string, string> = {
    NOT_READY: "bg-white/10 text-white/40",
    ELIGIBLE: "bg-blue-500/20 text-blue-300",
    SELLABLE: "bg-amber-500/20 text-amber-300",
    PUBLISHED: "bg-emerald-500/20 text-emerald-300",
  };
  const s = status ?? "NOT_READY";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[s] ?? "bg-white/10 text-white/40"}`}>
      {s.replace("_", " ")}
    </span>
  );
}

export default function AdminComplianceQueue() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewState, setReviewState] = useState<{
    requirementId: number;
    decision: string;
    visibleNote: string;
    internalNote: string;
    submitting: boolean;
  } | null>(null);

  // Fetch queue on mount and page change
  useState(() => {
    setLoading(true);
    fetch(`/api/admin/compliance-queue?page=${page}&pageSize=30`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load queue");
        return r.json();
      })
      .then((data) => setItems(data.items ?? []))
      .catch(() => toast({ title: "Error", description: "Could not load compliance queue", variant: "destructive" }))
      .finally(() => setLoading(false));
  });

  const loadDetail = (supplierId: number) => {
    setDetailLoading(true);
    fetch(`/api/admin/compliance-queue/${supplierId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load supplier detail");
        return r.json();
      })
      .then((data) => setSelectedSupplier(data))
      .catch(() => toast({ title: "Error", description: "Could not load supplier detail", variant: "destructive" }))
      .finally(() => setDetailLoading(false));
  };

  const submitReview = async () => {
    if (!reviewState) return;
    const { requirementId, decision, visibleNote, internalNote } = reviewState;
    setReviewState((s) => s && { ...s, submitting: true });

    const res = await fetch(`/api/admin/compliance/review/${requirementId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, visibleNote: visibleNote || undefined, internalNote: internalNote || undefined }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({ title: "Review failed", description: (err as any).error ?? "Unknown error", variant: "destructive" });
      setReviewState((s) => s && { ...s, submitting: false });
      return;
    }

    const data = await res.json();
    toast({ title: "Review submitted", description: `Requirement moved to: ${data.newState}` });
    setReviewState(null);
    // Refresh detail
    if (selectedSupplier) {
      const s = selectedSupplier.supplier as any;
      loadDetail(s.id);
    }
  };

  // Detail panel
  if (selectedSupplier) {
    const s = selectedSupplier.supplier as any;
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSelectedSupplier(null)}
            className="text-white/40 hover:text-white text-sm transition-colors"
          >
            ← Back to queue
          </button>
          <ChevronRight className="h-4 w-4 text-white/20" />
          <h1 className="text-xl font-bold text-white">{s.nombreCompleto}</h1>
          <SellableBadge status={s.sellableStatus} />
        </div>

        <div className="space-y-4">
          {detailLoading && <p className="text-white/40 text-sm">Loading…</p>}

          {selectedSupplier.requirements.map((req) => (
            <div key={req.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-white/60">
                      {req.requirementCode}
                    </span>
                    <span className="text-xs text-white/30">{req.agency}</span>
                    {req.adminRequired && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Admin Required</span>
                    )}
                  </div>
                  <StatePill state={req.state} />
                  {req.visibleNote && (
                    <p className="text-sm text-white/50 mt-2">{req.visibleNote}</p>
                  )}
                </div>
                <button
                  onClick={() =>
                    setReviewState({
                      requirementId: req.id,
                      decision: "verified",
                      visibleNote: "",
                      internalNote: "",
                      submitting: false,
                    })
                  }
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                >
                  Review
                </button>
              </div>

              {/* Documents for this requirement */}
              {selectedSupplier.documents.filter((d) => d.requirementCode === req.requirementCode).map((doc) => (
                <div key={doc.id} className="mt-3 flex items-center gap-3 text-xs text-white/50 border-t border-white/10 pt-3">
                  <span className="font-medium text-white/70">{doc.documentType}</span>
                  <span className={`px-2 py-0.5 rounded-full ${doc.reviewStatus === "accepted" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {doc.reviewStatus}
                  </span>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline ml-auto">
                    View file
                  </a>
                </div>
              ))}
            </div>
          ))}

          {selectedSupplier.requirements.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/40">
              No compliance requirements on record for this supplier.
            </div>
          )}

          {/* Review history */}
          {selectedSupplier.reviews.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Review History</h3>
              <div className="space-y-2">
                {selectedSupplier.reviews.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 text-sm text-white/50 rounded-lg border border-white/5 bg-white/5 px-4 py-2.5">
                    <span className="font-mono text-xs text-white/30">{r.requirementCode}</span>
                    <StatePill state={r.decision} />
                    {r.visibleNote && <span className="text-white/40">{r.visibleNote}</span>}
                    <span className="ml-auto text-xs text-white/30">
                      {new Date(r.reviewedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Review modal */}
        {reviewState && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a140e] border border-white/20 rounded-2xl p-6 w-full max-w-md space-y-4">
              <h3 className="text-lg font-bold text-white">Submit Review</h3>

              <div>
                <label className="text-xs text-white/50 mb-1 block">Decision</label>
                <select
                  value={reviewState.decision}
                  onChange={(e) => setReviewState((s) => s && { ...s, decision: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                >
                  {VALID_DECISIONS.map((d) => (
                    <option key={d.value} value={d.value} className="bg-[#0a140e]">
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1 block">Visible note (shown to officer)</label>
                <textarea
                  rows={2}
                  value={reviewState.visibleNote}
                  onChange={(e) => setReviewState((s) => s && { ...s, visibleNote: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
                  placeholder="Optional — shown to field officer"
                />
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1 block">Internal note (admin only)</label>
                <textarea
                  rows={2}
                  value={reviewState.internalNote}
                  onChange={(e) => setReviewState((s) => s && { ...s, internalNote: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
                  placeholder="Optional — internal only"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setReviewState(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-white/60 hover:text-white hover:bg-white/5 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  disabled={reviewState.submitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {reviewState.submitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Queue list
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/15 border border-emerald-500/20">
          <ClipboardCheck className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Queue</h1>
          <p className="text-sm text-white/40">Suppliers ranked by pending compliance requirements</p>
        </div>
      </div>

      {loading ? (
        <div className="text-white/40 text-sm py-12 text-center">Loading queue…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <ClipboardCheck className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No suppliers in the compliance queue yet.</p>
          <p className="text-white/30 text-sm mt-1">Suppliers appear here after their AI scoring run identifies compliance gaps.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider px-5 py-3">Supplier</th>
                <th className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-center text-xs font-semibold text-white/40 uppercase tracking-wider px-5 py-3">Pending</th>
                <th className="text-center text-xs font-semibold text-white/40 uppercase tracking-wider px-5 py-3">Verified</th>
                <th className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider px-5 py-3">Location</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => (
                <tr
                  key={item.supplierId}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => loadDetail(item.supplierId)}
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{item.nombreCompleto}</p>
                    <p className="text-xs text-white/40 capitalize">{item.supplierType.toLowerCase()}</p>
                  </td>
                  <td className="px-5 py-4">
                    <SellableBadge status={item.sellableStatus} />
                  </td>
                  <td className="px-5 py-4 text-center">
                    {item.pendingCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {item.pendingCount}
                      </span>
                    ) : (
                      <span className="text-white/30">0</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {item.verifiedCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {item.verifiedCount}
                      </span>
                    ) : (
                      <span className="text-white/30">0</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-white/50">
                    {item.municipio}{item.department ? `, ${item.department}` : ""}
                  </td>
                  <td className="px-5 py-4">
                    <ChevronRight className="h-4 w-4 text-white/30" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-white/5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs text-white/40 hover:text-white disabled:opacity-30 transition-colors"
            >
              ← Previous
            </button>
            <span className="text-xs text-white/40">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={items.length < 30}
              className="text-xs text-white/40 hover:text-white disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
