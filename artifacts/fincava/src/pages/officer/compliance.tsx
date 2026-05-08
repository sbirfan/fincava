// CC-1D: Officer DIAN RUT Compliance — 5-screen mobile-first flow
// Screens: 1 Overview → 2 Mode Select → 3 Guidance → 4 Upload → 5 Submit

import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Upload,
  ChevronRight,
  FileText,
  Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Supplier {
  id: number;
  nombreCompleto: string;
  municipio: string;
  department: string | null;
  primaryProduct: string | null;
  sellableStatus: string | null;
}

interface Requirement {
  id: number;
  requirementCode: string;
  agency: string;
  state: string;
  selectedMode: string | null;
  adminRequired: boolean;
  visibleNote: string | null;
}

interface GuidanceStep {
  id: number;
  stepOrder: number;
  title: string;
  guidance: string;
  expectedOutput: string | null;
}

// ── State label helpers ────────────────────────────────────────────────────────

const STATE_LABELS: Record<string, string> = {
  not_started: "Sin iniciar",
  not_sure: "No está seguro",
  self_serve_in_progress: "En proceso (propio)",
  assisted_in_progress: "En proceso (asistido)",
  managed_service_candidate: "Servicio gestionado",
  submitted: "Enviado — pendiente de revisión",
  needs_fix: "Correcciones requeridas",
  conditionally_approved: "Aprobado condicionalmente",
  verified: "Verificado ✓",
  rejected: "Rechazado",
};

