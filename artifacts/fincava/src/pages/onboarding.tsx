import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";

const COLOMBIA_DEPARTMENTS = [
  "Antioquia",
  "Atlántico",
  "Bogotá D.C.",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guajira",
  "Huila",
  "Magdalena",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Quindío",
  "Risaralda",
  "San Andrés y Providencia",
  "Santander",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Arauca",
  "Putumayo",
  "Amazonas",
  "Guainía",
  "Guaviare",
  "Vaupés",
  "Vichada",
];

const PRODUCT_OPTIONS = [
  { value: "cacao", labelEn: "Specialty Cacao", labelEs: "Cacao Especial" },
  { value: "cafe", labelEn: "Coffee (Café)", labelEs: "Café" },
  {
    value: "bocadillo",
    labelEn: "Bocadillo de Guayaba",
    labelEs: "Bocadillo de Guayaba",
  },
  {
    value: "panela",
    labelEn: "Panela / Organic Cane Sugar",
    labelEs: "Panela / Azúcar de Caña Orgánica",
  },
  { value: "lulo", labelEn: "Lulo (Naranjilla)", labelEs: "Lulo" },
  { value: "feijoa", labelEn: "Feijoa", labelEs: "Feijoa" },
  {
    value: "pitahaya",
    labelEn: "Pitahaya (Dragon Fruit)",
    labelEs: "Pitahaya",
  },
  { value: "uchuva", labelEn: "Uchuva (Cape Gooseberry)", labelEs: "Uchuva" },
  { value: "other", labelEn: "Other", labelEs: "Otro" },
];

type Step = 1 | 2 | 3 | 4;

interface FormData {
  // Step 1 — Farm Identity
  farm_name: string;
  owner_name: string;
  phone: string;
  email: string;
  department: string;
  municipio: string;
  vereda: string;

  // Step 2 — Production
  primary_product: string;
  other_product: string;
  farm_size_hectares: string;
  annual_volume_kg: string;
  harvest_months: string;
  organic_certified: string;

  // Step 3 — Business Readiness
  currently_exporting: string;
  has_rut: string;
  has_bank_account: string;
  working_capital_needed: string;
  export_blocker: string;

  // Step 4 — Field Officer
  officer_name: string;
  officer_code: string;
  visit_notes: string;
}

const INITIAL: FormData = {
  farm_name: "",
  owner_name: "",
  phone: "",
  email: "",
  department: "",
  municipio: "",
  vereda: "",
  primary_product: "",
  other_product: "",
  farm_size_hectares: "",
  annual_volume_kg: "",
  harvest_months: "",
  organic_certified: "",
  currently_exporting: "",
  has_rut: "",
  has_bank_account: "",
  working_capital_needed: "",
  export_blocker: "",
  officer_name: "",
  officer_code: "",
  visit_notes: "",
};

