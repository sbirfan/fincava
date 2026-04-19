import React, { useState, useEffect, useCallback } from "react";
import { SUPPORT_WHATSAPP_NUMBER } from "@/lib/config";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, Save, RotateCcw, AlertCircle, Cloud } from "lucide-react";
import {
  SANTANDER_MUNICIPIOS,
  VARIEDADES_CAFE,
  METODOS_SECADO,
  ACCESO_AGUA_OPTIONS,
  TENENCIA_TIERRA_OPTIONS,
  TIPO_COMPRADOR_OPTIONS,
  PRECIO_VENTA_BANDA_OPTIONS,
  DEUDA_ACTUAL_OPTIONS,
  USO_CAPITAL_OPTIONS,
  SITUACION_ECONOMICA_OPTIONS,
  HORIZONTE_INVERSION_OPTIONS,
  META_PRINCIPAL_OPTIONS,
  DESAFIOS_OPTIONS,
} from "@/data/onboarding-options";

const STEPS = [
  "Identidad",
  "Finca",
  "Ventas",
  "Economía",
  "Metas",
];

const schema = z.object({
  nombre_completo: z.string().min(2, "Ingrese su nombre completo"),
  whatsapp_number: z
    .string()
    .regex(/^\+57[0-9]{10}$/, "Debe comenzar con +57 seguido de 10 dígitos"),
  municipio: z.string().min(1, "Seleccione un municipio"),
  vereda: z.string().optional(),
  consent_given: z.boolean().refine((v) => v === true, {
    message: "Debe aceptar el consentimiento para continuar",
  }),

  cultivo_principal: z.string().min(1, "Seleccione el cultivo principal"),
  variedad_cafe: z.string().optional(),
  hectareas_produccion: z.coerce
    .number()
    .min(0.1, "Mínimo 0.1 ha")
    .max(200, "Máximo 200 ha")
    .optional()
    .or(z.literal("")),
  edad_plantas_anos: z.coerce.number().int().min(0).optional().or(z.literal("")),
  cosechas_por_ano: z.string().optional(),
  metodo_secado: z.string().optional(),
  acceso_agua: z.string().optional(),
  tenencia_tierra: z.string().optional(),

  tipo_comprador: z.string().optional(),
  volumen_value: z.coerce.number().int().min(0).optional().or(z.literal("")),
  volumen_unit: z.enum(["kg", "cargas"]).default("kg"),
  precio_venta_banda: z.string().optional(),
  interes_canal_premium: z.string().optional(),

  deuda_actual: z.string().optional(),
  uso_capital: z.array(z.string()).default([]),
  personas_dependientes: z.coerce.number().int().min(0).optional().or(z.literal("")),
  situacion_economica: z.string().optional(),

  disposicion_cambiar: z.string().optional(),
  horizonte_inversion: z.string().optional(),
  meta_principal_12m: z.string().optional(),
  principales_desafios: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof schema>;

const STEP_FIELDS: Array<(keyof FormData)[]> = [
  ["nombre_completo", "whatsapp_number", "municipio", "consent_given"],
  ["cultivo_principal"],
  [],
  [],
  ["principales_desafios"],
];

function getStorageKey(whatsapp: string) {
  return `fincava_onboarding_${whatsapp}`;
}

type DraftBanner = {
  key: string;
  nombre: string;
  whatsapp: string;
  savedStep: number;
  source: "local" | "server";
  canFullRestore: boolean;
  updatedAt?: string;
  createdAt?: string;
  daysUntilExpiry?: number;
};

function formatRelativeTime(isoString: string): string {
  try {
    const ts = new Date(isoString).getTime();
    if (!Number.isFinite(ts)) return "";
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Guardado hace un momento";
    if (minutes < 60) return `Guardado hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Guardado hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
    const days = Math.floor(hours / 24);
    return `Guardado hace ${days} ${days === 1 ? "día" : "días"}`;
  } catch {
    return "";
  }
}

function formatSyncAge(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Sincronizado hace un momento";
  if (minutes < 60) return `Sincronizado hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Sincronizado hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  return `Sincronizado hace ${days} ${days === 1 ? "día" : "días"}`;
}

function formatDraftAge(isoString: string): string {
  try {
    const ts = new Date(isoString).getTime();
    if (!Number.isFinite(ts)) return "";
    const days = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
    if (days < 1) return "Iniciado hoy";
    return `Iniciado hace ${days} ${days === 1 ? "día" : "días"}`;
  } catch {
    return "";
  }
}

const DRAFT_PREFIX = "fincava_onboarding_";

const DRAFT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function findExistingDraft(): DraftBanner | null {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DRAFT_PREFIX)) keys.push(k);
    }
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<FormData> & { _step?: number; _savedAt?: string };
      const savedAt = parsed._savedAt ? new Date(parsed._savedAt).getTime() : NaN;
      const age = isNaN(savedAt) ? Infinity : Date.now() - savedAt;
      if (age > DRAFT_EXPIRY_MS) {
        localStorage.removeItem(key);
        continue;
      }
      const nombre = parsed.nombre_completo || "";
      const whatsapp = parsed.whatsapp_number || key.replace(DRAFT_PREFIX, "");
      if (nombre || whatsapp.length > 6) {
        const msRemaining = DRAFT_EXPIRY_MS - age;
        const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
        const daysUntilExpiry = daysRemaining > 0 && daysRemaining <= 7 ? daysRemaining : undefined;
        return { key, nombre, whatsapp, savedStep: parsed._step ?? 0, source: "local", canFullRestore: true, daysUntilExpiry };
      }
    }
  } catch {
  }
  return null;
}

