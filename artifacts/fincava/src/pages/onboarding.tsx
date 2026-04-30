import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";
import { StepFarmIdentity } from "@/components/onboarding/StepFarmIdentity";
import { StepProduction } from "@/components/onboarding/StepProduction";
import { StepBusinessReadiness } from "@/components/onboarding/StepBusinessReadiness";
import { ReviewSummary, type ReviewSection } from "@/components/onboarding/ReviewSummary";
import { PRODUCT_OPTIONS } from "@/lib/onboarding-constants";

type Step = 1 | 2 | 3 | 4 | 5;

interface FormData {
  farm_name: string;
  owner_name: string;
  phone: string;
  email: string;
  department: string;
  municipio: string;
  vereda: string;
  primary_product: string;
  other_product: string;
  farm_size_hectares: string;
  annual_volume_kg: string;
  harvest_months: string;
  organic_certified: string;
  currently_exporting: string;
  has_rut: string;
  has_bank_account: string;
  business_structure: string;
  part_of_cooperative: string;
  vuce_registered: string;
  invima_required: string;
  invima_approved: string;
  ica_registered: string;
  working_capital_needed: string;
  export_blocker: string;
  officer_name: string;
  officer_code: string;
  visit_notes: string;
}

const INITIAL: FormData = {
  farm_name: "", owner_name: "", phone: "", email: "",
  department: "", municipio: "", vereda: "",
  primary_product: "", other_product: "", farm_size_hectares: "",
  annual_volume_kg: "", harvest_months: "", organic_certified: "",
  currently_exporting: "", has_rut: "", has_bank_account: "",
  business_structure: "", part_of_cooperative: "", vuce_registered: "",
  invima_required: "", invima_approved: "", ica_registered: "",
  working_capital_needed: "", export_blocker: "",
  officer_name: "", officer_code: "", visit_notes: "",
};