function StateChip({ state }: { state: string }) {
  const colorMap: Record<string, string> = {
    not_started: "bg-gray-100 text-gray-500",
    not_sure: "bg-amber-100 text-amber-700",
    self_serve_in_progress: "bg-blue-100 text-blue-700",
    assisted_in_progress: "bg-blue-100 text-blue-700",
    managed_service_candidate: "bg-purple-100 text-purple-700",
    submitted: "bg-amber-100 text-amber-700",
    needs_fix: "bg-red-100 text-red-700",
    conditionally_approved: "bg-amber-100 text-amber-700",
    verified: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  const Icon =
    state === "verified" ? CheckCircle2
    : state === "rejected" || state === "needs_fix" ? XCircle
    : state === "not_sure" ? AlertTriangle
    : Clock;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${colorMap[state] ?? "bg-gray-100 text-gray-500"}`}>
      <Icon className="h-3 w-3" />
      {STATE_LABELS[state] ?? state}
    </span>
  );
}

// ── Screen 1: Overview ────────────────────────────────────────────────────────

function OverviewScreen({
  supplier,
  requirements,
  onStart,
  lang,
}: {
  supplier: Supplier;
  requirements: Requirement[];
  onStart: (req: Requirement) => void;
  lang: string;
}) {
  const isDone = (r: Requirement) => r.state === "verified" || r.state === "conditionally_approved";
  const isBlocked = (r: Requirement) => r.state === "rejected";
  const pending = requirements.filter((r) => !isDone(r) && !isBlocked(r));

  return (
    <div className="space-y-5">
      {/* Supplier card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
          {lang === "es" ? "Proveedor" : "Supplier"}
        </p>
        <h2 className="text-lg font-bold text-gray-800">{supplier.nombreCompleto}</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {supplier.municipio}{supplier.department ? `, ${supplier.department}` : ""}
        </p>
        {supplier.primaryProduct && (
          <p className="text-xs text-green-700 font-medium mt-1 capitalize">{supplier.primaryProduct}</p>
        )}
      </div>

      {/* Requirements list */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-3">
          {lang === "es" ? "Requisitos de cumplimiento" : "Compliance requirements"}
        </h3>
        {requirements.length === 0 ? (
          <div className="rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
            {lang === "es"
              ? "Este proveedor no tiene requisitos registrados aún."
              : "No compliance requirements registered for this supplier yet."}
          </div>
        ) : (
          <div className="space-y-3">
            {requirements.map((req) => (
              <div key={req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {req.requirementCode}
                      </span>
                      <span className="text-xs text-gray-400">{req.agency}</span>
                    </div>
                    <StateChip state={req.state} />
                    {req.visibleNote && (
                      <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded-lg px-3 py-2">
                        {req.visibleNote}
                      </p>
                    )}
                  </div>
                  {!isDone(req) && !isBlocked(req) && (
                    <button
                      onClick={() => onStart(req)}
                      className="shrink-0 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      {lang === "es" ? "Gestionar →" : "Manage →"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pending.length === 0 && requirements.length > 0 && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
          <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-800">
            {lang === "es" ? "¡Todo en orden!" : "All requirements handled!"}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Screen 2: Mode Select ──────────────────────────────────────────────────────

interface ModeOption {
  value: string;
  title: string;
  description: string;
  icon: string;
}

function ModeScreen({
  requirement,
  onSelect,
  onBack,
  lang,
}: {
  requirement: Requirement;
  onSelect: (mode: string) => void;
  onBack: () => void;
  lang: string;
}) {
  const options: ModeOption[] = [
    {
      value: "has_rut_ready_to_upload",
      title: lang === "es" ? "Ya tiene el RUT" : "Already has the RUT",
      description: lang === "es"
        ? "El agricultor tiene una copia del RUT lista para subir."
        : "The farmer has a copy of the RUT ready to upload.",
      icon: "📄",
    },
    {
      value: "no_rut_self_serve",
      title: lang === "es" ? "Necesita registrarse (auto-gestión)" : "Needs registration (self-serve)",
      description: lang === "es"
        ? "Guíe al agricultor para que se registre en el portal DIAN por su cuenta."
        : "Guide the farmer to register on the DIAN portal independently.",
      icon: "🖥️",
    },
    {
      value: "assisted",
      title: lang === "es" ? "Asistencia del oficial" : "Officer assistance",
      description: lang === "es"
        ? "Usted le ayudará al agricultor a completar el trámite durante la visita."
        : "You will help the farmer complete the process during this visit.",
      icon: "🤝",
    },
    {
      value: "managed",
      title: lang === "es" ? "Servicio gestionado (Fincava)" : "Managed service (Fincava)",
      description: lang === "es"
        ? "El equipo Fincava gestionará el trámite por el agricultor."
        : "The Fincava team will handle the process on behalf of the farmer.",
      icon: "⭐",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
          {lang === "es" ? "Requisito" : "Requirement"}: {requirement.requirementCode}
        </p>
        <h2 className="text-lg font-bold text-gray-800">
          {lang === "es" ? "¿Cómo desea proceder?" : "How would you like to proceed?"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {lang === "es"
            ? "Seleccione la opción que mejor describe la situación del agricultor."
            : "Select the option that best describes the farmer's situation."}
        </p>
      </div>

      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="w-full text-left bg-white rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 transition p-4 flex items-start gap-4 group"
          >
            <span className="text-2xl">{opt.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm group-hover:text-green-800">{opt.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{opt.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-green-500 shrink-0 mt-0.5" />
          </button>
        ))}
      </div>

      <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition flex items-center gap-1 mt-2">
        <ArrowLeft className="h-4 w-4" />
        {lang === "es" ? "Volver" : "Back"}
      </button>
    </div>
  );
}

// ── Screen 3: Guidance steps ──────────────────────────────────────────────────

function GuidanceScreen({
  steps,
  mode,
  requirement,
  onProceed,
  onBack,
  lang,
}: {
  steps: GuidanceStep[];
  mode: string;
  requirement: Requirement;
  onProceed: () => void;
  onBack: () => void;
  lang: string;
}) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allDone = steps.length > 0 && done.size === steps.length;

  const modeLabel: Record<string, string> = {
    has_rut_ready_to_upload: lang === "es" ? "Subir RUT" : "Upload RUT",
    no_rut_self_serve: lang === "es" ? "Auto-gestión" : "Self-serve",
    assisted: lang === "es" ? "Asistida" : "Assisted",
    managed: lang === "es" ? "Gestionada" : "Managed",
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
          {lang === "es" ? "Modo" : "Mode"}: {modeLabel[mode] ?? mode}
        </p>
        <h2 className="text-lg font-bold text-gray-800">
          {lang === "es" ? "Pasos a seguir" : "Steps to follow"}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {lang === "es" ? "Marque cada paso a medida que lo complete." : "Check each step as you complete it."}
        </p>
      </div>

      {steps.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          {lang === "es"
            ? "No hay pasos de orientación disponibles para este modo."
            : "No guidance steps available for this mode yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => toggle(step.id)}
              className={`w-full text-left rounded-xl border transition p-4 ${done.has(step.id) ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${done.has(step.id) ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                  {done.has(step.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">
                    {step.stepOrder}. {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">{step.guidance}</p>
                  {step.expectedOutput && (
                    <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 mt-2 font-medium">
                      ✓ {step.expectedOutput}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={onProceed}
        disabled={steps.length > 0 && !allDone}
        className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold text-sm transition"
      >
        {lang === "es" ? "Continuar →" : "Continue →"}
      </button>

      <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" />
        {lang === "es" ? "Volver" : "Back"}
      </button>
    </div>
  );
}

// ── Screen 4: Document Upload ─────────────────────────────────────────────────

function UploadScreen({
  supplier,
  requirement,
  onUploaded,
  onSkip,
  onBack,
  lang,
}: {
  supplier: Supplier;
  requirement: Requirement;
  onUploaded: (fileUrl: string) => void;
  onSkip: () => void;
  onBack: () => void;
  lang: string;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: lang === "es" ? "Tipo de archivo no permitido" : "File type not allowed", description: "PDF, JPG, PNG, WebP", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Step 1: request presigned URL
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, folder: "compliance" }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, fileUrl } = await urlRes.json();

      // Step 2: upload directly to GCS
      const gcsRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!gcsRes.ok) throw new Error("Upload to storage failed");

      // Step 3: confirm with our API
      const confirmRes = await fetch(`/api/officer/compliance/${supplier.id}/documents`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirementCode: requirement.requirementCode,
          documentType: "RUT",
          evidenceType: "original_scan",
          fileUrl,
        }),
      });
      if (!confirmRes.ok) throw new Error("Failed to confirm upload");

      setUploaded(fileUrl);
      toast({ title: lang === "es" ? "Documento subido" : "Document uploaded" });
      onUploaded(fileUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: lang === "es" ? "Error al subir" : "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
          {lang === "es" ? "Documento" : "Document"}: {requirement.requirementCode}
        </p>
        <h2 className="text-lg font-bold text-gray-800">
          {lang === "es" ? "Subir documento" : "Upload document"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {lang === "es"
            ? "Suba una foto o PDF del RUT del agricultor."
            : "Upload a photo or PDF of the farmer's RUT document."}
        </p>
      </div>

      {uploaded ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-800">
            {lang === "es" ? "Documento subido exitosamente" : "Document uploaded successfully"}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {lang === "es" ? "Puede continuar al siguiente paso." : "You can proceed to the next step."}
          </p>
        </div>
      ) : (
        <label className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${uploading ? "border-gray-200 bg-gray-50" : "border-gray-300 hover:border-green-400 hover:bg-green-50"}`}>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploading ? (
            <Loader2 className="h-8 w-8 text-green-600 animate-spin mx-auto mb-2" />
          ) : (
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          )}
          <p className="text-sm font-semibold text-gray-700">
            {uploading
              ? (lang === "es" ? "Subiendo…" : "Uploading…")
              : (lang === "es" ? "Toque para seleccionar archivo" : "Tap to select a file")}
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WebP</p>
        </label>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition flex items-center justify-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          {lang === "es" ? "Volver" : "Back"}
        </button>
        <button
          onClick={onSkip}
          className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
        >
          {lang === "es" ? "Sin documento" : "No document"}
        </button>
      </div>
    </div>
  );
}

// ── Screen 5: Submit ─────────────────────────────────────────────────────────

function SubmitScreen({
  supplier,
  requirement,
  mode,
  uploadedFileUrl,
  onDone,
  lang,
}: {
  supplier: Supplier;
  requirement: Requirement;
  mode: string;
  uploadedFileUrl: string | null;
  onDone: () => void;
  lang: string;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isManagedService = mode === "managed";

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (isManagedService) {
        const res = await fetch(`/api/officer/compliance/${supplier.id}/managed-service`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requirementCode: requirement.requirementCode,
            packageType: "rut_registration",
            consentRecord: `Officer obtained verbal consent at ${new Date().toISOString()}`,
          }),
        });
        if (!res.ok) throw new Error("Failed to open managed service case");
      } else {
        const res = await fetch(`/api/officer/compliance/${supplier.id}/submit/${requirement.requirementCode}`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any).error ?? "Submit failed");
        }
      }
      setSubmitted(true);
      toast({
        title: lang === "es" ? "Enviado exitosamente" : "Submitted successfully",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: lang === "es" ? "Error" : "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">
          {isManagedService
            ? (lang === "es" ? "Caso gestionado abierto" : "Managed service case opened")
            : (lang === "es" ? "Requisito enviado" : "Requirement submitted")}
        </h2>
        <p className="text-sm text-gray-500">
          {lang === "es"
            ? "El equipo Fincava revisará la documentación y notificará al agricultor."
            : "The Fincava team will review the documentation and notify the farmer."}
        </p>
        <button
          onClick={onDone}
          className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition mt-4"
        >
          {lang === "es" ? "Volver al proveedor" : "Back to supplier"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-800">
          {lang === "es" ? "Confirmar y enviar" : "Confirm and submit"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {lang === "es" ? "Revise los detalles antes de enviar." : "Review details before submitting."}
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-500">{lang === "es" ? "Proveedor" : "Supplier"}</span>
          <span className="text-sm font-semibold text-gray-800">{supplier.nombreCompleto}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-500">{lang === "es" ? "Requisito" : "Requirement"}</span>
          <span className="font-mono text-sm text-gray-800">{requirement.requirementCode}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-500">{lang === "es" ? "Modo" : "Mode"}</span>
          <span className="text-sm font-semibold text-gray-800 capitalize">{mode.replace(/_/g, " ")}</span>
        </div>
        {uploadedFileUrl && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500">{lang === "es" ? "Documento" : "Document"}</span>
            <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
              <FileText className="h-3.5 w-3.5" />
              {lang === "es" ? "Subido" : "Uploaded"}
            </span>
          </div>
        )}
      </div>

      {isManagedService && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>{lang === "es" ? "Consentimiento requerido:" : "Consent required:"}</strong>{" "}
          {lang === "es"
            ? "Al confirmar, registra que el agricultor dio consentimiento verbal para el servicio gestionado."
            : "By confirming, you record that the farmer gave verbal consent for the managed service."}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting
          ? (lang === "es" ? "Enviando…" : "Submitting…")
          : isManagedService
          ? (lang === "es" ? "Confirmar servicio gestionado" : "Confirm managed service")
          : (lang === "es" ? "Enviar para revisión" : "Submit for review")}
      </button>
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

type Screen = "overview" | "mode" | "guidance" | "upload" | "submit";

export default function OfficerCompliance() {
  const { lang } = useLanguage();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const supplierId = parseInt(params.get("supplierId") ?? "", 10);

  const { toast } = useToast();
  const [screen, setScreen] = useState<Screen>("overview");
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [activeRequirement, setActiveRequirement] = useState<Requirement | null>(null);
  const [selectedMode, setSelectedMode] = useState<string>("");
  const [guidanceSteps, setGuidanceSteps] = useState<GuidanceStep[]>([]);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!supplierId) return;
    fetch(`/api/officer/compliance/${supplierId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load supplier compliance");
        return r.json();
      })
      .then((data) => {
        setSupplier(data.supplier);
        setRequirements(data.requirements ?? []);
      })
      .catch(() =>
        toast({ title: lang === "es" ? "Error" : "Error", description: "Could not load compliance data", variant: "destructive" })
      )
      .finally(() => setLoading(false));
  }, [supplierId]);

  if (!supplierId || isNaN(supplierId)) {
    return (
      <div className="p-6 text-center text-red-500 text-sm">
        {lang === "es" ? "Proveedor no especificado." : "No supplier specified."}
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleStartRequirement = (req: Requirement) => {
    setActiveRequirement(req);
    setSelectedMode("");
    setUploadedFileUrl(null);
    setScreen("mode");
  };

  const handleModeSelect = async (mode: string) => {
    if (!activeRequirement || !supplier) return;
    setSelectedMode(mode);

    // Persist mode to server
    await fetch(`/api/officer/compliance/${supplier.id}/mode`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirementCode: activeRequirement.requirementCode, mode }),
    });

    // Load guidance steps
    const modeForGuidance =
      mode === "has_rut_ready_to_upload" ? "self_serve"
      : mode === "no_rut_self_serve" ? "self_serve"
      : mode === "assisted" ? "assisted"
      : "managed";

    const gRes = await fetch(
      `/api/officer/compliance/guidance/${activeRequirement.requirementCode}?mode=${modeForGuidance}`,
      { credentials: "include" },
    );
    if (gRes.ok) {
      const gData = await gRes.json();
      setGuidanceSteps(gData.steps ?? []);
    }

    if (mode === "has_rut_ready_to_upload") {
      // Skip guidance, go straight to upload
      setScreen("upload");
    } else {
      setScreen("guidance");
    }
  };

  const handleGuidanceProceed = () => {
    if (!activeRequirement) return;
    if (selectedMode === "managed") {
      setScreen("submit");
    } else {
      setScreen("upload");
    }
  };

  const handleUploaded = (fileUrl: string) => {
    setUploadedFileUrl(fileUrl);
    setScreen("submit");
  };

  const handleSkipUpload = () => {
    setScreen("submit");
  };

  const handleDone = async () => {
    // Refresh requirements
    const r = await fetch(`/api/officer/compliance/${supplierId}`, { credentials: "include" });
    if (r.ok) {
      const data = await r.json();
      setRequirements(data.requirements ?? []);
    }
    setActiveRequirement(null);
    setScreen("overview");
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-800 text-white px-5 py-5 safe-top">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => {
              if (screen !== "overview") {
                setScreen("overview");
              } else {
                setLocation("/officer/dashboard");
              }
            }}
            className="p-1.5 rounded-lg hover:bg-green-700 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs text-green-300 uppercase tracking-wide font-semibold">
              {lang === "es" ? "Cumplimiento" : "Compliance"}
            </p>
            <h1 className="font-bold text-base">
              {supplier?.nombreCompleto ?? (lang === "es" ? "Cargando…" : "Loading…")}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">{lang === "es" ? "Cargando…" : "Loading…"}</p>
          </div>
        ) : (
          <>
            {screen === "overview" && supplier && (
              <OverviewScreen
                supplier={supplier}
                requirements={requirements}
                onStart={handleStartRequirement}
                lang={lang}
              />
            )}
            {screen === "mode" && activeRequirement && (
              <ModeScreen
                requirement={activeRequirement}
                onSelect={handleModeSelect}
                onBack={() => setScreen("overview")}
                lang={lang}
              />
            )}
            {screen === "guidance" && activeRequirement && (
              <GuidanceScreen
                steps={guidanceSteps}
                mode={selectedMode}
                requirement={activeRequirement}
                onProceed={handleGuidanceProceed}
                onBack={() => setScreen("mode")}
                lang={lang}
              />
            )}
            {screen === "upload" && supplier && activeRequirement && (
              <UploadScreen
                supplier={supplier}
                requirement={activeRequirement}
                onUploaded={handleUploaded}
                onSkip={handleSkipUpload}
                onBack={() => setScreen(selectedMode === "has_rut_ready_to_upload" ? "mode" : "guidance")}
                lang={lang}
              />
            )}
            {screen === "submit" && supplier && activeRequirement && (
              <SubmitScreen
                supplier={supplier}
                requirement={activeRequirement}
                mode={selectedMode}
                uploadedFileUrl={uploadedFileUrl}
                onDone={handleDone}
                lang={lang}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
