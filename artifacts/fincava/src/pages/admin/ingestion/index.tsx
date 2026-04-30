import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Plus, DatabaseZap, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Batch {
  id: number;
  batchUuid: string;
  status: "DRAFT" | "SUBMITTED" | "ROLLED_BACK";
  batchSize: number | null;
  notes: string | null;
  createdAt: string;
  submittedAt: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  DRAFT: {
    label: "Draft",
    icon: <Clock className="h-3 w-3" />,
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  },
  SUBMITTED: {
    label: "Submitted",
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  ROLLED_BACK: {
    label: "Rolled back",
    icon: <XCircle className="h-3 w-3" />,
    color: "bg-red-500/20 text-red-300 border-red-500/30",
  },
};

export default function AdminIngestion() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/ingestion/batches", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setBatches(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load batches.");
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DatabaseZap className="h-6 w-6 text-emerald-400" />
            Supplier Ingestion
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Manually seed and AI-enrich supplier profiles before they go live.
          </p>
        </div>
        <Link href="/admin/ingestion/new">
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white">
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="text-white/40 text-sm py-8 text-center">Loading batches…</div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && batches.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-8 py-16 text-center">
          <DatabaseZap className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm">No ingestion batches yet.</p>
          <p className="text-white/30 text-xs mt-1">
            Click "New Entry" to add your first supplier manually.
          </p>
        </div>
      )}

      {!loading && batches.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-white/40 font-medium">Batch</th>
                <th className="px-4 py-3 text-left text-white/40 font-medium">Status</th>
                <th className="px-4 py-3 text-left text-white/40 font-medium">Size</th>
                <th className="px-4 py-3 text-left text-white/40 font-medium">Notes</th>
                <th className="px-4 py-3 text-left text-white/40 font-medium">Created</th>
                <th className="px-4 py-3 text-left text-white/40 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => {
                const cfg = STATUS_CONFIG[batch.status] ?? STATUS_CONFIG.DRAFT;
                return (
                  <tr
                    key={batch.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-white/70 text-xs">
                        #{batch.id} · {batch.batchUuid.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60">{batch.batchSize ?? "—"}</td>
                    <td className="px-4 py-3 text-white/60 max-w-xs truncate">
                      {batch.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs">
                      {batch.submittedAt
                        ? new Date(batch.submittedAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
