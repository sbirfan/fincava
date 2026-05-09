import { useState } from "react";
import { useLocation } from "wouter";
import { Search, DatabaseZap, Globe, MapPin, Leaf, ArrowRight, Loader2, AlertCircle, CheckCircle2, XCircle, Zap, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DISCOVERY_QUEUE_KEY = "fincava_discovery_queue";

interface CandidateLead {
  name: string;
  location: string;
  website: string | null;
  categoryHint: string;
  existingStatus?: "new" | "in_evaluation" | "already_onboarded" | "rejected";
}

const EXISTING_STATUS_CONFIG = {
  new:               null,
  in_evaluation:     { label: "In Evaluation",     bg: "bg-amber-500/20",   text: "text-amber-400"   },
  already_onboarded: { label: "Already Onboarded", bg: "bg-emerald-500/20", text: "text-emerald-400" },
  rejected:          { label: "Rejected",           bg: "bg-red-500/20",     text: "text-red-400"     },
} as const;

// Entity types the admin can hard-exclude from AI discovery results.
// Cooperatives and exporters are checked by default — Fincava sources
// only from direct farms, not intermediaries.
const EXCLUDE_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "cooperative", label: "Cooperatives", description: "Cooperativas, asociaciones de productores" },
  { value: "exporter",    label: "Exporters / Traders", description: "Exportadoras, comercializadoras, brokers" },
  { value: "processor",   label: "Processors", description: "Procesadoras, beneficiaderos, transformadoras" },
  { value: "distributor", label: "Distributors", description: "Distribuidoras, mayoristas" },
];
const DEFAULT_EXCLUDED = new Set(["cooperative", "exporter"]);

const CATEGORY_OPTIONS = [
  "Coffee",
  "Cacao",
  "Bananas / Plantains",
  "Avocado",
  "Panela / Sugarcane",
  "Fruits & Berries",
  "Vegetables",
  "Flowers",
  "Palm Oil",
  "Other",
];

const REGION_OPTIONS = [
  "Antioquia",
  "Huila",
  "Nariño",
  "Cauca",
  "Cundinamarca",
  "Tolima",
  "Valle del Cauca",
  "Boyacá",
  "Santander",
  "Caldas",
  "Risaralda",
  "Quindío",
  "Meta",
  "Córdoba",
];

