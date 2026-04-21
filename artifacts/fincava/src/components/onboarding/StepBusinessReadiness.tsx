interface BusinessReadinessFields {
  currently_exporting: string;
  has_rut: string;
  has_bank_account: string;
  working_capital_needed: string;
  export_blocker: string;
  business_structure: string;
  part_of_cooperative: string;
  vuce_registered: string;
  invima_required: string;
  invima_approved: string;
  ica_registered: string;
}

interface Props {
  form: BusinessReadinessFields;
  set: (field: string, value: string) => void;
  lang: string;
  inputClass: string;
  labelClass: string;
}

function MultiChoice({
  value,
  onChange,
  options,
  lang,
  inputClass,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; en: string; es: string }[];
  lang: string;
  inputClass: string;
}) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{lang === "es" ? "Seleccionar..." : "Select..."}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {lang === "es" ? o.es : o.en}
        </option>
      ))}
    </select>
  );
}

const FIVE_OPTS = [
  { value: "yes",          en: "Yes",          es: "Sí" },
  { value: "no",           en: "No",           es: "No" },
  { value: "in_progress",  en: "In progress",  es: "En proceso" },
  { value: "not_required", en: "Not required", es: "No requerido" },
  { value: "not_sure",     en: "Not sure",     es: "No estoy seguro/a" },
];

const THREE_OPTS = [
  { value: "yes",         en: "Yes",         es: "Sí" },
  { value: "no",          en: "No",          es: "No" },
  { value: "in_progress", en: "In progress", es: "En proceso" },
];

const INVIMA_APPROVAL_OPTS = [
  { value: "yes",          en: "Yes",          es: "Sí" },
  { value: "no",           en: "No",           es: "No" },
  { value: "in_progress",  en: "In progress",  es: "En proceso" },
  { value: "not_required", en: "Not required", es: "No requerido" },
];

const BUSINESS_STRUCTURE_OPTS = [
  { value: "informal",           en: "Informal",           es: "Informal" },
  { value: "individual",         en: "Individual",         es: "Individual" },
  { value: "cooperative",        en: "Cooperative",        es: "Cooperativa" },
  { value: "registered_company", en: "Registered Company", es: "Empresa registrada" },
];

export function StepBusinessReadiness({ form, set, lang, inputClass, labelClass }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        {lang === "es" ? "Preparación para Exportación" : "Export Readiness"}
      </h2>

      {/* Currently exporting */}
      <div>
        <label className={labelClass}>
          {lang === "es" ? "¿Actualmente exporta?" : "Currently exporting?"}
        </label>
        <MultiChoice
          value={form.currently_exporting}
          onChange={(v) => set("currently_exporting", v)}
          options={THREE_OPTS}
          lang={lang}
          inputClass={inputClass}
        />
      </div>

      {/* RUT */}
      <div>
        <label className={labelClass}>
          {lang === "es"
            ? "¿Está registrado en el RUT ante la DIAN?"
            : "Are you registered with the Colombian tax authority (RUT)?"}
        </label>
        <MultiChoice
          value={form.has_rut}
          onChange={(v) => set("has_rut", v)}
          options={FIVE_OPTS}
          lang={lang}
          inputClass={inputClass}
        />
      </div>

      {/* Bank account */}
      <div>
        <label className={labelClass}>
          {lang === "es"
            ? "¿Tiene una cuenta bancaria a nombre propio o del negocio?"
            : "Do you have a bank account in the business or personal name?"}
        </label>
        <MultiChoice
          value={form.has_bank_account}
          onChange={(v) => set("has_bank_account", v)}
          options={THREE_OPTS}
          lang={lang}
          inputClass={inputClass}
        />
      </div>

      {/* Business structure */}
      <div>
        <label className={labelClass}>
          {lang === "es" ? "¿Cuál es su estructura empresarial?" : "What is your business structure?"}
        </label>
        <MultiChoice
          value={form.business_structure}
          onChange={(v) => set("business_structure", v)}
          options={BUSINESS_STRUCTURE_OPTS}
          lang={lang}
          inputClass={inputClass}
        />
      </div>

      {/* Cooperative / association */}
      <div>
        <label className={labelClass}>
          {lang === "es"
            ? "¿Hace parte de una cooperativa o asociación?"
            : "Are you part of a cooperative or association?"}
        </label>
        <MultiChoice
          value={form.part_of_cooperative}
          onChange={(v) => set("part_of_cooperative", v)}
          options={THREE_OPTS}
          lang={lang}
          inputClass={inputClass}
        />
      </div>

      {/* VUCE */}
      <div>
        <label className={labelClass}>
          {lang === "es"
            ? "¿Está registrado para exportar en la VUCE?"
            : "Are you registered to export through VUCE?"}
        </label>
        <MultiChoice
          value={form.vuce_registered}
          onChange={(v) => set("vuce_registered", v)}
          options={FIVE_OPTS}
          lang={lang}
          inputClass={inputClass}
        />
      </div>

      {/* INVIMA required */}
      <div>
        <label className={labelClass}>
          {lang === "es"
            ? "¿Sus productos requieren registro INVIMA?"
            : "Do your products require INVIMA registration?"}
        </label>
        <MultiChoice
          value={form.invima_required}
          onChange={(v) => set("invima_required", v)}
          options={FIVE_OPTS}
          lang={lang}
          inputClass={inputClass}
        />
      </div>

      {/* INVIMA approval */}
      <div>
        <label className={labelClass}>
          {lang === "es"
            ? "¿Cuenta con aprobación INVIMA (si aplica)?"
            : "Do you currently have INVIMA approval (if required)?"}
        </label>
        <MultiChoice
          value={form.invima_approved}
          onChange={(v) => set("invima_approved", v)}
          options={INVIMA_APPROVAL_OPTS}
          lang={lang}
          inputClass={inputClass}
        />
      </div>

      {/* ICA */}
      <div>
        <label className={labelClass}>
          {lang === "es"
            ? "¿Sus fincas están registradas ante el ICA?"
            : "Are your farms registered with ICA?"}
        </label>
        <MultiChoice
          value={form.ica_registered}
          onChange={(v) => set("ica_registered", v)}
          options={FIVE_OPTS}
          lang={lang}
          inputClass={inputClass}
        />
      </div>

      {/* Capital needed (COP) */}
      <div>
        <label className={labelClass}>
          {lang === "es" ? "Capital de trabajo necesario (COP)" : "Working capital needed (COP)"}
        </label>
        <input
          className={inputClass}
          type="number"
          min="0"
          value={form.working_capital_needed}
          onChange={(e) => set("working_capital_needed", e.target.value)}
          placeholder={lang === "es" ? "Ej. 5000000" : "e.g. 5000000"}
        />
      </div>

      {/* Export blocker */}
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
  );
}
