import { useState, useEffect, useCallback } from "react";
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
  const [docLang, setDocLang] = useState<"en" | "es">("es");

  // Filters
  const [filterPathway, setFilterPathway] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchSuppliers(controller.signal);
    return () => controller.abort();
  }, [filterPathway, filterStatus]);

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
          <option value="pending">
            {lang === "es" ? "Pendiente" : "Pending"}
          </option>
          <option value="qualified">
            {lang === "es" ? "Calificado" : "Qualified"}
          </option>
          <option value="active">{lang === "es" ? "Activo" : "Active"}</option>
          <option value="rejected">
            {lang === "es" ? "Rechazado" : "Rejected"}
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
            <div className="flex items-center justify-between mb-6">
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

            <div className="mt-6 space-y-3">
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