export default function AdminIngestionDiscover() {
  const [, setLocation] = useLocation();

  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [excludeTypes, setExcludeTypes] = useState<Set<string>>(new Set(DEFAULT_EXCLUDED));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<CandidateLead[]>([]);
  const [discovered, setDiscovered] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    success: number[];
    failed: { leadId: number; name: string; error: string }[];
  } | null>(null);

  const canDiscover = category.trim().length > 0 && region.trim().length > 0 && !loading;

  async function handleDiscover() {
    setLoading(true);
    setError(null);
    setLeads([]);
    setSelected(new Set());
    setDiscovered(false);
    setBatchResult(null);

    try {
      const res = await fetch("/api/admin/ingestion/discover", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, region, maxResults, excludeTypes: Array.from(excludeTypes) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Discovery failed — please try again.");
        return;
      }
      setLeads(Array.isArray(data.leads) ? data.leads : []);
      setDiscovered(true);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        const lead = leads[idx];
        if (
          lead?.existingStatus === "already_onboarded" ||
          lead?.existingStatus === "rejected"
        ) {
          return prev; // cannot select — already in system
        }
        if (next.size >= 5) return prev;
        next.add(idx);
      }
      return next;
    });
  }

  function handleConfirm() {
    const selectedLeads = Array.from(selected).sort((a, b) => a - b).map((i) => leads[i]);
    if (selectedLeads.length === 0) return;
    const [first, ...rest] = selectedLeads;
    // Store remaining leads in sessionStorage queue for sequential processing
    if (rest.length > 0) {
      try {
        sessionStorage.setItem(DISCOVERY_QUEUE_KEY, JSON.stringify(rest));
      } catch {
        // ignore storage errors
      }
    } else {
      try {
        sessionStorage.removeItem(DISCOVERY_QUEUE_KEY);
      } catch {
        // ignore
      }
    }
    const params = new URLSearchParams({
      nombreCompleto: first.name,
      municipio: first.location,
      categoryHint: first.categoryHint,
      ...(first.website ? { sourceUrl: first.website } : {}),
    });
    setLocation(`/admin/ingestion/new?${params.toString()}`);
  }

  async function handleBatchConfirm() {
    const selectedLeads = Array.from(selected).sort((a, b) => a - b).map((i) => leads[i]);
    if (selectedLeads.length === 0) return;
    setBatchLoading(true);
    setBatchResult(null);
    try {
      // Step 1: Quick-create each selected lead as a DRAFT supplier
      const createdIds: number[] = [];
      const createFailed: { name: string; error: string }[] = [];

      for (const lead of selectedLeads) {
        try {
          const res = await fetch("/api/admin/ingestion/suppliers", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nombreCompleto: lead.name,
              municipio: lead.location,
              sourceUrl: lead.website ?? null,
              categoryHint: lead.categoryHint,
              country: "Colombia",
            }),
          });
          if (res.status === 409) {
            // Duplicate — fetch the existing supplier ID if available
            const dup = await res.json();
            if (dup.duplicate?.matchedSupplierId) {
              createdIds.push(dup.duplicate.matchedSupplierId);
            } else {
              createFailed.push({ name: lead.name, error: "Duplicate — already exists" });
            }
          } else if (!res.ok) {
            const data = await res.json();
            createFailed.push({ name: lead.name, error: data.error ?? "Create failed" });
          } else {
            const data = await res.json();
            if (data.id) createdIds.push(data.id);
          }
        } catch {
          createFailed.push({ name: lead.name, error: "Network error" });
        }
      }

      if (createdIds.length === 0) {
        setBatchResult({ success: [], failed: createFailed.map((f) => ({ leadId: -1, name: f.name, error: f.error })) });
        return;
      }

      // Step 2: Batch-confirm the created supplier IDs (DRAFT → READY)
      const batchRes = await fetch("/api/admin/ingestion/batch-confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: createdIds }),
      });

      // Guard: treat non-OK responses (e.g. 422 invalid body, 500 server error)
      // as a request-level failure before attempting to consume the payload.
      if (!batchRes.ok) {
        const errData = await batchRes.json().catch(() => ({}));
        const message = errData.error ?? `Batch confirm failed (HTTP ${batchRes.status})`;
        setBatchResult({
          success: [],
          failed: [
            ...createdIds.map((id) => ({ leadId: id, name: `Supplier #${id}`, error: message })),
            ...createFailed.map((f) => ({ leadId: -1, name: f.name, error: f.error })),
          ],
        });
        return;
      }

      const batchData = await batchRes.json();

      setBatchResult({
        success: batchData.success ?? [],
        failed: [
          ...(batchData.failed ?? []).map((f: { leadId: number; error: string }) => ({
            leadId: f.leadId,
            name: `Supplier #${f.leadId}`,
            error: f.error,
          })),
          ...createFailed.map((f) => ({ leadId: -1, name: f.name, error: f.error })),
        ],
      });
      setSelected(new Set());
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setBatchLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Search className="h-6 w-6 text-emerald-400" />
            Discover Leads
          </h1>
          <p className="text-white/50 text-sm mt-1">
            AI-powered lead discovery — results are ephemeral and never stored.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-white/10 text-white/60 hover:text-white hover:bg-white/5 bg-transparent"
          onClick={() => setLocation("/admin/ingestion")}
        >
          <DatabaseZap className="h-4 w-4" />
          Back to Ingestion
        </Button>
      </div>

      {/* Search form */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">Product Category *</Label>
            <Input
              list="category-options"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Coffee"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-emerald-500"
            />
            <datalist id="category-options">
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">Region / Department *</Label>
            <Input
              list="region-options"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Huila"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-emerald-500"
            />
            <datalist id="region-options">
              {REGION_OPTIONS.map((r) => <option key={r} value={r} />)}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">Max Results (1–20)</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={maxResults}
              onChange={(e) => setMaxResults(Math.min(20, Math.max(1, parseInt(e.target.value) || 10)))}
              className="bg-white/5 border-white/10 text-white focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Exclude filters */}
        <div className="border-t border-white/10 pt-4">
          <p className="flex items-center gap-1.5 text-white/50 text-xs font-medium mb-3">
            <Filter className="h-3.5 w-3.5" />
            Exclude entity types — checked types are hard-excluded from AI results
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {EXCLUDE_OPTIONS.map((opt) => {
              const checked = excludeTypes.has(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-start gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setExcludeTypes((prev) => {
                        const next = new Set(prev);
                        if (next.has(opt.value)) next.delete(opt.value);
                        else next.add(opt.value);
                        return next;
                      });
                    }}
                    className="mt-0.5 h-4 w-4 accent-emerald-500 shrink-0"
                  />
                  <span>
                    <span className="text-white/80 text-sm group-hover:text-white transition-colors">{opt.label}</span>
                    <span className="block text-white/30 text-xs">{opt.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <Button
          className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto"
          onClick={handleDiscover}
          disabled={!canDiscover}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Discovering…</>
          ) : (
            <><Search className="h-4 w-4" /> Discover</>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {discovered && leads.length === 0 && !error && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-8 py-12 text-center">
          <Search className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm">No leads found for this combination.</p>
          <p className="text-white/30 text-xs mt-1">Try a broader category or different region.</p>
        </div>
      )}

      {leads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-sm">
              {leads.length} lead{leads.length !== 1 ? "s" : ""} found
              {selected.size > 0 && (
                <span className="ml-2 text-emerald-400 font-semibold">
                  · {selected.size} selected
                </span>
              )}
            </p>
            <p className="text-white/30 text-xs">Select up to 5 to route into the entry form</p>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            {leads.map((lead, idx) => {
              const isSelected = selected.has(idx);
              const isBlocked =
                lead.existingStatus === "already_onboarded" ||
                lead.existingStatus === "rejected";
              const isDisabled = isBlocked || (!isSelected && selected.size >= 5);
              return (
                <div
                  key={idx}
                  onClick={() => !isDisabled && toggleSelect(idx)}
                  title={isBlocked ? `${lead.existingStatus === "already_onboarded" ? "Already onboarded" : "Previously rejected"} — cannot select` : undefined}
                  className={`flex items-start gap-4 px-5 py-4 border-b border-white/5 last:border-0 transition-colors cursor-pointer
                    ${isSelected ? "bg-emerald-500/10 border-l-2 border-l-emerald-500" : "hover:bg-white/5"}
                    ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => !isDisabled && toggleSelect(idx)}
                    disabled={isDisabled}
                    className="mt-1 h-4 w-4 accent-emerald-500 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{lead.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1 text-white/50 text-xs">
                        <MapPin className="h-3 w-3" />
                        {lead.location}
                      </span>
                      <span className="flex items-center gap-1 text-white/50 text-xs">
                        <Leaf className="h-3 w-3" />
                        {lead.categoryHint}
                      </span>
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-emerald-400/70 hover:text-emerald-300 text-xs transition-colors"
                        >
                          <Globe className="h-3 w-3" />
                          {new URL(lead.website).hostname}
                        </a>
                      )}
                      {lead.existingStatus && lead.existingStatus !== "new" && (() => {
                        const cfg = EXISTING_STATUS_CONFIG[lead.existingStatus as "in_evaluation" | "already_onboarded" | "rejected"];
                        if (!cfg) return null;
                        return (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                variant="outline"
                className="gap-2 border-white/10 text-white/70 hover:text-white hover:bg-white/5 bg-transparent"
                onClick={handleConfirm}
              >
                Confirm via Form ({selected.size})
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={handleBatchConfirm}
                disabled={batchLoading}
              >
                {batchLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</>
                ) : (
                  <><Zap className="h-4 w-4" /> Quick Confirm ({selected.size})</>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {batchResult && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
          <p className="text-white/70 text-sm font-medium">Batch Confirm Result</p>
          {batchResult.success.length > 0 && (
            <div className="flex items-start gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {batchResult.success.length} supplier{batchResult.success.length !== 1 ? "s" : ""} created
                {" "}(IDs: {batchResult.success.join(", ")})
              </span>
            </div>
          )}
          {batchResult.failed.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{batchResult.failed.length} lead{batchResult.failed.length !== 1 ? "s" : ""} failed:</span>
              </div>
              <ul className="ml-6 space-y-0.5">
                {batchResult.failed.map((f, i) => (
                  <li key={i} className="text-xs text-red-300/80">
                    <span className="font-medium">{f.name}</span>
                    {f.leadId > 0 && <span className="text-white/30"> (#{f.leadId})</span>}
                    {" — "}{f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {batchResult.success.length > 0 && batchResult.failed.length === 0 && (
            <p className="text-xs text-white/30">All leads confirmed successfully.</p>
          )}
        </div>
      )}
    </div>
  );
}