export default function OnboardingPage() {
  const { t, lang } = useLanguage();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const selectClass = inputClass;

  const yn = (field: keyof FormData) => (
    <select
      className={selectClass}
      value={form[field]}
      onChange={(e) => set(field, e.target.value)}
    >
      <option value="">{lang === "es" ? "Seleccionar..." : "Select..."}</option>
      <option value="yes">{lang === "es" ? "Sí" : "Yes"}</option>
      <option value="no">{lang === "es" ? "No" : "No"}</option>
    </select>
  );

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        // supplier
        business_name: form.farm_name,
        contact_name: form.owner_name,
        phone: form.phone,
        email: form.email || undefined,
        supplier_type: "farmer",
        department: form.department,
        municipio: form.municipio,
        // farm
        farm_name: form.farm_name,
        vereda: form.vereda,
        farm_size_hectares: form.farm_size_hectares
          ? parseFloat(form.farm_size_hectares)
          : undefined,
        primary_product:
          form.primary_product === "other"
            ? form.other_product
            : form.primary_product,
        annual_volume_kg: form.annual_volume_kg
          ? parseFloat(form.annual_volume_kg)
          : undefined,
        harvest_months: form.harvest_months || undefined,
        organic_certified: form.organic_certified === "yes",
        // economics
        currently_exporting: form.currently_exporting === "yes",
        working_capital_needed: form.working_capital_needed
          ? parseFloat(form.working_capital_needed)
          : undefined,
        export_blocker: form.export_blocker || undefined,
        // compliance
        has_rut: form.has_rut === "yes",
        has_bank_account: form.has_bank_account === "yes",
        // interaction
        officer_name: form.officer_name || undefined,
        officer_code: form.officer_code || undefined,
        visit_notes: form.visit_notes || undefined,
      };

      const res = await fetch("/api/suppliers/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🌱</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">
            {lang === "es" ? "¡Registro Exitoso!" : "Registration Successful!"}
          </h2>
          <p className="text-gray-600 mb-6">
            {lang === "es"
              ? "Hemos recibido la información de su finca. Un asesor de Fincava se comunicará con usted pronto."
              : "We've received your farm information. A Fincava advisor will reach out shortly."}
          </p>
          <button
            onClick={() => setLocation("/")}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            {lang === "es" ? "Volver al Inicio" : "Back to Home"}
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: lang === "es" ? "Finca" : "Farm" },
    { num: 2, label: lang === "es" ? "Producción" : "Production" },
    { num: 3, label: lang === "es" ? "Negocios" : "Business" },
    { num: 4, label: lang === "es" ? "Oficial" : "Officer" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800">
            {lang === "es" ? "Registro de Proveedor" : "Supplier Registration"}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {lang === "es"
              ? "Únase a la red de exportadores de Fincava"
              : "Join the Fincava export network"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8 gap-1">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex flex-col items-center cursor-pointer`}
                onClick={() => s.num < step && setStep(s.num as Step)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    step === s.num
                      ? "bg-green-600 text-white"
                      : step > s.num
                        ? "bg-green-200 text-green-800"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </div>
                <span className="text-xs mt-1 text-gray-500">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mb-4 mx-1 ${step > s.num ? "bg-green-400" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          {/* STEP 1 — Farm Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {lang === "es" ? "Información de la Finca" : "Farm Information"}
              </h2>
              <div>
                <label className={labelClass}>
                  {lang === "es" ? "Nombre de la Finca *" : "Farm Name *"}
                </label>
                <input
                  className={inputClass}
                  value={form.farm_name}
                  onChange={(e) => set("farm_name", e.target.value)}
                  placeholder={
                    lang === "es"
                      ? "Ej. Finca El Paraíso"
                      : "e.g. El Paraíso Farm"
                  }
                />
              </div>
              <div>
                <label className={labelClass}>
                  {lang === "es" ? "Nombre del Propietario *" : "Owner Name *"}
                </label>
                <input
                  className={inputClass}
                  value={form.owner_name}
                  onChange={(e) => set("owner_name", e.target.value)}
                  placeholder={lang === "es" ? "Nombre completo" : "Full name"}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    {lang === "es"
                      ? "Teléfono / WhatsApp *"
                      : "Phone / WhatsApp *"}
                  </label>
                  <input
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+57 300 000 0000"
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    className={inputClass}
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder={lang === "es" ? "Opcional" : "Optional"}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  {lang === "es" ? "Departamento *" : "Department *"}
                </label>
                <select
                  className={selectClass}
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                >
                  <option value="">
                    {lang === "es"
                      ? "Seleccionar departamento"
                      : "Select department"}
                  </option>
                  {COLOMBIA_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    {lang === "es" ? "Municipio *" : "Municipality *"}
                  </label>
                  <input
                    className={inputClass}
                    value={form.municipio}
                    onChange={(e) => set("municipio", e.target.value)}
                    placeholder={lang === "es" ? "Ej. San Gil" : "e.g. San Gil"}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {lang === "es" ? "Vereda" : "Village / Vereda"}
                  </label>
                  <input
                    className={inputClass}
                    value={form.vereda}
                    onChange={(e) => set("vereda", e.target.value)}
                    placeholder={lang === "es" ? "Opcional" : "Optional"}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Production */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {lang === "es"
                  ? "Información de Producción"
                  : "Production Information"}
              </h2>
              <div>
                <label className={labelClass}>
                  {lang === "es" ? "Producto Principal *" : "Primary Product *"}
                </label>
                <select
                  className={selectClass}
                  value={form.primary_product}
                  onChange={(e) => set("primary_product", e.target.value)}
                >
                  <option value="">
                    {lang === "es" ? "Seleccionar producto" : "Select product"}
                  </option>
                  {PRODUCT_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {lang === "es" ? p.labelEs : p.labelEn}
                    </option>
                  ))}
                </select>
              </div>
              {form.primary_product === "other" && (
                <div>
                  <label className={labelClass}>
                    {lang === "es" ? "Especificar Producto" : "Specify Product"}
                  </label>
                  <input
                    className={inputClass}
                    value={form.other_product}
                    onChange={(e) => set("other_product", e.target.value)}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    {lang === "es"
                      ? "Tamaño de Finca (ha)"
                      : "Farm Size (hectares)"}
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.farm_size_hectares}
                    onChange={(e) => set("farm_size_hectares", e.target.value)}
                    placeholder="e.g. 2.5"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {lang === "es"
                      ? "Volumen Anual (kg)"
                      : "Annual Volume (kg)"}
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    value={form.annual_volume_kg}
                    onChange={(e) => set("annual_volume_kg", e.target.value)}
                    placeholder="e.g. 5000"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  {lang === "es" ? "Meses de Cosecha" : "Harvest Months"}
                </label>
                <input
                  className={inputClass}
                  value={form.harvest_months}
                  onChange={(e) => set("harvest_months", e.target.value)}
                  placeholder={
                    lang === "es"
                      ? "Ej. Marzo, Abril, Octubre"
                      : "e.g. March, April, October"
                  }
                />
              </div>
              <div>
                <label className={labelClass}>
                  {lang === "es"
                    ? "¿Tiene certificación orgánica?"
                    : "Organically certified?"}
                </label>
                {yn("organic_certified")}
              </div>
            </div>
          )}

          {/* STEP 3 — Business Readiness */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {lang === "es"
                  ? "Preparación para Exportación"
                  : "Export Readiness"}
              </h2>
              <div>
                <label className={labelClass}>
                  {lang === "es"
                    ? "¿Actualmente exporta?"
                    : "Currently exporting?"}
                </label>
                {yn("currently_exporting")}
              </div>
              <div>
                <label className={labelClass}>
                  {lang === "es"
                    ? "¿Tiene RUT?"
                    : "Has RUT (tax registration)?"}
                </label>
                {yn("has_rut")}
              </div>
              <div>
                <label className={labelClass}>
                  {lang === "es"
                    ? "¿Tiene cuenta bancaria?"
                    : "Has bank account?"}
                </label>
                {yn("has_bank_account")}
              </div>
              <div>
                <label className={labelClass}>
                  {lang === "es"
                    ? "Capital de trabajo necesario (USD)"
                    : "Working capital needed (USD)"}
                </label>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={form.working_capital_needed}
                  onChange={(e) =>
                    set("working_capital_needed", e.target.value)
                  }
                  placeholder={lang === "es" ? "Ej. 2000" : "e.g. 2000"}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {lang === "es"
                    ? "¿Cuál es el mayor obstáculo para exportar?"
                    : "Biggest blocker to exporting?"}
                </label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.export_blocker}
                  onChange={(e) => set("export_blocker", e.target.value)}
                  placeholder={
                    lang === "es"
                      ? "Ej. No tengo capital, no sé los trámites..."
                      : "e.g. No capital, don't know the process..."
                  }
                />
              </div>
            </div>
          )}

          {/* STEP 4 — Field Officer */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {lang === "es"
                  ? "Información del Oficial de Campo"
                  : "Field Officer Information"}
              </h2>
              <p className="text-sm text-gray-500">
                {lang === "es"
                  ? "Complete esta sección si un oficial de campo está registrando al proveedor."
                  : "Complete this section if a field officer is registering this supplier."}
              </p>
              <div>
                <label className={labelClass}>
                  {lang === "es" ? "Nombre del Oficial" : "Officer Name"}
                </label>
                <input
                  className={inputClass}
                  value={form.officer_name}
                  onChange={(e) => set("officer_name", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {lang === "es" ? "Código del Oficial" : "Officer Code"}
                </label>
                <input
                  className={inputClass}
                  value={form.officer_code}
                  onChange={(e) => set("officer_code", e.target.value)}
                  placeholder="FO-001"
                />
              </div>
              <div>
                <label className={labelClass}>
                  {lang === "es" ? "Notas de la Visita" : "Visit Notes"}
                </label>
                <textarea
                  className={inputClass}
                  rows={4}
                  value={form.visit_notes}
                  onChange={(e) => set("visit_notes", e.target.value)}
                  placeholder={
                    lang === "es"
                      ? "Observaciones sobre la finca, el productor, condiciones..."
                      : "Observations about the farm, producer, conditions..."
                  }
                />
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                {lang === "es" ? "← Anterior" : "← Back"}
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={() => {
                  // Basic required field check per step
                  if (
                    step === 1 &&
                    (!form.farm_name ||
                      !form.owner_name ||
                      !form.phone ||
                      !form.department ||
                      !form.municipio)
                  ) {
                    alert(
                      lang === "es"
                        ? "Por favor complete los campos requeridos (*)"
                        : "Please fill required fields (*)",
                    );
                    return;
                  }
                  if (step === 2 && !form.primary_product) {
                    alert(
                      lang === "es"
                        ? "Por favor seleccione el producto principal"
                        : "Please select primary product",
                    );
                    return;
                  }
                  setStep((s) => (s + 1) as Step);
                }}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
              >
                {lang === "es" ? "Siguiente →" : "Next →"}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition"
              >
                {submitting
                  ? lang === "es"
                    ? "Enviando..."
                    : "Submitting..."
                  : lang === "es"
                    ? "Registrar Proveedor ✓"
                    : "Register Supplier ✓"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          {lang === "es"
            ? "Fincava — Conectando productores colombianos con mercados globales"
            : "Fincava — Connecting Colombian producers with global markets"}
        </p>
      </div>
    </div>
  );
}
