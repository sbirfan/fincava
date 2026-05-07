import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChangePasswordCard } from "@/components/change-password-card";
import {
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";

// ── Types ──────────────────────────────────────────────────────────────────────
type P2Section = "S1" | "S2" | "S3" | "S4";
type SectionSaveStatus = "idle" | "saving" | "saved" | "error";
type SectionStatus = "complete" | "in-progress" | "empty";

interface P2Profile {
  id: number;
  companyName: string | null;
  country: string | null;
  targetProducts: string[];
  requiredCertsP1: string[];
  // S1
  buyerSegment: string | null;
  locationCount: string | null;
  annualBudgetUsd: string | null;
  // S2
  coffeeQualityTier: string | null;
  coffeeFlavorProfile: string[];
  cacaoFlavorProfile: string | null;
  fruitForm: string[];
  availabilityRequirement: string | null;
  orderFrequency: string | null;
  // S3
  coffeeOrderSizeKg: string | null;
  cacaoOrderSizeKg: string | null;
  fruitOrderSizeKg: string | null;
  priceSensitivity: string | null;
  priceTransparency: string[];
  // S4
  certsNiceToHave: string[];
  traceabilityLevel: string | null;
  qualityDocRequired: string[];
  coffeeDefectRate: string | null;
  cacaoMoldPct: string | null;
  sourceConsistency: string | null;
  qualityVerification: string[];
  sustainabilityImportance: string | null;
  sustainabilityDimensions: string[];
  // tracking
  p2CompletionPct: number;
  p2SectionsDone: string[];
  // approval workflow
  p2ApprovalStatus: string | null;
  p2RevisionNote: string | null;
  // marketing (from same DB row, may or may not be present)
  marketingOptIn?: boolean;
  marketingTopics?: string[];
}

type P2FormState = {
  buyerSegment: string | null;
  locationCount: string | null;
  annualBudgetUsd: string | null;
  coffeeQualityTier: string | null;
  coffeeFlavorProfile: string[];
  cacaoFlavorProfile: string | null;
  fruitForm: string[];
  availabilityRequirement: string | null;
  orderFrequency: string | null;
  coffeeOrderSizeKg: string | null;
  cacaoOrderSizeKg: string | null;
  fruitOrderSizeKg: string | null;
  priceSensitivity: string | null;
  priceTransparency: string[];
  certsNiceToHave: string[];
  traceabilityLevel: string | null;
  qualityDocRequired: string[];
  coffeeDefectRate: string | null;
  cacaoMoldPct: string | null;
  sourceConsistency: string | null;
  qualityVerification: string[];
  sustainabilityImportance: string | null;
  sustainabilityDimensions: string[];
};

const EMPTY_FORM: P2FormState = {
  buyerSegment: null, locationCount: null, annualBudgetUsd: null,
  coffeeQualityTier: null, coffeeFlavorProfile: [], cacaoFlavorProfile: null,
  fruitForm: [], availabilityRequirement: null, orderFrequency: null,
  coffeeOrderSizeKg: null, cacaoOrderSizeKg: null, fruitOrderSizeKg: null,
  priceSensitivity: null, priceTransparency: [],
  certsNiceToHave: [], traceabilityLevel: null, qualityDocRequired: [],
  coffeeDefectRate: null, cacaoMoldPct: null, sourceConsistency: null,
  qualityVerification: [], sustainabilityImportance: null, sustainabilityDimensions: [],
};

const SECTIONS: P2Section[] = ["S1", "S2", "S3", "S4"];

// ── Section completion logic ───────────────────────────────────────────────────
// Required fields mirror ONBOARD_SECTION_REQUIRED on the backend (non-conditional
// required fields only). Used for optimistic local "Complete" detection before
// the PATCH response lands.
function isLocallyComplete(section: P2Section, form: P2FormState): boolean {
  switch (section) {
    case "S1": return !!(form.buyerSegment && form.locationCount && form.annualBudgetUsd);
    case "S2": return !!(form.availabilityRequirement && form.orderFrequency);
    case "S3": return !!(form.priceSensitivity);
    case "S4": return !!(form.traceabilityLevel && form.sourceConsistency);
  }
}

function computeSectionStatus(
  section: P2Section,
  form: P2FormState,
  sectionsDone: string[],
): SectionStatus {
  // Backend-confirmed completion takes priority (persists across page loads)
  if (sectionsDone.includes(section)) return "complete";
  // Optimistic local check — immediately responsive on field changes
  if (isLocallyComplete(section, form)) return "complete";
  const hasAny = (() => {
    switch (section) {
      case "S1":
        return !!(form.buyerSegment || form.locationCount || form.annualBudgetUsd);
      case "S2":
        return !!(
          form.coffeeQualityTier || form.coffeeFlavorProfile.length ||
          form.cacaoFlavorProfile || form.fruitForm.length ||
          form.availabilityRequirement || form.orderFrequency
        );
      case "S3":
        return !!(
          form.coffeeOrderSizeKg || form.cacaoOrderSizeKg || form.fruitOrderSizeKg ||
          form.priceSensitivity || form.priceTransparency.length
        );
      case "S4":
        return !!(
          form.certsNiceToHave.length || form.traceabilityLevel ||
          form.qualityDocRequired.length || form.coffeeDefectRate ||
          form.cacaoMoldPct || form.sourceConsistency ||
          form.qualityVerification.length || form.sustainabilityImportance ||
          form.sustainabilityDimensions.length
        );
    }
  })();
  return hasAny ? "in-progress" : "empty";
}

function buildSectionPayload(section: P2Section, form: P2FormState): Record<string, unknown> {
  switch (section) {
    case "S1":
      return { buyerSegment: form.buyerSegment, locationCount: form.locationCount, annualBudgetUsd: form.annualBudgetUsd };
    case "S2":
      return { coffeeQualityTier: form.coffeeQualityTier, coffeeFlavorProfile: form.coffeeFlavorProfile, cacaoFlavorProfile: form.cacaoFlavorProfile, fruitForm: form.fruitForm, availabilityRequirement: form.availabilityRequirement, orderFrequency: form.orderFrequency };
    case "S3":
      return { coffeeOrderSizeKg: form.coffeeOrderSizeKg, cacaoOrderSizeKg: form.cacaoOrderSizeKg, fruitOrderSizeKg: form.fruitOrderSizeKg, priceSensitivity: form.priceSensitivity, priceTransparency: form.priceTransparency };
    case "S4":
      return { certsNiceToHave: form.certsNiceToHave, traceabilityLevel: form.traceabilityLevel, qualityDocRequired: form.qualityDocRequired, coffeeDefectRate: form.coffeeDefectRate, cacaoMoldPct: form.cacaoMoldPct, sourceConsistency: form.sourceConsistency, qualityVerification: form.qualityVerification, sustainabilityImportance: form.sustainabilityImportance, sustainabilityDimensions: form.sustainabilityDimensions };
  }
}

// ── Helper UI components ───────────────────────────────────────────────────────
function StatusBadge({ status, tr }: { status: SectionStatus; tr: { statusComplete: string; statusInProgress: string; statusEmpty: string } }) {
  if (status === "complete")
    return <Badge className="bg-emerald-600 hover:bg-emerald-700 shrink-0 text-xs"><Check className="h-3 w-3 mr-1" />{tr.statusComplete}</Badge>;
  if (status === "in-progress")
    return <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 shrink-0 text-xs">{tr.statusInProgress}</Badge>;
  return <Badge variant="outline" className="text-muted-foreground shrink-0 text-xs">{tr.statusEmpty}</Badge>;
}

function PillSelect({ options, value, onChange, testIdPrefix }: {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(value === o.value ? null : o.value)}
          data-testid={`pill-${testIdPrefix}-${o.value}`}
          className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
            value === o.value
              ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-medium"
              : "border-input hover:bg-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MultiPillSelect({ options, value, onChange, testIdPrefix }: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  testIdPrefix: string;
}) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            data-testid={`mpill-${testIdPrefix}-${o.value}`}
            className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
              active
                ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-medium"
                : "border-input hover:bg-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

