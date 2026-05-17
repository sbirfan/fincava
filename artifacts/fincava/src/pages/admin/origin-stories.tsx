import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Leaf, Plus, Eye, EyeOff, Trash2, X, User, Pencil, ChevronDown, ChevronUp, Upload, Link2, Sparkles, RotateCcw, Check,
} from "lucide-react";
import { ObjectUploader } from "@workspace/object-storage-web";

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOMBIAN_DEPARTMENTS = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá",
  "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba",
  "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena",
  "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda",
  "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca",
  "Vaupés", "Vichada",
];

const STORY_PRODUCT_CATEGORIES = [
  "Coffee", "Cacao", "Avocado", "Exotic Fruit", "Dehydrated Fruit", "Superfood", "Other",
] as const;

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminOriginStory {
  id: number;
  productId: number | null;
  productCategory: string | null;
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
}

type StoryDraft = {
  productCategory: string;
  farmerName: string;
  farmerPhoto: string;
  farmName: string;
  region: string;
  customRegion: string;
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
  productCategory: "",
  farmerName: "",
  farmerPhoto: "",
  farmName: "",
  region: "",
  customRegion: "",
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
  const isKnownDept = COLOMBIAN_DEPARTMENTS.includes(s.region);
  return {
    productCategory: s.productCategory ?? "",
    farmerName:      s.farmerName,
    farmerPhoto:     s.farmerPhoto ?? "",
    farmName:        s.farmName,
    region:          isKnownDept ? s.region : "__custom__",
    customRegion:    isKnownDept ? "" : s.region,
    elevation:       s.elevation ?? "",
    farmSizeHa:      s.farmSizeHa != null ? String(s.farmSizeHa) : "",
    yearsFarming:    s.yearsFarming != null ? String(s.yearsFarming) : "",
    story:           s.story,
    challenges:      s.challenges,
    impact:          s.impact,
    images:          s.images.join(", "),
    videoUrl:        s.videoUrl ?? "",
    published:       s.published,
  };
}

function resolvedRegion(d: StoryDraft): string {
  if (d.region === "__custom__") return d.customRegion.trim();
  return d.region.trim();
}

function draftToPayload(d: StoryDraft) {
  return {
    productCategory: d.productCategory,
    farmerName:      d.farmerName.trim(),
    farmerPhoto:     d.farmerPhoto.trim() || undefined,
    farmName:        d.farmName.trim(),
    region:          resolvedRegion(d),
    elevation:       d.elevation.trim() || undefined,
    farmSizeHa:      d.farmSizeHa ? parseFloat(d.farmSizeHa) : undefined,
    yearsFarming:    d.yearsFarming ? parseInt(d.yearsFarming, 10) : undefined,
    story:           d.story.trim(),
    challenges:      d.challenges.trim() || undefined,
    impact:          d.impact.trim() || undefined,
    images:          d.images ? d.images.split(",").map((u) => u.trim()).filter(Boolean) : [],
    videoUrl:        d.videoUrl.trim() || undefined,
    published:       d.published,
  };
}

// ── Upload helpers ────────────────────────────────────────────────────────────

async function requestUploadParams(file: { name: string; size: number | null; type: string }) {
  const res = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  const data = await res.json() as { uploadURL: string; objectPath: string };
  return { method: "PUT" as const, url: data.uploadURL, headers: { "Content-Type": file.type }, objectPath: data.objectPath };
}

async function confirmUpload(objectPath: string) {
  await fetch("/api/storage/uploads/confirm", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectPath, acl: "private" }),
  });
}

// ── ImageField — URL + Upload ─────────────────────────────────────────────────

