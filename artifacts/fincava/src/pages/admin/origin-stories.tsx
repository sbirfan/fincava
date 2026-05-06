import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Leaf, Plus, Eye, EyeOff, Trash2, X, User, Pencil, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminOriginStory {
  id: number;
  productId: number;
  farmerName: string;
  farmerPhoto: string | null;
  farmName: string;
  region: string;
  elevation: string | null;
  farmSizeHa: number | null;
  yearsFarming: number | null;
  story: string;
  challenges: string;
  impact: string;
  images: string[];
  videoUrl: string | null;
  published: boolean;
  createdAt: string;
  productName: string;
  supplierId: number | null;
  supplierName: string | null;
}

interface SimpleProduct {
  id: number;
  name: string;
  supplierId: number | null;
  supplierName: string | null;
}

type StoryDraft = {
  productId: number | "";
  farmerName: string;
  farmerPhoto: string;
  farmName: string;
  region: string;
  elevation: string;
  farmSizeHa: string;
  yearsFarming: string;
  story: string;
  challenges: string;
  impact: string;
  images: string;
  videoUrl: string;
  published: boolean;
};

const EMPTY_DRAFT: StoryDraft = {
  productId: "",
  farmerName: "",
  farmerPhoto: "",
  farmName: "",
  region: "",
  elevation: "",
  farmSizeHa: "",
  yearsFarming: "",
  story: "",
  challenges: "",
  impact: "",
  images: "",
  videoUrl: "",
  published: false,
};

function draftFromStory(s: AdminOriginStory): StoryDraft {
  return {
    productId:    s.productId,
    farmerName:   s.farmerName,
    farmerPhoto:  s.farmerPhoto ?? "",
    farmName:     s.farmName,
    region:       s.region,
    elevation:    s.elevation ?? "",
    farmSizeHa:   s.farmSizeHa != null ? String(s.farmSizeHa) : "",
    yearsFarming: s.yearsFarming != null ? String(s.yearsFarming) : "",
    story:        s.story,
    challenges:   s.challenges,
    impact:       s.impact,
    images:       s.images.join(", "),
    videoUrl:     s.videoUrl ?? "",
    published:    s.published,
  };
}

function draftToPayload(d: StoryDraft, isCreate: boolean) {
  const base = {
    farmerName:   d.farmerName.trim(),
    farmerPhoto:  d.farmerPhoto.trim() || undefined,
    farmName:     d.farmName.trim(),
    region:       d.region.trim(),
    elevation:    d.elevation.trim() || undefined,
    farmSizeHa:   d.farmSizeHa ? parseFloat(d.farmSizeHa) : undefined,
    yearsFarming: d.yearsFarming ? parseInt(d.yearsFarming, 10) : undefined,
    story:        d.story.trim(),
    challenges:   d.challenges.trim(),
    impact:       d.impact.trim(),
    images:       d.images ? d.images.split(",").map((u) => u.trim()).filter(Boolean) : [],
    videoUrl:     d.videoUrl.trim() || undefined,
    published:    d.published,
  };
  if (isCreate) return { ...base, productId: d.productId as number };
  return base;
}

// ── Expandable story text ─────────────────────────────────────────────────────

function ExpandableText({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  const preview = text.length > 100 ? text.slice(0, 100) + "…" : text;
  return (
    <div>
      <span className="text-xs font-medium text-white/40 uppercase tracking-wide">{label}</span>
      <p className="text-sm text-white/70 mt-0.5">{open ? text : preview}</p>
      {text.length > 100 && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 mt-1 text-xs text-emerald-400 hover:text-emerald-300"
        >
          {open ? <><ChevronUp className="h-3 w-3" /> Less</> : <><ChevronDown className="h-3 w-3" /> More</>}
        </button>
      )}
    </div>
  );
}

// ── Story Row Card ────────────────────────────────────────────────────────────

