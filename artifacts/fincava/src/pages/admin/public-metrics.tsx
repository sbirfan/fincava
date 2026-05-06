import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Eye, EyeOff, CheckCircle2, Clock, Database, FlaskConical, Sprout, AlertCircle } from "lucide-react";

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

// ── Predefined structure ──────────────────────────────────────────────────────
// This drives the always-visible panel skeleton regardless of DB state.
// Panels render even when empty; the seed button populates the DB rows.
const PREDEFINED_STRUCTURE: {
  page: string;
  pageLabel: string;
  sections: { key: string; label: string; description: string }[];
}[] = [
  {
    page: "home",
    pageLabel: "Home",
    sections: [
      { key: "hero_stats",  label: "Hero Stats",    description: "The 2–4 numbers shown in the hero tile strip (verified suppliers, export products, etc.)" },
      { key: "traction",    label: "Traction",       description: "Stat cards in the Traction section (target markets, farming families, premiums)." },
    ],
  },
  {
    page: "impact",
    pageLabel: "Impact",
    sections: [
      { key: "numbers",     label: "Impact Numbers", description: "The impact stat grid at the top of the Impact page." },
    ],
  },
  {
    page: "markets",
    pageLabel: "Markets",
    sections: [
      { key: "overview",    label: "Overview",       description: "Market overview numbers shown on the Markets page." },
    ],
  },
];

