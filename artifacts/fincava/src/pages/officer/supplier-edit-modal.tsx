import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Save, User, Sprout, TrendingUp, Banknote, Target, ShieldCheck, AlertCircle } from "lucide-react";
import { officerAuthHeaders, clearOfficerToken } from "@/lib/officer-auth";

const WHATSAPP_RE = /^\+57[0-9]{10}$/;

interface Supplier {
  id: string;
  nombreCompleto: string;
  whatsappNumber: string;
  municipio: string | null;
  vereda: string | null;
  supplierType: string | null;
  registeredBy: string | null;
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
  disposicion_cambiar?: number | null;
  horizonte_inversion?: string;
  meta_principal_12m?: string;
  principales_desafios?: string[];
}

interface OfficerMeta {
  salud_plantas?: string;
  infraestructura_postcosecha?: string;
  acceso_vial?: string;
  disposicion_agricultor?: string;
  potencial_general?: number | null;
  notas_officer?: string;
}

interface Props {
  supplierId: string;
  initial: {
    supplier: Supplier;
    farm: Farm | null;
    economics: Economics | null;
    goalsMeta: GoalsMeta | null;
    officerMeta: OfficerMeta | null;
  };
  onClose: () => void;
  base: string;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>;
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
    >
      <option value="">{placeholder ?? "Seleccionar..."}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function TextareaInput({
  value,
  onChange,
  placeholder,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows ?? 3}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
    />
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b pb-3 mb-4">
      <Icon className="h-5 w-5 text-blue-600 shrink-0" />
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
    </div>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const USO_CAPITAL_OPTIONS = [
  "Insumos agrícolas",
  "Maquinaria",
  "Mano de obra",
  "Mejoras de infraestructura",
  "Educación",
  "Salud",
  "Deudas",
  "Ahorro",
  "Otro",
];

const DESAFIOS_OPTIONS = [
  "Financiamiento",
  "Acceso a mercados",
  "Clima",
  "Plagas y enfermedades",
  "Infraestructura vial",
  "Mano de obra",
  "Precios bajos",
  "Falta de asistencia técnica",
];

function MultiCheckbox({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  function toggle(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-2 py-1 rounded-md text-xs border transition-colors ${
            selected.includes(opt)
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className={`text-2xl leading-none transition-colors ${
            n <= value ? "text-yellow-400" : "text-gray-200"
          }`}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <span className="ml-1 self-center text-sm text-gray-600 font-medium">{value}/5</span>
      )}
    </div>
  );
}

interface ValidationErrors {
  nombreCompleto?: string;
  whatsappNumber?: string;
  hectareas?: string;
  edadPlantas?: string;
  cosechas?: string;
  volumenKg?: string;
  personasDep?: string;
  potencialGeneral?: string;
}

export default function SupplierEditModal({ supplierId, initial, onClose, base }: Props) {
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const s = initial.supplier;
  const f = initial.farm;
  const e = initial.economics;
  const g = initial.goalsMeta;
  const o = initial.officerMeta;

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const [nombreCompleto, setNombreCompleto] = useState(s.nombreCompleto ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(s.whatsappNumber ?? "");
  const [municipio, setMunicipio] = useState(s.municipio ?? "");
  const [vereda, setVereda] = useState(s.vereda ?? "");
  const [supplierType, setSupplierType] = useState(s.supplierType ?? "");

  const [cultivoPrincipal, setCultivoPrincipal] = useState(f?.cultivoPrincipal ?? "");
  const [variedadCafe, setVariedadCafe] = useState(f?.variedadCafe ?? "");
  const [hectareas, setHectareas] = useState(f?.hectareasProduccion ?? "");
  const [edadPlantas, setEdadPlantas] = useState(f?.edadPlantasAnos != null ? String(f.edadPlantasAnos) : "");
  const [cosechas, setCosechas] = useState(f?.cosechasPorAno != null ? String(f.cosechasPorAno) : "");
  const [metodoSecado, setMetodoSecado] = useState(f?.metodoSecado ?? "");
  const [accesoAgua, setAccesoAgua] = useState(f?.accesoAgua ?? "");
  const [tenenciaTierra, setTenenciaTierra] = useState(f?.tenenciaTierra ?? "");

  const [tipoComprador, setTipoComprador] = useState(e?.tipoComprador ?? "");
  const [volumenKg, setVolumenKg] = useState(e?.volumenKgUltimaCosecha != null ? String(e.volumenKgUltimaCosecha) : "");
  const [precioVenta, setPrecioVenta] = useState(e?.precioVentaBanda ?? "");
  const [interesCanal, setInteresCanal] = useState<string>(
    e?.interesCanalpremium === true ? "si" : e?.interesCanalpremium === false ? "no" : ""
  );

  const [deudaActual, setDeudaActual] = useState(e?.deudaActual ?? "");
  const [usoCapital, setUsoCapital] = useState<string[]>(e?.usoCapital ?? []);
  const [personasDep, setPersonasDep] = useState(e?.personasDependientes != null ? String(e.personasDependientes) : "");
  const [situacionEcon, setSituacionEcon] = useState(e?.situacionEconomica ?? "");

  const [disposicionCambiar, setDisposicionCambiar] = useState<number>(g?.disposicion_cambiar ?? 0);
  const [horizonteInversion, setHorizonteInversion] = useState(g?.horizonte_inversion ?? "");
  const [metaPrincipal, setMetaPrincipal] = useState(g?.meta_principal_12m ?? "");
  const [desafios, setDesafios] = useState<string[]>(g?.principales_desafios ?? []);

  const [saludPlantas, setSaludPlantas] = useState(o?.salud_plantas ?? "");
  const [infra, setInfra] = useState(o?.infraestructura_postcosecha ?? "");
  const [accesoVial, setAccesoVial] = useState(o?.acceso_vial ?? "");
  const [disposicionAgr, setDisposicionAgr] = useState(o?.disposicion_agricultor ?? "");
  const [potencialGeneral, setPotencialGeneral] = useState<number>(o?.potencial_general ?? 0);
  const [notasOfficer, setNotasOfficer] = useState(o?.notas_officer ?? "");

  const [changeNote, setChangeNote] = useState("");
  const [showEvalWarning, setShowEvalWarning] = useState(false);

  const evalComplete = saludPlantas && infra && accesoVial && disposicionAgr && potencialGeneral > 0;
  const liveWhatsappOk = WHATSAPP_RE.test(whatsappNumber) || whatsappNumber === "";

  function validate(): ValidationErrors {
    const errors: ValidationErrors = {};
    if (!nombreCompleto.trim() || nombreCompleto.trim().length < 2) {
      errors.nombreCompleto = "El nombre completo es obligatorio (mínimo 2 caracteres).";
    }
    if (!WHATSAPP_RE.test(whatsappNumber)) {
      errors.whatsappNumber = "Formato inválido. Debe ser +57 seguido de 10 dígitos.";
    }
    if (hectareas !== "") {
      const ha = parseFloat(hectareas);
      if (isNaN(ha) || ha < 0) {
        errors.hectareas = "Debe ser un número positivo.";
      }
    }
    if (edadPlantas !== "") {
      const ep = Number(edadPlantas);
      if (!Number.isInteger(ep) || ep < 0) {
        errors.edadPlantas = "Debe ser un número entero no negativo.";
      }
    }
    if (cosechas !== "") {
      const c = Number(cosechas);
      if (!Number.isInteger(c) || c < 0) {
        errors.cosechas = "Debe ser un número entero no negativo.";
      }
    }
    if (volumenKg !== "") {
      const v = Number(volumenKg);
      if (isNaN(v) || v < 0) {
        errors.volumenKg = "Debe ser un número no negativo.";
      }
    }
    if (personasDep !== "") {
      const p = Number(personasDep);
      if (!Number.isInteger(p) || p < 0) {
        errors.personasDep = "Debe ser un número entero no negativo.";
      }
    }
    if (potencialGeneral === 0) {
      errors.potencialGeneral = "El potencial general es obligatorio. Asigna una calificación de 1 a 5 estrellas.";
    }
    return errors;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        supplier: {
          nombreCompleto: nombreCompleto || undefined,
          whatsappNumber: whatsappNumber || undefined,
          municipio: municipio || undefined,
          vereda: vereda || undefined,
          supplierType: supplierType || undefined,
        },
        farm: {
          cultivoPrincipal: cultivoPrincipal || undefined,
          variedadCafe: variedadCafe || undefined,
          hectareasProduccion: hectareas || undefined,
          edadPlantasAnos: edadPlantas !== "" ? Number(edadPlantas) : null,
          cosechasPorAno: cosechas !== "" ? Number(cosechas) : null,
          metodoSecado: metodoSecado || undefined,
          accesoAgua: accesoAgua || undefined,
          tenenciaTierra: tenenciaTierra || undefined,
        },
        economics: {
          tipoComprador: tipoComprador || undefined,
          volumenKgUltimaCosecha: volumenKg !== "" ? Number(volumenKg) : null,
          precioVentaBanda: precioVenta || undefined,
          deudaActual: deudaActual || undefined,
          usoCapital: usoCapital.length > 0 ? usoCapital : undefined,
          personasDependientes: personasDep !== "" ? Number(personasDep) : null,
          situacionEconomica: situacionEcon || undefined,
          interesCanalpremium:
            interesCanal === "si" ? true : interesCanal === "no" ? false : null,
        },
        goalsMeta: {
          disposicion_cambiar: disposicionCambiar || null,
          horizonte_inversion: horizonteInversion || undefined,
          meta_principal_12m: metaPrincipal || undefined,
          principales_desafios: desafios.length > 0 ? desafios : undefined,
        },
        officerMeta: {
          salud_plantas: saludPlantas || undefined,
          infraestructura_postcosecha: infra || undefined,
          acceso_vial: accesoVial || undefined,
          disposicion_agricultor: disposicionAgr || undefined,
          potencial_general: potencialGeneral || null,
          notas_officer: notasOfficer || undefined,
        },
        notes: changeNote.trim() || undefined,
      };

      const res = await fetch(`${base}/api/officer/suppliers/${supplierId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...officerAuthHeaders(),
        },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        clearOfficerToken();
        navigate("/officer/login");
        throw new Error("Session expired");
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Error al guardar cambios");
      }

      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["officer-supplier", supplierId] });
      qc.invalidateQueries({ queryKey: ["officer-suppliers"] });
      onClose();
    },
  });

  const qualityOptions = ["Excelente", "Buena", "Regular", "Deficiente"];
  const cropOptions = ["Café", "Cacao", "Panela", "Plátano", "Aguacate", "Otro"];
  const buyerOptions = [
    "Cooperativa",
    "Exportador directo",
    "Intermediario local",
    "Exportador",
    "Otro",
  ];
  const debtOptions = ["Sin deuda", "Baja", "Moderada", "Alta", "Muy alta"];
  const economicOptions = ["Muy difícil", "Difícil", "Regular", "Buena", "Excelente"];
  const horizonOptions = ["Menos de 1 año", "1–2 años", "3–5 años", "Más de 5 años"];
  const tenenciaOptions = ["Propio", "Arrendado", "Familiar", "Otro"];
  const secadoOptions = ["Solar", "Mecánico", "Mixto"];
  const aguaOptions = ["Fuente propia", "Acueducto", "Lluvia", "Compra", "Sin acceso"];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-2 py-4 sm:py-8">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-blue-50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-blue-900">Editar perfil del agricultor</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-8 overflow-y-auto max-h-[calc(100vh-160px)]">
          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {mutation.error instanceof Error ? mutation.error.message : "Error al guardar"}
            </div>
          )}

          <div>
            <SectionHeader icon={User} title="A. Identidad" />
            <FormRow>
              <Field label="Nombre completo">
                <TextInput value={nombreCompleto} onChange={(v) => { setNombreCompleto(v); if (validationErrors.nombreCompleto) setValidationErrors((prev) => ({ ...prev, nombreCompleto: undefined })); }} />
                {validationErrors.nombreCompleto && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {validationErrors.nombreCompleto}
                  </p>
                )}
              </Field>
              <Field label="WhatsApp">
                <TextInput value={whatsappNumber} onChange={(v) => { setWhatsappNumber(v); if (validationErrors.whatsappNumber) setValidationErrors((prev) => ({ ...prev, whatsappNumber: undefined })); }} placeholder="+57..." />
                {validationErrors.whatsappNumber ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {validationErrors.whatsappNumber}
                  </p>
                ) : !liveWhatsappOk ? (
                  <p className="mt-1 text-xs text-amber-600">Formato requerido: +57 seguido de 10 dígitos</p>
                ) : null}
              </Field>
              <Field label="Municipio">
                <TextInput value={municipio} onChange={setMunicipio} />
              </Field>
              <Field label="Vereda">
                <TextInput value={vereda} onChange={setVereda} />
              </Field>
              <Field label="Tipo de proveedor">
                <TextInput value={supplierType} onChange={setSupplierType} />
              </Field>
            </FormRow>
          </div>

          <div>
            <SectionHeader icon={Sprout} title="B. Información de la Finca" />
            <FormRow>
              <Field label="Cultivo principal">
                <SelectInput
                  value={cultivoPrincipal}
                  onChange={setCultivoPrincipal}
                  options={cropOptions}
                />
              </Field>
              <Field label="Variedad de café">
                <TextInput value={variedadCafe} onChange={setVariedadCafe} placeholder="Castillo, Caturra..." />
              </Field>
              <Field label="Hectáreas en producción">
                <NumberInput value={hectareas} onChange={(v) => { setHectareas(v); if (validationErrors.hectareas) setValidationErrors((prev) => ({ ...prev, hectareas: undefined })); }} placeholder="0.0" />
                {validationErrors.hectareas && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {validationErrors.hectareas}
                  </p>
                )}
              </Field>
              <Field label="Edad de plantas (años)">
                <NumberInput value={edadPlantas} onChange={(v) => { setEdadPlantas(v); if (validationErrors.edadPlantas) setValidationErrors((prev) => ({ ...prev, edadPlantas: undefined })); }} placeholder="0" />
                {validationErrors.edadPlantas && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {validationErrors.edadPlantas}
                  </p>
                )}
              </Field>
              <Field label="Cosechas por año">
                <NumberInput value={cosechas} onChange={(v) => { setCosechas(v); if (validationErrors.cosechas) setValidationErrors((prev) => ({ ...prev, cosechas: undefined })); }} placeholder="0" />
                {validationErrors.cosechas && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {validationErrors.cosechas}
                  </p>
                )}
              </Field>
              <Field label="Método de secado">
                <SelectInput value={metodoSecado} onChange={setMetodoSecado} options={secadoOptions} />
              </Field>
              <Field label="Acceso al agua">
                <SelectInput value={accesoAgua} onChange={setAccesoAgua} options={aguaOptions} />
              </Field>
              <Field label="Tenencia de tierra">
                <SelectInput value={tenenciaTierra} onChange={setTenenciaTierra} options={tenenciaOptions} />
              </Field>
            </FormRow>
          </div>

          <div>
            <SectionHeader icon={TrendingUp} title="C. Ventas y Comercialización" />
            <FormRow>
              <Field label="Tipo de comprador">
                <SelectInput value={tipoComprador} onChange={setTipoComprador} options={buyerOptions} />
              </Field>
              <Field label="Volumen última cosecha (kg)">
                <NumberInput value={volumenKg} onChange={(v) => { setVolumenKg(v); if (validationErrors.volumenKg) setValidationErrors((prev) => ({ ...prev, volumenKg: undefined })); }} placeholder="0" />
                {validationErrors.volumenKg && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {validationErrors.volumenKg}
                  </p>
                )}
              </Field>
              <Field label="Precio de venta (banda)">
                <TextInput value={precioVenta} onChange={setPrecioVenta} placeholder="Ej: $1.800–$2.200/kg" />
              </Field>
              <Field label="Interés en canal premium">
                <SelectInput
                  value={interesCanal}
                  onChange={setInteresCanal}
                  options={["si", "no"]}
                  placeholder="Seleccionar..."
                />
              </Field>
            </FormRow>
          </div>

          <div>
            <SectionHeader icon={Banknote} title="D. Situación Económica" />
            <FormRow>
              <Field label="Deuda actual">
                <SelectInput value={deudaActual} onChange={setDeudaActual} options={debtOptions} />
              </Field>
              <Field label="Personas dependientes">
                <NumberInput value={personasDep} onChange={(v) => { setPersonasDep(v); if (validationErrors.personasDep) setValidationErrors((prev) => ({ ...prev, personasDep: undefined })); }} placeholder="0" />
                {validationErrors.personasDep && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {validationErrors.personasDep}
                  </p>
                )}
              </Field>
              <Field label="Situación económica">
                <SelectInput value={situacionEcon} onChange={setSituacionEcon} options={economicOptions} />
              </Field>
            </FormRow>
            <div className="mt-4">
              <Label>Uso del capital</Label>
              <MultiCheckbox options={USO_CAPITAL_OPTIONS} selected={usoCapital} onChange={setUsoCapital} />
            </div>
          </div>

          <div>
            <SectionHeader icon={Target} title="E. Metas y Aspiraciones" />
            <div className="mb-4">
              <Label>Disposición al cambio (1–5)</Label>
              <StarPicker value={disposicionCambiar} onChange={setDisposicionCambiar} />
            </div>
            <FormRow>
              <Field label="Horizonte de inversión">
                <SelectInput value={horizonteInversion} onChange={setHorizonteInversion} options={horizonOptions} />
              </Field>
              <Field label="Meta principal (12 meses)">
                <TextInput value={metaPrincipal} onChange={setMetaPrincipal} placeholder="Describir meta..." />
              </Field>
            </FormRow>
            <div className="mt-4">
              <Label>Principales desafíos</Label>
              <MultiCheckbox options={DESAFIOS_OPTIONS} selected={desafios} onChange={setDesafios} />
            </div>
          </div>

          <div>
            <SectionHeader icon={ShieldCheck} title="F. Evaluación Officer" />
            {!evalComplete && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Para una evaluación completa, rellena todos los campos: salud de plantas, infraestructura, acceso vial y disposición del agricultor. El <strong>potencial general</strong> es obligatorio para guardar.
              </div>
            )}
            <FormRow>
              <Field label="Salud de plantas">
                <SelectInput value={saludPlantas} onChange={setSaludPlantas} options={qualityOptions} />
              </Field>
              <Field label="Infraestructura postcosecha">
                <SelectInput value={infra} onChange={setInfra} options={qualityOptions} />
              </Field>
              <Field label="Acceso vial">
                <SelectInput value={accesoVial} onChange={setAccesoVial} options={qualityOptions} />
              </Field>
              <Field label="Disposición del agricultor">
                <SelectInput value={disposicionAgr} onChange={setDisposicionAgr} options={qualityOptions} />
              </Field>
            </FormRow>
            <div className="mt-4">
              <Label>Potencial general <span className="text-red-500">*</span></Label>
              <StarPicker
                value={potencialGeneral}
                onChange={(v) => {
                  setPotencialGeneral(v);
                  if (validationErrors.potencialGeneral) {
                    setValidationErrors((prev) => ({ ...prev, potencialGeneral: undefined }));
                  }
                }}
              />
              {validationErrors.potencialGeneral && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {validationErrors.potencialGeneral}
                </p>
              )}
            </div>
            <div className="mt-4">
              <Label>Notas del officer</Label>
              <TextareaInput value={notasOfficer} onChange={setNotasOfficer} rows={4} placeholder="Observaciones..." />
            </div>
          </div>
        </div>

        <div className="px-6 pb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo del cambio <span className="text-gray-400 font-normal">(opcional)</span></label>
            <TextareaInput
              value={changeNote}
              onChange={setChangeNote}
              rows={2}
              placeholder="Ej: Corregí el tamaño de la finca después de visita de campo..."
            />
          </div>
          {showEvalWarning && !evalComplete && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              La evaluación del officer está incompleta. Puedes guardar de todas formas — vuelve a pulsar «Guardar cambios» para confirmar.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              const errors = validate();
              if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                return;
              }
              setValidationErrors({});
              if (!evalComplete && !showEvalWarning) {
                setShowEvalWarning(true);
                return;
              }
              setShowEvalWarning(false);
              mutation.mutate();
            }}
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
