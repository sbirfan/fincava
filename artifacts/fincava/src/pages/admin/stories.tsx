import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Eye, EyeOff, Trash2, X, User } from "lucide-react";

interface PublicStory {
  id: number;
  storyKey: string;
  page: string;
  section: string;
  name: string;
  region: string | null;
  product: string | null;
  quote: string | null;
  photoUrl: string | null;
  isVisible: boolean;
  sortOrder: number;
  updatedAt: string;
}

type StoryDraft = Omit<PublicStory, "id" | "updatedAt">;

const EMPTY_DRAFT: StoryDraft = {
  storyKey: "",
  page: "impact",
  section: "farmer_voices",
  name: "",
  region: "",
  product: "",
  quote: "",
  photoUrl: "",
  isVisible: false,
  sortOrder: 0,
};

function StoryCard({
  story,
  onToggle,
  onDelete,
  onEdit,
}: {
  story: PublicStory;
  onToggle: (id: number, visible: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (story: PublicStory) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className={`rounded-xl border transition-colors ${story.isVisible ? "border-emerald-500/20 bg-emerald-500/3" : "border-white/10 bg-white/3"}`}>
      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {story.photoUrl ? (
              <img
                src={story.photoUrl}
                alt={story.name}
                className="h-10 w-10 rounded-full object-cover border border-white/10"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                <User className="h-4 w-4 text-white/30" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{story.name}</p>
              <p className="text-xs text-white/40">
                {[story.region, story.product].filter(Boolean).join(" · ") || "No region or product"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onToggle(story.id, !story.isVisible)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                story.isVisible
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                  : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
              }`}
            >
              {story.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {story.isVisible ? "Visible" : "Hidden"}
            </button>
            <button
              onClick={() => onEdit(story)}
              className="text-xs px-2.5 py-1 rounded border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Edit
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
                  className="text-xs px-2 py-1 text-white/40 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs p-1 rounded text-white/30 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quote */}
        {story.quote && (
          <blockquote className="text-sm text-white/60 italic border-l-2 border-white/10 pl-3">
            "{story.quote}"
          </blockquote>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-white/30">
          <span className="font-mono">{story.storyKey}</span>
          <span>·</span>
          <span>sort: {story.sortOrder}</span>
          <span>·</span>
          <span>updated {new Date(story.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function StoryModal({
  initial,
  onClose,
  onSave,
  isSaving,
}: {
  initial: StoryDraft;
  onClose: () => void;
  onSave: (draft: StoryDraft) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<StoryDraft>(initial);
  const set = (k: keyof StoryDraft) => (v: string | boolean | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">
            {initial.storyKey ? "Edit Story" : "Add Story"}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Story Key <span className="text-red-400">*</span></label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-white/30"
                value={form.storyKey}
                onChange={(e) => set("storyKey")(e.target.value)}
                placeholder="huila-coffee-1"
                disabled={!!initial.storyKey}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Sort Order</label>
              <input
                type="number"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder")(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Display Name <span className="text-red-400">*</span></label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="e.g. Specialty Coffee Producer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Region</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                value={form.region ?? ""}
                onChange={(e) => set("region")(e.target.value)}
                placeholder="e.g. Huila"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Product</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                value={form.product ?? ""}
                onChange={(e) => set("product")(e.target.value)}
                placeholder="e.g. Specialty Coffee"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Quote</label>
            <textarea
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 resize-none"
              value={form.quote ?? ""}
              onChange={(e) => set("quote")(e.target.value)}
              placeholder="A short quote from this producer type…"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Photo URL</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              value={form.photoUrl ?? ""}
              onChange={(e) => set("photoUrl")(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set("isVisible")(!form.isVisible)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${form.isVisible ? "bg-emerald-500" : "bg-white/20"}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${form.isVisible ? "translate-x-4" : "translate-x-0"}`}
              />
            </button>
            <label className="text-sm text-white/70">Publish on public site</label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={isSaving || !form.storyKey || !form.name}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm text-white font-medium transition-colors"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminStories() {
  const qc = useQueryClient();
  const [modalState, setModalState] = useState<{ open: boolean; editing: PublicStory | null }>({ open: false, editing: null });

  const { data: stories = [], isLoading, error } = useQuery<PublicStory[]>({
    queryKey: ["admin", "public-stories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/public-stories", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (draft: StoryDraft) => {
      const res = await fetch("/api/admin/public-stories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed to create"); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "public-stories"] }); setModalState({ open: false, editing: null }); },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<PublicStory> }) => {
      const res = await fetch(`/api/admin/public-stories/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "public-stories"] }); setModalState({ open: false, editing: null }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/public-stories/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "public-stories"] }),
  });

  const handleSave = (draft: StoryDraft) => {
    if (modalState.editing) {
      const { storyKey: _sk, ...patch } = draft;
      patchMutation.mutate({ id: modalState.editing.id, patch });
    } else {
      createMutation.mutate(draft);
    }
  };

  const visibleCount = stories.filter((s) => s.isVisible).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/15 border border-amber-500/20">
            <BookOpen className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Producer Stories</h1>
            <p className="text-sm text-white/40 mt-0.5">
              Manage profile cards shown on the Impact page.{" "}
              <span className="text-emerald-400">{visibleCount} of {stories.length} published.</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalState({ open: true, editing: null })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Story
        </button>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300 space-y-1">
        <p className="font-semibold">Publishing rules</p>
        <p className="text-amber-300/70">
          Only <strong>Visible</strong> stories appear on the public Impact page. If no stories are visible, the section is hidden entirely.
          Use generic producer-type descriptions (e.g. "Specialty Coffee Producer") rather than real names unless you have explicit consent.
        </p>
      </div>

      {isLoading && <p className="text-white/50 text-sm">Loading stories…</p>}
      {error && <p className="text-red-400 text-sm">Failed to load stories.</p>}

      {!isLoading && stories.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 py-16 flex flex-col items-center gap-3 text-center">
          <BookOpen className="h-10 w-10 text-white/20" />
          <p className="text-white/50 text-sm">No producer stories yet.</p>
          <button
            onClick={() => setModalState({ open: true, editing: null })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-medium transition-colors mt-2"
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
            onToggle={(id, visible) => patchMutation.mutate({ id, patch: { isVisible: visible } })}
            onDelete={(id) => deleteMutation.mutate(id)}
            onEdit={(s) => setModalState({ open: true, editing: s })}
          />
        ))}
      </div>

      {modalState.open && (
        <StoryModal
          initial={modalState.editing
            ? {
                storyKey: modalState.editing.storyKey,
                page: modalState.editing.page,
                section: modalState.editing.section,
                name: modalState.editing.name,
                region: modalState.editing.region,
                product: modalState.editing.product,
                quote: modalState.editing.quote,
                photoUrl: modalState.editing.photoUrl,
                isVisible: modalState.editing.isVisible,
                sortOrder: modalState.editing.sortOrder,
              }
            : EMPTY_DRAFT
          }
          onClose={() => setModalState({ open: false, editing: null })}
          onSave={handleSave}
          isSaving={createMutation.isPending || patchMutation.isPending}
        />
      )}
    </div>
  );
}