const WHATSAPP_REGEX = /^\+57[0-9]{10}$/;

async function fetchServerDraftMeta(
  whatsapp: string,
  base: string,
): Promise<{ savedStep: number; updatedAt: string; createdAt?: string } | null> {
  try {
    const res = await fetch(
      `${base}/api/drafts/onboarding?whatsapp=${encodeURIComponent(whatsapp)}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.found) return null;
    return {
      savedStep: (json.savedStep as number) ?? 0,
      updatedAt: json.updatedAt as string,
      createdAt: json.createdAt as string | undefined,
    };
  } catch {
    return null;
  }
}

function getDraftTokenKey(whatsapp: string) {
  return `fincava_draft_token_${whatsapp}`;
}

function getDraftToken(whatsapp: string): string | null {
  try {
    return localStorage.getItem(getDraftTokenKey(whatsapp));
  } catch {
    return null;
  }
}

function setDraftToken(whatsapp: string, token: string) {
  try {
    localStorage.setItem(getDraftTokenKey(whatsapp), token);
  } catch {
  }
}

function clearDraftToken(whatsapp: string) {
  try {
    localStorage.removeItem(getDraftTokenKey(whatsapp));
  } catch {
  }
}

async function restoreServerDraft(
  whatsapp: string,
  token: string,
  base: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${base}/api/drafts/onboarding/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsapp_number: whatsapp, restore_token: token }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.found) return null;
    return json.data as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function saveServerDraft(
  whatsapp: string,
  data: Record<string, unknown>,
  base: string,
): Promise<Date | null> {
  try {
    const existingToken = getDraftToken(whatsapp);
    const res = await fetch(`${base}/api/drafts/onboarding`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whatsapp_number: whatsapp,
        data,
        ...(existingToken ? { restore_token: existingToken } : {}),
      }),
    });
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json.restore_token) {
        setDraftToken(whatsapp, json.restore_token as string);
      }
      if (json.updatedAt) {
        const ts = new Date(json.updatedAt as string);
        if (!Number.isNaN(ts.getTime())) return ts;
      }
      return new Date();
    }
  } catch {
  }
  return null;
}

async function deleteServerDraft(whatsapp: string, base: string): Promise<void> {
  const token = getDraftToken(whatsapp);
  if (!token) return;
  try {
    const res = await fetch(
      `${base}/api/drafts/onboarding?whatsapp=${encodeURIComponent(whatsapp)}&restore_token=${encodeURIComponent(token)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      clearDraftToken(whatsapp);
    }
  } catch {
  }
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successName, setSuccessName] = useState("");
  const [duplicateError, setDuplicateError] = useState<{ supplierId: string } | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastServerSync, setLastServerSync] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const [draftBanner, setDraftBanner] = useState<DraftBanner | null>(null);
  const [checkingServerDraft, setCheckingServerDraft] = useState(false);
  const checkedWhatsappRef = React.useRef<string>("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      nombre_completo: "",
      whatsapp_number: "+57",
      municipio: "",
      vereda: "",
      consent_given: false,
      cultivo_principal: "",
      variedad_cafe: "",
      hectareas_produccion: "",
      edad_plantas_anos: "",
      cosechas_por_ano: "",
      metodo_secado: "",
      acceso_agua: "",
      tenencia_tierra: "",
      tipo_comprador: "",
      volumen_value: "",
      volumen_unit: "kg",
      precio_venta_banda: "",
      interes_canal_premium: "",
      deuda_actual: "",
      uso_capital: [],
      personas_dependientes: "",
      situacion_economica: "",
      disposicion_cambiar: "",
      horizonte_inversion: "",
      meta_principal_12m: "",
      principales_desafios: [],
    },
  });

  const watchWhatsapp = form.watch("whatsapp_number");
  const watchCultivo = form.watch("cultivo_principal");
  const watchDesafios = form.watch("principales_desafios");

  useEffect(() => {
    const draft = findExistingDraft();
    if (draft) {
      setDraftBanner(draft);
    }
  }, []);

  useEffect(() => {
    if (duplicateError) {
      setDuplicateError(null);
    }
  }, [watchWhatsapp]);

  const getApiBase = useCallback(() => {
    return (import.meta.env.BASE_URL as string).replace(/\/$/, "");
  }, []);

  const serverDraftDataRef = React.useRef<Record<string, unknown> | null>(null);
  const [restoringServer, setRestoringServer] = useState(false);

  const checkServerDraft = useCallback(async (whatsapp: string) => {
    if (!WHATSAPP_REGEX.test(whatsapp)) return;
    if (checkedWhatsappRef.current === whatsapp) return;
    if (draftBanner) return;
    checkedWhatsappRef.current = whatsapp;
    setCheckingServerDraft(true);
    try {
      const base = getApiBase();
      const meta = await fetchServerDraftMeta(whatsapp, base);
      if (!meta) return;

      const token = getDraftToken(whatsapp);
      const serverDaysRemaining = meta.updatedAt
        ? Math.ceil((DRAFT_EXPIRY_MS - (Date.now() - new Date(meta.updatedAt).getTime())) / (24 * 60 * 60 * 1000))
        : undefined;
      const serverDaysUntilExpiry = serverDaysRemaining !== undefined && serverDaysRemaining > 0 && serverDaysRemaining <= 7 ? serverDaysRemaining : undefined;

      if (token) {
        setRestoringServer(true);
        const fullData = await restoreServerDraft(whatsapp, token, base);
        setRestoringServer(false);
        if (fullData) {
          serverDraftDataRef.current = fullData;
          setDraftBanner({
            key: getStorageKey(whatsapp),
            nombre: "",
            whatsapp,
            savedStep: meta.savedStep,
            source: "server",
            canFullRestore: true,
            updatedAt: meta.updatedAt,
            createdAt: meta.createdAt,
            daysUntilExpiry: serverDaysUntilExpiry,
          });
          return;
        }
      }

      setDraftBanner({
        key: getStorageKey(whatsapp),
        nombre: "",
        whatsapp,
        savedStep: meta.savedStep,
        source: "server",
        canFullRestore: false,
        updatedAt: meta.updatedAt,
        createdAt: meta.createdAt,
        daysUntilExpiry: serverDaysUntilExpiry,
      });
    } finally {
      setCheckingServerDraft(false);
      setRestoringServer(false);
    }
  }, [draftBanner, getApiBase]);

  const restoreDraft = useCallback(() => {
    if (!draftBanner) return;
    if (draftBanner.source === "server") {
      if (draftBanner.updatedAt) {
        const ts = new Date(draftBanner.updatedAt);
        if (!Number.isNaN(ts.getTime())) setLastServerSync(ts);
      }
      if (draftBanner.canFullRestore) {
        const data = serverDraftDataRef.current;
        if (!data) {
          console.warn("[onboarding] Server draft data not yet loaded");
          return;
        }
        const { _step, ...formValues } = data as Partial<FormData> & { _step?: number };
        form.reset({ ...form.getValues(), ...formValues }, { keepDefaultValues: true });
        setStep(Math.min(Math.max((_step as number) ?? 0, 0), STEPS.length - 1));
      } else {
        setStep(Math.min(Math.max(draftBanner.savedStep, 0), STEPS.length - 1));
      }
    } else {
      try {
        const raw = localStorage.getItem(draftBanner.key);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<FormData> & { _step?: number };
          const { _step, ...formValues } = parsed;
          form.reset({ ...form.getValues(), ...formValues }, { keepDefaultValues: true });
          setStep(Math.min(Math.max(_step ?? 0, 0), STEPS.length - 1));
        }
      } catch (err) {
        console.warn("[onboarding] Could not restore local draft:", err);
      }
    }
    serverDraftDataRef.current = null;
    window.scrollTo(0, 0);
    setDraftBanner(null);
  }, [draftBanner, form]);

  const discardDraft = useCallback(() => {
    if (!draftBanner) return;
    if (draftBanner.source === "server") {
      deleteServerDraft(draftBanner.whatsapp, getApiBase());
    } else {
      localStorage.removeItem(draftBanner.key);
    }
    serverDraftDataRef.current = null;
    form.reset();
    setStep(0);
    setDraftBanner(null);
    checkedWhatsappRef.current = "";
  }, [draftBanner, form, getApiBase]);

  const saveToStorage = useCallback(async () => {
    const whatsapp = form.getValues("whatsapp_number");
    if (whatsapp && whatsapp.length > 6) {
      const values = form.getValues();
      const payload = { ...values, _step: step, _savedAt: new Date().toISOString() };
      localStorage.setItem(getStorageKey(whatsapp), JSON.stringify(payload));
      setLastSaved(new Date());
      if (WHATSAPP_REGEX.test(whatsapp)) {
        const syncedAt = await saveServerDraft(whatsapp, payload as Record<string, unknown>, getApiBase());
        if (syncedAt) setLastServerSync(syncedAt);
      }
    }
  }, [form, step, getApiBase]);

  useEffect(() => {
    const interval = setInterval(saveToStorage, 30000);
    return () => clearInterval(interval);
  }, [saveToStorage]);

  useEffect(() => {
    if (!lastServerSync) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [lastServerSync]);

  const goNext = async () => {
    const fields = STEP_FIELDS[step];
    const valid = fields.length === 0 || await form.trigger(fields);

    if (step === 4) {
      const desafios = form.getValues("principales_desafios");
      if (desafios.length !== 3) {
        form.setError("principales_desafios", {
          message: "Seleccione exactamente 3 desafíos",
        });
        return;
      }
    }

    if (!valid) return;
    saveToStorage();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo(0, 0);
  };

  const onSubmit = async (values: FormData) => {
    const desafios = values.principales_desafios;
    if (desafios.length !== 3) {
      form.setError("principales_desafios", {
        message: "Seleccione exactamente 3 desafíos",
      });
      return;
    }

    setSubmitting(true);
    try {
      let volumenKg: number | undefined;
      if (values.volumen_value !== "" && values.volumen_value !== undefined) {
        const v = Number(values.volumen_value);
        volumenKg = values.volumen_unit === "cargas" ? v * 125 : v;
      }

      const payload = {
        nombre_completo: values.nombre_completo,
        whatsapp_number: values.whatsapp_number,
        municipio: values.municipio,
        vereda: values.vereda || undefined,
        consent_given: values.consent_given,
        supplier_type: "farmer",
        registered_by: "self",
        cultivo_principal: values.cultivo_principal || undefined,
        variedad_cafe: values.variedad_cafe || undefined,
        hectareas_produccion: values.hectareas_produccion !== "" ? Number(values.hectareas_produccion) : undefined,
        edad_plantas_anos: values.edad_plantas_anos !== "" ? Number(values.edad_plantas_anos) : undefined,
        cosechas_por_ano: values.cosechas_por_ano ? Number(values.cosechas_por_ano) : undefined,
        metodo_secado: values.metodo_secado || undefined,
        acceso_agua: values.acceso_agua || undefined,
        tenencia_tierra: values.tenencia_tierra || undefined,
        tipo_comprador: values.tipo_comprador || undefined,
        volumen_kg_ultima_cosecha: volumenKg,
        precio_venta_banda: values.precio_venta_banda || undefined,
        interes_canal_premium: values.interes_canal_premium === "si" ? true : values.interes_canal_premium === "no" ? false : undefined,
        deuda_actual: values.deuda_actual || undefined,
        uso_capital: values.uso_capital,
        personas_dependientes: values.personas_dependientes !== "" ? Number(values.personas_dependientes) : undefined,
        situacion_economica: values.situacion_economica || undefined,
        disposicion_cambiar: values.disposicion_cambiar ? Number(values.disposicion_cambiar) : undefined,
        horizonte_inversion: values.horizonte_inversion || undefined,
        meta_principal_12m: values.meta_principal_12m || undefined,
        principales_desafios: values.principales_desafios,
      };

      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/suppliers/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409 && err.supplierId) {
          setDuplicateError({ supplierId: err.supplierId });
          return;
        }
        throw new Error(err.error || "Error al enviar el formulario");
      }

      localStorage.removeItem(getStorageKey(values.whatsapp_number));
      deleteServerDraft(values.whatsapp_number, getApiBase());
      setSuccessName(values.nombre_completo.split(" ")[0]);
      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "No se pudo enviar el formulario. Intente de nuevo.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-20 w-20 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            ¡Gracias {successName}, recibirá su evaluación por WhatsApp!
          </h1>
          <p className="text-gray-600">
            Nuestro equipo revisará su información y le enviará un análisis personalizado en las próximas 24–48 horas.
          </p>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setLocation("/")}
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-6 px-4">
      <div className="max-w-lg mx-auto">

        {draftBanner && (
          <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <RotateCcw className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">
                  ¿Continuar donde lo dejó?
                </p>
                <p className="text-xs text-amber-800 mt-0.5 leading-snug">
                  {draftBanner.source === "local" && draftBanner.nombre
                    ? <><span className="font-medium">{draftBanner.nombre}</span> · </>
                    : null}
                  {draftBanner.whatsapp}
                  {" · "}
                  Sección {draftBanner.savedStep + 1} de {STEPS.length} — {STEPS[draftBanner.savedStep]}
                  {draftBanner.source === "server" && draftBanner.createdAt && (
                    <span className="block mt-0.5 text-amber-600 text-xs">
                      {formatDraftAge(draftBanner.createdAt)}
                    </span>
                  )}
                  {draftBanner.source === "server" && draftBanner.updatedAt && (
                    <span className="block mt-0.5 text-amber-700">
                      {formatRelativeTime(draftBanner.updatedAt)}
                    </span>
                  )}
                  {draftBanner.source === "server" && !draftBanner.canFullRestore && (
                    <span className="block mt-0.5 text-amber-700">
                      (Este dispositivo no tiene el borrador; puede continuar desde esa sección)
                    </span>
                  )}
                  {draftBanner.daysUntilExpiry !== undefined && (
                    <span className="flex items-center gap-1 mt-1 text-red-700 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Su borrador vence en {draftBanner.daysUntilExpiry} {draftBanner.daysUntilExpiry === 1 ? "día" : "días"} — complete su registro para no perderlo.
                    </span>
                  )}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1 h-auto"
                    onClick={restoreDraft}
                    disabled={restoringServer}
                  >
                    {restoringServer ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Cargando...
                      </>
                    ) : draftBanner.source === "server" && !draftBanner.canFullRestore ? (
                      `Ir a Sección ${draftBanner.savedStep + 1}`
                    ) : (
                      "Restaurar borrador"
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs px-3 py-1 h-auto border-amber-400 text-amber-800 hover:bg-amber-100"
                    onClick={discardDraft}
                    disabled={restoringServer}
                  >
                    Empezar de nuevo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-green-900 mb-1">Registro de Agricultor</h1>
          <p className="text-sm text-green-700">
            Sección {step + 1} de {STEPS.length} — {STEPS[step]}
          </p>
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-xs text-green-700 font-medium">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={i <= step ? "text-green-700" : "text-gray-400"}
              >
                {i + 1}
              </span>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`hidden sm:block ${i <= step ? "text-green-700 font-medium" : "text-gray-400"}`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {(lastSaved || lastServerSync) && (
          <div className="flex flex-col items-end gap-0.5 mb-3">
            {lastSaved && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Save className="h-3 w-3" />
                Guardado automáticamente {lastSaved.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
            {lastServerSync && (
              <div className="flex items-center gap-1 text-xs text-blue-500">
                <Cloud className="h-3 w-3" />
                {formatSyncAge(lastServerSync)}
              </div>
            )}
          </div>
        )}

        {duplicateError && (
          <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-900">
                  Este número ya está registrado
                </p>
                <p className="text-xs text-red-800 mt-0.5 leading-snug">
                  El número de WhatsApp ingresado ya tiene un perfil en Fincava. Si desea actualizar su información, comuníquese con un oficial de campo.
                </p>
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, mi número ${form.getValues("whatsapp_number")} ya está registrado en Fincava y necesito actualizar mi perfil`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-green-700 underline underline-offset-2 hover:text-green-800"
                >
                  Contactar oficial por WhatsApp
                </a>
                <div className="flex gap-2 mt-3">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 h-auto"
                    onClick={() => setLocation("/")}
                  >
                    Volver al inicio
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs px-3 py-1 h-auto border-red-400 text-red-800 hover:bg-red-100"
                    onClick={() => setDuplicateError(null)}
                  >
                    Corregir número
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {step === 0 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">A. Identidad</h2>

                  <FormField
                    control={form.control}
                    name="nombre_completo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Carlos Andrés Gómez Rueda" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsapp_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de WhatsApp *</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+573001234567"
                            {...field}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (!val.startsWith("+57")) val = "+57" + val.replace(/^\+57/, "");
                              field.onChange(val);
                            }}
                            onBlur={(e) => {
                              field.onBlur();
                              checkServerDraft(e.target.value);
                            }}
                          />
                        </FormControl>
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground">Formato: +57 seguido de 10 dígitos</p>
                          {checkingServerDraft && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Verificando...
                            </span>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="municipio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Municipio (Santander) *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione municipio..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {SANTANDER_MUNICIPIOS.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vereda"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vereda <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: El Palmar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="consent_given"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-3 bg-green-50 rounded-lg p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="text-sm font-medium leading-snug cursor-pointer">
                            Acepto que Fincava recopile y use mis datos para análisis de elegibilidad y comunicación comercial. Puedo retirar mi consentimiento en cualquier momento. *
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">B. Información de la Finca</h2>

                  <FormField
                    control={form.control}
                    name="cultivo_principal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cultivo principal *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="grid grid-cols-2 gap-3"
                          >
                            {["Café", "Cacao", "Panela", "Otro"].map((c) => (
                              <div key={c}>
                                <RadioGroupItem value={c} id={`cultivo-${c}`} className="peer sr-only" />
                                <label
                                  htmlFor={`cultivo-${c}`}
                                  className="flex items-center justify-center rounded-xl border-2 border-muted bg-muted/20 p-3 text-sm font-medium cursor-pointer hover:bg-green-50 peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:bg-green-50 peer-data-[state=checked]:text-green-800 transition-colors"
                                >
                                  {c}
                                </label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchCultivo === "Café" && (
                    <FormField
                      control={form.control}
                      name="variedad_cafe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variedad de café</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione variedad..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {VARIEDADES_CAFE.map((v) => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hectareas_produccion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hectáreas en producción</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="200"
                              placeholder="Ej: 2.5"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="edad_plantas_anos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Edad plantas (años)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="Ej: 7"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="cosechas_por_ano"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cosechas por año</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex gap-4"
                          >
                            {["1", "2", "3"].map((n) => (
                              <div key={n} className="flex items-center gap-2">
                                <RadioGroupItem value={n} id={`cosechas-${n}`} />
                                <label htmlFor={`cosechas-${n}`} className="text-sm font-medium cursor-pointer">{n}</label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="metodo_secado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método de secado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione método..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {METODOS_SECADO.map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="acceso_agua"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acceso a agua en la finca</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="space-y-2"
                          >
                            {ACCESO_AGUA_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`agua-${o.value}`} />
                                <label htmlFor={`agua-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tenencia_tierra"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenencia de la tierra</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="grid grid-cols-2 gap-3"
                          >
                            {TENENCIA_TIERRA_OPTIONS.map((o) => (
                              <div key={o.value}>
                                <RadioGroupItem value={o.value} id={`tierra-${o.value}`} className="peer sr-only" />
                                <label
                                  htmlFor={`tierra-${o.value}`}
                                  className="flex items-center justify-center rounded-xl border-2 border-muted bg-muted/20 p-3 text-sm font-medium cursor-pointer hover:bg-green-50 peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:bg-green-50 peer-data-[state=checked]:text-green-800 transition-colors"
                                >
                                  {o.label}
                                </label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">C. Comercialización</h2>

                  <FormField
                    control={form.control}
                    name="tipo_comprador"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿A quién le vende su cosecha?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="space-y-2"
                          >
                            {TIPO_COMPRADOR_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`comprador-${o.value}`} />
                                <label htmlFor={`comprador-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <p className="text-sm font-medium">Volumen última cosecha</p>
                    <div className="flex gap-2 mt-2">
                      <FormField
                        control={form.control}
                        name="volumen_value"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="Ej: 500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="volumen_unit"
                        render={({ field }) => (
                          <FormItem className="w-28">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="cargas">cargas</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">1 carga = 125 kg</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="precio_venta_banda"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio de venta habitual</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="space-y-2"
                          >
                            {PRECIO_VENTA_BANDA_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`precio-${o.value}`} />
                                <label htmlFor={`precio-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interes_canal_premium"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Le interesa vender a canales de exportación premium?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="si" id="premium-si" />
                              <label htmlFor="premium-si" className="text-sm font-medium cursor-pointer">Sí</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="no" id="premium-no" />
                              <label htmlFor="premium-no" className="text-sm font-medium cursor-pointer">No</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">D. Situación Económica</h2>

                  <FormField
                    control={form.control}
                    name="deuda_actual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deuda actual aproximada</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="space-y-2"
                          >
                            {DEUDA_ACTUAL_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`deuda-${o.value}`} />
                                <label htmlFor={`deuda-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="uso_capital"
                    render={() => (
                      <FormItem>
                        <FormLabel>¿En qué usaría capital adicional? <span className="text-muted-foreground text-xs">(seleccione todas las que apliquen)</span></FormLabel>
                        <div className="space-y-2 mt-1">
                          {USO_CAPITAL_OPTIONS.map((o) => (
                            <FormField
                              key={o.value}
                              control={form.control}
                              name="uso_capital"
                              render={({ field }) => (
                                <div className="flex items-center gap-3 border rounded-lg p-3">
                                  <Checkbox
                                    id={`capital-${o.value}`}
                                    checked={field.value?.includes(o.value)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value ?? [];
                                      field.onChange(
                                        checked
                                          ? [...current, o.value]
                                          : current.filter((v) => v !== o.value)
                                      );
                                    }}
                                  />
                                  <label htmlFor={`capital-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
                                </div>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="personas_dependientes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Personas que dependen económicamente de usted</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Ej: 4"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="situacion_economica"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Cómo calificaría su situación económica actual?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="space-y-2"
                          >
                            {SITUACION_ECONOMICA_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`situacion-${o.value}`} />
                                <label htmlFor={`situacion-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">E. Metas y Perspectivas</h2>

                  <FormField
                    control={form.control}
                    name="disposicion_cambiar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Qué tan dispuesto está a cambiar prácticas para mejorar calidad?</FormLabel>
                        <p className="text-xs text-muted-foreground">1 = Nada dispuesto · 5 = Muy dispuesto</p>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex gap-3 justify-center mt-2"
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <div key={n}>
                                <RadioGroupItem value={String(n)} id={`disposicion-${n}`} className="peer sr-only" />
                                <label
                                  htmlFor={`disposicion-${n}`}
                                  className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-muted bg-muted/20 text-base font-bold cursor-pointer hover:bg-green-50 peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:bg-green-600 peer-data-[state=checked]:text-white transition-colors"
                                >
                                  {n}
                                </label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="horizonte_inversion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horizonte de inversión preferido</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="space-y-2"
                          >
                            {HORIZONTE_INVERSION_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`horizonte-${o.value}`} />
                                <label htmlFor={`horizonte-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="meta_principal_12m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta principal en los próximos 12 meses</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="space-y-2"
                          >
                            {META_PRINCIPAL_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`meta-${o.value}`} />
                                <label htmlFor={`meta-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="principales_desafios"
                    render={() => (
                      <FormItem>
                        <FormLabel>
                          Principales desafíos{" "}
                          <span
                            className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                              watchDesafios.length === 3
                                ? "bg-green-100 text-green-700"
                                : watchDesafios.length > 3
                                ? "bg-red-100 text-red-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {watchDesafios.length}/3 seleccionados
                          </span>
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">Seleccione exactamente 3</p>
                        <div className="space-y-2 mt-1">
                          {DESAFIOS_OPTIONS.map((o) => (
                            <FormField
                              key={o.value}
                              control={form.control}
                              name="principales_desafios"
                              render={({ field }) => {
                                const checked = field.value?.includes(o.value);
                                const maxReached = (field.value?.length ?? 0) >= 3 && !checked;
                                return (
                                  <div className={`flex items-center gap-3 border rounded-lg p-3 transition-colors ${checked ? "border-green-500 bg-green-50" : ""} ${maxReached ? "opacity-40" : ""}`}>
                                    <Checkbox
                                      id={`desafio-${o.value}`}
                                      checked={checked}
                                      disabled={maxReached}
                                      onCheckedChange={(c) => {
                                        const current = field.value ?? [];
                                        field.onChange(
                                          c
                                            ? [...current, o.value]
                                            : current.filter((v) => v !== o.value)
                                        );
                                      }}
                                    />
                                    <label
                                      htmlFor={`desafio-${o.value}`}
                                      className={`text-sm cursor-pointer ${maxReached ? "cursor-not-allowed" : ""}`}
                                    >
                                      {o.label}
                                    </label>
                                  </div>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {step > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={goBack}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                )}

                {step < STEPS.length - 1 ? (
                  <Button
                    type="button"
                    className="flex-1 bg-green-700 hover:bg-green-800"
                    onClick={goNext}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1 bg-green-700 hover:bg-green-800"
                    disabled={submitting || watchDesafios.length !== 3}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Formulario"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>

        <p className="text-center text-xs text-green-700 mt-4 pb-6">
          Sus datos están protegidos. Solo Fincava y sus aliados autorizados tendrán acceso.
        </p>
      </div>
    </div>
  );
}
