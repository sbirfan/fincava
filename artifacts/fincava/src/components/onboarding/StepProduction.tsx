import { PRODUCT_OPTIONS } from "@/lib/onboarding-constants";

interface ProductionFields {
  primary_product: string;
  other_product: string;
  farm_size_hectares: string;
  annual_volume_kg: string;
  harvest_months: string;
  organic_certified: string;
}

interface Props {
  form: ProductionFields;
  set: (field: string, value: string) => void;
  lang: string;
  inputClass: string;
  labelClass: string;
}

export function StepProduction({ form, set, lang, inputClass, labelClass }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        {lang === "es" ? "Información de Producción" : "Production Information"}
      </h2>

      <div>
        <label className={labelClass}>
          {lang === "es" ? "Producto Principal *" : "Primary Product *"}
        </label>
        <select
          className={inputClass}
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
            {lang === "es" ? "Tamaño de Finca (ha)" : "Farm Size (hectares)"}
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
            {lang === "es" ? "Volumen Anual (kg)" : "Annual Volume (kg)"}
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
          {lang === "es" ? "¿Tiene certificación orgánica?" : "Organically certified?"}
        </label>
        <select
          className={inputClass}
          value={form.organic_certified}
          onChange={(e) => set("organic_certified", e.target.value)}
        >
          <option value="">{lang === "es" ? "Seleccionar..." : "Select..."}</option>
          <option value="yes">{lang === "es" ? "Sí" : "Yes"}</option>
          <option value="no">No</option>
        </select>
      </div>
    </div>
  );
}
