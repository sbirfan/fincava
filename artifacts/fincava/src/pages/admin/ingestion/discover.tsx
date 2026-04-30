import { useState } from "react";
import { useLocation } from "wouter";
import { Search, DatabaseZap, Globe, MapPin, Leaf, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CandidateLead {
  name: string;
  location: string;
  website: string | null;
  categoryHint: string;
}

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<CandidateLead[]>([]);
  const [discovered, setDiscovered] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const canDiscover = category.trim().length > 0 && region.trim().length > 0 && !loading;

  async function handleDiscover() {
    setLoading(true);
    setError(null);
    setLeads([]);
    setSelected(new Set());
    setDiscovered(false);

    try {
      const res = await fetch("/api/admin/ingestion/discover", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, region, maxResults }),
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
        if (next.size >= 5) return prev;
        next.add(idx);
      }
      return next;
    });
  }

  function handleConfirm() {
    const selectedLeads = Array.from(selected).map((i) => leads[i]);
    if (selectedLeads.length === 0) return;
    const first = selectedLeads[0];
    const params = new URLSearchParams({
      nombreCompleto: first.name,
      municipio: first.location,
      categoryHint: first.categoryHint,
      ...(first.website ? { sourceUrl: first.website } : {}),
    });
    setLocation(`/admin/ingestion/new?${params.toString()}`);
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
              const isDisabled = !isSelected && selected.size >= 5;
              return (
                <div
                  key={idx}
                  onClick={() => !isDisabled && toggleSelect(idx)}
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selected.size > 0 && (
            <div className="flex justify-end">
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={handleConfirm}
              >
                Confirm Selected ({selected.size})
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
