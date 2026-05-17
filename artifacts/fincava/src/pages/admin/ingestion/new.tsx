import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import {
  Sparkles,
  Save,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  ListOrdered,
  X,
  Eye,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SupplierType = "FARMER" | "COOPERATIVE" | "EXPORTER" | "PROCESSOR" | "DISTRIBUTOR" | "OTHER";

interface FormState {
  nombreCompleto: string;
  municipio: string;
  department: string;
  vereda: string;
  whatsappNumber: string;
  email: string;
  supplierType: SupplierType;
  customSupplierType: string;
  description: string;
  sourceUrl: string;
  country: string;
  categoryHint: string;
}

interface DuplicateResult {
  hasDuplicate: boolean;
  matchedSupplierId: number | null;
  matchedName: string | null;
  similarityScore: number;
  matchType: string;
}

interface EnrichedProfile {
  normalizedName: string;
  description: string;
  categoryHints: string[];
  exportReadinessNarrative: string | null;
  estimatedAnnualVolumeKg: number | null;
  likelyCertifications: string[];
  dataCompletenessScore: number | null;
}

const SUPPLIER_TYPE_OPTIONS: { value: SupplierType; label: string }[] = [
  { value: "FARMER",      label: "Farm / Farmer" },
  { value: "COOPERATIVE", label: "Cooperative" },
  { value: "EXPORTER",    label: "Exporter / Trader" },
  { value: "PROCESSOR",   label: "Processor" },
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "OTHER",       label: "Other…" },
];

const EMPTY_FORM: FormState = {
  nombreCompleto: "",
  municipio: "",
  department: "",
  vereda: "",
  whatsappNumber: "",
  email: "",
  supplierType: "FARMER",
  customSupplierType: "",
  description: "",
  sourceUrl: "",
  country: "Colombia",
  categoryHint: "",
};

const DISCOVERY_QUEUE_KEY = "fincava_discovery_queue";

