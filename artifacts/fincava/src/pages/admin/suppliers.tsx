import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("fincava_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Supplier {
  id: number;
  nombreCompleto: string;
  contactName?: string;
  phone?: string;
  department?: string | null;
  municipio: string;
  supplierType: string;
  status: string;
  createdAt: string;
  exportReadinessScore: number | null;
  pathway: string | null;
  primaryProduct?: string | null;
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

function DocModal({
  supplierName,
  content,
  onClose,
}: {
  supplierName: string;
  content: string;
  onClose: () => void;
}) {
  function download() {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${supplierName.replace(/\s+/g, "_")}_document.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
            Generated Document — {supplierName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {content}
          </pre>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={download}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
          >
            Download as TXT
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSuppliersPage() {
  const { lang } = useLanguage();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [generating, setGenerating] = useState<number | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docContent, setDocContent] = useState<string | null>(null);
  const [docSupplierName, setDocSupplierName] = useState<string | null>(null);

  // Filters
  const [filterPathway, setFilterPathway] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSuppliers();
  }, [filterPathway, filterStatus]);

  async function fetchSuppliers() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterPathway) params.set("pathway", filterPathway);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/suppliers/admin-list?${params}`, { headers: authHeader() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSuppliers(data.data ?? []);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function updateSupplierStatus(supplierId: number, status: string) {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplierId ? { ...s, status } : s))
      );
      setSelected((prev) => (prev && prev.id === supplierId ? { ...prev, status } : prev));
    } catch (e) {
      // silently reset — select will revert on next render
    } finally {
      setStatusUpdating(false);
    }
  }

  async function generateDocument(supplierId: number, supplierName: string) {
    setGenerating(supplierId);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/generate-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ doc_type: "supplier_profile" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDocContent(data.documentContent);
      setDocSupplierName(supplierName);
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
        headers: authHeader(),
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
      setDocModalOpen(true);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
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
          content={docContent}
          onClose={() => setDocModalOpen(false)}
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
            onClick={fetchSuppliers}
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
                    disabled={statusUpdating}
                    onChange={(e) => updateSupplierStatus(selected.id, e.target.value)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-400 disabled:opacity-60 ${STATUS_COLORS[selected.status] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {SUPPLIER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                }
              />
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

            <div className="mt-8 space-y-3">
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
                href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`}
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
