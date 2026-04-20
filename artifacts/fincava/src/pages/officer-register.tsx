import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

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

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  department: string;
  municipio: string;
  languages: string[];
  experience_years: string;
  has_motorcycle: string;
  available_days: string;
  motivation: string;
  referral_code: string;
}

const INITIAL: FormData = {
  full_name: "",
  email: "",
  phone: "",
  department: "",
  municipio: "",
  languages: [],
  experience_years: "",
  has_motorcycle: "",
  available_days: "",
  motivation: "",
  referral_code: "",
};

const LANGUAGE_OPTIONS = [
  { value: "es", labelEn: "Spanish", labelEs: "Español" },
  { value: "en", labelEn: "English", labelEs: "Inglés" },
  { value: "other", labelEn: "Other / Indigenous", labelEs: "Otro / Indígena" },
];

export default function OfficerRegisterPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const selectClass = inputClass;

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleLanguage = (val: string) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(val)
        ? prev.languages.filter((l) => l !== val)
        : [...prev.languages, val],
    }));
  };

  const validate = () => {
    if (!form.full_name || !form.phone || !form.department || !form.municipio) {
      alert(
        lang === "es"
          ? "Por favor complete los campos requeridos (*)"
          : "Please fill all required fields (*)",
      );
      return false;
    }
    return true;
  };

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email || undefined,
        phone: form.phone,
        department: form.department,
        municipio: form.municipio,
        languages: form.languages,
        experience_years: form.experience_years
          ? parseInt(form.experience_years)
          : undefined,
        has_motorcycle: form.has_motorcycle === "yes",
        available_days: form.available_days || undefined,
        motivation: form.motivation || undefined,
        referral_code: form.referral_code || undefined,
      };

      const res = await fetch("/api/officers/register", {
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
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🤝</div>
          <h2 className="text-2xl font-bold text-blue-700 mb-2">
            {lang === "es" ? "¡Solicitud Enviada!" : "Application Submitted!"}
          </h2>
          <p className="text-gray-600 mb-6">
            {lang === "es"
              ? "Gracias por querer unirse al equipo de Fincava. Le contactaremos pronto."
              : "Thank you for applying to join the Fincava field team. We'll be in touch soon."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {lang === "es" ? "Volver al Inicio" : "Back to Home"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800">
            {lang === "es"
              ? "Registro de Oficial de Campo"
              : "Field Officer Registration"}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {lang === "es"
              ? "Únase al equipo que conecta productores con mercados globales"
              : "Join the team connecting producers with global markets"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
          {/* Personal Info */}
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">
              {lang === "es" ? "Información Personal" : "Personal Information"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  {lang === "es" ? "Nombre Completo *" : "Full Name *"}
                </label>
                <input
                  className={inputClass}
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder={
                    lang === "es" ? "Su nombre completo" : "Your full name"
                  }
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
            </div>
          </div>

          {/* Location */}
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">
              {lang === "es" ? "Ubicación" : "Location"}
            </h2>
            <div className="space-y-4">
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
            </div>
          </div>

          {/* Field Capacity */}
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">
              {lang === "es" ? "Capacidad en Campo" : "Field Capacity"}
            </h2>
            <div className="space-y-4">
              {/* Languages */}
              <div>
                <label className={labelClass}>
                  {lang === "es" ? "Idiomas que habla" : "Languages spoken"}
                </label>
                <div className="flex gap-3 flex-wrap mt-1">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <label
                      key={l.value}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.languages.includes(l.value)}
                        onChange={() => toggleLanguage(l.value)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      {lang === "es" ? l.labelEs : l.labelEn}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    {lang === "es"
                      ? "Años de experiencia agrícola"
                      : "Years of agricultural experience"}
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max="50"
                    value={form.experience_years}
                    onChange={(e) => set("experience_years", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {lang === "es" ? "¿Tiene moto?" : "Has motorcycle?"}
                  </label>
                  <select
                    className={selectClass}
                    value={form.has_motorcycle}
                    onChange={(e) => set("has_motorcycle", e.target.value)}
                  >
                    <option value="">
                      {lang === "es" ? "Seleccionar..." : "Select..."}
                    </option>
                    <option value="yes">{lang === "es" ? "Sí" : "Yes"}</option>
                    <option value="no">{lang === "es" ? "No" : "No"}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  {lang === "es"
                    ? "Días disponibles por semana"
                    : "Days available per week"}
                </label>
                <input
                  className={inputClass}
                  value={form.available_days}
                  onChange={(e) => set("available_days", e.target.value)}
                  placeholder={
                    lang === "es"
                      ? "Ej. Lunes a Viernes, fines de semana"
                      : "e.g. Monday to Friday, weekends"
                  }
                />
              </div>
            </div>
          </div>

          {/* Motivation */}
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">
              {lang === "es" ? "Motivación" : "Motivation"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  {lang === "es"
                    ? "¿Por qué quiere ser oficial de campo de Fincava?"
                    : "Why do you want to be a Fincava field officer?"}
                </label>
                <textarea
                  className={inputClass}
                  rows={4}
                  value={form.motivation}
                  onChange={(e) => set("motivation", e.target.value)}
                  placeholder={
                    lang === "es"
                      ? "Cuéntenos sobre su motivación y experiencia relevante..."
                      : "Tell us about your motivation and relevant experience..."
                  }
                />
              </div>
              <div>
                <label className={labelClass}>
                  {lang === "es" ? "Código de Referido" : "Referral Code"}
                </label>
                <input
                  className={inputClass}
                  value={form.referral_code}
                  onChange={(e) => set("referral_code", e.target.value)}
                  placeholder={lang === "es" ? "Opcional" : "Optional"}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition text-sm"
            >
              {submitting
                ? lang === "es"
                  ? "Enviando..."
                  : "Submitting..."
                : lang === "es"
                  ? "Enviar Solicitud ✓"
                  : "Submit Application ✓"}
            </button>
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
