import { useState } from "react";
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
import { Loader2, Search, ShieldCheck, Users, ChevronRight } from "lucide-react";
import { officerAuthHeaders, clearOfficerToken } from "@/lib/officer-auth";

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

function PotencialBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-xs">—</span>;
  const colors: Record<number, string> = {
    1: "bg-red-100 text-red-700",
    2: "bg-orange-100 text-orange-700",
    3: "bg-yellow-100 text-yellow-700",
    4: "bg-blue-100 text-blue-700",
    5: "bg-green-100 text-green-700",
  };
  const labels: Record<number, string> = {
    1: "Muy bajo",
    2: "Bajo",
    3: "Medio",
    4: "Alto",
    5: "Muy alto",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${colors[score] ?? "bg-gray-100 text-gray-600"}`}
    >
      {score}/5 · {labels[score] ?? "—"}
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

export default function OfficerDashboard() {
  const [search, setSearch] = useState("");
  const [cultivo, setCultivo] = useState("all");
  const [, navigate] = useLocation();

  function handleUnauthorized() {
    clearOfficerToken();
    navigate("/officer/login");
  }

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (cultivo && cultivo !== "all") params.set("cultivo", cultivo);

  const { data, isLoading, isError } = useQuery<{ suppliers: SupplierRow[] }>({
    queryKey: ["officer-suppliers", search, cultivo],
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

  const suppliers = data?.suppliers ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-blue-700 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Panel Officer — Proveedores</h1>
            <p className="text-sm text-blue-600">Gestión y seguimiento de agricultores registrados</p>
          </div>
        </div>

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
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Cultivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los cultivos</SelectItem>
                {CULTIVOS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            {isLoading ? "Cargando..." : `${suppliers.length} proveedor${suppliers.length !== 1 ? "es" : ""}`}
          </div>
        </div>

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