function ImageField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [mode, setMode] = useState<"url" | "upload">("url");

  return (
    <div>
      <label className="block text-xs text-white/50 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="flex gap-1.5 mb-2">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors ${
            mode === "url"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              : "bg-white/5 text-white/40 border-white/10 hover:bg-white/8"
          }`}
        >
          <Link2 className="h-3 w-3" /> URL
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors ${
            mode === "upload"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              : "bg-white/5 text-white/40 border-white/10 hover:bg-white/8"
          }`}
        >
          <Upload className="h-3 w-3" /> Upload
        </button>
      </div>

      {mode === "url" ? (
        <input
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "https://…"}
        />
      ) : (
        <div className="space-y-2">
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={10485760}
            onGetUploadParameters={async (file) => {
              const params = await requestUploadParams({ name: file.name, size: file.size ?? null, type: file.type ?? "image/jpeg" });
              return { method: params.method, url: params.url, headers: params.headers };
            }}
            onComplete={async (result) => {
              const successful = result.successful ?? [];
              if (successful.length > 0) {
                const file = successful[0];
                const xhrResponse = (file as any).response?.body as { objectPath?: string } | undefined;
                if (xhrResponse?.objectPath) {
                  await confirmUpload(xhrResponse.objectPath);
                  onChange(`/api/storage${xhrResponse.objectPath}`);
                } else {
                  const uploadURL = (file as any).uploadURL as string | undefined;
                  if (uploadURL) {
                    const path = new URL(uploadURL).pathname;
                    await confirmUpload(path);
                    onChange(`/api/storage${path}`);
                  }
                }
              }
            }}
            buttonClassName="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors w-full justify-center"
          >
            <Upload className="h-4 w-4" />
            Choose file to upload
          </ObjectUploader>
          {value && (
            <p className="text-xs text-emerald-400 truncate">Uploaded: {value}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── GalleryField — multi-image with URL + Upload ───────────────────────────────

function GalleryField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [mode, setMode] = useState<"url" | "upload">("url");

  function appendUrl(url: string) {
    const existing = value.split(",").map((u) => u.trim()).filter(Boolean);
    onChange([...existing, url].join(", "));
  }

  return (
    <div>
      <label className="block text-xs text-white/50 mb-1">Gallery Image URLs</label>
      <div className="flex gap-1.5 mb-2">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors ${
            mode === "url"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              : "bg-white/5 text-white/40 border-white/10 hover:bg-white/8"
          }`}
        >
          <Link2 className="h-3 w-3" /> URL
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors ${
            mode === "upload"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              : "bg-white/5 text-white/40 border-white/10 hover:bg-white/8"
          }`}
        >
          <Upload className="h-3 w-3" /> Upload
        </button>
      </div>

      {mode === "url" ? (
        <input
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…, https://… (comma-separated)"
        />
      ) : (
        <div className="space-y-2">
          <ObjectUploader
            maxNumberOfFiles={10}
            maxFileSize={10485760}
            onGetUploadParameters={async (file) => {
              const params = await requestUploadParams({ name: file.name, size: file.size ?? null, type: file.type ?? "image/jpeg" });
              return { method: params.method, url: params.url, headers: params.headers };
            }}
            onComplete={async (result) => {
              const successful = result.successful ?? [];
              for (const file of successful) {
                const xhrResponse = (file as any).response?.body as { objectPath?: string } | undefined;
                if (xhrResponse?.objectPath) {
                  await confirmUpload(xhrResponse.objectPath);
                  appendUrl(`/api/storage${xhrResponse.objectPath}`);
                } else {
                  const uploadURL = (file as any).uploadURL as string | undefined;
                  if (uploadURL) {
                    const path = new URL(uploadURL).pathname;
                    await confirmUpload(path);
                    appendUrl(`/api/storage${path}`);
                  }
                }
              }
            }}
            buttonClassName="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors w-full justify-center"
          >
            <Upload className="h-4 w-4" />
            Upload images (up to 10)
          </ObjectUploader>
          {value && (
            <p className="text-xs text-white/40">
              {value.split(",").filter((u) => u.trim()).length} image(s) added
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Enhance Field ──────────────────────────────────────────────────────────

type EnhanceField = "story" | "challenges" | "impact";

interface StoryContext {
  farmerName?: string;
  farmName?: string;
  region?: string;
  product?: string;
}

const FIELD_PLACEHOLDER: Record<EnhanceField, string> = {
  story:      "Tell the farmer's story — their history, their land, their passion…",
  challenges: "What this farmer faces and overcomes… (optional)",
  impact:     "What this farmer has built and is proud of… (optional)",
};

function AIEnhanceField({
  field,
  label,
  required,
  rows,
  value,
  onChange,
  storyContext,
}: {
  field: EnhanceField;
  label: string;
  required?: boolean;
  rows: number;
  value: string;
  onChange: (v: string) => void;
  storyContext: StoryContext;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "preview" | "error">("idle");
  const [suggestion, setSuggestion] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function runEnhance() {
    if (!value.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/origin-stories/enhance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, text: value, context: storyContext }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const { enhanced } = await res.json() as { enhanced: string };
      setSuggestion(enhanced);
      setStatus("preview");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Enhancement failed");
      setStatus("error");
    }
  }

  function accept() {
    onChange(suggestion);
    setStatus("idle");
    setSuggestion("");
  }

  function dismiss() {
    setStatus("idle");
    setSuggestion("");
  }

  return (
    <div>
      {/* Label row */}
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-white/50">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <button
          type="button"
          onClick={runEnhance}
          disabled={!value.trim() || status === "loading"}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Let AI rewrite this field in a passionate, first-person farmer voice"
        >
          {status === "loading" ? (
            <><span className="animate-spin inline-block h-3 w-3 border border-emerald-400 border-t-transparent rounded-full" /> Enhancing…</>
          ) : (
            <><Sparkles className="h-3 w-3" /> Rewrite in Farmer Voice</>
          )}
        </button>
      </div>

      {/* Original textarea — always visible */}
      <textarea
        rows={rows}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 resize-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={FIELD_PLACEHOLDER[field]}
      />

      {/* Error */}
      {status === "error" && (
        <p className="mt-1 text-xs text-red-400">{errorMsg}</p>
      )}

      {/* Side-by-side preview */}
      {status === "preview" && (
        <div className="mt-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-3">
          <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> AI Suggestion
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-white/30 mb-1 uppercase tracking-wide">Original</p>
              <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{value}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-300/60 mb-1 uppercase tracking-wide">Enhanced</p>
              <p className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap">{suggestion}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-white/8">
            <button
              type="button"
              onClick={accept}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
            >
              <Check className="h-3 w-3" /> Accept
            </button>
            <button
              type="button"
              onClick={runEnhance}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Regenerate
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-xs px-3 py-1.5 text-white/30 hover:text-white/60 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Expandable story text ─────────────────────────────────────────────────────

function ExpandableText({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
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
        <div className="flex items-start gap-4">
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

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">{story.farmerName}</p>
            <p className="text-sm text-white/50">{story.farmName} · {story.region}</p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {story.productCategory && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {story.productCategory}
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

        <p className="mt-3 text-xs text-white/20">
          Created {new Date(story.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────

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
  onClose,
  onSave,
  isSaving,
  saveError,
}: {
  initial: StoryDraft;
  isEditing: boolean;
  onClose: () => void;
  onSave: (d: StoryDraft) => void;
  isSaving: boolean;
  saveError: string;
}) {
  const [form, setForm] = useState<StoryDraft>(initial);
  const set = <K extends keyof StoryDraft>(k: K) =>
    (v: StoryDraft[K]) => setForm((f) => ({ ...f, [k]: v }));

  const canSave =
    form.productCategory !== "" &&
    form.farmerName.trim() &&
    form.farmName.trim() &&
    resolvedRegion(form) &&
    form.story.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1a12] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[#0d1a12] z-10">
          <h2 className="text-base font-semibold text-white">
            {isEditing ? "Edit Origin Story" : "Add Origin Story"}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Product Category — simple fixed list, no FK */}
          <Field label="Product" required>
            <select
              className={inputCls}
              value={form.productCategory}
              onChange={(e) => set("productCategory")(e.target.value)}
            >
              <option value="">— select a product category —</option>
              {STORY_PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
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

          {/* Region — dropdown of Colombian departments + custom */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Department / Region" required>
              <select
                className={inputCls}
                value={form.region}
                onChange={(e) => {
                  set("region")(e.target.value);
                  if (e.target.value !== "__custom__") set("customRegion")("");
                }}
              >
                <option value="">— select a department —</option>
                {COLOMBIAN_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="__custom__">Other / outside Colombia…</option>
              </select>
              {form.region === "__custom__" && (
                <input
                  className={`${inputCls} mt-2`}
                  value={form.customRegion}
                  onChange={(e) => set("customRegion")(e.target.value)}
                  placeholder="Enter region / country"
                />
              )}
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

          {/* Farmer Photo — URL or Upload */}
          <ImageField
            label="Farmer Photo"
            value={form.farmerPhoto}
            onChange={set("farmerPhoto")}
            placeholder="https://… or upload from computer"
          />

          {/* Rich text fields — each with AI Enhance */}
          {(() => {
            const storyCtx: StoryContext = {
              farmerName: form.farmerName || undefined,
              farmName:   form.farmName || undefined,
              region:     resolvedRegion(form) || undefined,
              product:    form.productCategory || undefined,
            };
            return (
              <>
                <AIEnhanceField
                  field="story"
                  label="Story"
                  required
                  rows={4}
                  value={form.story}
                  onChange={set("story")}
                  storyContext={storyCtx}
                />
                <AIEnhanceField
                  field="challenges"
                  label="Challenges"
                  rows={3}
                  value={form.challenges}
                  onChange={set("challenges")}
                  storyContext={storyCtx}
                />
                <AIEnhanceField
                  field="impact"
                  label="Impact"
                  rows={3}
                  value={form.impact}
                  onChange={set("impact")}
                  storyContext={storyCtx}
                />
              </>
            );
          })()}

          {/* Gallery — URL or Upload */}
          <GalleryField value={form.images} onChange={set("images")} />

          {/* Video URL */}
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

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "origin-stories"] });

  const createMutation = useMutation({
    mutationFn: async (draft: StoryDraft) => {
      const res = await fetch("/api/admin/origin-stories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToPayload(draft)),
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
        body: JSON.stringify(draftToPayload(draft)),
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/15 border border-emerald-500/20">
            <Leaf className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Farm Biography Records</h1>
            <p className="text-sm text-white/40 mt-0.5">
              Internal rich-story records.{" "}
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

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-xs text-amber-300 space-y-1">
        <p className="font-semibold">Important — read before adding records</p>
        <p className="text-amber-300/80">
          This section manages internal rich-story records. These records do <strong>NOT</strong> publish to the
          public Origin Stories page. Public Origin Stories are currently managed through supplier publishing.
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
              Records created here are stored internally and are not connected to the public Origin Stories page.
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
          onClose={() => { setModalState({ open: false, editing: null }); setSaveError(""); }}
          onSave={handleSave}
          isSaving={createMutation.isPending || patchMutation.isPending}
          saveError={saveError}
        />
      )}
    </div>
  );
}
