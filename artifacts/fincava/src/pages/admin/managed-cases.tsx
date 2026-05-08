// CC-5: Admin Managed Service Cases
// Table of open/closed managed service cases with filters, notes, staff assignment.

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Briefcase, ChevronRight, Clock, CheckCircle2, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CaseItem {
  id: number;
  supplierId: number;
  supplierName: string;
  municipio: string;
  requirementCode: string;
  packageType: string;
  feeStatus: string;
  assignedStaffId: number | null;
  consentAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CaseDetail extends CaseItem {
  department: string | null;
  consentRecord: string | null;
  assignedStaffName: string | null;
}

const FEE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  none: { label: "No fee", color: "text-white/40" },
  quoted: { label: "Quoted", color: "text-blue-400" },
  invoiced: { label: "Invoiced", color: "text-amber-400" },
  paid: { label: "Paid", color: "text-emerald-400" },
};

const REQUIREMENT_CODES = ["DIAN_RUT", "ICA_CONTEXT", "FNC_COFFEE"];
const FEE_STATUSES = ["none", "quoted", "invoiced", "paid"];

function FeePill({ status }: { status: string }) {
  const cfg = FEE_STATUS_CONFIG[status] ?? { label: status, color: "text-white/40" };
  return <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

interface EditState {
  caseId: number;
  detail: CaseDetail | null;
  loading: boolean;
  feeStatus: string;
  appendNote: string;
  submitting: boolean;
}

export default function AdminManagedCases() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [items, setItems] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [filterReqCode, setFilterReqCode] = useState<string>("");
  const [filterFeeStatus, setFilterFeeStatus] = useState<string>("");

  const [editState, setEditState] = useState<EditState | null>(null);

  const loadCases = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (filterStatus) params.set("status", filterStatus);
    if (filterReqCode) params.set("requirementCode", filterReqCode);
    if (filterFeeStatus) params.set("feeStatus", filterFeeStatus);

    fetch(`/api/admin/managed-cases?${params}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load cases");
        return r.json();
      })
      .then((data) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => toast({ title: "Error", description: "Could not load managed cases", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [page, filterStatus, filterReqCode, filterFeeStatus, toast]);

  useEffect(() => { loadCases(); }, [loadCases]);

  const openDetail = async (caseId: number, item: CaseItem) => {
    setEditState({
      caseId,
      detail: null,
      loading: true,
      feeStatus: item.feeStatus,
      appendNote: "",
      submitting: false,
    });
    try {
      const r = await fetch(`/api/admin/managed-cases/${caseId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      const detail: CaseDetail = await r.json();
      setEditState((s) => s ? { ...s, detail, loading: false, feeStatus: detail.feeStatus } : null);
    } catch {
      toast({ title: "Error", description: "Could not load case detail", variant: "destructive" });
      setEditState(null);
    }
  };

  const submitUpdate = async () => {
    if (!editState) return;
    setEditState((s) => s ? { ...s, submitting: true } : null);

    const body: Record<string, unknown> = { feeStatus: editState.feeStatus };
    if (editState.appendNote.trim()) body.appendNote = editState.appendNote.trim();

    const r = await fetch(`/api/admin/managed-cases/${editState.caseId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      toast({ title: "Update failed", description: (err as any).error ?? "Unknown error", variant: "destructive" });
      setEditState((s) => s ? { ...s, submitting: false } : null);
      return;
    }

    toast({ title: "Case updated" });
    setEditState(null);
    loadCases();
  };

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/15 border border-purple-500/20">
          <Briefcase className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Managed Service Cases</h1>
          <p className="text-sm text-white/40">Officer-managed compliance cases — track progress and fee status</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
        >
          <option value="" className="bg-[#0a140e]">All statuses</option>
          <option value="open" className="bg-[#0a140e]">Open</option>
          <option value="closed" className="bg-[#0a140e]">Closed</option>
        </select>

        <select
          value={filterReqCode}
          onChange={(e) => { setFilterReqCode(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
        >
          <option value="" className="bg-[#0a140e]">All requirements</option>
          {REQUIREMENT_CODES.map((c) => (
            <option key={c} value={c} className="bg-[#0a140e]">{c}</option>
          ))}
        </select>

        <select
          value={filterFeeStatus}
          onChange={(e) => { setFilterFeeStatus(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
        >
          <option value="" className="bg-[#0a140e]">All fee statuses</option>
          {FEE_STATUSES.map((f) => (
            <option key={f} value={f} className="bg-[#0a140e]">{FEE_STATUS_CONFIG[f]?.label ?? f}</option>
          ))}
        </select>

        <div className="ml-auto text-xs text-white/30 self-center">
          {total} case{total !== 1 ? "s" : ""}
        </div>
      </div>

      {loading ? (
        <div className="text-white/40 text-sm py-12 text-center flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading cases…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Briefcase className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No managed service cases match these filters.</p>
          <p className="text-white/30 text-sm mt-1">Cases are created when a field officer enrolls a supplier into managed service mode.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider px-5 py-3">Supplier</th>
                <th className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider px-5 py-3">Requirement</th>
                <th className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider px-5 py-3">Package</th>
                <th className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider px-5 py-3">Fee Status</th>
                <th className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider px-5 py-3">Consent</th>
                <th className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider px-5 py-3">Opened</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => openDetail(item.id, item)}
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{item.supplierName}</p>
                    <p className="text-xs text-white/40">{item.municipio}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded text-white/70">
                      {item.requirementCode}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white/50 text-xs">{item.packageType.replace(/_/g, " ")}</td>
                  <td className="px-5 py-4">
                    <FeePill status={item.feeStatus} />
                  </td>
                  <td className="px-5 py-4">
                    {item.consentAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> {new Date(item.consentAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-white/30">Pending</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-white/40">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <ChevronRight className="h-4 w-4 text-white/30" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-white/5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs text-white/40 hover:text-white disabled:opacity-30 transition-colors"
            >
              ← Previous
            </button>
            <span className="text-xs text-white/40">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="text-xs text-white/40 hover:text-white disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Detail / edit drawer */}
      {editState && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#0a140e] border border-white/20 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Case Detail</h3>
              <button
                onClick={() => setEditState(null)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {editState.loading ? (
                <div className="flex items-center justify-center py-8 text-white/40">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
                </div>
              ) : editState.detail ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-white/40 mb-1">Supplier</p>
                      <p className="text-white font-medium">{editState.detail.supplierName}</p>
                      <p className="text-white/50 text-xs">{editState.detail.municipio}{editState.detail.department ? `, ${editState.detail.department}` : ""}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Requirement</p>
                      <span className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded text-white/70">
                        {editState.detail.requirementCode}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Package</p>
                      <p className="text-white/70">{editState.detail.packageType.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Assigned Staff</p>
                      <p className="text-white/70">{editState.detail.assignedStaffName ?? "Unassigned"}</p>
                    </div>
                    {editState.detail.consentRecord && (
                      <div className="col-span-2">
                        <p className="text-xs text-white/40 mb-1">Consent Record</p>
                        <p className="text-white/60 text-xs">{editState.detail.consentRecord}</p>
                      </div>
                    )}
                  </div>

                  {editState.detail.notes && (
                    <div>
                      <p className="text-xs text-white/40 mb-1">Notes</p>
                      <div className="bg-white/5 rounded-lg p-3 text-xs text-white/60 whitespace-pre-wrap font-mono">
                        {editState.detail.notes}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Fee Status</label>
                    <select
                      value={editState.feeStatus}
                      onChange={(e) => setEditState((s) => s ? { ...s, feeStatus: e.target.value } : null)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                    >
                      {FEE_STATUSES.map((f) => (
                        <option key={f} value={f} className="bg-[#0a140e]">
                          {FEE_STATUS_CONFIG[f]?.label ?? f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Append note</label>
                    <textarea
                      rows={3}
                      value={editState.appendNote}
                      onChange={(e) => setEditState((s) => s ? { ...s, appendNote: e.target.value } : null)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50 resize-none"
                      placeholder="Note will be appended with timestamp…"
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setEditState(null)}
                      className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-white/60 hover:text-white hover:bg-white/5 text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitUpdate}
                      disabled={editState.submitting}
                      className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {editState.submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {editState.submitting ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
