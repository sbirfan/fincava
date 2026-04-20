import { Pencil, CheckCircle } from "lucide-react";

export interface ReviewSection {
  title: string;
  onEdit: () => void;
  rows: { label: string; value: string }[];
}

interface Props {
  sections: ReviewSection[];
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
  lang: string;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 text-xs shrink-0 w-40">{label}</span>
      <span className="text-gray-800 text-xs text-right font-medium">
        {value || <span className="text-gray-300 font-normal italic">—</span>}
      </span>
    </div>
  );
}

export function ReviewSummary({ sections, onBack, onSubmit, submitting, error, lang }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <h2 className="text-lg font-semibold text-gray-800">
          {lang === "es" ? "Resumen y Confirmación" : "Review & Confirm"}
        </h2>
      </div>
      <p className="text-sm text-gray-500 -mt-3">
        {lang === "es"
          ? "Por favor revise la información antes de enviar. Puede volver a editar cualquier sección."
          : "Please review your information before submitting. You can go back to edit any section."}
      </p>

      {sections.map((section) => (
        <div key={section.title} className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">{section.title}</span>
            <button
              onClick={section.onEdit}
              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <Pencil className="h-3 w-3" />
              {lang === "es" ? "Editar" : "Edit"}
            </button>
          </div>
          <div className="px-4 py-2">
            {section.rows.map((row) => (
              <ReviewRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      ))}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          {lang === "es" ? "← Anterior" : "← Back"}
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
        >
          {submitting
            ? lang === "es" ? "Enviando..." : "Submitting..."
            : lang === "es" ? "Confirmar y Enviar ✓" : "Confirm & Submit ✓"}
        </button>
      </div>
    </div>
  );
}
