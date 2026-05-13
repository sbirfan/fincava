import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Eye, EyeOff, AlertCircle, CheckCircle2, Sprout } from "lucide-react";

interface PublicMetric {
  id: number;
  metricKey: string;
  label: string;
  value: string;
  isVisible: boolean;
  updatedAt: string;
}

type PatchCallbacks = { onSuccess?: () => void; onError?: (err: Error) => void };

function MetricRow({
  metric,
  onPatch,
}: {
  metric: PublicMetric;
  onPatch: (id: number, patch: Partial<PublicMetric>, callbacks?: PatchCallbacks) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ label: metric.label, value: metric.value });

  useEffect(() => {
    if (!editing) setDraft({ label: metric.label, value: metric.value });
  }, [metric.label, metric.value, editing]);

  const handleSave = () => {
    setIsSaving(true);
    setSaveError(null);
    onPatch(
      metric.id,
      { label: draft.label, value: draft.value },
      {
        onSuccess: () => { setIsSaving(false); setEditing(false); },
        onError: () => { setIsSaving(false); setSaveError("Save failed — try again"); },
      },
    );
  };

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
      <td className="px-4 py-3 text-xs text-white/40 font-mono">{metric.metricKey}</td>

      <td className="px-4 py-3">
        {editing ? (
          <input
            className="w-48 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500/60"
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          />
        ) : (
          <span className="text-sm text-white">{metric.label}</span>
        )}
      </td>

      <td className="px-4 py-3">
        {editing ? (
          <input
            className="w-28 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500/60"
            value={draft.value}
            placeholder="Value…"
            onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
            autoFocus
          />
        ) : (
          <span className="text-sm font-semibold text-white">
            {metric.value || <span className="text-white/30 italic">empty</span>}
          </span>
        )}
      </td>

      <td className="px-4 py-3">
        <button
          onClick={() => onPatch(metric.id, { isVisible: !metric.isVisible })}
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${
            metric.isVisible
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
              : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
          }`}
        >
          {metric.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          {metric.isVisible ? "Visible" : "Hidden"}
        </button>
      </td>

      <td className="px-4 py-3">
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => { setEditing(false); setSaveError(null); }}
                className="text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
              >
                Cancel
              </button>
            </div>
            {saveError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {saveError}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => { setEditing(true); setSaveError(null); }}
            className="text-xs px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          >
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}

export default function AdminPublicMetrics() {
  const qc = useQueryClient();
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const { data: metrics = [], isLoading, error } = useQuery<PublicMetric[]>({
    queryKey: ["admin", "public-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/public-metrics", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/public-metrics/seed", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ seeded: number; total: number; message: string }>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin", "public-metrics"] });
      setSeedResult(data.message);
      setTimeout(() => setSeedResult(null), 6000);
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<PublicMetric> }) => {
      const res = await fetch(`/api/admin/public-metrics/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "public-metrics"] }),
  });

  const handlePatch = (id: number, patch: Partial<PublicMetric>, callbacks?: PatchCallbacks) =>
    patchMutation.mutate({ id, patch }, callbacks);

  const visibleCount = metrics.filter((m) => m.isVisible).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/15 border border-blue-500/20">
            <BarChart3 className="h-5 w-5 text-blue-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Public Metrics</h1>
            <p className="text-sm text-white/40 mt-0.5">
              Control every number shown on public-facing pages.{" "}
              {metrics.length > 0 && (
                <span className={visibleCount > 0 ? "text-emerald-400" : "text-white/40"}>
                  {visibleCount} of {metrics.length} visible.
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Sprout className="h-4 w-4" />
          {seedMutation.isPending ? "Seeding…" : "Seed defaults"}
        </button>
      </div>

      {/* Seed result toast */}
      {seedResult && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {seedResult}
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-300 space-y-1">
        <p className="font-semibold">How this works</p>
        <p className="text-blue-300/70">
          Click <strong>Seed defaults</strong> to create the standard metric rows. Set a value and toggle <strong>Visible</strong> to publish it on the public site. Hidden rows are never served to visitors.
        </p>
      </div>

      {isLoading && <p className="text-white/50 text-sm">Loading metrics…</p>}
      {error && <p className="text-red-400 text-sm">Failed to load metrics.</p>}

      {!isLoading && metrics.length === 0 && (
        <div className="rounded-xl border border-white/10 px-6 py-12 text-center">
          <p className="text-sm text-white/40 mb-4">No metrics yet. Seed the defaults to get started.</p>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="text-xs px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            Seed defaults
          </button>
        </div>
      )}

      {!isLoading && metrics.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/40">
                  <th className="px-4 py-2.5 font-medium">Key</th>
                  <th className="px-4 py-2.5 font-medium">Label</th>
                  <th className="px-4 py-2.5 font-medium">Value</th>
                  <th className="px-4 py-2.5 font-medium">Visibility</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <MetricRow key={m.id} metric={m} onPatch={handlePatch} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
