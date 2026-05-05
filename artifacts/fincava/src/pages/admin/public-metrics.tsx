import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Eye, EyeOff, CheckCircle2, Clock, Database, FlaskConical } from "lucide-react";

interface PublicMetric {
  id: number;
  metricKey: string;
  page: string;
  section: string;
  label: string;
  value: string;
  sourceType: "manual_verified" | "live_db" | "external_research";
  sourceNote: string | null;
  lastVerifiedAt: string | null;
  sortOrder: number;
  isVisible: boolean;
  updatedAt: string;
}

const SOURCE_LABELS: Record<PublicMetric["sourceType"], { label: string; icon: typeof CheckCircle2; color: string }> = {
  manual_verified:    { label: "Manually Verified", icon: CheckCircle2, color: "text-emerald-400" },
  live_db:            { label: "Live DB",           icon: Database,      color: "text-blue-400"    },
  external_research:  { label: "Research",          icon: FlaskConical,  color: "text-amber-400"   },
};

function SourceBadge({ type }: { type: PublicMetric["sourceType"] }) {
  const { label, icon: Icon, color } = SOURCE_LABELS[type];
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function MetricRow({
  metric,
  onPatch,
}: {
  metric: PublicMetric;
  onPatch: (id: number, patch: Partial<PublicMetric>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ value: metric.value, sourceType: metric.sourceType, sourceNote: metric.sourceNote ?? "" });

  const handleSave = () => {
    onPatch(metric.id, { value: draft.value, sourceType: draft.sourceType, sourceNote: draft.sourceNote || null });
    setEditing(false);
  };

  return (
    <tr className="border-b border-white/5 hover:bg-white/3 transition-colors group">
      <td className="px-4 py-3 text-xs text-white/40 font-mono">{metric.metricKey}</td>
      <td className="px-4 py-3 text-sm text-white">{metric.label}</td>

      {/* Value */}
      <td className="px-4 py-3">
        {editing ? (
          <input
            className="w-28 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500/60"
            value={draft.value}
            onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
            autoFocus
          />
        ) : (
          <span className="text-sm font-semibold text-white">{metric.value || <span className="text-white/30 italic">empty</span>}</span>
        )}
      </td>

      {/* Source type */}
      <td className="px-4 py-3">
        {editing ? (
          <select
            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none"
            value={draft.sourceType}
            onChange={(e) => setDraft((d) => ({ ...d, sourceType: e.target.value as PublicMetric["sourceType"] }))}
          >
            <option value="manual_verified">Manually Verified</option>
            <option value="live_db">Live DB</option>
            <option value="external_research">Research</option>
          </select>
        ) : (
          <SourceBadge type={metric.sourceType} />
        )}
      </td>

      {/* Source note */}
      <td className="px-4 py-3 max-w-[200px]">
        {editing ? (
          <input
            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none"
            value={draft.sourceNote}
            placeholder="Source note…"
            onChange={(e) => setDraft((d) => ({ ...d, sourceNote: e.target.value }))}
          />
        ) : (
          <span className="text-xs text-white/40 truncate block">{metric.sourceNote ?? "—"}</span>
        )}
      </td>

      {/* Last verified */}
      <td className="px-4 py-3 text-xs text-white/40">
        {metric.lastVerifiedAt
          ? new Date(metric.lastVerifiedAt).toLocaleDateString()
          : <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Never</span>}
      </td>

      {/* Visible toggle */}
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

      {/* Actions */}
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => { setEditing(false); setDraft({ value: metric.value, sourceType: metric.sourceType, sourceNote: metric.sourceNote ?? "" }); }}
              className="text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
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
  const [filterPage, setFilterPage] = useState<string>("");

  const { data: metrics = [], isLoading, error } = useQuery<PublicMetric[]>({
    queryKey: ["admin", "public-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/public-metrics", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
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

  const handlePatch = (id: number, patch: Partial<PublicMetric>) => {
    patchMutation.mutate({ id, patch });
  };

  // Group by page → section
  const pages = [...new Set(metrics.map((m) => m.page))].sort();
  const filtered = filterPage ? metrics.filter((m) => m.page === filterPage) : metrics;
  const grouped = filtered.reduce<Record<string, Record<string, PublicMetric[]>>>((acc, m) => {
    if (!acc[m.page]) acc[m.page] = {};
    if (!acc[m.page][m.section]) acc[m.page][m.section] = [];
    acc[m.page][m.section].push(m);
    return acc;
  }, {});

  const visibleCount = metrics.filter((m) => m.isVisible).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/15 border border-blue-500/20">
              <BarChart3 className="h-5 w-5 text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Public Metrics</h1>
              <p className="text-sm text-white/40 mt-0.5">Control every number shown on public-facing pages.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-white/40">
            <div>{visibleCount} of {metrics.length} visible</div>
            <div className="text-white/20">{metrics.length === 0 ? "No metrics — add rows via the API seed endpoint" : ""}</div>
          </div>
          {pages.length > 1 && (
            <select
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              value={filterPage}
              onChange={(e) => setFilterPage(e.target.value)}
            >
              <option value="">All pages</option>
              {pages.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-300 space-y-1">
        <p className="font-semibold">How this works</p>
        <p className="text-blue-300/70">
          Toggle <strong>Visible</strong> to publish a metric to the public site. Hidden rows are never served to visitors.
          Edit the <strong>Value</strong> field to change what appears on-site. Set <strong>Source Type</strong> to document how the number was obtained.
        </p>
      </div>

      {/* Loading / Error */}
      {isLoading && <p className="text-white/50 text-sm">Loading metrics…</p>}
      {error && <p className="text-red-400 text-sm">Failed to load metrics.</p>}

      {/* Empty state */}
      {!isLoading && metrics.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 py-16 flex flex-col items-center gap-3 text-center">
          <BarChart3 className="h-10 w-10 text-white/20" />
          <p className="text-white/50 text-sm">No metrics configured yet.</p>
          <p className="text-white/30 text-xs max-w-sm">
            Seed initial rows by calling <code className="bg-white/10 px-1 rounded">POST /api/admin/public-metrics/seed</code> or insert rows directly via the database.
          </p>
        </div>
      )}

      {/* Grouped table */}
      {Object.entries(grouped).map(([page, sections]) => (
        <div key={page} className="space-y-4">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Page: {page}</h2>
          {Object.entries(sections).map(([section, rows]) => (
            <div key={section} className="rounded-xl border border-white/10 overflow-hidden">
              <div className="px-4 py-2.5 bg-white/3 border-b border-white/10">
                <span className="text-xs font-medium text-white/60">Section: <span className="text-white/80">{section}</span></span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-white/40">
                      <th className="px-4 py-2.5 font-medium">Key</th>
                      <th className="px-4 py-2.5 font-medium">Label</th>
                      <th className="px-4 py-2.5 font-medium">Value</th>
                      <th className="px-4 py-2.5 font-medium">Source</th>
                      <th className="px-4 py-2.5 font-medium">Note</th>
                      <th className="px-4 py-2.5 font-medium">Verified</th>
                      <th className="px-4 py-2.5 font-medium">Visibility</th>
                      <th className="px-4 py-2.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <MetricRow key={m.id} metric={m} onPatch={handlePatch} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