function StoryCard({
  story,
  onEdit,
  onTogglePublished,
  onDelete,
}: {
  story: AdminOriginStory;
  onEdit: (s: AdminOriginStory) => void;
  onTogglePublished: (id: number, published: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border transition-colors ${story.published ? "border-emerald-500/25 bg-emerald-500/3" : "border-white/10 bg-white/3"}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="shrink-0">
            {story.farmerPhoto ? (
              <img
                src={story.farmerPhoto}
                alt={story.farmerName}
                className="h-12 w-12 rounded-full object-cover border border-white/10"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                <User className="h-5 w-5 text-white/30" />
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">{story.farmerName}</p>
            <p className="text-sm text-white/50">{story.farmName} · {story.region}</p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
                {story.productName}
              </span>
              {story.supplierName && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
                  {story.supplierName}
                </span>
              )}
              {story.elevation && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
                  {story.elevation}
                </span>
              )}
              {story.yearsFarming && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
                  {story.yearsFarming} yrs farming
                </span>
              )}
              {story.farmSizeHa && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
                  {story.farmSizeHa} ha
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onTogglePublished(story.id, !story.published)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                story.published
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                  : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
              }`}
            >
              {story.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {story.published ? "Published" : "Hidden"}
            </button>
            <button
              onClick={() => onEdit(story)}
              className="p-1.5 rounded border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDelete(story.id)}
                  className="text-xs px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs p-1 text-white/40 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded text-white/30 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Expandable detail */}
        <div className="mt-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide details" : "Show story details"}
          </button>
          {expanded && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/8">
              <ExpandableText text={story.story} label="Story" />
              <ExpandableText text={story.challenges} label="Challenges" />
              <ExpandableText text={story.impact} label="Impact" />
              {story.images.length > 0 && (
                <div className="md:col-span-3">
                  <span className="text-xs font-medium text-white/40 uppercase tracking-wide">Gallery images</span>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {story.images.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:underline truncate max-w-[200px]">
                        Image {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {story.videoUrl && (
                <div>
                  <span className="text-xs font-medium text-white/40 uppercase tracking-wide">Video</span>
                  <a href={story.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="block text-xs text-emerald-400 hover:underline truncate mt-0.5">
                    {story.videoUrl}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-3 text-xs text-white/20">
          Product ID {story.productId} · Created {new Date(story.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30";
const textareaCls = `${inputCls} resize-none`;

// ── Modal ─────────────────────────────────────────────────────────────────────

function StoryModal({
  initial,
  isEditing,
  products,
  onClose,
  onSave,
  isSaving,
  saveError,
}: {
  initial: StoryDraft;
  isEditing: boolean;
  products: SimpleProduct[];
  onClose: () => void;
  onSave: (d: StoryDraft) => void;
  isSaving: boolean;
  saveError: string;
}) {
  const [form, setForm] = useState<StoryDraft>(initial);
  const set = <K extends keyof StoryDraft>(k: K) =>
    (v: StoryDraft[K]) => setForm((f) => ({ ...f, [k]: v }));

  const canSave =
    form.productId !== "" &&
    form.farmerName.trim() &&
    form.farmName.trim() &&
    form.region.trim() &&
    form.story.trim() &&
    form.challenges.trim() &&
    form.impact.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1a12] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[#0d1a12] z-10">
          <h2 className="text-base font-semibold text-white">
            {isEditing ? "Edit Origin Story" : "Add Origin Story"}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Product */}
          <Field label="Linked Product" required>
            <select
              className={inputCls}
              value={form.productId}
              onChange={(e) => set("productId")(e.target.value === "" ? "" : parseInt(e.target.value, 10) as number | "")}
              disabled={isEditing}
            >
              <option value="">— select a product —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.supplierName ? ` (${p.supplierName})` : ""}
                </option>
              ))}
            </select>
            {isEditing && (
              <p className="text-xs text-white/30 mt-1">Product cannot be changed after creation.</p>
            )}
          </Field>

          {/* Farmer identity */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Farmer Name" required>
              <input className={inputCls} value={form.farmerName}
                onChange={(e) => set("farmerName")(e.target.value)} placeholder="e.g. Carlos Hernández" />
            </Field>
            <Field label="Farm Name" required>
              <input className={inputCls} value={form.farmName}
                onChange={(e) => set("farmName")(e.target.value)} placeholder="e.g. Finca El Roble" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Region" required>
              <input className={inputCls} value={form.region}
                onChange={(e) => set("region")(e.target.value)} placeholder="e.g. Huila, Colombia" />
            </Field>
            <Field label="Elevation">
              <input className={inputCls} value={form.elevation}
                onChange={(e) => set("elevation")(e.target.value)} placeholder="e.g. 1,800 m" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Farm Size (ha)">
              <input type="number" min="0" step="0.1" className={inputCls} value={form.farmSizeHa}
                onChange={(e) => set("farmSizeHa")(e.target.value)} placeholder="e.g. 4.5" />
            </Field>
            <Field label="Years Farming">
              <input type="number" min="0" step="1" className={inputCls} value={form.yearsFarming}
                onChange={(e) => set("yearsFarming")(e.target.value)} placeholder="e.g. 18" />
            </Field>
          </div>

          <Field label="Farmer Photo URL">
            <input className={inputCls} value={form.farmerPhoto}
              onChange={(e) => set("farmerPhoto")(e.target.value)} placeholder="https://… or /api/storage/…" />
          </Field>

          {/* Rich text fields */}
          <Field label="Story" required>
            <textarea rows={4} className={textareaCls} value={form.story}
              onChange={(e) => set("story")(e.target.value)}
              placeholder="Tell the farmer's story — their history, their land, their passion…" />
          </Field>

          <Field label="Challenges" required>
            <textarea rows={3} className={textareaCls} value={form.challenges}
              onChange={(e) => set("challenges")(e.target.value)}
              placeholder="What challenges does this farmer face? Climate, access to markets, financing…" />
          </Field>

          <Field label="Impact" required>
            <textarea rows={3} className={textareaCls} value={form.impact}
              onChange={(e) => set("impact")(e.target.value)}
              placeholder="What positive impact does Fincava's partnership create for this farmer?" />
          </Field>

          {/* Media */}
          <Field label="Gallery Image URLs (comma-separated)">
            <input className={inputCls} value={form.images}
              onChange={(e) => set("images")(e.target.value)}
              placeholder="https://…, https://…" />
          </Field>

          <Field label="Video URL">
            <input className={inputCls} value={form.videoUrl}
              onChange={(e) => set("videoUrl")(e.target.value)} placeholder="https://youtube.com/…" />
          </Field>

          {/* Publish toggle */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => set("published")(!form.published)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${form.published ? "bg-emerald-500" : "bg-white/20"}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${form.published ? "translate-x-4" : "translate-x-0"}`} />
            </button>
            <label className="text-sm text-white/70">Publish on Supplier Network page</label>
          </div>

          {saveError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 sticky bottom-0 bg-[#0d1a12]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={isSaving || !canSave}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm text-white font-medium transition-colors"
          >
            {isSaving ? "Saving…" : isEditing ? "Save Changes" : "Create Story"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOriginStories() {
  const qc = useQueryClient();
  const [modalState, setModalState] = useState<{
    open: boolean;
    editing: AdminOriginStory | null;
  }>({ open: false, editing: null });
  const [saveError, setSaveError] = useState("");

  const { data: stories = [], isLoading, error } = useQuery<AdminOriginStory[]>({
    queryKey: ["admin", "origin-stories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/origin-stories", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const { data: products = [] } = useQuery<SimpleProduct[]>({
    queryKey: ["admin", "products-simple"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products-simple", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "origin-stories"] });

  const createMutation = useMutation({
    mutationFn: async (draft: StoryDraft) => {
      const res = await fetch("/api/admin/origin-stories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToPayload(draft, true)),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ? JSON.stringify(j.error) : `HTTP ${res.status}`); }
      return res.json();
    },
    onSuccess: () => { invalidate(); setModalState({ open: false, editing: null }); setSaveError(""); },
    onError: (e: Error) => setSaveError(e.message),
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, draft }: { id: number; draft: StoryDraft }) => {
      const res = await fetch(`/api/admin/origin-stories/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToPayload(draft, false)),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ? JSON.stringify(j.error) : `HTTP ${res.status}`); }
      return res.json();
    },
    onSuccess: () => { invalidate(); setModalState({ open: false, editing: null }); setSaveError(""); },
    onError: (e: Error) => setSaveError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, published }: { id: number; published: boolean }) => {
      const res = await fetch(`/api/admin/origin-stories/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/origin-stories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: invalidate,
  });

  const handleSave = (draft: StoryDraft) => {
    setSaveError("");
    if (modalState.editing) {
      patchMutation.mutate({ id: modalState.editing.id, draft });
    } else {
      createMutation.mutate(draft);
    }
  };

  const openCreate = () => {
    setSaveError("");
    setModalState({ open: true, editing: null });
  };

  const openEdit = (s: AdminOriginStory) => {
    setSaveError("");
    setModalState({ open: true, editing: s });
  };

  const publishedCount = stories.filter((s) => s.published).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/15 border border-emerald-500/20">
            <Leaf className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Origin Stories</h1>
            <p className="text-sm text-white/40 mt-0.5">
              Product-level farmer stories shown on supplier detail pages.{" "}
              <span className="text-emerald-400">{publishedCount} of {stories.length} published.</span>
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Story
        </button>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300 space-y-1">
        <p className="font-semibold">How this works</p>
        <p className="text-emerald-300/70">
          Each story is linked to a specific <strong>product</strong>. Published stories surface in the
          "Meet the Farmer" section on product detail pages and in the{" "}
          <strong>Supplier Network building section</strong> when the supplier has no SELLABLE/PUBLISHED status yet.
          Unpublished stories are saved but not visible to buyers.
        </p>
      </div>

      {isLoading && <p className="text-white/50 text-sm py-8 text-center">Loading origin stories…</p>}
      {error && <p className="text-red-400 text-sm">Failed to load stories.</p>}

      {!isLoading && stories.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 py-20 flex flex-col items-center gap-4 text-center">
          <Leaf className="h-12 w-12 text-white/15" />
          <div>
            <p className="text-white/50 text-sm font-medium">No origin stories yet</p>
            <p className="text-white/30 text-xs mt-1">
              Create a story to add farmer identity to a product listing.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-medium transition-colors mt-1"
          >
            <Plus className="h-4 w-4" />
            Add first story
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            onEdit={openEdit}
            onTogglePublished={(id, published) => toggleMutation.mutate({ id, published })}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>

      {modalState.open && (
        <StoryModal
          initial={modalState.editing ? draftFromStory(modalState.editing) : EMPTY_DRAFT}
          isEditing={!!modalState.editing}
          products={products}
          onClose={() => { setModalState({ open: false, editing: null }); setSaveError(""); }}
          onSave={handleSave}
          isSaving={createMutation.isPending || patchMutation.isPending}
          saveError={saveError}
        />
      )}
    </div>
  );
}
