import { COLOMBIA_DEPARTMENTS } from "@/lib/onboarding-constants";

interface FarmIdentityFields {
  farm_name: string;
  owner_name: string;
  phone: string;
  email: string;
  department: string;
  municipio: string;
  vereda: string;
}

interface Props {
  form: FarmIdentityFields;
  set: (field: string, value: string) => void;
  lang: string;
  inputClass: string;
  labelClass: string;
  showEmailField?: boolean;
}

export function StepFarmIdentity({ form, set, lang, inputClass, labelClass, showEmailField = true }: Props) {
  return (
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
          placeholder={lang === "es" ? "Ej. Finca El Paraíso" : "e.g. El Paraíso Farm"}
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

      <div>
        <label className={labelClass}>
          {lang === "es" ? "Teléfono / WhatsApp *" : "Phone / WhatsApp *"}
        </label>
        <input
          className={inputClass}
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="+57 300 000 0000"
        />
      </div>

      {showEmailField && (
        <div>
          <label className={labelClass}>
            {lang === "es" ? "Correo electrónico" : "Email address"}
            <span className="ml-1 font-normal text-gray-400">
              ({lang === "es" ? "opcional" : "optional"})
            </span>
          </label>
          <input
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder={lang === "es" ? "su@correo.com" : "your@email.com"}
          />
          <p className="mt-1 text-xs text-gray-400">
            {lang === "es"
              ? "Le enviaremos una confirmación de su solicitud."
              : "We'll send you a confirmation of your application."}
          </p>
        </div>
      )}

      <div>
        <label className={labelClass}>
          {lang === "es" ? "Departamento *" : "Department *"}
        </label>
        <select
          className={inputClass}
          value={form.department}
          onChange={(e) => set("department", e.target.value)}
        >
          <option value="">
            {lang === "es" ? "Seleccionar departamento" : "Select department"}
          </option>
          {COLOMBIA_DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
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
  );
}
