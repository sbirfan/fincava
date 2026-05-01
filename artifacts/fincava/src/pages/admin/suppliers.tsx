import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, Link } from "wouter";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "../../contexts/LanguageContext";


interface ProfileCompleteness {
  hasFarmData: boolean;
  hasEconomicsData: boolean;
  hasComplianceData: boolean;
  hasAiScore: boolean;
  isGraduated: boolean;
}

interface Supplier {
  id: number;
  nombreCompleto: string;
  contactName?: string;
  phone?: string;
  email?: string | null;
  department?: string | null;
  municipio: string;
  supplierType: string;
  status: string;
  createdAt: string;
  exportReadinessScore: number | null;
  pathway: string | null;
  primaryProduct?: string | null;
  whatsappMessageSent?: string | null;
  // Graduation fields (nullable until evaluateSupplier runs)
  sellableStatus?: string | null;
  eligibilityStatus?: string | null;
  commercialScore?: number | null;
  // Ingestion / Origin Stories fields
  ingestionSource?: string | null;
  description?: string | null;
  publishedToOriginStories?: boolean;
  originStoryImageUrl?: string | null;
}

const SUPPLIER_STATUSES = ["PENDING", "ACTIVE", "INACTIVE"] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-700",
};

const PATHWAY_COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-orange-100 text-orange-800",
  D: "bg-red-100 text-red-700",
};

const PATHWAY_LABELS: Record<string, string> = {
  A: "Fast Track",
  B: "Standard",
  C: "Needs Support",
  D: "Not Ready",
};

const SELLABLE_COLORS: Record<string, string> = {
  PUBLISHED:  "bg-emerald-100 text-emerald-800",
  SELLABLE:   "bg-green-100 text-green-700",
  ELIGIBLE:   "bg-blue-100 text-blue-700",
  NOT_READY:  "bg-gray-100 text-gray-500",
};

const ELIGIBILITY_COLORS: Record<string, string> = {
  PASS: "text-green-600",
  FAIL: "text-red-500",
};

