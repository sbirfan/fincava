import { useState, useEffect, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, Save, ShieldCheck, RotateCcw } from "lucide-react";
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
  SALUD_PLANTAS_OPTIONS,
  INFRAESTRUCTURA_OPTIONS,
  ACCESO_VIAL_OFFICER_OPTIONS,
  DISPOSICION_AGRICULTOR_OPTIONS,
} from "@/data/onboarding-options";

const STEPS = [
  "Identidad",
  "Finca",
  "Ventas",
  "Economía",
  "Metas",
  "Evaluación Officer",
];

const schema = z.object({
  nombre_completo: z.string().min(2, "Ingrese el nombre completo del agricultor"),
  whatsapp_number: z
    .string()
    .regex(/^\+57[0-9]{10}$/, "Debe comenzar con +57 seguido de 10 dígitos"),
  municipio: z.string().min(1, "Seleccione un municipio"),
  vereda: z.string().optional(),
  consent_given: z.boolean().refine((v) => v === true, {
    message: "El agricultor debe otorgar consentimiento",
  }),

  cultivo_principal: z.string().min(1, "Seleccione el cultivo principal"),
  variedad_cafe: z.string().optional(),
  hectareas_produccion: z.coerce
    .number()
    .min(0.1)
    .max(200)
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

  salud_plantas: z.string().optional(),
  infraestructura_postcosecha: z.string().optional(),
  acceso_vial: z.string().optional(),
  disposicion_agricultor: z.string().optional(),
  potencial_general: z.string().optional(),
  notas_officer: z.string().optional(),
  officer_name: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEP_FIELDS: Array<(keyof FormData)[]> = [
  ["nombre_completo", "whatsapp_number", "municipio", "consent_given"],
  ["cultivo_principal"],
  [],
  [],
  ["principales_desafios"],
  [],
];

function getStorageKey(whatsapp: string) {
  return `fincava_officer_reg_${whatsapp}`;
}

type DraftBanner = {
  key: string;
  nombre: string;
  whatsapp: string;
  savedStep: number;
};

const DRAFT_PREFIX = "fincava_officer_reg_";

function findExistingDraft(): DraftBanner | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Partial<FormData> & { _step?: number };
        const nombre = parsed.nombre_completo || "";
        const whatsapp = parsed.whatsapp_number || key.replace(DRAFT_PREFIX, "");
        if (nombre || whatsapp.length > 6) {
          return { key, nombre, whatsapp, savedStep: parsed._step ?? 0 };
        }
      }
    }
  } catch {
  }
  return null;
}

