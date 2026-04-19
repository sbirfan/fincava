import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type LucideIcon, Loader2, ShieldCheck, ArrowLeft, User, Sprout, TrendingUp, Banknote, Target, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/auth";

interface Supplier {
  id: string;
  nombreCompleto: string;
  whatsappNumber: string;
  municipio: string | null;
  vereda: string | null;
  supplierType: string | null;
  registeredBy: string | null;
  status: string;
  consentGiven: boolean;
  createdAt: string;
}

interface Farm {
  cultivoPrincipal: string | null;
  variedadCafe: string | null;
  hectareasProduccion: string | null;
  edadPlantasAnos: number | null;
  cosechasPorAno: number | null;
  metodoSecado: string | null;
  accesoAgua: string | null;
  tenenciaTierra: string | null;
}

interface Economics {
  tipoComprador: string | null;
  volumenKgUltimaCosecha: number | null;
  precioVentaBanda: string | null;
  deudaActual: string | null;
  usoCapital: string[] | null;
  personasDependientes: number | null;
  situacionEconomica: string | null;
  interesCanalpremium: boolean | null;
}

interface GoalsMeta {
  disposicion_cambiar?: number;
  horizonte_inversion?: string;
  meta_principal_12m?: string;
  principales_desafios?: string[];
}

interface OfficerMeta {
  salud_plantas?: string;
  infraestructura_postcosecha?: string;
  acceso_vial?: string;
  disposicion_agricultor?: string;
  potencial_general?: number;
  notas_officer?: string;
}

interface ProfileData {
  supplier: Supplier;
  farm: Farm | null;
  economics: Economics | null;
  goalsMeta: GoalsMeta | null;
  officerMeta: OfficerMeta | null;
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <Icon className="h-5 w-5 text-blue-600 shrink-0" />
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | boolean | null | string[] }) {
  let display: React.ReactNode = <span className="text-gray-400">—</span>;

  if (value === null || value === undefined) {
    display = <span className="text-gray-400">—</span>;
  } else if (typeof value === "boolean") {
    display = value ? (
      <Badge variant="outline" className="text-xs text-green-700 border-green-300">Sí</Badge>
    ) : (
      <Badge variant="outline" className="text-xs text-red-700 border-red-300">No</Badge>
    );
  } else if (Array.isArray(value)) {
    display = value.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <Badge key={i} variant="secondary" className="text-xs">{v}</Badge>
        ))}
      </div>
    ) : (
      <span className="text-gray-400">—</span>
    );
  } else {
    display = <span className="text-gray-900 font-medium">{String(value)}</span>;
  }

  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {display}
    </div>
  );
}

function PotencialStars({ score }: { score?: number }) {
  if (!score) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${i < score ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`}
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-gray-700">{score}/5</span>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function OfficerSupplierProfile() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/officer/supplier/:id");
  const id = params?.id;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  const { data, isLoading, isError } = useQuery<ProfileData>({
    queryKey: ["officer-supplier", id],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(`${base}/api/officer/suppliers/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al cargar perfil");
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md p-8 text-center space-y-4 max-w-md">
          <p className="text-red-600 font-medium">No se pudo cargar el perfil del proveedor.</p>
          <button
            onClick={() => navigate("/officer/dashboard")}
            className="text-blue-600 underline text-sm"
          >
            Volver al panel
          </button>
        </div>
      </div>
    );
  }

  const { supplier, farm, economics, goalsMeta, officerMeta } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-5">

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/officer/dashboard")}
            className="p-2 rounded-xl hover:bg-blue-100 text-blue-700 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-700 shrink-0" />
            <h1 className="text-xl font-bold text-blue-900">Perfil del Agricultor</h1>
          </div>
        </div>

        {officerMeta?.potencial_general && (
          <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col sm:flex-row sm:items-center gap-4 border-l-4 border-blue-500">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Potencial de exportación (evaluación officer)</p>
              <PotencialStars score={officerMeta.potencial_general} />
            </div>
            {officerMeta.notas_officer && (
              <div className="flex-1 text-sm text-gray-600 italic border-l pl-4">
                "{officerMeta.notas_officer}"
              </div>
            )}
          </div>
        )}

        <Section icon={User} title="A. Identidad">
          <Field label="Nombre completo" value={supplier.nombreCompleto} />
          <Field label="WhatsApp" value={supplier.whatsappNumber} />
          <Field label="Municipio" value={supplier.municipio} />
          <Field label="Vereda" value={supplier.vereda} />
          <Field label="Tipo de proveedor" value={supplier.supplierType} />
          <Field label="Registrado por" value={supplier.registeredBy} />
          <Field label="Fecha de registro" value={formatDate(supplier.createdAt)} />
          <Field label="Consentimiento" value={supplier.consentGiven} />
        </Section>

        <Section icon={Sprout} title="B. Información de la Finca">
          <Field label="Cultivo principal" value={farm?.cultivoPrincipal} />
          <Field label="Variedad de café" value={farm?.variedadCafe} />
          <Field label="Hectáreas en producción" value={farm?.hectareasProduccion ? `${farm.hectareasProduccion} ha` : null} />
          <Field label="Edad de plantas" value={farm?.edadPlantasAnos != null ? `${farm.edadPlantasAnos} años` : null} />
          <Field label="Cosechas por año" value={farm?.cosechasPorAno} />
          <Field label="Método de secado" value={farm?.metodoSecado} />
          <Field label="Acceso al agua" value={farm?.accesoAgua} />
          <Field label="Tenencia de tierra" value={farm?.tenenciaTierra} />
        </Section>

        <Section icon={TrendingUp} title="C. Ventas y Comercialización">
          <Field label="Tipo de comprador" value={economics?.tipoComprador} />
          <Field label="Volumen última cosecha (kg)" value={economics?.volumenKgUltimaCosecha} />
          <Field label="Precio de venta (banda)" value={economics?.precioVentaBanda} />
          <Field label="Interés en canal premium" value={economics?.interesCanalpremium} />
        </Section>

        <Section icon={Banknote} title="D. Situación Económica">
          <Field label="Deuda actual" value={economics?.deudaActual} />
          <Field label="Uso del capital" value={economics?.usoCapital} />
          <Field label="Personas dependientes" value={economics?.personasDependientes} />
          <Field label="Situación económica" value={economics?.situacionEconomica} />
        </Section>

        <Section icon={Target} title="E. Metas y Aspiraciones">
          <Field label="Disposición al cambio (1–5)" value={goalsMeta?.disposicion_cambiar} />
          <Field label="Horizonte de inversión" value={goalsMeta?.horizonte_inversion} />
          <Field label="Meta principal (12 meses)" value={goalsMeta?.meta_principal_12m} />
          <Field label="Principales desafíos" value={goalsMeta?.principales_desafios} />
        </Section>

        {officerMeta && (
          <Section icon={ShieldCheck} title="F. Evaluación Officer">
            <Field label="Salud de plantas" value={officerMeta.salud_plantas} />
            <Field label="Infraestructura postcosecha" value={officerMeta.infraestructura_postcosecha} />
            <Field label="Acceso vial" value={officerMeta.acceso_vial} />
            <Field label="Disposición del agricultor" value={officerMeta.disposicion_agricultor} />
            <div className="sm:col-span-2">
              <p className="text-xs text-gray-500 mb-1">Potencial general</p>
              <PotencialStars score={officerMeta.potencial_general} />
            </div>
            {officerMeta.notas_officer && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500 mb-1">Notas del officer</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">{officerMeta.notas_officer}</p>
              </div>
            )}
          </Section>
        )}

      </div>
    </div>
  );
}