function DocModal({
  supplierName,
  supplierId,
  content,
  lang,
  onClose,
  onRegenerate,
}: {
  supplierName: string;
  supplierId: number | null;
  content: string;
  lang: string;
  onClose: () => void;
  onRegenerate?: () => void;
}) {
  const [downloadingLang, setDownloadingLang] = useState<"en" | "es" | null>(null);

  async function downloadInLanguage(dlLang: "en" | "es") {
    setDownloadingLang(dlLang);
    try {
      let text = content;
      if (supplierId != null) {
        const res = await fetch(`/api/suppliers/${supplierId}/generate-document`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc_type: "supplier_profile", language: dlLang }),
        });
        if (res.ok) {
          const data = await res.json();
          text = data.documentContent;
        }
      }
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${supplierName.replace(/\s+/g, "_")}_${dlLang.toUpperCase()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingLang(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">
            {lang === "es" ? "Documento Generado" : "Generated Document"} — {supplierName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 prose prose-sm prose-gray max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mt-4 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold text-gray-800 mt-4 mb-2 border-b border-gray-200 pb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-800 mt-3 mb-1">{children}</h3>,
              p: ({ children }) => <p className="text-sm text-gray-700 leading-relaxed mb-3">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
              hr: () => <hr className="border-gray-200 my-4" />,
              ul: ({ children }) => <ul className="list-none space-y-1 mb-3">{children}</ul>,
              li: ({ children }) => <li className="text-sm text-gray-700">{children}</li>,
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
              th: ({ children }) => <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200">{children}</th>,
              td: ({ children }) => <td className="px-3 py-2 text-gray-700 border border-gray-200">{children}</td>,
              a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-green-700 underline">{children}</a>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        <div className="border-t border-gray-100 px-6 py-4 shrink-0 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => downloadInLanguage("en")}
              disabled={downloadingLang !== null}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition"
            >
              {downloadingLang === "en"
                ? "Generating…"
                : "↓ English"}
            </button>
            <button
              onClick={() => downloadInLanguage("es")}
              disabled={downloadingLang !== null}
              className="flex-1 py-2.5 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition"
            >
              {downloadingLang === "es"
                ? "Generando…"
                : "↓ Español"}
            </button>
          </div>
          <div className="flex gap-2">
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium transition"
              >
                {lang === "es" ? "Regenerar" : "Regenerate"}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
            >
              {lang === "es" ? "Cerrar" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSuppliersPage() {
  const { lang } = useLanguage();
  const [, setLocation] = useLocation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [loadingCompleteness, setLoadingCompleteness] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [pendingInactive, setPendingInactive] = useState<{ supplierId: number } | null>(null);
  const [inactiveReason, setInactiveReason] = useState<"REJECTED" | "SUSPENDED">("REJECTED");
  const [sendingWa, setSendingWa] = useState<number | null>(null);
  const [waStatus, setWaStatus] = useState<Record<number, { state: "sent" | "failed"; msg?: string }>>({});
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docContent, setDocContent] = useState<string | null>(null);
  const [docSupplierName, setDocSupplierName] = useState<string | null>(null);
  const [docSupplierId, setDocSupplierId] = useState<number | null>(null);
  const [docLang, setDocLang] = useState<"en" | "es">(lang === "es" ? "es" : "en");
  const [scoring, setScoring] = useState<number | null>(null);
  const [scoreStatus, setScoreStatus] = useState<Record<number, "started" | "failed">>({});
  const [publishing, setPublishing] = useState<number | null>(null);
  const [publishError, setPublishError] = useState("");
  // Origin Stories modal state
  const [originModalOpen, setOriginModalOpen] = useState(false);
  const [originImageUrl, setOriginImageUrl] = useState("");
  const [originImagePreview, setOriginImagePreview] = useState<string | null>(null);
  const [originUploading, setOriginUploading] = useState(false);
  const [originUploadError, setOriginUploadError] = useState("");
  const [originPublishing, setOriginPublishing] = useState(false);
  const [originError, setOriginError] = useState("");
  const [originUnpublishing, setOriginUnpublishing] = useState(false);
  const originFileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filterPathway, setFilterPathway] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [search, setSearch] = useState("");

  // Edit profile state
  type EditForm = {
    nombreCompleto: string;
    whatsappNumber: string;
    email: string;
    municipio: string;
    department: string;
    vereda: string;
    supplierType: "FARMER" | "COOPERATIVE" | "EXPORTER" | "PROCESSOR" | "DISTRIBUTOR" | "OTHER";
    registeredBy: string;
    primaryProduct: string;
  };
  const EMPTY_EDIT_FORM: EditForm = {
    nombreCompleto: "",
    whatsappNumber: "",
    email: "",
    municipio: "",
    department: "",
    vereda: "",
    supplierType: "FARMER",
    registeredBy: "",
    primaryProduct: "",
  };
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT_FORM);
  // Snapshot of the form values when the modal opened — used to compute the
  // diff so we only PATCH fields the admin actually changed.
  const [editInitial, setEditInitial] = useState<EditForm>(EMPTY_EDIT_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const controller = new AbortController();
    fetchSuppliers(controller.signal);
    return () => controller.abort();
  }, [filterPathway, filterStatus]);

  useEffect(() => {
    setPublishError("");
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) { setCompleteness(null); return; }
    setLoadingCompleteness(true);
    fetch(`/api/suppliers/${selected.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (data.profileCompleteness) setCompleteness(data.profileCompleteness); })
      .catch(() => {})
      .finally(() => setLoadingCompleteness(false));
  }, [selected?.id]);

  async function fetchSuppliers(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterPathway) params.set("pathway", filterPathway);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/suppliers/admin-list?${params}`, { credentials: "include", signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSuppliers(data.data ?? []);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setError(e.message || "Failed to load");
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateSupplierStatus(supplierId: number, status: string, reason?: "REJECTED" | "SUSPENDED") {
    setStatusUpdating(true);
    try {
      const body: Record<string, string> = { status };
      if (reason) body.reason = reason;
      const res = await fetch(`/api/admin/suppliers/${supplierId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplierId ? { ...s, status } : s))
      );
      setSelected((prev) => (prev && prev.id === supplierId ? { ...prev, status } : prev));
    } catch (e: any) {
      setError(e.message || "Failed to update supplier status");
    } finally {
      setStatusUpdating(false);
      setPendingInactive(null);
    }
  }

  async function openEditModal() {
    if (!selected) return;
    // Build a sensible initial form synchronously from the list row so the modal
    // is never blank, then refine it with authoritative supplier-detail data so
    // fields not present in the list (e.g. `vereda`) prefill correctly. Without
    // this refresh the diff-based save would treat absent fields as "unchanged"
    // — which is what we want — but the form would still display "" instead of
    // the existing DB value.
    const initial: EditForm = {
      nombreCompleto: selected.nombreCompleto || "",
      whatsappNumber: selected.phone || "",
      email: selected.email || "",
      municipio: selected.municipio || "",
      department: selected.department || "",
      vereda: "",
      supplierType:
        (selected.supplierType as EditForm["supplierType"]) || "FARMER",
      registeredBy: selected.contactName || "",
      primaryProduct: selected.primaryProduct || "",
    };
    setEditForm({ ...EMPTY_EDIT_FORM, ...initial });
    setEditInitial({ ...EMPTY_EDIT_FORM, ...initial });
    setEditError("");
    setEditFieldErrors({});
    setEditOpen(true);
    setEditLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${selected.id}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        const s = json?.supplier;
        if (s) {
          const refined: EditForm = {
            nombreCompleto: s.nombreCompleto ?? initial.nombreCompleto,
            whatsappNumber: s.whatsappNumber ?? initial.whatsappNumber,
            email: s.email ?? initial.email,
            municipio: s.municipio ?? initial.municipio,
            department: s.department ?? initial.department,
            vereda: s.vereda ?? "",
            supplierType:
              (s.supplierType as EditForm["supplierType"]) ||
              initial.supplierType,
            registeredBy: s.registeredBy ?? initial.registeredBy,
            primaryProduct: s.primaryProduct ?? initial.primaryProduct,
          };
          setEditForm({ ...EMPTY_EDIT_FORM, ...refined });
          setEditInitial({ ...EMPTY_EDIT_FORM, ...refined });
        }
      }
    } catch {
      // Best-effort; the row-level prefill is still in place.
    } finally {
      setEditLoading(false);
    }
  }

  async function saveEdit() {
    if (!selected) return;
    setEditSaving(true);
    setEditError("");
    setEditFieldErrors({});
    try {
      // Diff against the initial values so we only PATCH fields the admin
      // actually changed — this prevents accidentally clearing fields like
      // `vereda` that were initially blank in the form but populated in the DB.
      const diff: Partial<EditForm> = {};
      (Object.keys(editForm) as (keyof EditForm)[]).forEach((k) => {
        if (editForm[k] !== editInitial[k]) {
          (diff as any)[k] = editForm[k];
        }
      });
      if (Object.keys(diff).length === 0) {
        setEditOpen(false);
        return;
      }
      const res = await fetch(`/api/admin/suppliers/${selected.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diff),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.error && typeof json.error === "object") {
          setEditFieldErrors(json.error as Record<string, string[]>);
        }
        const formErrs: string[] = Array.isArray(json?.formErrors)
          ? json.formErrors
          : [];
        const msg =
          typeof json?.error === "string"
            ? json.error
            : formErrs[0] || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      // Update local lists with the new values
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === selected.id
            ? {
                ...s,
                nombreCompleto: editForm.nombreCompleto,
                phone: editForm.whatsappNumber || s.phone,
                email: editForm.email || null,
                municipio: editForm.municipio,
                department: editForm.department || null,
                supplierType: editForm.supplierType,
                contactName: editForm.registeredBy || s.contactName,
                primaryProduct: editForm.primaryProduct || s.primaryProduct,
              }
            : s,
        ),
      );
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              nombreCompleto: editForm.nombreCompleto,
              phone: editForm.whatsappNumber || prev.phone,
              email: editForm.email || null,
              municipio: editForm.municipio,
              department: editForm.department || null,
              supplierType: editForm.supplierType,
              contactName: editForm.registeredBy || prev.contactName,
              primaryProduct: editForm.primaryProduct || prev.primaryProduct,
            }
          : prev,
      );
      setEditOpen(false);
    } catch (e: any) {
      setEditError(e.message || "Failed to save");
    } finally {
      setEditSaving(false);
    }
  }

  function handleStatusChange(supplierId: number, newStatus: string) {
    if (newStatus === "INACTIVE") {
      setInactiveReason("REJECTED");
      setPendingInactive({ supplierId });
    } else {
      updateSupplierStatus(supplierId, newStatus);
    }
  }

  async function generateDocument(supplierId: number, supplierName: string) {
    setDocModalOpen(false);
    setGenerating(supplierId);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/generate-document`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_type: "supplier_profile", language: docLang }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDocContent(data.documentContent);
      setDocSupplierName(supplierName);
      setDocSupplierId(supplierId);
      setDocModalOpen(true);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setGenerating(null);
    }
  }

  async function viewLastDoc(supplierId: number, supplierName: string) {
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/document`, {
        credentials: "include",
      });
      if (res.status === 404) {
        alert(
          lang === "es"
            ? "No se encontró ningún documento generado para este proveedor."
            : "No document has been generated for this supplier yet.",
        );
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDocContent(data.documentContent);
      setDocSupplierName(supplierName);
      setDocSupplierId(supplierId);
      setDocModalOpen(true);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  }

  async function scoreNow(supplierId: number) {
    setScoring(supplierId);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/score`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setScoreStatus((prev) => ({ ...prev, [supplierId]: "started" }));
      setTimeout(() => setScoreStatus((prev) => { const n = { ...prev }; delete n[supplierId]; return n; }), 4000);
    } catch (e: any) {
      setScoreStatus((prev) => ({ ...prev, [supplierId]: "failed" }));
      setTimeout(() => setScoreStatus((prev) => { const n = { ...prev }; delete n[supplierId]; return n; }), 4000);
    } finally {
      setScoring(null);
    }
  }

  async function publishSupplier(supplierId: number) {
    setPublishing(supplierId);
    setPublishError("");
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "ADMIN", justification: "Published via admin console" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSuppliers((prev) =>
        prev.map((s) => s.id === supplierId ? { ...s, sellableStatus: "PUBLISHED" } : s)
      );
      setSelected((prev) => prev && prev.id === supplierId ? { ...prev, sellableStatus: "PUBLISHED" } : prev);
    } catch (e: any) {
      setPublishError(e.message || (lang === "es" ? "Error al publicar" : "Failed to publish"));
    } finally {
      setPublishing(null);
    }
  }

  async function unpublishSupplier(supplierId: number) {
    setPublishing(supplierId);
    setPublishError("");
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/unpublish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "ADMIN", justification: "Unpublished via admin console" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSuppliers((prev) =>
        prev.map((s) => s.id === supplierId ? { ...s, sellableStatus: "SELLABLE" } : s)
      );
      setSelected((prev) => prev && prev.id === supplierId ? { ...prev, sellableStatus: "SELLABLE" } : prev);
    } catch (e: any) {
      setPublishError(e.message || (lang === "es" ? "Error al despublicar" : "Failed to unpublish"));
    } finally {
      setPublishing(null);
    }
  }

  async function uploadOriginImage(file: File) {
    setOriginUploading(true);
    setOriginUploadError("");
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed");
      // Build a serving URL that the browser and origin-stories page can load
      const servingUrl = `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
      setOriginImageUrl(servingUrl);
      // Generate a local preview
      const reader = new FileReader();
      reader.onload = (e) => setOriginImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } catch (e: any) {
      setOriginUploadError(e.message || "Upload failed");
    } finally {
      setOriginUploading(false);
    }
  }

  async function publishToOriginStories(supplierId: number, imageUrl: string) {
    setOriginPublishing(true);
    setOriginError("");
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/publish-origin-story`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imageUrl.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const newImageUrl = imageUrl.trim() || null;
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === supplierId
            ? { ...s, publishedToOriginStories: true, originStoryImageUrl: newImageUrl }
            : s,
        ),
      );
      setSelected((prev) =>
        prev && prev.id === supplierId
          ? { ...prev, publishedToOriginStories: true, originStoryImageUrl: newImageUrl }
          : prev,
      );
      setOriginModalOpen(false);
      setOriginImageUrl("");
    } catch (e: any) {
      setOriginError(e.message || "Failed to publish to Origin Stories");
    } finally {
      setOriginPublishing(false);
    }
  }

  async function unpublishFromOriginStories(supplierId: number) {
    setOriginUnpublishing(true);
    setOriginError("");
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/unpublish-origin-story`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === supplierId ? { ...s, publishedToOriginStories: false } : s,
        ),
      );
      setSelected((prev) =>
        prev && prev.id === supplierId
          ? { ...prev, publishedToOriginStories: false }
          : prev,
      );
    } catch (e: any) {
      setOriginError(e.message || "Failed to unpublish from Origin Stories");
    } finally {
      setOriginUnpublishing(false);
    }
  }

  async function sendWhatsapp(supplierId: number) {
    setSendingWa(supplierId);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/send-whatsapp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setWaStatus((prev) => ({ ...prev, [supplierId]: { state: "sent" } }));
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === supplierId ? { ...s, whatsappMessageSent: "sent" } : s,
        ),
      );
      setTimeout(() => {
        setWaStatus((prev) => {
          const next = { ...prev };
          delete next[supplierId];
          return next;
        });
      }, 3000);
    } catch (e: any) {
      setWaStatus((prev) => ({
        ...prev,
        [supplierId]: { state: "failed", msg: e.message },
      }));
      setTimeout(() => {
        setWaStatus((prev) => {
          const next = { ...prev };
          delete next[supplierId];
          return next;
        });
      }, 4000);
    } finally {
      setSendingWa(null);
    }
  }

  const filtered = suppliers.filter((s) => {
    if (filterProduct && s.primaryProduct !== filterProduct) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.nombreCompleto?.toLowerCase().includes(q) ||
        s.contactName?.toLowerCase().includes(q) ||
        s.municipio?.toLowerCase().includes(q) ||
        s.phone?.includes(q)
      );
    }
    return true;
  });

  const scoreColor = (score: number | null) => {
    if (score === null) return "text-gray-400";
    if (score >= 75) return "text-green-600 font-semibold";
    if (score >= 50) return "text-yellow-600 font-semibold";
    return "text-red-500 font-semibold";
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "es" ? "es-CO" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {docModalOpen && docContent && docSupplierName && (
        <DocModal
          supplierName={docSupplierName}
          supplierId={docSupplierId}
          content={docContent}
          lang={lang}
          onClose={() => setDocModalOpen(false)}
          onRegenerate={
            docSupplierId != null
              ? () => generateDocument(docSupplierId, docSupplierName)
              : undefined
          }
        />
      )}

      {/* ── Origin Stories publish modal ─────────────────────────────── */}
      {originModalOpen && selected && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setOriginModalOpen(false); setOriginError(""); } }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-800">
              Publish to Origin Stories
            </h2>
            <p className="text-sm text-gray-500">
              This will make <strong className="text-gray-700">{selected.nombreCompleto}</strong>'s profile publicly visible on the Origin Stories page.
            </p>

            {/* Description guard */}
            {!selected.description?.trim() && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <strong>A description is required</strong> before this profile can be published. Please edit the supplier profile and add a description first.
              </div>
            )}

            {/* Image upload */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Cover image <span className="text-gray-400">(optional)</span>
              </label>

              {/* Preview */}
              {(originImagePreview || originImageUrl) && (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={originImagePreview ?? originImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => { setOriginImagePreview(null); setOriginImageUrl(""); }}
                    className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition"
                    title="Remove image"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Upload button + drag zone */}
              {!originImageUrl && (
                <div
                  className="relative border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition"
                  onClick={() => originFileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
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
                    <p className="text-sm text-amber-600 font-medium">Uploading…</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">Click or drag an image here to upload</p>
                      <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP up to 10 MB</p>
                    </>
                  )}
                </div>
              )}

              {originUploadError && (
                <p className="text-xs text-red-600">{originUploadError}</p>
              )}

              {/* Manual URL fallback */}
              <div className="space-y-1">
                <p className="text-[11px] text-gray-400">Or paste an image URL directly:</p>
                <input
                  type="url"
                  value={originImageUrl}
                  onChange={(e) => { setOriginImageUrl(e.target.value); setOriginImagePreview(null); }}
                  placeholder="https://example.com/farmer-photo.jpg"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {originError && (
              <p className="text-sm text-red-600">{originError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => publishToOriginStories(selected.id, originImageUrl)}
                disabled={originPublishing || originUploading || !selected.description?.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {originPublishing ? "Publishing…" : "Publish"}
              </button>
              <button
                onClick={() => { setOriginModalOpen(false); setOriginError(""); setOriginUploadError(""); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {lang === "es" ? "Panel de Proveedores" : "Supplier Dashboard"}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {lang === "es"
              ? "Gestión y seguimiento de proveedores"
              : "Supplier management & tracking"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {filtered.length} {lang === "es" ? "proveedores" : "suppliers"}
          </span>
          <button
            onClick={() => fetchSuppliers()}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            {lang === "es" ? "↻ Actualizar" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex flex-wrap gap-3">
        <input
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-green-400"
          placeholder={lang === "es" ? "Buscar..." : "Search..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          value={filterPathway}
          onChange={(e) => setFilterPathway(e.target.value)}
        >
          <option value="">
            {lang === "es" ? "Todos los pathways" : "All pathways"}
          </option>
          <option value="A">A · Fast Track</option>
          <option value="B">B · Standard</option>
          <option value="C">C · Needs Support</option>
          <option value="D">D · Not Ready</option>
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">
            {lang === "es" ? "Todos los estados" : "All statuses"}
          </option>
          <option value="PENDING">
            {lang === "es" ? "Pendiente" : "Pending"}
          </option>
          <option value="ACTIVE">
            {lang === "es" ? "Activo" : "Active"}
          </option>
          <option value="INACTIVE">
            {lang === "es" ? "Inactivo" : "Inactive"}
          </option>
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
        >
          <option value="">
            {lang === "es" ? "Todos los productos" : "All products"}
          </option>
          <option value="cacao">Cacao</option>
          <option value="cafe">{lang === "es" ? "Café" : "Coffee"}</option>
          <option value="bocadillo">Bocadillo</option>
          <option value="panela">Panela</option>
          <option value="lulo">Lulo</option>
          <option value="pitahaya">Pitahaya</option>
          <option value="uchuva">Uchuva</option>
        </select>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            {lang === "es" ? "Cargando proveedores..." : "Loading suppliers..."}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="text-4xl mb-3">🌱</div>
            <p className="text-sm">
              {lang === "es"
                ? "No se encontraron proveedores"
                : "No suppliers found"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">
                    {lang === "es" ? "Proveedor" : "Supplier"}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {lang === "es" ? "Ubicación" : "Location"}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {lang === "es" ? "Producto" : "Product"}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {lang === "es" ? "Estado" : "Status"}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {lang === "es" ? "Graduación" : "Graduation"}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {lang === "es" ? "Score IA" : "AI Score"}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Pathway</th>
                  <th className="text-left px-4 py-3 font-medium">
                    {lang === "es" ? "Registro" : "Registered"}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {lang === "es" ? "Acciones" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelected(s)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {s.nombreCompleto}
                      </div>
                      <div className="text-xs text-gray-400">
                        {s.contactName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{s.municipio}</div>
                      <div className="text-xs text-gray-400">
                        {s.department}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {s.primaryProduct || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.sellableStatus ? (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${SELLABLE_COLORS[s.sellableStatus] || "bg-gray-100 text-gray-500"}`}
                          >
                            {s.sellableStatus}
                          </span>
                          {s.eligibilityStatus && (
                            <span className={`text-[10px] font-semibold ${ELIGIBILITY_COLORS[s.eligibilityStatus] || "text-gray-400"}`}>
                              {s.eligibilityStatus === "PASS" ? "✓ Eligible" : "✗ Not eligible"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={scoreColor(s.exportReadinessScore)}>
                        {s.exportReadinessScore !== null ? s.exportReadinessScore : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.pathway ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${PATHWAY_COLORS[s.pathway] || "bg-gray-100 text-gray-600"}`}
                          title={PATHWAY_LABELS[s.pathway]}
                        >
                          {s.pathway} · {PATHWAY_LABELS[s.pathway] ?? s.pathway}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {formatDate(s.createdAt)}
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => generateDocument(s.id, s.nombreCompleto)}
                          disabled={generating === s.id}
                          className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 transition whitespace-nowrap"
                        >
                          {generating === s.id
                            ? "..."
                            : lang === "es"
                              ? "Generar Doc"
                              : "Gen Doc"}
                        </button>
                        <button
                          onClick={() => viewLastDoc(s.id, s.nombreCompleto)}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition whitespace-nowrap"
                        >
                          {lang === "es" ? "Ver Último" : "View Last"}
                        </button>
                        {(() => {
                          const ws = waStatus[s.id];
                          const alreadySent = !!s.whatsappMessageSent;
                          return (
                            <button
                              onClick={() => sendWhatsapp(s.id)}
                              disabled={sendingWa === s.id}
                              title={ws?.state === "failed" ? ws.msg : undefined}
                              className={`text-xs px-2 py-1 border rounded transition whitespace-nowrap disabled:opacity-50 ${
                                ws?.state === "sent"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : ws?.state === "failed"
                                    ? "bg-red-50 text-red-600 border-red-200"
                                    : alreadySent
                                      ? "bg-white text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              }`}
                            >
                              {sendingWa === s.id
                                ? "..."
                                : ws?.state === "sent"
                                  ? "Sent ✓"
                                  : ws?.state === "failed"
                                    ? "Failed"
                                    : lang === "es"
                                      ? "Enviar WA"
                                      : "Send WA"}
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex justify-end"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {selected.nombreCompleto}
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <button
              onClick={openEditModal}
              className="mb-5 w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium transition"
            >
              {lang === "es" ? "✎ Editar perfil" : "✎ Edit profile"}
            </button>

            <div className="space-y-4 text-sm">
              <Row
                label={lang === "es" ? "Contacto" : "Contact"}
                value={selected.contactName || "—"}
              />
              <Row label="Phone" value={selected.phone || "—"} />
              <Row
                label={lang === "es" ? "Ubicación" : "Location"}
                value={`${selected.municipio}${selected.department ? `, ${selected.department}` : ""}`}
              />
              <Row
                label={lang === "es" ? "Producto" : "Product"}
                value={selected.primaryProduct || "—"}
              />
              <Row
                label={lang === "es" ? "Tipo" : "Type"}
                value={selected.supplierType}
              />
              <Row
                label={lang === "es" ? "Estado" : "Status"}
                value={
                  <select
                    value={selected.status}
                    disabled={statusUpdating || !!pendingInactive}
                    onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-400 disabled:opacity-60 ${STATUS_COLORS[selected.status] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {SUPPLIER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                }
              />
              {/* Reason picker — shown when an admin initiates deactivation */}
              {pendingInactive && pendingInactive.supplierId === selected.id && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">
                    {lang === "es" ? "¿Por qué se desactiva esta cuenta?" : "Why is this account being deactivated?"}
                  </p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                      <input
                        type="radio"
                        name="inactiveReason"
                        value="REJECTED"
                        checked={inactiveReason === "REJECTED"}
                        onChange={() => setInactiveReason("REJECTED")}
                        className="accent-amber-600"
                      />
                      {lang === "es" ? "Rechazado (no cumple requisitos)" : "Rejected (does not qualify)"}
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                      <input
                        type="radio"
                        name="inactiveReason"
                        value="SUSPENDED"
                        checked={inactiveReason === "SUSPENDED"}
                        onChange={() => setInactiveReason("SUSPENDED")}
                        className="accent-amber-600"
                      />
                      {lang === "es" ? "Suspendido (cumplimiento)" : "Suspended (compliance)"}
                    </label>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      disabled={statusUpdating}
                      onClick={() => updateSupplierStatus(selected.id, "INACTIVE", inactiveReason)}
                      className="px-3 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition"
                    >
                      {statusUpdating
                        ? (lang === "es" ? "Guardando…" : "Saving…")
                        : (lang === "es" ? "Confirmar desactivación" : "Confirm deactivation")}
                    </button>
                    <button
                      disabled={statusUpdating}
                      onClick={() => setPendingInactive(null)}
                      className="px-3 py-1 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition"
                    >
                      {lang === "es" ? "Cancelar" : "Cancel"}
                    </button>
                  </div>
                </div>
              )}
              <Row
                label={lang === "es" ? "Score IA" : "AI Score"}
                value={
                  <span className={scoreColor(selected.exportReadinessScore)}>
                    {selected.exportReadinessScore !== null
                      ? `${selected.exportReadinessScore}/100`
                      : "—"}
                  </span>
                }
              />
              <Row
                label={lang === "es" ? "Puntuación Comercial" : "Commercial Score"}
                value={
                  selected.commercialScore != null ? (
                    <span className={scoreColor(selected.commercialScore)}>
                      {selected.commercialScore}/100
                    </span>
                  ) : "—"
                }
              />
              <Row
                label={lang === "es" ? "Estado Vendible" : "Sellable Status"}
                value={
                  selected.sellableStatus ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SELLABLE_COLORS[selected.sellableStatus] || "bg-gray-100 text-gray-500"}`}>
                      {selected.sellableStatus}
                    </span>
                  ) : "—"
                }
              />
              <Row
                label={lang === "es" ? "Elegibilidad" : "Eligibility"}
                value={
                  selected.eligibilityStatus ? (
                    <span className={`text-xs font-semibold ${ELIGIBILITY_COLORS[selected.eligibilityStatus] || "text-gray-400"}`}>
                      {selected.eligibilityStatus === "PASS"
                        ? (lang === "es" ? "✓ Cumple requisitos" : "✓ Passes")
                        : (lang === "es" ? "✗ No cumple requisitos" : "✗ Fails")}
                    </span>
                  ) : "—"
                }
              />
              <Row
                label="Pathway"
                value={
                  selected.pathway ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${PATHWAY_COLORS[selected.pathway] || "bg-gray-100 text-gray-600"}`}
                    >
                      {selected.pathway} · {PATHWAY_LABELS[selected.pathway] ?? selected.pathway}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label={lang === "es" ? "Registrado" : "Registered"}
                value={formatDate(selected.createdAt)}
              />
            </div>

            {/* ── Profile Completeness ──────────────────────────────── */}
            <div className="mt-6 border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {lang === "es" ? "Completitud del Perfil" : "Profile Completeness"}
                </h3>
                {loadingCompleteness && (
                  <span className="text-xs text-gray-400">{lang === "es" ? "Cargando…" : "Loading…"}</span>
                )}
              </div>
              {completeness ? (
                <div className="space-y-2">
                  {([
                    { key: "hasFarmData",       labelEn: "Farm data",       labelEs: "Datos de finca" },
                    { key: "hasEconomicsData",  labelEn: "Economics",       labelEs: "Economía" },
                    { key: "hasComplianceData", labelEn: "Compliance",      labelEs: "Cumplimiento" },
                    { key: "hasAiScore",        labelEn: "AI readiness score", labelEs: "Score IA" },
                    { key: "isGraduated",       labelEn: "Graduated",       labelEs: "Graduado" },
                  ] as const).map(({ key, labelEn, labelEs }) => {
                    const done = completeness[key];
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{lang === "es" ? labelEs : labelEn}</span>
                        <span className={done ? "text-green-600 font-medium" : "text-gray-300"}>
                          {done ? "✓" : "○"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !loadingCompleteness && (
                  <p className="text-xs text-gray-400">
                    {lang === "es" ? "No disponible" : "Not available"}
                  </p>
                )
              )}

              {/* Collect Farm Data CTA — shown when farm data is missing */}
              {completeness && !completeness.hasFarmData && (
                <Link
                  href={`/onboarding?supplierId=${selected.id}&prefill=1`}
                  className="mt-4 block w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition text-center"
                >
                  {lang === "es" ? "Recopilar datos de finca →" : "Collect farm data →"}
                </Link>
              )}
              {completeness && completeness.hasFarmData && !completeness.hasAiScore && (
                <p className="mt-3 text-xs text-amber-600 text-center">
                  {lang === "es"
                    ? "Datos capturados. El score IA se generará en breve."
                    : "Data captured. AI score will generate shortly."}
                </p>
              )}
            </div>

            {/* G5: Score Now button */}
            <div className="mt-6">
              <button
                onClick={() => scoreNow(selected.id)}
                disabled={scoring === selected.id}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition border ${
                  scoreStatus[selected.id] === "started"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : scoreStatus[selected.id] === "failed"
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                } disabled:opacity-60`}
              >
                {scoring === selected.id
                  ? (lang === "es" ? "Iniciando score…" : "Starting score…")
                  : scoreStatus[selected.id] === "started"
                    ? (lang === "es" ? "✓ Pipeline iniciado" : "✓ Pipeline started")
                    : scoreStatus[selected.id] === "failed"
                      ? (lang === "es" ? "✗ Error al iniciar" : "✗ Failed to start")
                      : (lang === "es" ? "⚡ Score Now" : "⚡ Score Now")}
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-1">
                {lang === "es" ? "Re-ejecuta el pipeline de evaluación IA" : "Re-runs the AI evaluation pipeline"}
              </p>
            </div>

            {/* Publish / Unpublish — always visible */}
            <div className="mt-4">
              {publishError && (
                <p className="mb-2 text-xs text-red-600 text-center">{publishError}</p>
              )}
              {selected.sellableStatus !== "PUBLISHED" ? (
                <>
                  <button
                    onClick={() => {
                      if (window.confirm(
                        lang === "es"
                          ? `¿Publicar a ${selected.nombreCompleto} en el marketplace? Esta acción hará el perfil visible para los compradores.`
                          : `Publish ${selected.nombreCompleto} to the marketplace? This will make their profile visible to buyers.`
                      )) publishSupplier(selected.id);
                    }}
                    disabled={publishing === selected.id}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition border bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 disabled:opacity-60"
                  >
                    {publishing === selected.id
                      ? (lang === "es" ? "Publicando…" : "Publishing…")
                      : (lang === "es" ? "🚀 Publicar en Marketplace" : "🚀 Publish to Marketplace")}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center mt-1">
                    {lang === "es"
                      ? "El perfil será visible para los compradores"
                      : "Profile will become visible to buyers"}
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                    {lang === "es" ? "Publicado en el marketplace" : "Live on marketplace"}
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(
                        lang === "es"
                          ? `¿Retirar a ${selected.nombreCompleto} del marketplace? El perfil dejará de ser visible para los compradores.`
                          : `Unpublish ${selected.nombreCompleto} from the marketplace? Their profile will no longer be visible to buyers.`
                      )) unpublishSupplier(selected.id);
                    }}
                    disabled={publishing === selected.id}
                    className="w-full py-2.5 rounded-lg text-sm font-medium transition border bg-white hover:bg-red-50 text-red-600 border-red-200 hover:border-red-300 disabled:opacity-60"
                  >
                    {publishing === selected.id
                      ? (lang === "es" ? "Retirando…" : "Unpublishing…")
                      : (lang === "es" ? "Retirar del Marketplace" : "Unpublish from Marketplace")}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center mt-1">
                    {lang === "es"
                      ? "El proveedor vuelve a estado SELLABLE"
                      : "Supplier returns to SELLABLE state"}
                  </p>
                </>
              )}
            </div>

            {/* ── Origin Stories publish / unpublish ────────────────────── */}
            {selected.ingestionSource === "ADMIN_ENTRY" && (
              <div className="mt-3">
                {originError && (
                  <p className="mb-2 text-xs text-red-600 text-center">{originError}</p>
                )}
                {selected.publishedToOriginStories ? (
                  <>
                    <div className="mb-2 flex items-center justify-center gap-1.5 text-xs text-amber-700 font-medium">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                      Live on Origin Stories
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove ${selected.nombreCompleto} from Origin Stories?`)) {
                          unpublishFromOriginStories(selected.id);
                        }
                      }}
                      disabled={originUnpublishing}
                      className="w-full py-2 rounded-lg text-sm font-medium transition border bg-white hover:bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300 disabled:opacity-60"
                    >
                      {originUnpublishing ? "Removing…" : "Unpublish from Origin Stories"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setOriginError("");
                      setOriginUploadError("");
                      setOriginImageUrl(selected.originStoryImageUrl ?? "");
                      setOriginImagePreview(null);
                      setOriginModalOpen(true);
                    }}
                    className="w-full py-2 rounded-lg text-sm font-semibold transition border bg-amber-600 hover:bg-amber-700 text-white border-amber-700"
                  >
                    📖 Publish to Origin Stories
                  </button>
                )}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">
                  {lang === "es" ? "Idioma del documento" : "Document language"}
                </p>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
                  <button
                    onClick={() => setDocLang("es")}
                    className={`flex-1 py-1.5 transition ${docLang === "es" ? "bg-green-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                  >
                    Español
                  </button>
                  <button
                    onClick={() => setDocLang("en")}
                    className={`flex-1 py-1.5 transition ${docLang === "en" ? "bg-green-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                  >
                    English
                  </button>
                </div>
              </div>
              <button
                onClick={() => generateDocument(selected.id, selected.nombreCompleto)}
                disabled={generating === selected.id}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
              >
                {generating === selected.id
                  ? lang === "es"
                    ? "Generando..."
                    : "Generating..."
                  : lang === "es"
                    ? "Generar Perfil de Proveedor"
                    : "Generate Supplier Profile"}
              </button>
              <button
                onClick={() => viewLastDoc(selected.id, selected.nombreCompleto)}
                className="w-full py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
              >
                {lang === "es" ? "Ver Último Documento" : "View Last Document"}
              </button>
              <a
                href={`https://wa.me/${selected.phone?.replace(/\D/g, "") ?? ""}`}
                target={"_blank"}
                rel="noopener noreferrer"
                className="block w-full py-2.5 bg-[#25D366] text-white rounded-lg text-sm font-medium text-center hover:bg-[#1ebe5d] transition"
              >
                {lang === "es"
                  ? "Contactar por WhatsApp"
                  : "Contact via WhatsApp"}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editOpen && selected && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => !editSaving && setEditOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-800">
              {lang === "es" ? "Editar perfil del proveedor" : "Edit Supplier Profile"}
              </h2>
              <button
                onClick={() => !editSaving && setEditOpen(false)}
                disabled={editSaving}
                className="text-gray-400 hover:text-gray-600 transition text-xl leading-none disabled:opacity-50"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {editError}
                </div>
              )}

              <EditField
                label={lang === "es" ? "Nombre completo" : "Full name"}
                value={editForm.nombreCompleto}
                onChange={(v) => setEditForm({ ...editForm, nombreCompleto: v })}
                error={editFieldErrors.nombreCompleto?.[0]}
                required
              />
              <EditField
                label={lang === "es" ? "Nombre de contacto" : "Contact name"}
                value={editForm.registeredBy}
                onChange={(v) => setEditForm({ ...editForm, registeredBy: v })}
                error={editFieldErrors.registeredBy?.[0]}
              />
              <EditField
                label={lang === "es" ? "WhatsApp / Teléfono" : "WhatsApp / Phone"}
                value={editForm.whatsappNumber}
                onChange={(v) => setEditForm({ ...editForm, whatsappNumber: v })}
                error={editFieldErrors.whatsappNumber?.[0]}
                placeholder="+57..."
              />
              <EditField
                label={lang === "es" ? "Correo electrónico" : "Email"}
                value={editForm.email}
                onChange={(v) => setEditForm({ ...editForm, email: v })}
                error={editFieldErrors.email?.[0]}
                type="email"
              />

              <div className="grid grid-cols-2 gap-3">
                <EditField
                  label={lang === "es" ? "Municipio" : "Municipality"}
                  value={editForm.municipio}
                  onChange={(v) => setEditForm({ ...editForm, municipio: v })}
                  error={editFieldErrors.municipio?.[0]}
                  required
                />
                <EditField
                  label={lang === "es" ? "Departamento" : "Department"}
                  value={editForm.department}
                  onChange={(v) => setEditForm({ ...editForm, department: v })}
                  error={editFieldErrors.department?.[0]}
                />
              </div>
              <EditField
                label={lang === "es" ? "Vereda" : "Vereda"}
                value={editForm.vereda}
                onChange={(v) => setEditForm({ ...editForm, vereda: v })}
                error={editFieldErrors.vereda?.[0]}
              />

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {lang === "es" ? "Tipo de proveedor" : "Supplier type"}
                </label>
                <select
                  value={editForm.supplierType}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      supplierType: e.target.value as EditForm["supplierType"],
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="FARMER">{lang === "es" ? "Productor" : "Farmer"}</option>
                  <option value="COOPERATIVE">{lang === "es" ? "Cooperativa" : "Cooperative"}</option>
                  <option value="EXPORTER">{lang === "es" ? "Exportador" : "Exporter"}</option>
                  <option value="PROCESSOR">{lang === "es" ? "Procesador" : "Processor"}</option>
                  <option value="DISTRIBUTOR">{lang === "es" ? "Distribuidor" : "Distributor"}</option>
                  <option value="OTHER">{lang === "es" ? "Otro" : "Other"}</option>
                </select>
                {editFieldErrors.supplierType?.[0] && (
                  <p className="mt-1 text-xs text-red-600">{editFieldErrors.supplierType[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {lang === "es" ? "Producto principal" : "Primary product"}
                </label>
                <select
                  value={editForm.primaryProduct}
                  onChange={(e) => setEditForm({ ...editForm, primaryProduct: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="">{lang === "es" ? "— Sin especificar —" : "— Unspecified —"}</option>
                  <option value="cacao">Cacao</option>
                  <option value="cafe">{lang === "es" ? "Café" : "Coffee"}</option>
                  <option value="bocadillo">Bocadillo</option>
                  <option value="panela">Panela</option>
                  <option value="lulo">Lulo</option>
                  <option value="pitahaya">Pitahaya</option>
                  <option value="uchuva">Uchuva</option>
                </select>
                {editFieldErrors.primaryProduct?.[0] && (
                  <p className="mt-1 text-xs text-red-600">{editFieldErrors.primaryProduct[0]}</p>
                )}
              </div>
            </div>
            <div className="border-t border-gray-100 px-6 py-4 shrink-0 flex gap-2">
              <button
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {lang === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
              >
                {editSaving
                  ? (lang === "es" ? "Guardando…" : "Saving…")
                  : (lang === "es" ? "Guardar cambios" : "Save changes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  error,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${
          error ? "border-red-300 bg-red-50" : "border-gray-300"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-50">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-800 text-right">{value}</span>
    </div>
  );
}
