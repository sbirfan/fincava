interface BusinessReadinessFields {
  currently_exporting: string;
  has_rut: string;
  has_bank_account: string;
  working_capital_needed: string;
  export_blocker: string;
}

interface Props {
  form: BusinessReadinessFields;
  set: (field: string, value: string) => void;
  lang: string;
  inputClass: string;
  labelClass: string;
}

function YesNo({
  value,
  onChange,
  lang,
  inputClass,
}: {
  value: string;
  onChange: (v: string) => void;
  lang: string;
  inputClass: string;
}) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{lang === "es" ? "Seleccionar..." : "Select..."}</option>
      <option value="yes">{lang === "es" ? "Sí" : "Yes"}</option>
      <option value="no">No</option>
    </select>
  );
}

export function StepBusinessReadiness({ form, set, lang, inputClass, labelClass }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        {lang === "es" ? "Preparación para Exportación" : "Export Readiness"}
      </h2>

      <div>
        <label className={labelClass}>
          {lang === "es" ? "¿Actualmente exporta?" : "Currently exporting?"}
        </label>
        <YesNo value={form.currently_exporting} onChange={(v) => set("currently_exporting", v)} lang={lang} inputClass={inputClass} />
      </div>

      <div>
        <label className={labelClass}>
          {lang === "es" ? "¿Tiene RUT?" : "Has RUT (tax registration)?"}
        </label>
        <YesNo value={form.has_rut} onChange={(v) => set("has_rut", v)} lang={lang} inputClass={inputClass} />
      </div>

      <div>
        <label className={labelClass}>
          {lang === "es" ? "¿Tiene cuenta bancaria?" : "Has bank account?"}
        </label>
        <YesNo value={form.has_bank_account} onChange={(v) => set("has_bank_account", v)} lang={lang} inputClass={inputClass} />
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
          onChange={(e) => set("working_capital_needed", e.target.value)}
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
  );
}
