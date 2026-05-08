import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface SupplierResult {
  id: number;
  nombreCompleto: string;
  municipio: string;
  department?: string | null;
  primaryProduct?: string | null;
  ingestionStatus?: string | null;
  sellableStatus?: string | null;
  hasFarmData?: boolean;
}

export default function OfficerDashboard() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SupplierResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const officerName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Officer";
  const officerCode = `FO-${user?.id ?? "000"}`;

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      // Server-side text search: q param does ILIKE on name, municipio, department, product.
      const params = new URLSearchParams({ q, limit: "50" });
      const res = await fetch(`/api/suppliers/admin-list?${params}`, { credentials: "include" });
      const data = await res.json();
      // admin-list returns { data: [...], total, ... }
      const all: SupplierResult[] = data.data ?? [];
      setResults(all);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search, doSearch]);

  function startFarmVisit(supplier: SupplierResult) {
    const params = new URLSearchParams({
      supplierId: String(supplier.id),
      prefill: "1",
      officerName,
      officerCode,
    });
    setLocation(`/onboarding?${params}`);
  }

  function startCompliance(supplier: SupplierResult) {
    setLocation(`/officer/compliance?supplierId=${supplier.id}`);
  }

  function registerNewSupplier() {
    const params = new URLSearchParams({ officerName, officerCode });
    setLocation(`/onboarding?${params}`);
  }

  const statusBadge = (s: SupplierResult) => {
    if (s.sellableStatus === "SELLABLE" || s.sellableStatus === "PUBLISHED")
      return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Active</span>;
    if (s.ingestionStatus === "READY")
      return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Ingested</span>;
    if (s.ingestionStatus === "DRAFT" || s.ingestionStatus === "ENRICHED")
      return <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Draft</span>;
    return <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Pending</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-green-800 text-white px-5 py-5 safe-top">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-base font-bold">
              {officerName.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-green-300 uppercase tracking-wide font-semibold">
                {lang === "es" ? "Oficial de Campo" : "Field Officer"}
              </p>
              <p className="font-semibold text-sm">{officerName}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-green-300">{lang === "es" ? "Código" : "Code"}</p>
              <p className="font-mono text-sm font-semibold">{officerCode}</p>
            </div>
          </div>
          <div className="mt-4">
            <h1 className="text-xl font-bold">
              {lang === "es" ? "Visita de Campo" : "Farm Visit"}
            </h1>
            <p className="text-green-300 text-sm mt-0.5">
              {lang === "es"
                ? "Busque un proveedor existente o registre uno nuevo."
                : "Search for an existing supplier or register a new one."}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Register new supplier — primary CTA */}
        <button
          onClick={registerNewSupplier}
          className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-base shadow-sm transition flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span>
          {lang === "es" ? "Registrar nuevo proveedor" : "Register new supplier"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 text-gray-400 text-xs">
          <div className="flex-1 h-px bg-gray-200" />
          <span>{lang === "es" ? "o encuentra uno existente" : "or find an existing one"}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Supplier search */}
        <div className="relative">
          <input
            className="w-full border border-gray-300 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            placeholder={lang === "es" ? "Buscar proveedor por nombre, municipio o producto…" : "Search by name, municipality, or product…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>

        {/* Search results */}
        {loading && (
          <div className="text-center py-6 text-gray-400 text-sm">
            {lang === "es" ? "Buscando…" : "Searching…"}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">{lang === "es" ? "No se encontraron proveedores" : "No suppliers found"}</p>
            <p className="text-xs mt-1 text-gray-400">
              {lang === "es" ? "Use el botón de arriba para registrar uno nuevo." : "Use the button above to register a new one."}
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium">
              {results.length} {lang === "es" ? "resultado(s)" : "result(s)"}
            </p>
            {results.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 text-sm truncate">{s.nombreCompleto}</p>
                    {statusBadge(s)}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.municipio}{s.department ? `, ${s.department}` : ""}
                  </p>
                  {s.primaryProduct && (
                    <p className="text-xs text-green-700 mt-0.5 font-medium capitalize">{s.primaryProduct}</p>
                  )}
                  {s.ingestionStatus === "READY" && (
                    <p className="text-xs text-amber-600 mt-1">
                      {lang === "es" ? "⚠ Falta datos de finca" : "⚠ Farm data missing"}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => startFarmVisit(s)}
                  className="shrink-0 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-semibold transition border border-green-200 whitespace-nowrap"
                >
                  {lang === "es" ? "Visita →" : "Visit →"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            {lang === "es" ? "Cómo usar" : "How to use"}
          </h3>
          <ol className="space-y-2 text-xs text-gray-500 list-decimal list-inside">
            <li>{lang === "es" ? "Busque si el agricultor ya existe en el sistema." : "Search to check if the farmer already exists in the system."}</li>
            <li>{lang === "es" ? "Si existe, toque Visita para completar su perfil de finca." : 'If found, tap "Visit" to complete their farm profile.'}</li>
            <li>{lang === "es" ? "Si no existe, use Registrar nuevo proveedor." : 'If not found, use "Register new supplier".'}</li>
            <li>{lang === "es" ? "Sus datos de oficial se añaden automáticamente." : "Your officer details are added automatically."}</li>
          </ol>
        </div>

      </div>
    </div>
  );
}
