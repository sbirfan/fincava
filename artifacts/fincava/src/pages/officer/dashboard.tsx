import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, ShieldCheck, Users, ChevronRight, Download, LogOut, Settings, FileSpreadsheet, BarChart3 } from "lucide-react";
import { officerAuthHeaders, clearOfficerToken } from "@/lib/officer-auth";
import { useOfficerInactivity } from "@/hooks/useOfficerInactivity";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface SupplierRow {
  id: string;
  nombreCompleto: string;
  municipio: string | null;
  registeredBy: string | null;
  status: string;
  createdAt: string;
  cultivoPrincipal: string | null;
  potencialGeneral: number | null;
}

interface Stats {
  totalSuppliers: number;
  activeDrafts: number;
  expiringDrafts: number;
  duplicateAttempts: number;
}

const POTENCIAL_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-700",
  2: "bg-orange-100 text-orange-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-blue-100 text-blue-700",
  5: "bg-green-100 text-green-700",
};

function PotencialBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${POTENCIAL_COLORS[score] ?? "bg-gray-100 text-gray-600"}`}
    >
      {score}/5 · {POTENCIAL_LABELS[score] ?? "—"}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CULTIVOS = ["Café", "Cacao", "Panela", "Otro"];
const POTENCIAL_LABELS: Record<number, string> = {
  1: "Muy bajo",
  2: "Bajo",
  3: "Medio",
  4: "Alto",
  5: "Muy alto",
};

interface PotencialOption {
  value: string;
  label: string;
  potencial_min?: number;
  potencial_max?: number;
}

const POTENCIAL_FILTER_OPTIONS: PotencialOption[] = [
  { value: "all", label: "Todos los potenciales" },
  { value: "min:4", label: "4+ — Alto y Muy alto", potencial_min: 4 },
  { value: "min:3", label: "3+ — Medio o más", potencial_min: 3 },
  { value: "exact:5", label: "5/5 — Muy alto", potencial_min: 5, potencial_max: 5 },
  { value: "exact:4", label: "4/5 — Alto", potencial_min: 4, potencial_max: 4 },
  { value: "exact:3", label: "3/5 — Medio", potencial_min: 3, potencial_max: 3 },
  { value: "exact:2", label: "2/5 — Bajo", potencial_min: 2, potencial_max: 2 },
  { value: "exact:1", label: "1/5 — Muy bajo", potencial_min: 1, potencial_max: 1 },
];

const ALL_CSV_COLUMNS = [
  { key: "nombre", label: "Nombre" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "municipio", label: "Municipio" },
  { key: "cultivo", label: "Cultivo" },
  { key: "fecha_registro", label: "Fecha de registro" },
  { key: "potencial_general", label: "Potencial general" },
];

export default function OfficerDashboard() {
  const [search, setSearch] = useState("");
  const [cultivo, setCultivo] = useState("all");
  const [potencial, setPotencial] = useState("all");
  const [, navigate] = useLocation();

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(ALL_CSV_COLUMNS.map((c) => c.key));
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");

  const [showStats, setShowStats] = useState(false);

  useOfficerInactivity();

  function signOut() {
    clearOfficerToken();
    navigate("/officer/login");
  }

  function handleUnauthorized() {
    signOut();
  }

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  const selectedPotencialOption = POTENCIAL_FILTER_OPTIONS.find((o) => o.value === potencial);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (cultivo && cultivo !== "all") params.set("cultivo", cultivo);
  if (selectedPotencialOption?.potencial_min !== undefined) params.set("potencial_min", String(selectedPotencialOption.potencial_min));
  if (selectedPotencialOption?.potencial_max !== undefined) params.set("potencial_max", String(selectedPotencialOption.potencial_max));

  async function handleExport() {
    setIsExporting(true);
    setExportError(null);
    setShowColumnPicker(false);
    try {
      const exportParams = new URLSearchParams(params);
      if (exportFormat === "csv") {
        exportParams.set("columns", selectedColumns.join(","));
      }
      const endpoint = exportFormat === "xlsx"
        ? `${base}/api/officer/suppliers/export.xlsx`
        : `${base}/api/officer/suppliers/export`;
      const res = await fetch(`${endpoint}?${exportParams.toString()}`, {
        headers: officerAuthHeaders(),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error("Error al exportar proveedores");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFormat === "xlsx" ? "proveedores.xlsx" : "proveedores.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Error al exportar");
    } finally {
      setIsExporting(false);
    }
  }

  const { data, isLoading, isError } = useQuery<{ suppliers: SupplierRow[] }>({
    queryKey: ["officer-suppliers", search, cultivo, potencial],
    queryFn: async () => {
      const res = await fetch(`${base}/api/officer/suppliers?${params.toString()}`, {
        headers: officerAuthHeaders(),
      });
      if (res.status === 401) {
        handleUnauthorized();
        throw new Error("Session expired");
      }
      if (!res.ok) throw new Error("Error al cargar proveedores");
      return res.json();
    },
  });

  const { data: statsData } = useQuery<Stats>({
    queryKey: ["officer-stats"],
    queryFn: async () => {
      const res = await fetch(`${base}/api/officer/stats`, {
        headers: officerAuthHeaders(),
      });
      if (!res.ok) throw new Error("Error al cargar estadísticas");
      return res.json();
    },
    enabled: showStats,
  });

  const suppliers = data?.suppliers ?? [];

  function toggleColumn(key: string) {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-blue-700 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-blue-900">Panel Officer — Proveedores</h1>
              <p className="text-sm text-blue-600">Gestión y seguimiento de agricultores registrados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats((v) => !v)}
              className="text-blue-700 hover:bg-blue-100"
              title="Estadísticas"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/officer/settings")}
              className="text-blue-700 hover:bg-blue-100"
              title="Configuración"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-red-600 hover:bg-red-50"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Salir</span>
            </Button>
          </div>
        </div>

        {showStats && statsData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Agricultores registrados", value: statsData.totalSuppliers, color: "bg-blue-50 text-blue-800" },
              { label: "Borradores activos", value: statsData.activeDrafts, color: "bg-amber-50 text-amber-800" },
              { label: "Borradores por vencer", value: statsData.expiringDrafts, color: "bg-orange-50 text-orange-800" },
              { label: "Duplicados detectados", value: statsData.duplicateAttempts, color: "bg-red-50 text-red-800" },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-xl px-4 py-3 ${stat.color}`}>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs mt-0.5 opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre o municipio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={cultivo} onValueChange={setCultivo}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Cultivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los cultivos</SelectItem>
                {CULTIVOS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={potencial} onValueChange={setPotencial}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Potencial" />
              </SelectTrigger>
              <SelectContent>
                {POTENCIAL_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              {isLoading ? "Cargando..." : `${suppliers.length} proveedor${suppliers.length !== 1 ? "es" : ""}`}
            </div>
            <div className="flex items-center gap-2">
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "xlsx")}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                </SelectContent>
              </Select>
              {exportFormat === "csv" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowColumnPicker((v) => !v)}
                  disabled={isLoading || suppliers.length === 0}
                  className="text-xs h-8"
                >
                  Columnas
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting || isLoading || suppliers.length === 0}
                className="flex items-center gap-1.5 text-sm h-8"
              >
                {isExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : exportFormat === "xlsx" ? (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Exportar
              </Button>
            </div>
          </div>

          {showColumnPicker && exportFormat === "csv" && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
              <p className="text-xs font-semibold text-gray-600">Seleccionar columnas para exportar:</p>
              <div className="flex flex-wrap gap-3">
                {ALL_CSV_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedColumns.includes(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
              <Button
                size="sm"
                onClick={handleExport}
                disabled={isExporting || selectedColumns.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Exportar CSV
              </Button>
            </div>
          )}
        </div>

        {exportError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {exportError}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700">
            Error al cargar los proveedores. Por favor recargue la página.
          </div>
        )}

        {!isLoading && !isError && suppliers.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No se encontraron proveedores</p>
            <p className="text-sm mt-1">Intente con otros filtros o registre un nuevo agricultor.</p>
          </div>
        )}

        {!isLoading && !isError && suppliers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-5 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Nombre</span>
              <span>Municipio</span>
              <span>Cultivo</span>
              <span>Registro</span>
              <span>Potencial</span>
              <span></span>
            </div>

            <ul className="divide-y divide-gray-100">
              {suppliers.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto] sm:gap-x-4 px-5 py-4 hover:bg-blue-50 cursor-pointer transition-colors items-start sm:items-center gap-2"
                  onClick={() => navigate(`/officer/supplier/${s.id}`)}
                >
                  <div className="font-medium text-gray-900 truncate">{s.nombreCompleto}</div>
                  <div className="text-sm text-gray-500 whitespace-nowrap">{s.municipio ?? "—"}</div>
                  <div className="text-sm">
                    {s.cultivoPrincipal ? (
                      <Badge variant="outline" className="text-xs">
                        {s.cultivoPrincipal}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">{formatDate(s.createdAt)}</div>
                  <div><PotencialBadge score={s.potencialGeneral} /></div>
                  <ChevronRight className="h-4 w-4 text-gray-400 hidden sm:block" />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <a
            href="/officer/register"
            className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Registrar agricultor
          </a>
        </div>

      </div>
    </div>
  );
}