export default function OfficerRegister() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successName, setSuccessName] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftBanner, setDraftBanner] = useState<DraftBanner | null>(null);
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
      salud_plantas: "",
      infraestructura_postcosecha: "",
      acceso_vial: "",
      disposicion_agricultor: "",
      potencial_general: "",
      notas_officer: "",
      officer_name: "",
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

  const restoreDraft = useCallback(() => {
    if (!draftBanner) return;
    try {
      const raw = localStorage.getItem(draftBanner.key);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FormData> & { _step?: number };
        const { _step, ...formValues } = parsed;
        form.reset({ ...form.getValues(), ...formValues }, { keepDefaultValues: true });
        setStep(Math.min(Math.max(_step ?? 0, 0), STEPS.length - 1));
        window.scrollTo(0, 0);
      }
    } catch (err) {
      console.warn("[officer-register] Could not restore draft:", err);
    }
    setDraftBanner(null);
  }, [draftBanner, form]);

  const discardDraft = useCallback(() => {
    if (!draftBanner) return;
    localStorage.removeItem(draftBanner.key);
    form.reset();
    setStep(0);
    setDraftBanner(null);
  }, [draftBanner, form]);

  const saveToStorage = useCallback(() => {
    const whatsapp = form.getValues("whatsapp_number");
    if (whatsapp && whatsapp.length > 6) {
      localStorage.setItem(getStorageKey(whatsapp), JSON.stringify({ ...form.getValues(), _step: step }));
      setLastSaved(new Date());
    }
  }, [form, step]);

  useEffect(() => {
    const interval = setInterval(saveToStorage, 30000);
    return () => clearInterval(interval);
  }, [saveToStorage]);

  const goNext = async () => {
    const fields = STEP_FIELDS[step];
    const valid = fields.length === 0 || await form.trigger(fields);

    if (step === 4) {
      const desafios = form.getValues("principales_desafios");
      if (desafios.length !== 3) {
        form.setError("principales_desafios", { message: "Seleccione exactamente 3 desafíos" });
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
      form.setError("principales_desafios", { message: "Seleccione exactamente 3 desafíos" });
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
        registered_by: values.officer_name || "officer",
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
        interes_canal_premium:
          values.interes_canal_premium === "si"
            ? true
            : values.interes_canal_premium === "no"
            ? false
            : undefined,
        deuda_actual: values.deuda_actual || undefined,
        uso_capital: values.uso_capital,
        personas_dependientes: values.personas_dependientes !== "" ? Number(values.personas_dependientes) : undefined,
        situacion_economica: values.situacion_economica || undefined,
        disposicion_cambiar: values.disposicion_cambiar ? Number(values.disposicion_cambiar) : undefined,
        horizonte_inversion: values.horizonte_inversion || undefined,
        meta_principal_12m: values.meta_principal_12m || undefined,
        principales_desafios: values.principales_desafios,
        salud_plantas: values.salud_plantas || undefined,
        infraestructura_postcosecha: values.infraestructura_postcosecha || undefined,
        acceso_vial: values.acceso_vial || undefined,
        disposicion_agricultor: values.disposicion_agricultor || undefined,
        potencial_general: values.potencial_general ? Number(values.potencial_general) : undefined,
        notas_officer: values.notas_officer || undefined,
      };

      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/suppliers/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al enviar el formulario");
      }

      localStorage.removeItem(getStorageKey(values.whatsapp_number));
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-20 w-20 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            ¡Gracias {successName}, recibirá su evaluación por WhatsApp!
          </h1>
          <p className="text-gray-600">
            El agricultor ha sido registrado exitosamente. Recibirá un análisis completo de elegibilidad en las próximas 24–48 horas.
          </p>
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-blue-700 hover:bg-blue-800"
              onClick={() => {
                setSubmitted(false);
                setStep(0);
                form.reset();
              }}
            >
              Registrar otro
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => setLocation("/")}
            >
              Inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-4">
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
                  {draftBanner.nombre
                    ? <><span className="font-medium">{draftBanner.nombre}</span> · </>
                    : null}
                  {draftBanner.whatsapp}
                  {" · "}
                  Sección {draftBanner.savedStep + 1} de {STEPS.length} — {STEPS[draftBanner.savedStep]}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1 h-auto"
                    onClick={restoreDraft}
                  >
                    Restaurar borrador
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs px-3 py-1 h-auto border-amber-400 text-amber-800 hover:bg-amber-100"
                    onClick={discardDraft}
                  >
                    Empezar de nuevo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            <h1 className="text-2xl font-bold text-blue-900">Registro — Officer</h1>
          </div>
          <p className="text-sm text-blue-700">
            Sección {step + 1} de {STEPS.length} — {STEPS[step]}
          </p>
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-xs text-blue-700 font-medium">
            {STEPS.map((_, i) => (
              <span key={i} className={i <= step ? "text-blue-700" : "text-gray-400"}>
                {i + 1}
              </span>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {lastSaved && (
          <div className="flex items-center gap-1 text-xs text-blue-600 mb-3 justify-end">
            <Save className="h-3 w-3" />
            Guardado {lastSaved.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {step === 0 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">A. Identidad del Agricultor</h2>

                  <FormField
                    control={form.control}
                    name="officer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Su nombre (Officer registrador)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: María Torres" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nombre_completo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo del agricultor *</FormLabel>
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
                        <FormLabel>WhatsApp del agricultor *</FormLabel>
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
                          />
                        </FormControl>
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
                      <FormItem className="flex items-start gap-3 bg-blue-50 rounded-lg p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="text-sm font-medium leading-snug cursor-pointer">
                            El agricultor otorgó su consentimiento verbal para el uso de sus datos en el proceso de análisis de elegibilidad Fincava. *
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
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-3">
                            {["Café", "Cacao", "Panela", "Otro"].map((c) => (
                              <div key={c}>
                                <RadioGroupItem value={c} id={`off-cultivo-${c}`} className="peer sr-only" />
                                <label htmlFor={`off-cultivo-${c}`} className="flex items-center justify-center rounded-xl border-2 border-muted bg-muted/20 p-3 text-sm font-medium cursor-pointer hover:bg-blue-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 peer-data-[state=checked]:text-blue-800 transition-colors">
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
                              <SelectTrigger><SelectValue placeholder="Seleccione variedad..." /></SelectTrigger>
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
                          <FormControl><Input type="number" step="0.1" min="0.1" max="200" placeholder="Ej: 2.5" {...field} /></FormControl>
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
                          <FormControl><Input type="number" min="0" placeholder="Ej: 7" {...field} /></FormControl>
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
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                            {["1", "2", "3"].map((n) => (
                              <div key={n} className="flex items-center gap-2">
                                <RadioGroupItem value={n} id={`off-cosechas-${n}`} />
                                <label htmlFor={`off-cosechas-${n}`} className="text-sm font-medium cursor-pointer">{n}</label>
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
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione método..." /></SelectTrigger></FormControl>
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
                        <FormLabel>Acceso a agua</FormLabel>
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-2">
                            {ACCESO_AGUA_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`off-agua-${o.value}`} />
                                <label htmlFor={`off-agua-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
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
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-3">
                            {TENENCIA_TIERRA_OPTIONS.map((o) => (
                              <div key={o.value}>
                                <RadioGroupItem value={o.value} id={`off-tierra-${o.value}`} className="peer sr-only" />
                                <label htmlFor={`off-tierra-${o.value}`} className="flex items-center justify-center rounded-xl border-2 border-muted bg-muted/20 p-3 text-sm font-medium cursor-pointer hover:bg-blue-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 peer-data-[state=checked]:text-blue-800 transition-colors">
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
                        <FormLabel>¿A quién vende la cosecha?</FormLabel>
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-2">
                            {TIPO_COMPRADOR_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`off-comprador-${o.value}`} />
                                <label htmlFor={`off-comprador-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel className="text-sm font-medium">Volumen última cosecha</FormLabel>
                    <div className="flex gap-2 mt-2">
                      <FormField
                        control={form.control}
                        name="volumen_value"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl><Input type="number" min="0" placeholder="Ej: 500" {...field} /></FormControl>
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
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="cargas">cargas</SelectItem>
                              </SelectContent>
                            </Select>
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
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-2">
                            {PRECIO_VENTA_BANDA_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`off-precio-${o.value}`} />
                                <label htmlFor={`off-precio-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
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
                        <FormLabel>¿Interés en canales premium?</FormLabel>
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="si" id="off-premium-si" />
                              <label htmlFor="off-premium-si" className="text-sm font-medium cursor-pointer">Sí</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="no" id="off-premium-no" />
                              <label htmlFor="off-premium-no" className="text-sm font-medium cursor-pointer">No</label>
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
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-2">
                            {DEUDA_ACTUAL_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`off-deuda-${o.value}`} />
                                <label htmlFor={`off-deuda-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
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
                        <FormLabel>¿En qué usaría capital adicional?</FormLabel>
                        <div className="space-y-2 mt-1">
                          {USO_CAPITAL_OPTIONS.map((o) => (
                            <FormField
                              key={o.value}
                              control={form.control}
                              name="uso_capital"
                              render={({ field }) => (
                                <div className="flex items-center gap-3 border rounded-lg p-3">
                                  <Checkbox
                                    id={`off-capital-${o.value}`}
                                    checked={field.value?.includes(o.value)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value ?? [];
                                      field.onChange(checked ? [...current, o.value] : current.filter((v) => v !== o.value));
                                    }}
                                  />
                                  <label htmlFor={`off-capital-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
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
                        <FormLabel>Personas dependientes</FormLabel>
                        <FormControl><Input type="number" min="0" placeholder="Ej: 4" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="situacion_economica"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Situación económica actual</FormLabel>
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-2">
                            {SITUACION_ECONOMICA_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`off-situacion-${o.value}`} />
                                <label htmlFor={`off-situacion-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
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
                        <FormLabel>Disposición al cambio (1–5)</FormLabel>
                        <p className="text-xs text-muted-foreground">1 = Nada dispuesto · 5 = Muy dispuesto</p>
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-3 justify-center mt-2">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <div key={n}>
                                <RadioGroupItem value={String(n)} id={`off-disposicion-${n}`} className="peer sr-only" />
                                <label htmlFor={`off-disposicion-${n}`} className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-muted bg-muted/20 text-base font-bold cursor-pointer hover:bg-blue-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-600 peer-data-[state=checked]:text-white transition-colors">
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
                        <FormLabel>Horizonte de inversión</FormLabel>
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-2">
                            {HORIZONTE_INVERSION_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`off-horizonte-${o.value}`} />
                                <label htmlFor={`off-horizonte-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
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
                        <FormLabel>Meta principal — próximos 12 meses</FormLabel>
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-2">
                            {META_PRINCIPAL_OPTIONS.map((o) => (
                              <div key={o.value} className="flex items-center gap-3 border rounded-lg p-3">
                                <RadioGroupItem value={o.value} id={`off-meta-${o.value}`} />
                                <label htmlFor={`off-meta-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
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
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${watchDesafios.length === 3 ? "bg-green-100 text-green-700" : watchDesafios.length > 3 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                            {watchDesafios.length}/3
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
                                  <div className={`flex items-center gap-3 border rounded-lg p-3 transition-colors ${checked ? "border-blue-500 bg-blue-50" : ""} ${maxReached ? "opacity-40" : ""}`}>
                                    <Checkbox
                                      id={`off-desafio-${o.value}`}
                                      checked={checked}
                                      disabled={maxReached}
                                      onCheckedChange={(c) => {
                                        const current = field.value ?? [];
                                        field.onChange(c ? [...current, o.value] : current.filter((v) => v !== o.value));
                                      }}
                                    />
                                    <label htmlFor={`off-desafio-${o.value}`} className={`text-sm cursor-pointer ${maxReached ? "cursor-not-allowed" : ""}`}>{o.label}</label>
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

              {step === 5 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-800">F. Evaluación del Officer</h2>
                  </div>
                  <p className="text-xs text-blue-700 bg-blue-50 rounded-lg p-3">
                    Esta sección es completada por el officer de campo y no es visible para el agricultor.
                  </p>

                  <FormField
                    control={form.control}
                    name="salud_plantas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado de salud de las plantas</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {SALUD_PLANTAS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="infraestructura_postcosecha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Infraestructura postcosecha</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {INFRAESTRUCTURA_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="acceso_vial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acceso vial a la finca</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {ACCESO_VIAL_OFFICER_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="disposicion_agricultor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disposición del agricultor (observación officer)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {DISPOSICION_AGRICULTOR_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="potencial_general"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potencial general del agricultor (1–5)</FormLabel>
                        <p className="text-xs text-muted-foreground">1 = Muy bajo · 5 = Muy alto</p>
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-3 justify-center mt-2">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <div key={n}>
                                <RadioGroupItem value={String(n)} id={`off-potencial-${n}`} className="peer sr-only" />
                                <label htmlFor={`off-potencial-${n}`} className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-muted bg-muted/20 text-base font-bold cursor-pointer hover:bg-blue-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-600 peer-data-[state=checked]:text-white transition-colors">
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
                    name="notas_officer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas del officer <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Observaciones de campo, contexto adicional, impresiones generales..."
                            className="min-h-28 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {step > 0 && (
                  <Button type="button" variant="outline" className="flex-1" onClick={goBack}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                )}

                {step < STEPS.length - 1 ? (
                  <Button type="button" className="flex-1 bg-blue-700 hover:bg-blue-800" onClick={goNext}>
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-700 hover:bg-blue-800"
                    disabled={submitting || watchDesafios.length !== 3}
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                    ) : (
                      "Guardar Registro"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>

        <p className="text-center text-xs text-blue-700 mt-4 pb-6">
          Uso exclusivo para officers Fincava. Datos protegidos con acceso restringido.
        </p>
      </div>
    </div>
  );
}