export default function AdminIngestionNew() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [enriched, setEnriched] = useState<EnrichedProfile | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateResult | null>(null);
  const [overrideJustification, setOverrideJustification] = useState("");
  const [overrideDuplicateId, setOverrideDuplicateId] = useState<number | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [queueRemaining, setQueueRemaining] = useState(0);
  // Success / post-save state
  const [savedSupplier, setSavedSupplier] = useState<{ id: number; nombreCompleto: string; description: string | null } | null>(null);
  const [nextLeadParams, setNextLeadParams] = useState<URLSearchParams | null>(null);
  // Origin Stories publish (within success panel)
  const [originImageUrl, setOriginImageUrl] = useState("");
  const [originImagePreview, setOriginImagePreview] = useState<string | null>(null);
  const [originUploading, setOriginUploading] = useState(false);
  const [originUploadError, setOriginUploadError] = useState<string | null>(null);
  const [originPublishing, setOriginPublishing] = useState(false);
  const [originPublished, setOriginPublished] = useState(false);
  const [originError, setOriginError] = useState<string | null>(null);
  const originFileInputRef = useRef<HTMLInputElement>(null);
  // Track description that was auto-filled by AI so we can revert it on decline
  const aiFilledDescriptionRef = useRef<string | null>(null);
  // Origin story preview toggle (in success panel)
  const [showOriginPreview, setShowOriginPreview] = useState(false);

  // Pre-fill form from URL query params (supplied by the discovery engine handoff).
  // Always starts from EMPTY_FORM so stale data from a previous lead never carries over.
  useEffect(() => {
    if (!search) return;
    const params = new URLSearchParams(search);
    const name = params.get("nombreCompleto");
    const municipio = params.get("municipio");
    const categoryHint = params.get("categoryHint");
    const sourceUrl = params.get("sourceUrl");
    const hasParams = name || municipio || categoryHint || sourceUrl;
    if (!hasParams) return;

    // Reset form to blank slate, then apply only the discovered fields
    setForm({
      ...EMPTY_FORM,
      ...(name ? { nombreCompleto: name } : {}),
      ...(municipio ? { municipio: municipio } : {}),
      ...(categoryHint ? { categoryHint: categoryHint } : {}),
      ...(sourceUrl ? { sourceUrl: sourceUrl } : {}),
    });

    // Clear all transient state so nothing from the previous lead bleeds through
    setEnriched(null);
    setDuplicate(null);
    setOverrideJustification("");
    setOverrideDuplicateId(null);
    setEnrichError(null);
    setSaveError(null);

    // Check if there are more leads queued in sessionStorage
    try {
      const raw = sessionStorage.getItem(DISCOVERY_QUEUE_KEY);
      if (raw) {
        const queue: unknown[] = JSON.parse(raw);
        setQueueRemaining(Array.isArray(queue) ? queue.length : 0);
      } else {
        setQueueRemaining(0);
      }
    } catch {
      setQueueRemaining(0);
    }
  }, [search]);

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const checkDuplicate = useCallback(async () => {
    if (!form.nombreCompleto.trim()) return null;
    const params = new URLSearchParams({
      nombre: form.nombreCompleto,
      country: form.country || "Colombia",
    });
    const res = await fetch(`/api/admin/ingestion/duplicate-check?${params}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    return (await res.json()) as DuplicateResult;
  }, [form.nombreCompleto, form.country]);

  const handleEnrich = async () => {
    if (!form.nombreCompleto.trim() || !form.municipio.trim()) {
      setEnrichError("Name and municipality are required before enriching.");
      return;
    }
    setEnriching(true);
    setEnrichError(null);
    setEnriched(null);

    try {
      const res = await fetch("/api/admin/ingestion/enrich", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: null,
          input: buildPayload(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const fieldHint = Array.isArray(data.issues) && data.issues.length > 0
          ? ` (${data.issues[0].path.join(" › ")}: ${data.issues[0].message})`
          : "";
        throw new Error((data.error ?? "Enrichment failed — please try again.") + fieldHint);
      }
      const data: EnrichedProfile = await res.json();
      setEnriched(data);
      // Merge AI description back into form if form description is blank; track it so we can revert on decline
      if (!form.description && data.description) {
        setForm((f) => ({ ...f, description: data.description }));
        aiFilledDescriptionRef.current = data.description;
      } else {
        aiFilledDescriptionRef.current = null;
      }
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : "Enrichment failed.");
    } finally {
      setEnriching(false);
    }
  };

  const buildPayload = () => ({
    nombreCompleto: form.nombreCompleto.trim(),
    municipio: form.municipio.trim(),
    department: form.department.trim() || null,
    vereda: form.vereda.trim() || null,
    whatsappNumber: form.whatsappNumber.trim() || null,
    email: form.email.trim() || null,
    supplierType: form.supplierType,
    customSupplierType: form.supplierType === "OTHER" ? (form.customSupplierType.trim() || null) : null,
    description: form.description.trim() || null,
    sourceUrl: form.sourceUrl.trim() || null,
    country: form.country.trim() || "Colombia",
    categoryHint: form.categoryHint.trim() || null,
  });

  const handleSave = async () => {
    if (!form.nombreCompleto.trim() || !form.municipio.trim()) {
      setSaveError("Name and municipality are required.");
      return;
    }
    setSaving(true);
    setSaveError(null);

    // Run duplicate check before save
    const dupResult = await checkDuplicate();
    setDuplicate(dupResult);
    if (dupResult?.hasDuplicate && !overrideDuplicateId) {
      setSaving(false);
      return; // Show duplicate warning — user must confirm override
    }

    const payload: Record<string, unknown> = {
      ...buildPayload(),
      normalizedName: enriched?.normalizedName ?? null,
    };
    if (overrideDuplicateId) {
      payload.overrideDuplicateId = overrideDuplicateId;
      payload.overrideJustification = overrideJustification.trim() || null;
    }

    try {
      const res = await fetch("/api/admin/ingestion/suppliers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 409) {
        const data = await res.json();
        setDuplicate(data.duplicate ?? dupResult);
        setSaving(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const fieldHint = Array.isArray(data.issues) && data.issues.length > 0
          ? ` (${data.issues[0].path.join(" › ")}: ${data.issues[0].message})`
          : "";
        throw new Error((data.error ?? "Save failed — please try again.") + fieldHint);
      }
      const savedData = await res.json().catch(() => ({}));
      // Show success panel — let admin optionally publish to Origin Stories
      // before continuing. Capture next-lead params now so they're ready.
      let resolvedNextParams: URLSearchParams | null = null;
      try {
        const raw = sessionStorage.getItem(DISCOVERY_QUEUE_KEY);
        if (raw) {
          const queue: Array<{ name: string; location: string; website: string | null; categoryHint: string }> = JSON.parse(raw);
          if (Array.isArray(queue) && queue.length > 0) {
            const next = queue[0];
            if (next && typeof next.name === "string" && typeof next.location === "string") {
              const remaining = queue.slice(1);
              if (remaining.length > 0) {
                sessionStorage.setItem(DISCOVERY_QUEUE_KEY, JSON.stringify(remaining));
              } else {
                sessionStorage.removeItem(DISCOVERY_QUEUE_KEY);
              }
              resolvedNextParams = new URLSearchParams({
                nombreCompleto: next.name,
                municipio: next.location,
                categoryHint: next.categoryHint,
                ...(next.website ? { sourceUrl: next.website } : {}),
              });
            } else {
              sessionStorage.removeItem(DISCOVERY_QUEUE_KEY);
            }
          }
        }
      } catch {
        // ignore queue errors
      }
      setNextLeadParams(resolvedNextParams);
      setSavedSupplier({
        id: savedData.id,
        nombreCompleto: savedData.nombreCompleto ?? form.nombreCompleto,
        description: savedData.description ?? form.description ?? null,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleOverride = () => {
    if (!duplicate?.matchedSupplierId) return;
    setOverrideDuplicateId(duplicate.matchedSupplierId);
  };

  async function uploadOriginImage(file: File) {
    setOriginUploading(true);
    setOriginUploadError(null);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };
      const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!putRes.ok) throw new Error("Upload failed");
      const servingUrl = `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
      setOriginImageUrl(servingUrl);
      const reader = new FileReader();
      reader.onload = (e) => setOriginImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } catch (e: any) {
      setOriginUploadError(e.message || "Upload failed");
    } finally {
      setOriginUploading(false);
    }
  }

  // ── Success panel ────────────────────────────────────────────────────────
  if (savedSupplier) {
    const hasDescription = Boolean(savedSupplier.description?.trim());
    return (
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/50 hover:text-white"
            onClick={() => navigate("/admin/ingestion")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Supplier Saved</h1>
            <p className="text-white/50 text-sm">What would you like to do next?</p>
          </div>
        </div>

        {/* Confirmation card */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-1">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            <span>{savedSupplier.nombreCompleto} saved as Draft</span>
          </div>
          <p className="text-xs text-emerald-300/60">Supplier ID #{savedSupplier.id}</p>
        </div>

        {/* Origin Stories section */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Publish to Origin Stories</h2>
              <p className="text-xs text-white/50 mt-0.5">
                Feature this supplier on the public Origin Stories page. Requires a description.
              </p>
            </div>
            {hasDescription && !originPublished && (
              <button
                type="button"
                onClick={() => setShowOriginPreview((v) => !v)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/40 hover:border-emerald-400/40 hover:text-emerald-400 transition-colors"
              >
                <Eye className="h-3 w-3" />
                {showOriginPreview ? "Hide preview" : "Preview card"}
              </button>
            )}
          </div>

          {/* Public card preview */}
          {showOriginPreview && hasDescription && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
              <p className="text-[11px] text-emerald-400/70 font-medium uppercase tracking-wider">
                How it will appear on the public Origin Stories page
              </p>
              <div className="rounded-lg overflow-hidden border border-white/10 bg-[#111] max-w-xs">
                {/* Image area */}
                <div className="h-40 bg-white/5 relative overflow-hidden">
                  {(originImagePreview || originImageUrl) ? (
                    <img
                      src={originImagePreview ?? originImageUrl}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                      No image — add one below
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div className="flex items-center text-white/90 text-xs gap-1">
                      <MapPin className="w-3 h-3" />
                      {[savedSupplier.nombreCompleto ? null : null, form.municipio, form.department].filter(Boolean).join(", ") || "Colombia"}
                    </div>
                  </div>
                </div>
                {/* Card body */}
                <div className="p-4 space-y-1.5">
                  <div className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                    {form.categoryHint || "Agricultural Supplier"}
                  </div>
                  <h3 className="text-base font-serif font-bold text-white leading-snug">
                    {savedSupplier.nombreCompleto}
                  </h3>
                  <p className="text-[11px] text-white/40">
                    {[form.municipio, form.department].filter(Boolean).join(", ") || "Colombia"}
                  </p>
                  <p className="text-xs text-white/60 line-clamp-4 leading-relaxed pt-1">
                    {savedSupplier.description}
                  </p>
                  <p className="text-xs font-medium text-emerald-400 pt-1">Read full story →</p>
                </div>
              </div>
            </div>
          )}

          {!hasDescription && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2.5 text-xs text-orange-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                This profile has no description. Add one via{" "}
                <strong>Admin › Suppliers › Edit</strong> before publishing.
              </span>
            </div>
          )}

          {originPublished ? (
            <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Published to Origin Stories
            </div>
          ) : (
            <>
              {/* Image upload */}
              <div className="space-y-2">
                <label className="text-xs text-white/50">
                  Cover image <span className="text-white/30">(optional)</span>
                </label>

                {/* Preview thumbnail */}
                {(originImagePreview || originImageUrl) && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={originImagePreview ?? originImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => { setOriginImagePreview(null); setOriginImageUrl(""); }}
                      className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >✕</button>
                  </div>
                )}

                {/* Upload zone */}
                {!originImageUrl && (
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition ${hasDescription ? "border-white/20 hover:border-amber-400/60 hover:bg-amber-500/5" : "border-white/10 opacity-40 cursor-not-allowed"}`}
                    onClick={() => hasDescription && originFileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!hasDescription) return;
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith("image/")) uploadOriginImage(file);
                    }}
                  >
                    <input
                      ref={originFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadOriginImage(file);
                        e.target.value = "";
                      }}
                    />
                    {originUploading ? (
                      <p className="text-sm text-amber-400 font-medium">Uploading…</p>
                    ) : (
                      <p className="text-xs text-white/40">Click or drag to upload an image</p>
                    )}
                  </div>
                )}

                {originUploadError && (
                  <p className="text-xs text-red-400">{originUploadError}</p>
                )}

                {/* Manual URL fallback */}
                <div className="space-y-1">
                  <p className="text-[11px] text-white/30">Or paste an image URL:</p>
                  <input
                    type="url"
                    value={originImageUrl}
                    onChange={(e) => { setOriginImageUrl(e.target.value); setOriginImagePreview(null); }}
                    placeholder="https://example.com/farmer-photo.jpg"
                    disabled={!hasDescription}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-40"
                  />
                </div>
              </div>

              {originError && (
                <p className="text-xs text-red-400">{originError}</p>
              )}
              <Button
                onClick={async () => {
                  setOriginPublishing(true);
                  setOriginError(null);
                  try {
                    const r = await fetch(`/api/admin/suppliers/${savedSupplier.id}/publish-origin-story`, {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ imageUrl: originImageUrl.trim() || undefined }),
                    });
                    const j = await r.json().catch(() => ({})) as Record<string, unknown>;
                    if (!r.ok) {
                      const msg = typeof j.error === "string" ? j.error
                        : (j.error && typeof j.error === "object"
                          ? Object.values(j.error as Record<string, string[]>).flat()[0] ?? `HTTP ${r.status}`
                          : `HTTP ${r.status}`);
                      throw new Error(msg);
                    }
                    setOriginPublished(true);
                  } catch (e: any) {
                    setOriginError(e.message || "Failed to publish to Origin Stories");
                  } finally {
                    setOriginPublishing(false);
                  }
                }}
                disabled={originPublishing || originUploading || !hasDescription}
                className="gap-2 bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
              >
                {originPublishing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</>
                ) : (
                  "📖 Publish to Origin Stories"
                )}
              </Button>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {nextLeadParams ? (
            <Button
              onClick={() => navigate(`/admin/ingestion/new?${nextLeadParams.toString()}`)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Next Lead →
            </Button>
          ) : null}
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/ingestion")}
            className="text-white/50 hover:text-white"
          >
            {nextLeadParams ? "Skip & go to Ingestion" : "Go to Ingestion"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white/50 hover:text-white"
          onClick={() => navigate("/admin/ingestion")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">New Supplier Entry</h1>
          <p className="text-white/50 text-sm">
            Fill in what you know — then optionally enhance with AI.
          </p>
        </div>
      </div>

      {/* Discovery queue banner */}
      {queueRemaining > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
          <ListOrdered className="h-4 w-4 shrink-0" />
          <span>
            {queueRemaining} more lead{queueRemaining !== 1 ? "s" : ""} queued from discovery —
            they will open automatically after you save this one.
          </span>
        </div>
      )}

      {/* Form card */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-5">
        {/* Identity */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            Identity
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-white/70">
                Full Name <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.nombreCompleto}
                onChange={set("nombreCompleto")}
                placeholder="e.g. Cooperativa Cafetera La Palma"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Supplier Type</Label>
              <Select
                value={form.supplierType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, supplierType: v as SupplierType, customSupplierType: "" }))
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* "Other" free-text — only shown when Other… is selected */}
          {form.supplierType === "OTHER" && (
            <div className="space-y-1.5">
              <Label className="text-white/70">
                Describe the supplier type
                <span className="ml-2 text-white/30 font-normal text-xs">(optional — helps us add new categories)</span>
              </Label>
              <Input
                value={form.customSupplierType}
                onChange={(e) => setForm((f) => ({ ...f, customSupplierType: e.target.value }))}
                maxLength={120}
                placeholder="e.g. Agroindustrial processor, intermediary broker, artisanal collective…"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <p className="text-white/25 text-xs">{form.customSupplierType.length}/120</p>
            </div>
          )}
        </section>

        {/* Location */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            Location
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-white/70">
                Municipality <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.municipio}
                onChange={set("municipio")}
                placeholder="e.g. Salento"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Department</Label>
              <Input
                value={form.department}
                onChange={set("department")}
                placeholder="e.g. Quindío"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Vereda</Label>
              <Input
                value={form.vereda}
                onChange={set("vereda")}
                placeholder="e.g. El Roble"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            Contact
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-white/70">WhatsApp Number</Label>
              <Input
                value={form.whatsappNumber}
                onChange={set("whatsappNumber")}
                placeholder="+573001234567"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Email</Label>
              <Input
                value={form.email}
                onChange={set("email")}
                type="email"
                placeholder="contact@example.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>
        </section>

        {/* Product & Source */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            Product & Source
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-white/70">Category Hint</Label>
              <Input
                value={form.categoryHint}
                onChange={set("categoryHint")}
                placeholder="e.g. specialty coffee, cacao"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Source URL</Label>
              <Input
                value={form.sourceUrl}
                onChange={set("sourceUrl")}
                placeholder="https://..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70">Description</Label>
            <Textarea
              value={form.description}
              onChange={set("description")}
              placeholder="Any notes about this supplier…"
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-y min-h-[80px]"
            />
          </div>
        </section>
      </div>

      {/* AI Enrichment panel */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Enhance with AI</h2>
            <p className="text-white/40 text-xs mt-0.5">
              Claude will infer a description, category hints, export readiness, and a completeness score.
            </p>
          </div>
          <Button
            onClick={handleEnrich}
            disabled={enriching || !form.nombreCompleto.trim()}
            className="gap-2 bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
          >
            {enriching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enhancing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Enhance with AI
              </>
            )}
          </Button>
        </div>

        {enrichError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {enrichError}
          </div>
        )}

        {enriched && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Enrichment complete — review and save
              </div>
              <button
                type="button"
                onClick={() => {
                  // Revert description only if it was auto-filled by AI and hasn't been manually edited
                  if (
                    aiFilledDescriptionRef.current !== null &&
                    form.description === aiFilledDescriptionRef.current
                  ) {
                    setForm((f) => ({ ...f, description: "" }));
                  }
                  aiFilledDescriptionRef.current = null;
                  setEnriched(null);
                  setEnrichError(null);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/40 hover:border-red-400/40 hover:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
                Decline enrichment
              </button>
            </div>
            <div className="grid gap-3 text-sm">
              <Row label="Normalized name" value={enriched.normalizedName} />
              <Row label="Description" value={enriched.description} />
              <Row
                label="Category hints"
                value={enriched.categoryHints.length ? enriched.categoryHints.join(", ") : "—"}
              />
              <Row
                label="Export readiness"
                value={enriched.exportReadinessNarrative ?? "—"}
              />
              {enriched.estimatedAnnualVolumeKg != null && (
                <Row
                  label="Est. annual volume"
                  value={`${enriched.estimatedAnnualVolumeKg.toLocaleString()} kg`}
                />
              )}
              {(enriched.likelyCertifications?.length ?? 0) > 0 && (
                <Row label="Likely Certifications (AI-inferred)" value={enriched.likelyCertifications?.join(", ") ?? "—"} />
              )}
              {enriched.dataCompletenessScore != null && (
                <Row
                  label="Data completeness"
                  value={`${enriched.dataCompletenessScore}/100`}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Duplicate warning */}
      {duplicate?.hasDuplicate && !overrideDuplicateId && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-orange-300">Possible duplicate detected</p>
              <p className="text-xs text-orange-200/70">
                Match type: <span className="font-mono">{duplicate.matchType}</span> ·
                Similarity: {Math.round(duplicate.similarityScore * 100)}%
                {duplicate.matchedName && (
                  <> · Existing: <strong>{duplicate.matchedName}</strong> (ID #{duplicate.matchedSupplierId})</>
                )}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-orange-200/70 text-xs">
              Justification for overriding (required)
            </Label>
            <Textarea
              value={overrideJustification}
              onChange={(e) => setOverrideJustification(e.target.value)}
              placeholder="Explain why this is not a duplicate…"
              rows={2}
              className="bg-white/5 border-orange-500/20 text-white placeholder:text-white/30 resize-none text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!overrideJustification.trim()}
              onClick={handleOverride}
              className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10"
            >
              Confirm override and save
            </Button>
          </div>
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {saveError}
        </div>
      )}

      {/* Action bar */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || !form.nombreCompleto.trim() || !form.municipio.trim()}
          className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save as Draft
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/ingestion")}
          className="text-white/50 hover:text-white"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2">
      <span className="text-white/40">{label}</span>
      <span className="text-white/80">{value}</span>
    </div>
  );
}