export default function OnboardingPage() {
  const { lang } = useLanguage();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [prefillName, setPrefillName] = useState<string | null>(null);
  const [prefillSupplierId, setPrefillSupplierId] = useState<number | null>(null);

  // ── Pre-fill mode: populate form from an existing ingested supplier ──────
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const sid = params.get("supplierId");
    const prefill = params.get("prefill");

    // Officer params — pre-fill Step 4 fields when launched from officer dashboard.
    const officerName = params.get("officerName");
    const officerCode = params.get("officerCode");
    if (officerName || officerCode) {
      setForm((prev) => ({
        ...prev,
        officer_name: officerName || prev.officer_name,
        officer_code: officerCode || prev.officer_code,
      }));
    }

    if (!sid || prefill !== "1") return;
    const id = Number(sid);
    if (isNaN(id)) return;
    setPrefillLoading(true);
    fetch(`/api/suppliers/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const s = data.supplier;
        if (!s) return;
        setPrefillSupplierId(id);
        setPrefillName(s.nombreCompleto || s.normalizedName || "");
        setForm((prev) => ({
          ...prev,
          owner_name:  s.nombreCompleto || "",
          farm_name:   s.normalizedName || s.nombreCompleto || "",
          phone:       s.whatsappNumber || "",
          email:       s.email || "",
          department:  s.department || "",
          municipio:   s.municipio || "",
        }));
      })
      .catch(() => {})
      .finally(() => setPrefillLoading(false));
  }, [searchString]);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload: Record<string, unknown> = {
        ...(prefillSupplierId ? { supplierId: prefillSupplierId } : {}),
        business_name: form.farm_name,
        contact_name: form.owner_name,
        phone: form.phone,
        email: form.email || undefined,
        supplier_type: "farmer",
        department: form.department,
        municipio: form.municipio,
        farm_name: form.farm_name,
        vereda: form.vereda,
        farm_size_hectares: form.farm_size_hectares ? parseFloat(form.farm_size_hectares) : undefined,
        primary_product: form.primary_product === "other" ? form.other_product : form.primary_product,
        annual_volume_kg: form.annual_volume_kg ? parseFloat(form.annual_volume_kg) : undefined,
        harvest_months: form.harvest_months || undefined,
        organic_certified: form.organic_certified === "yes",
        currently_exporting: form.currently_exporting === "yes",
        working_capital_needed: form.working_capital_needed ? parseFloat(form.working_capital_needed) : undefined,
        export_blocker: form.export_blocker || undefined,
        has_rut: form.has_rut || undefined,
        has_bank_account: form.has_bank_account || undefined,
        business_structure: form.business_structure || undefined,
        part_of_cooperative: form.part_of_cooperative || undefined,
        vuce_registered: form.vuce_registered || undefined,
        invima_required: form.invima_required || undefined,
        invima_approved: form.invima_approved || undefined,
        ica_registered: form.ica_registered || undefined,
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
            {prefillSupplierId
              ? (lang === "es" ? "¡Perfil Completado!" : "Profile Complete!")
              : (lang === "es" ? "¡Registro Exitoso!" : "Registration Successful!")}
          </h2>
          <p className="text-gray-600 mb-6">
            {prefillSupplierId
              ? (lang === "es"
                  ? "Los datos de finca han sido guardados. El score IA se generará en breve."
                  : "Farm data saved. The AI score will be generated shortly.")
              : (lang === "es"
                  ? "Hemos recibido la información de su finca. Un asesor de Fincava se comunicará con usted pronto."
                  : "We've received your farm information. A Fincava advisor will reach out shortly.")}
          </p>
          <button
            onClick={() => setLocation(prefillSupplierId ? "/admin/suppliers" : "/")}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            {prefillSupplierId
              ? (lang === "es" ? "Volver a Proveedores" : "Back to Suppliers")
              : (lang === "es" ? "Volver al Inicio" : "Back to Home")}
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
    { num: 5, label: lang === "es" ? "Revisión" : "Review" },
  ];

  const productLabel = () => {
    const raw = form.primary_product === "other" ? form.other_product : form.primary_product;
    const opt = PRODUCT_OPTIONS.find((p) => p.value === raw);
    return opt ? (lang === "es" ? opt.labelEs : opt.labelEn) : raw;
  };

  const displayChoice = (v: string) => {
    const map: Record<string, { en: string; es: string }> = {
      yes:              { en: "Yes",          es: "Sí" },
      no:               { en: "No",           es: "No" },
      in_progress:      { en: "In progress",  es: "En proceso" },
      not_required:     { en: "Not required", es: "No requerido" },
      not_sure:         { en: "Not sure",     es: "No estoy seguro/a" },
      informal:         { en: "Informal",     es: "Informal" },
      individual:       { en: "Individual",   es: "Individual" },
      cooperative:      { en: "Cooperative",  es: "Cooperativa" },
      registered_company: { en: "Registered Company", es: "Empresa registrada" },
    };
    const entry = map[v];
    if (!entry) return v || "—";
    return lang === "es" ? entry.es : entry.en;
  };
  const yesNo = (v: string) => displayChoice(v);

  const reviewSections: ReviewSection[] = [
    {
      title: lang === "es" ? "Información de la Finca" : "Farm Information",
      onEdit: () => setStep(1),
      rows: [
        { label: lang === "es" ? "Nombre Finca" : "Farm Name", value: form.farm_name },
        { label: lang === "es" ? "Propietario" : "Owner", value: form.owner_name },
        { label: lang === "es" ? "Teléfono" : "Phone", value: form.phone },
        { label: lang === "es" ? "Departamento" : "Department", value: form.department },
        { label: lang === "es" ? "Municipio" : "Municipality", value: form.municipio },
        { label: "Vereda", value: form.vereda },
      ],
    },
    {
      title: lang === "es" ? "Producción" : "Production",
      onEdit: () => setStep(2),
      rows: [
        { label: lang === "es" ? "Producto" : "Product", value: productLabel() },
        { label: lang === "es" ? "Tamaño (ha)" : "Size (ha)", value: form.farm_size_hectares },
        { label: lang === "es" ? "Volumen Anual (kg)" : "Annual Volume (kg)", value: form.annual_volume_kg },
        { label: lang === "es" ? "Cosechas" : "Harvest Months", value: form.harvest_months },
        { label: lang === "es" ? "Orgánico" : "Organic", value: yesNo(form.organic_certified) },
      ],
    },
    {
      title: lang === "es" ? "Preparación Exportación" : "Export Readiness",
      onEdit: () => setStep(3),
      rows: [
        { label: lang === "es" ? "Exporta actualmente" : "Currently Exporting",          value: displayChoice(form.currently_exporting) },
        { label: "RUT (DIAN)",                                                            value: displayChoice(form.has_rut) },
        { label: lang === "es" ? "Cuenta Bancaria" : "Bank Account",                     value: displayChoice(form.has_bank_account) },
        { label: lang === "es" ? "Estructura empresarial" : "Business Structure",        value: displayChoice(form.business_structure) },
        { label: lang === "es" ? "Cooperativa / Asociación" : "Cooperative / Assoc.",    value: displayChoice(form.part_of_cooperative) },
        { label: "VUCE",                                                                  value: displayChoice(form.vuce_registered) },
        { label: lang === "es" ? "Registro INVIMA requerido" : "INVIMA Required",        value: displayChoice(form.invima_required) },
        { label: lang === "es" ? "Aprobación INVIMA" : "INVIMA Approval",                value: displayChoice(form.invima_approved) },
        { label: "ICA",                                                                   value: displayChoice(form.ica_registered) },
        { label: lang === "es" ? "Capital Necesario (COP)" : "Capital Needed (COP)",     value: form.working_capital_needed },
        { label: lang === "es" ? "Obstáculo" : "Blocker",                               value: form.export_blocker },
      ],
    },
    {
      title: lang === "es" ? "Oficial de Campo" : "Field Officer",
      onEdit: () => setStep(4),
      rows: [
        { label: lang === "es" ? "Nombre Oficial" : "Officer Name", value: form.officer_name },
        { label: lang === "es" ? "Código" : "Code", value: form.officer_code },
        { label: lang === "es" ? "Notas" : "Notes", value: form.visit_notes },
      ],
    },
  ];

  const canAdvance = () => {
    if (step === 1) return !!(form.farm_name && form.owner_name && form.phone && form.department && form.municipio);
    if (step === 2) return !!form.primary_product;
    return true;
  };

  if (prefillLoading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">{lang === "es" ? "Cargando datos del proveedor…" : "Loading supplier data…"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Pre-fill mode banner */}
        {prefillSupplierId && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-amber-500 text-lg mt-0.5">⚙</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {lang === "es" ? "Modo: Completar perfil de proveedor" : "Mode: Complete supplier profile"}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {lang === "es"
                  ? `Recopilando datos de finca para: ${prefillName}`
                  : `Collecting farm data for: ${prefillName}`}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                {lang === "es"
                  ? "Los campos de identidad están bloqueados. Complete los datos de producción y cumplimiento."
                  : "Identity fields are locked. Please complete the production and compliance sections."}
              </p>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800">
            {prefillSupplierId
              ? (lang === "es" ? "Completar Perfil" : "Complete Profile")
              : (lang === "es" ? "Registro de Proveedor" : "Supplier Registration")}
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
                className="flex flex-col items-center cursor-pointer"
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
          {step === 1 && (
            <StepFarmIdentity form={form} set={set} lang={lang} inputClass={inputClass} labelClass={labelClass} locked={!!prefillSupplierId} />
          )}
          {step === 2 && (
            <StepProduction form={form} set={set} lang={lang} inputClass={inputClass} labelClass={labelClass} />
          )}
          {step === 3 && (
            <StepBusinessReadiness form={form} set={set} lang={lang} inputClass={inputClass} labelClass={labelClass} />
          )}

          {/* Step 4 — Field Officer */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {lang === "es" ? "Información del Oficial de Campo" : "Field Officer Information"}
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
                <input className={inputClass} value={form.officer_name} onChange={(e) => set("officer_name", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>
                  {lang === "es" ? "Código del Oficial" : "Officer Code"}
                </label>
                <input className={inputClass} value={form.officer_code} onChange={(e) => set("officer_code", e.target.value)} placeholder="FO-001" />
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
            </div>
          )}

          {/* Step 5 — Review */}
          {step === 5 && (
            <ReviewSummary
              sections={reviewSections}
              onBack={() => setStep(4)}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={submitError}
              lang={lang}
            />
          )}

          {/* Navigation (steps 1–4 only; step 5 has its own buttons) */}
          {step < 5 && (
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
              <button
                onClick={() => {
                  if (!canAdvance()) {
                    alert(
                      lang === "es"
                        ? "Por favor complete los campos obligatorios."
                        : "Please fill in all required fields."
                    );
                    return;
                  }
                  setStep((s) => (s + 1) as Step);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
              >
                {lang === "es" ? "Siguiente →" : "Next →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