const SOURCE_LABELS: Record<PublicMetric["sourceType"], { label: string; icon: typeof CheckCircle2; color: string }> = {
  manual_verified:   { label: "Manually Verified", icon: CheckCircle2, color: "text-emerald-400" },
  live_db:           { label: "Live DB",            icon: Database,     color: "text-blue-400"    },
  external_research: { label: "Research",           icon: FlaskConical, color: "text-amber-400"   },
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
  const [draft, setDraft] = useState({
    value: metric.value,
    sourceType: metric.sourceType,
    sourceNote: metric.sourceNote ?? "",
  });

  const handleSave = () => {
    setIsSaving(true);
    setSaveError(null);
    onPatch(
      metric.id,
      {
        value: draft.value,
        sourceType: draft.sourceType,
        sourceNote: draft.sourceNote || null,
      },
      {
        onSuccess: () => {
          setIsSaving(false);
          setEditing(false);
        },
        onError: () => {
          setIsSaving(false);
          setSaveError("Save failed — try again");
        },
      }
    );
  };

  return (
    <tr className="border-b border-white/5 hover:bg-white/3 transition-colors group">
      <td className="px-4 py-3 text-xs text-white/40 font-mono">{metric.metricKey}</td>
      <td className="px-4 py-3 text-sm text-white">{metric.label}</td>

      <td className="px-4 py-3">
        {editing ? (
          <input
            className="w-28 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500/60"
            value={draft.value}
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

      <td className="px-4 py-3 text-xs text-white/40">
        {metric.lastVerifiedAt ? (
          new Date(metric.lastVerifiedAt).toLocaleDateString()
        ) : (
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Never</span>
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
                onClick={() => {
                  setEditing(false);
                  setSaveError(null);
                  setDraft({ value: metric.value, sourceType: metric.sourceType, sourceNote: metric.sourceNote ?? "" });
                }}
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

// Empty placeholder row shown when a predefined section exists but no DB rows exist yet
function EmptySectionPlaceholder({ onSeed }: { onSeed: () => void }) {
  return (
    <tr>
      <td colSpan={8} className="px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-white/40">
            <AlertCircle className="h-4 w-4 text-white/20 shrink-0" />
            <div>
              <p className="text-sm">No metrics seeded for this section yet.</p>
              <p className="text-xs text-white/30 mt-0.5">
                Values, source, and visibility can be configured after seeding.
              </p>
            </div>
          </div>
          <button
            onClick={onSeed}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors shrink-0"
          >
            Seed defaults
          </button>
        </div>
      </td>
    </tr>
  );
}

// Panel for a single page → section combination, always rendered
function SectionPanel({
  pageKey,
  section,
  rows,
  onPatch,
  onSeed,
}: {
  pageKey: string;
  section: { key: string; label: string; description: string };
  rows: PublicMetric[];
  onPatch: (id: number, patch: Partial<PublicMetric>, callbacks?: PatchCallbacks) => void;
  onSeed: () => void;
}) {
  const visibleInSection = rows.filter((r) => r.isVisible).length;

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-3 bg-white/3 border-b border-white/10 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white/80">{section.label}</span>
            <span className="text-white/20 text-xs">·</span>
            <span className="font-mono text-[10px] text-white/30">{pageKey}/{section.key}</span>
          </div>
          <p className="text-xs text-white/40 mt-0.5">{section.description}</p>
        </div>
        {rows.length > 0 && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
            visibleInSection > 0
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
              : "bg-white/5 text-white/30 border-white/10"
          }`}>
            {visibleInSection}/{rows.length} visible
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          {rows.length > 0 && (
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
          )}
          <tbody>
            {rows.length > 0 ? (
              rows.map((m) => <MetricRow key={m.id} metric={m} onPatch={onPatch} />)
            ) : (
              <EmptySectionPlaceholder onSeed={onSeed} />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPublicMetrics() {
  const qc = useQueryClient();
  const [filterPage, setFilterPage] = useState<string>("");
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
  const handleSeed = () => seedMutation.mutate();

  // Build lookup: metricKey → metric row
  const byKey = new Map(metrics.map((m) => [m.metricKey, m]));
  // Also collect any custom rows not in the predefined structure
  const predefinedKeys = new Set(
    PREDEFINED_STRUCTURE.flatMap((p) =>
      p.sections.map((s) => metrics.filter((m) => m.page === p.page && m.section === s.key).map((m) => m.metricKey))
    ).flat()
  );
  const customRows = metrics.filter((m) => !predefinedKeys.has(m.metricKey));

  // Visible pages for the filter dropdown
  const allPages = PREDEFINED_STRUCTURE.map((p) => p.page);
  const customPages = [...new Set(customRows.map((m) => m.page))].filter((p) => !allPages.includes(p));
  const allPageOptions = [...allPages, ...customPages];

  const visibleCount = metrics.filter((m) => m.isVisible).length;

  // Filter predefined structure by page
  const filteredStructure = PREDEFINED_STRUCTURE.filter(
    (p) => !filterPage || p.page === filterPage
  );

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

        <div className="flex items-center gap-2 flex-wrap">
          {allPageOptions.length > 1 && (
            <select
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              value={filterPage}
              onChange={(e) => setFilterPage(e.target.value)}
            >
              <option value="">All pages</option>
              {allPageOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleSeed}
            disabled={seedMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Sprout className="h-4 w-4" />
            {seedMutation.isPending ? "Seeding…" : "Seed defaults"}
          </button>
        </div>
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
          Each panel below maps to a specific section on the public site. Click <strong>Seed defaults</strong> to create the standard metric rows, then set a value and toggle <strong>Visible</strong> to publish. Hidden rows are never served to visitors.
        </p>
      </div>

      {isLoading && <p className="text-white/50 text-sm">Loading metrics…</p>}
      {error && <p className="text-red-400 text-sm">Failed to load metrics.</p>}

      {/* Predefined structure — panels always render */}
      {!isLoading && filteredStructure.map((pageDef) => (
        <div key={pageDef.page} className="space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
            <span>Page: {pageDef.pageLabel}</span>
            <span className="normal-case font-mono font-normal text-white/20">/{pageDef.page}</span>
          </h2>
          {pageDef.sections.map((section) => {
            const sectionRows = metrics.filter(
              (m) => m.page === pageDef.page && m.section === section.key
            );
            return (
              <SectionPanel
                key={`${pageDef.page}/${section.key}`}
                pageKey={pageDef.page}
                section={section}
                rows={sectionRows}
                onPatch={handlePatch}
                onSeed={handleSeed}
              />
            );
          })}
        </div>
      ))}

      {/* Custom rows — any page/section not in predefined structure */}
      {!isLoading && customRows.length > 0 && (!filterPage || customRows.some((r) => r.page === filterPage)) && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Custom Metrics</h2>
          {[...new Set(customRows.map((r) => `${r.page}/${r.section}`))].map((pageSection) => {
            const [pg, sec] = pageSection.split("/");
            const rows = customRows.filter((r) => r.page === pg && r.section === sec && (!filterPage || r.page === filterPage));
            if (!rows.length) return null;
            return (
              <SectionPanel
                key={pageSection}
                pageKey={pg}
                section={{ key: sec, label: sec, description: "Custom metric section." }}
                rows={rows}
                onPatch={handlePatch}
                onSeed={handleSeed}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