function ReadOnlyChip({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground border-l-2 border-muted pl-3 mb-4">{children}</p>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BuyerProfile() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const tr = t.dashboard.sourcingProfile;
  const trO = t.buyerOnboarding;

  // ── P2 onboarding data
  const {
    data: onboardingResp,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery<{ profile: P2Profile }>({
    queryKey: ["buyer", "onboarding"],
    queryFn: async () => {
      const res = await fetch("/api/buyer/onboarding", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
  });

  const profile = onboardingResp?.profile;

  // ── Local form state (mirrors API data for instant UI feedback)
  const [form, setForm] = useState<P2FormState | null>(null);
  const [sectionsDone, setSectionsDone] = useState<string[]>([]);
  const formRef = useRef<P2FormState | null>(null);

  useEffect(() => {
    if (profile && form === null) {
      const initial: P2FormState = {
        buyerSegment: profile.buyerSegment,
        locationCount: profile.locationCount,
        annualBudgetUsd: profile.annualBudgetUsd,
        coffeeQualityTier: profile.coffeeQualityTier,
        coffeeFlavorProfile: profile.coffeeFlavorProfile ?? [],
        cacaoFlavorProfile: profile.cacaoFlavorProfile,
        fruitForm: profile.fruitForm ?? [],
        availabilityRequirement: profile.availabilityRequirement,
        orderFrequency: profile.orderFrequency,
        coffeeOrderSizeKg: profile.coffeeOrderSizeKg,
        cacaoOrderSizeKg: profile.cacaoOrderSizeKg,
        fruitOrderSizeKg: profile.fruitOrderSizeKg,
        priceSensitivity: profile.priceSensitivity,
        priceTransparency: profile.priceTransparency ?? [],
        certsNiceToHave: profile.certsNiceToHave ?? [],
        traceabilityLevel: profile.traceabilityLevel,
        qualityDocRequired: profile.qualityDocRequired ?? [],
        coffeeDefectRate: profile.coffeeDefectRate,
        cacaoMoldPct: profile.cacaoMoldPct,
        sourceConsistency: profile.sourceConsistency,
        qualityVerification: profile.qualityVerification ?? [],
        sustainabilityImportance: profile.sustainabilityImportance,
        sustainabilityDimensions: profile.sustainabilityDimensions ?? [],
      };
      setForm(initial);
      formRef.current = initial;
      setSectionsDone(profile.p2SectionsDone ?? []);
    }
  }, [profile, form]);

  // ── Section open/collapsed state — first incomplete section open by default
  const [openSections, setOpenSections] = useState<Record<P2Section, boolean>>({
    S1: false, S2: false, S3: false, S4: false,
  });
  const defaultOpenSetRef = useRef(false);

  useEffect(() => {
    if (form && !defaultOpenSetRef.current) {
      defaultOpenSetRef.current = true;
      const first = SECTIONS.find(s => !sectionsDone.includes(s)) ?? "S1";
      setOpenSections(prev => ({ ...prev, [first]: true }));
    }
  }, [form, sectionsDone]);

  // ── Auto-save: debounced per section, 500 ms
  const [saveStatus, setSaveStatus] = useState<Record<P2Section, SectionSaveStatus>>({
    S1: "idle", S2: "idle", S3: "idle", S4: "idle",
  });
  const saveStatusRef = useRef<Record<P2Section, SectionSaveStatus>>({
    S1: "idle", S2: "idle", S3: "idle", S4: "idle",
  });
  const timersRef = useRef<Partial<Record<P2Section, ReturnType<typeof setTimeout>>>>({});
  const fadeTimersRef = useRef<Partial<Record<P2Section, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => () => {
    Object.values(timersRef.current).forEach(t => clearTimeout(t));
    Object.values(fadeTimersRef.current).forEach(t => clearTimeout(t));
  }, []);

  const setSS = (section: P2Section, status: SectionSaveStatus) => {
    saveStatusRef.current[section] = status;
    setSaveStatus(prev => ({ ...prev, [section]: status }));
  };

  const flushSection = async (section: P2Section) => {
    const currentForm = formRef.current;
    if (!currentForm) return;
    setSS(section, "saving");
    const payload = buildSectionPayload(section, currentForm);
    try {
      const res = await fetch("/api/buyer/onboarding", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Save failed (${res.status})`);
      const newDone: string[] = json.profile?.p2SectionsDone ?? json.sectionsDone ?? sectionsDone;
      setSectionsDone(newDone);
      queryClient.invalidateQueries({ queryKey: ["buyer", "onboarding-pct"] });
      queryClient.invalidateQueries({ queryKey: ["buyer", "onboarding"] });
      setSS(section, "saved");
      clearTimeout(fadeTimersRef.current[section]);
      fadeTimersRef.current[section] = setTimeout(() => {
        if (saveStatusRef.current[section] === "saved") setSS(section, "idle");
      }, 2000);
    } catch {
      setSS(section, "error");
      toast({ title: tr.saveFailed, variant: "destructive" });
    }
  };

  const scheduleSection = (section: P2Section) => {
    clearTimeout(timersRef.current[section]);
    timersRef.current[section] = setTimeout(() => flushSection(section), 500);
  };

  const updateField = (section: P2Section, field: keyof P2FormState, value: unknown) => {
    setForm(prev => {
      const next = { ...(prev ?? EMPTY_FORM), [field]: value };
      formRef.current = next;
      return next;
    });
    scheduleSection(section);
  };

  // ── Conditional flags
  const targetProducts = profile?.targetProducts ?? [];
  const hasCoffee = targetProducts.includes("COFFEE");
  const hasCacao = targetProducts.includes("CACAO");
  const hasFruit = targetProducts.includes("EXOTIC_FRUIT");

  const toggleSection = (section: P2Section) =>
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));

  const scrollToSection = (section: P2Section) => {
    setOpenSections(prev => ({ ...prev, [section]: true }));
    setTimeout(() => {
      document.getElementById(`section-card-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const isLoading = userLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const completionPct = profile?.p2CompletionPct ?? 0;

  const pctColor =
    completionPct >= 100 ? "text-emerald-600" :
    completionPct >= 80  ? "text-blue-600" :
    completionPct >= 50  ? "text-amber-600" :
    "text-red-600";

  const SECTION_LABELS: Record<P2Section, string> = {
    S1: trO.steps[0], S2: trO.steps[1], S3: trO.steps[2], S4: trO.steps[3],
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">{tr.pageTitle}</h1>
        <p className="text-muted-foreground mt-2">{tr.pageDesc}</p>
      </div>

      {/* ── Approval status banner (M11) ─────────────────────────────────────── */}
      {profile?.p2ApprovalStatus === "REVISION_REQUESTED" && (
        <div
          className="flex gap-3 rounded-xl border border-amber-300/40 bg-amber-50 px-4 py-3"
          data-testid="banner-revision-requested"
        >
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800">Profile updates requested</p>
            {profile.p2RevisionNote && (
              <p className="text-sm text-amber-700">{profile.p2RevisionNote}</p>
            )}
            <p className="text-xs text-amber-600">
              Please update the sections below and save. Our team will be notified automatically.
            </p>
          </div>
        </div>
      )}
      {profile?.p2ApprovalStatus === "NEEDS_ATTENTION" && (
        <div
          className="flex gap-3 rounded-xl border border-amber-300/40 bg-amber-50 px-4 py-3"
          data-testid="banner-needs-attention"
        >
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800">Your profile needs attention</p>
            <p className="text-xs text-amber-600">
              Our team has flagged your profile for review. Please ensure all sections are complete and accurate.
            </p>
          </div>
        </div>
      )}

      {/* ── P2 Sourcing Profile section ─────────────────────────────────────── */}
      {profileError ? (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-muted-foreground">{tr.emptyStateBody}</p>
            <Link href="/buyer/onboarding">
              <Button>{tr.emptyStateCta}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : form ? (
        /* Mobile: sidebar stacks above sections (flex-col). lg: side-by-side */
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Sticky sidebar ─────────────────────────────────────────────── */}
          <div className="w-full lg:w-64 xl:w-72 lg:sticky lg:top-6 shrink-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  {tr.completionSidebar}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-bold tabular-nums ${pctColor}`}
                    data-testid="text-completion-pct"
                  >
                    {completionPct}%
                  </span>
                  <span className="text-xs text-muted-foreground">complete</span>
                </div>
                <Progress value={completionPct} className="h-2" />
                <div className="space-y-1 pt-1">
                  {SECTIONS.map((s, i) => {
                    const status = computeSectionStatus(s, form, sectionsDone);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => scrollToSection(s)}
                        data-testid={`sidebar-section-${s}`}
                        className="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted transition-colors text-left"
                      >
                        <span className="truncate">{tr.sectionDescs[i] ? SECTION_LABELS[s] : s}</span>
                        {status === "complete" ? (
                          <span className="text-xs text-emerald-600 flex items-center gap-0.5 shrink-0 ml-2">
                            <Check className="h-3 w-3" />{tr.statusComplete}
                          </span>
                        ) : status === "in-progress" ? (
                          <span className="text-xs text-amber-600 shrink-0 ml-2">{tr.statusInProgress}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">{tr.statusEmpty}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2 border-t">
                  <Link href="/buyer/onboarding">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                      {tr.wizardLink} <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Section cards ────────────────────────────────────────────────── */}
          <div className="flex-1 space-y-4 min-w-0">
            {SECTIONS.map((section, i) => {
              const status = computeSectionStatus(section, form, sectionsDone);
              const ss = saveStatus[section];
              const isOpen = openSections[section];

              return (
                <Card key={section} id={`section-card-${section}`} data-testid={`section-card-${section}`}>
                  {/* Section header / toggle */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section)}
                    aria-expanded={isOpen}
                    data-testid={`section-toggle-${section}`}
                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left rounded-lg"
                  >
                    <span className="font-semibold text-sm flex-1">{SECTION_LABELS[section]}</span>
                    <StatusBadge status={status} tr={tr} />
                    {ss !== "idle" && (
                      <span className="flex items-center gap-1 shrink-0">
                        {ss === "saving" && (
                          <><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground hidden sm:inline">Saving…</span></>
                        )}
                        {ss === "saved" && (
                          <><Check className="h-3 w-3 text-emerald-600" /><span className="text-xs text-emerald-600 hidden sm:inline">{tr.saved}</span></>
                        )}
                        {ss === "error" && (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); flushSection(section); }}
                            className="text-xs text-destructive flex items-center gap-1 hover:underline"
                          >
                            <AlertCircle className="h-3 w-3" />
                            <span className="hidden sm:inline">{tr.saveFailed} — {tr.retry}</span>
                          </button>
                        )}
                      </span>
                    )}
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                  </button>

                  {/* Section body */}
                  {isOpen && (
                    <CardContent className="pt-0 pb-6 px-4 border-t space-y-5">
                      <p className="text-sm text-muted-foreground mt-3">{tr.sectionDescs[i]}</p>
                      <SectionFields
                        section={section}
                        form={form}
                        updateField={updateField}
                        hasCoffee={hasCoffee}
                        hasCacao={hasCacao}
                        hasFruit={hasFruit}
                        isCoffeeSpecialist={
                          form.buyerSegment === "specialty_roaster" ||
                          form.buyerSegment === "craft_chocolatier"
                        }
                        showSustainabilityDims={
                          !!form.sustainabilityImportance &&
                          form.sustainabilityImportance !== "not_important"
                        }
                        targetProducts={targetProducts}
                        requiredCertsP1={profile?.requiredCertsP1 ?? []}
                        companyName={profile?.companyName}
                        country={profile?.country}
                        trO={trO}
                      />
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Preserved working cards ──────────────────────────────────────────── */}
      {profile ? (
        <MarketingPreferencesCard
          profileId={profile.id}
          initialOptIn={profile.marketingOptIn ?? false}
          initialTopics={profile.marketingTopics ?? []}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Personal Information
            <Badge variant="secondary" className="text-xs font-normal">Read only</Badge>
          </CardTitle>
          <CardDescription>Your personal details on file. Contact support to update.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name</label>
              <Input defaultValue={user?.firstName} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <Input defaultValue={user?.lastName} disabled />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input defaultValue={user?.email} disabled />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Country</label>
            <Input defaultValue={user?.country || ""} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Company Details
            <Badge variant="secondary" className="text-xs font-normal">Read only</Badge>
          </CardTitle>
          <CardDescription>
            Information about your purchasing organization. Contact support to update.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Company Name</label>
            <Input defaultValue={user?.companyName || ""} disabled />
          </div>
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}

// ── Section Fields ────────────────────────────────────────────────────────────
type TrO = ReturnType<typeof useLanguage>["t"]["buyerOnboarding"];

function optsFromRecord(rec: Record<string, string>): { value: string; label: string }[] {
  return Object.entries(rec).map(([value, label]) => ({ value, label }));
}

function SectionFields({
  section, form, updateField,
  hasCoffee, hasCacao, hasFruit, isCoffeeSpecialist, showSustainabilityDims,
  targetProducts, requiredCertsP1, companyName, country, trO,
}: {
  section: P2Section;
  form: P2FormState;
  updateField: (section: P2Section, field: keyof P2FormState, value: unknown) => void;
  hasCoffee: boolean;
  hasCacao: boolean;
  hasFruit: boolean;
  isCoffeeSpecialist: boolean;
  showSustainabilityDims: boolean;
  targetProducts: string[];
  requiredCertsP1: string[];
  companyName: string | null | undefined;
  country: string | null | undefined;
  trO: TrO;
}) {
  const set = (field: keyof P2FormState, val: unknown) => updateField(section, field, val);

  switch (section) {
    // ─────────────────────────────────────── S1 — Company Profile
    case "S1": {
      const segmentOpts = useMemo(() => optsFromRecord(trO.buyerSegmentOpts), [trO]);
      const locationOpts = useMemo(() => optsFromRecord(trO.locationCountOpts), [trO]);
      const budgetOpts = useMemo(() => optsFromRecord(trO.annualBudgetOpts), [trO]);
      return (
        <div className="space-y-5">
          {(companyName || country) && (
            <ReadOnlyChip>{companyName}{companyName && country ? ", " : ""}{country}</ReadOnlyChip>
          )}
          <FieldGroup label={trO.q2Label}>
            <PillSelect options={segmentOpts} value={form.buyerSegment} onChange={v => set("buyerSegment", v)} testIdPrefix="buyerSegment" />
          </FieldGroup>
          <FieldGroup label={trO.q3Label}>
            <PillSelect options={locationOpts} value={form.locationCount} onChange={v => set("locationCount", v)} testIdPrefix="locationCount" />
          </FieldGroup>
          <FieldGroup label={trO.q4Label}>
            <PillSelect options={budgetOpts} value={form.annualBudgetUsd} onChange={v => set("annualBudgetUsd", v)} testIdPrefix="annualBudgetUsd" />
          </FieldGroup>
        </div>
      );
    }

    // ─────────────────────────────────────── S2 — Product Interests
    case "S2": {
      const qualityOpts = useMemo(() => optsFromRecord(trO.coffeeQualityOpts), [trO]);
      const coffeeFlavorOpts = useMemo(() => optsFromRecord(trO.coffeeFlavorOpts), [trO]);
      const cacaoFlavorOpts = useMemo(() => optsFromRecord(trO.cacaoFlavorOpts), [trO]);
      const fruitFormOpts = useMemo(() => optsFromRecord(trO.fruitFormOpts), [trO]);
      const availOpts = useMemo(() => optsFromRecord(trO.availabilityOpts), [trO]);
      const freqOpts = useMemo(() => optsFromRecord(trO.orderFrequencyOpts), [trO]);
      return (
        <div className="space-y-5">
          {targetProducts.length > 0 && (
            <ReadOnlyChip>{trO.youAreSourcing} {targetProducts.join(", ")}</ReadOnlyChip>
          )}
          {hasCoffee && (
            <FieldGroup label={trO.q6Label}>
              <PillSelect options={qualityOpts} value={form.coffeeQualityTier} onChange={v => set("coffeeQualityTier", v)} testIdPrefix="coffeeQualityTier" />
            </FieldGroup>
          )}
          {hasCoffee && (
            <FieldGroup label={trO.q7Label}>
              <MultiPillSelect options={coffeeFlavorOpts} value={form.coffeeFlavorProfile} onChange={v => set("coffeeFlavorProfile", v)} testIdPrefix="coffeeFlavorProfile" />
            </FieldGroup>
          )}
          {hasCacao && (
            <FieldGroup label={trO.q8Label}>
              <PillSelect options={cacaoFlavorOpts} value={form.cacaoFlavorProfile} onChange={v => set("cacaoFlavorProfile", v)} testIdPrefix="cacaoFlavorProfile" />
            </FieldGroup>
          )}
          {hasFruit && (
            <FieldGroup label={trO.q9Label}>
              <MultiPillSelect options={fruitFormOpts} value={form.fruitForm} onChange={v => set("fruitForm", v)} testIdPrefix="fruitForm" />
            </FieldGroup>
          )}
          <FieldGroup label={trO.q10Label}>
            <PillSelect options={availOpts} value={form.availabilityRequirement} onChange={v => set("availabilityRequirement", v)} testIdPrefix="availabilityRequirement" />
          </FieldGroup>
          <FieldGroup label={trO.q11Label}>
            <PillSelect options={freqOpts} value={form.orderFrequency} onChange={v => set("orderFrequency", v)} testIdPrefix="orderFrequency" />
          </FieldGroup>
        </div>
      );
    }

    // ─────────────────────────────────────── S3 — Volume & Pricing
    case "S3": {
      const coffeeOrderOpts = useMemo(() => optsFromRecord(trO.coffeeOrderOpts), [trO]);
      const cacaoOrderOpts = useMemo(() => optsFromRecord(trO.cacaoOrderOpts), [trO]);
      const fruitOrderOpts = useMemo(() => optsFromRecord(trO.fruitOrderOpts), [trO]);
      const priceOpts = useMemo(() => optsFromRecord(trO.priceSensitivityOpts), [trO]);
      const priceTransOpts = useMemo(() => optsFromRecord(trO.priceTransparencyOpts), [trO]);
      return (
        <div className="space-y-5">
          {hasCoffee && (
            <FieldGroup label={trO.q12Label}>
              <PillSelect options={coffeeOrderOpts} value={form.coffeeOrderSizeKg} onChange={v => set("coffeeOrderSizeKg", v)} testIdPrefix="coffeeOrderSizeKg" />
            </FieldGroup>
          )}
          {hasCacao && (
            <FieldGroup label={trO.q13Label}>
              <PillSelect options={cacaoOrderOpts} value={form.cacaoOrderSizeKg} onChange={v => set("cacaoOrderSizeKg", v)} testIdPrefix="cacaoOrderSizeKg" />
            </FieldGroup>
          )}
          {hasFruit && (
            <FieldGroup label={trO.q14Label}>
              <PillSelect options={fruitOrderOpts} value={form.fruitOrderSizeKg} onChange={v => set("fruitOrderSizeKg", v)} testIdPrefix="fruitOrderSizeKg" />
            </FieldGroup>
          )}
          <FieldGroup label={trO.q15Label}>
            <PillSelect options={priceOpts} value={form.priceSensitivity} onChange={v => set("priceSensitivity", v)} testIdPrefix="priceSensitivity" />
          </FieldGroup>
          <FieldGroup label={trO.q16Label}>
            <MultiPillSelect options={priceTransOpts} value={form.priceTransparency} onChange={v => set("priceTransparency", v)} testIdPrefix="priceTransparency" />
          </FieldGroup>
        </div>
      );
    }

    // ─────────────────────────────────────── S4 — Quality & Values
    case "S4": {
      const certOpts = useMemo(() => optsFromRecord(trO.certsNiceToHaveOpts), [trO]);
      const traceOpts = useMemo(() => optsFromRecord(trO.traceabilityOpts), [trO]);
      const qualDocOpts = useMemo(() => optsFromRecord(trO.qualityDocOpts), [trO]);
      const defectOpts = useMemo(() => optsFromRecord(trO.coffeeDefectOpts), [trO]);
      const moldOpts = useMemo(() => optsFromRecord(trO.cacaoMoldOpts), [trO]);
      const sourceOpts = useMemo(() => optsFromRecord(trO.sourceConsistencyOpts), [trO]);
      const verifyOpts = useMemo(() => optsFromRecord(trO.qualityVerificationOpts), [trO]);
      const sustOpts = useMemo(() => optsFromRecord(trO.sustainabilityOpts), [trO]);
      const sustDimOpts = useMemo(() => optsFromRecord(trO.sustainabilityDimOpts), [trO]);
      return (
        <div className="space-y-5">
          {requiredCertsP1.length > 0 && (
            <ReadOnlyChip>{trO.requiredCertsLabel} {requiredCertsP1.join(", ")}</ReadOnlyChip>
          )}
          <FieldGroup label={trO.q18Label}>
            <MultiPillSelect options={certOpts} value={form.certsNiceToHave} onChange={v => set("certsNiceToHave", v)} testIdPrefix="certsNiceToHave" />
          </FieldGroup>
          <FieldGroup label={trO.q19Label}>
            <PillSelect options={traceOpts} value={form.traceabilityLevel} onChange={v => set("traceabilityLevel", v)} testIdPrefix="traceabilityLevel" />
          </FieldGroup>
          <FieldGroup label={trO.q20Label}>
            <MultiPillSelect options={qualDocOpts} value={form.qualityDocRequired} onChange={v => set("qualityDocRequired", v)} testIdPrefix="qualityDocRequired" />
          </FieldGroup>
          {hasCoffee && (
            <FieldGroup label={trO.q21Label}>
              <PillSelect options={defectOpts} value={form.coffeeDefectRate} onChange={v => set("coffeeDefectRate", v)} testIdPrefix="coffeeDefectRate" />
            </FieldGroup>
          )}
          {hasCacao && (
            <FieldGroup label={trO.q22Label}>
              <PillSelect options={moldOpts} value={form.cacaoMoldPct} onChange={v => set("cacaoMoldPct", v)} testIdPrefix="cacaoMoldPct" />
            </FieldGroup>
          )}
          <FieldGroup label={trO.q23Label}>
            <PillSelect options={sourceOpts} value={form.sourceConsistency} onChange={v => set("sourceConsistency", v)} testIdPrefix="sourceConsistency" />
          </FieldGroup>
          {isCoffeeSpecialist && (
            <FieldGroup label={trO.q24Label}>
              <MultiPillSelect options={verifyOpts} value={form.qualityVerification} onChange={v => set("qualityVerification", v)} testIdPrefix="qualityVerification" />
            </FieldGroup>
          )}
          <FieldGroup label={trO.q31Label}>
            <PillSelect options={sustOpts} value={form.sustainabilityImportance} onChange={v => set("sustainabilityImportance", v)} testIdPrefix="sustainabilityImportance" />
          </FieldGroup>
          {showSustainabilityDims && (
            <FieldGroup label={trO.q32Label}>
              <MultiPillSelect options={sustDimOpts} value={form.sustainabilityDimensions} onChange={v => set("sustainabilityDimensions", v)} testIdPrefix="sustainabilityDimensions" />
            </FieldGroup>
          )}
        </div>
      );
    }
  }
}

// ── Marketing Preferences Card — preserved verbatim ───────────────────────────
type SaveStatus = "idle" | "saving" | "saved" | "error";

const MARKETING_TOPIC_OPTIONS: { value: string; label: string }[] = [
  { value: "coffee", label: "Coffee" },
  { value: "cocoa", label: "Cocoa" },
  { value: "tropical_fruit", label: "Tropical Fruit" },
  { value: "spices", label: "Spices" },
  { value: "market_intel", label: "Market Intelligence" },
  { value: "supplier_spotlights", label: "Supplier Spotlights" },
  { value: "harvest_calendar", label: "Harvest Calendar" },
  { value: "platform_updates", label: "Platform Updates" },
];

function MarketingPreferencesCard({
  profileId,
  initialOptIn,
  initialTopics,
}: {
  profileId: number;
  initialOptIn: boolean;
  initialTopics: string[];
}) {
  const [optIn, setOptIn] = useState<boolean>(initialOptIn);
  const [topics, setTopics] = useState<string[]>(initialTopics);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setOptIn(initialOptIn);
    setTopics(initialTopics);
  }, [initialOptIn, initialTopics, profileId]);

  const toggleTopic = (val: string) => {
    setTopics((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val],
    );
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/buyers/${profileId}/marketing-preferences`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketing_opt_in: optIn,
            marketing_topics: optIn ? topics : [],
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const msg =
          typeof json?.error === "string" ? json.error : `Save failed (${res.status})`;
        throw new Error(msg);
      }
      setSavedAt(Date.now());
      toast({ title: "Marketing preferences saved" });
      queryClient.invalidateQueries({ queryKey: ["buyer", "profile"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      toast({ title: "Could not save", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card data-testid="card-marketing-preferences">
      <CardHeader>
        <CardTitle>Marketing Preferences</CardTitle>
        <CardDescription>
          Opt in to receive curated supplier spotlights, harvest calendars and
          platform announcements. Choose which topics interest you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Receive marketing emails</p>
            <p className="text-xs text-muted-foreground">
              Off by default. We never share your email. Unsubscribe anytime.
            </p>
          </div>
          <Switch
            checked={optIn}
            onCheckedChange={setOptIn}
            data-testid="switch-marketing-opt-in"
          />
        </div>

        {optIn ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Topics of interest</p>
            <div className="flex flex-wrap gap-2">
              {MARKETING_TOPIC_OPTIONS.map((o) => {
                const checked = topics.includes(o.value);
                return (
                  <label
                    key={o.value}
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                      checked
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-input hover:bg-muted"
                    }`}
                    data-testid={`checkbox-marketing-topic-${o.value}`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleTopic(o.value)}
                    />
                    {o.label}
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600" data-testid="text-marketing-error">{error}</p>
        ) : null}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {savedAt ? "Preferences saved." : "\u00a0"}
          </p>
          <Button
            onClick={save}
            disabled={saving}
            data-testid="button-save-marketing"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              "Save preferences"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
