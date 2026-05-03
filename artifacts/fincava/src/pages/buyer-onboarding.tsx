import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ChevronLeft, Check, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Progress } from "@/components/ui/progress";

// ── Types ──────────────────────────────────────────────────────────────────────

interface OnboardingProfile {
  id: number;
  companyName: string | null;
  country: string | null;
  // Confirmed from buyer-register.tsx line 19:
  // PRODUCT_CATEGORY_VALUES = ["COFFEE","CACAO","AVOCADO","EXOTIC_FRUIT","SUPERFOOD","PROCESSED","TEXTILE","OTHER"]
  targetProducts: string[];
  requiredCertsP1: string[];
  p2CompletionPct: number;
  p2SectionsDone: string[];
  buyerSegment: string | null;
  locationCount: string | null;
  annualBudgetUsd: string | null;
  coffeeQualityTier: string | null;
  coffeeFlavorProfile: string[] | null;
  cacaoFlavorProfile: string | null;
  fruitForm: string[] | null;
  availabilityRequirement: string | null;
  orderFrequency: string | null;
  coffeeOrderSizeKg: string | null;
  cacaoOrderSizeKg: string | null;
  fruitOrderSizeKg: string | null;
  priceSensitivity: string | null;
  priceTransparency: string[] | null;
  certsNiceToHave: string[] | null;
  traceabilityLevel: string | null;
  qualityDocRequired: string[] | null;
  coffeeDefectRate: string | null;
  cacaoMoldPct: string | null;
  sourceConsistency: string | null;
  qualityVerification: string[] | null;
  sustainabilityImportance: string | null;
  sustainabilityDimensions: string[] | null;
}

interface FormState {
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
}

const EMPTY_FORM: FormState = {
  buyerSegment: null,
  locationCount: null,
  annualBudgetUsd: null,
  coffeeQualityTier: null,
  coffeeFlavorProfile: [],
  cacaoFlavorProfile: null,
  fruitForm: [],
  availabilityRequirement: null,
  orderFrequency: null,
  coffeeOrderSizeKg: null,
  cacaoOrderSizeKg: null,
  fruitOrderSizeKg: null,
  priceSensitivity: null,
  priceTransparency: [],
  certsNiceToHave: [],
  traceabilityLevel: null,
  qualityDocRequired: [],
  coffeeDefectRate: null,
  cacaoMoldPct: null,
  sourceConsistency: null,
  qualityVerification: [],
  sustainabilityImportance: null,
  sustainabilityDimensions: [],
};

function prefill(p: OnboardingProfile): FormState {
  return {
    buyerSegment: p.buyerSegment,
    locationCount: p.locationCount,
    annualBudgetUsd: p.annualBudgetUsd,
    coffeeQualityTier: p.coffeeQualityTier,
    coffeeFlavorProfile: p.coffeeFlavorProfile ?? [],
    cacaoFlavorProfile: p.cacaoFlavorProfile,
    fruitForm: p.fruitForm ?? [],
    availabilityRequirement: p.availabilityRequirement,
    orderFrequency: p.orderFrequency,
    coffeeOrderSizeKg: p.coffeeOrderSizeKg,
    cacaoOrderSizeKg: p.cacaoOrderSizeKg,
    fruitOrderSizeKg: p.fruitOrderSizeKg,
    priceSensitivity: p.priceSensitivity,
    priceTransparency: p.priceTransparency ?? [],
    certsNiceToHave: p.certsNiceToHave ?? [],
    traceabilityLevel: p.traceabilityLevel,
    qualityDocRequired: p.qualityDocRequired ?? [],
    coffeeDefectRate: p.coffeeDefectRate,
    cacaoMoldPct: p.cacaoMoldPct,
    sourceConsistency: p.sourceConsistency,
    qualityVerification: p.qualityVerification ?? [],
    sustainabilityImportance: p.sustainabilityImportance,
    sustainabilityDimensions: p.sustainabilityDimensions ?? [],
  };
}

// ── Helper components ──────────────────────────────────────────────────────────

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-3">
      <p className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function SingleSelect({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(active ? null : opt.value)}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
              active
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-input bg-background hover:bg-muted"
            }`}
          >
            <span className="text-left">{opt.label}</span>
            {active && <Check className="h-3.5 w-3.5 ml-1 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

function MultiSelect({
  options,
  values,
  onChange,
  hint,
}: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (v: string[]) => void;
  hint?: string;
}) {
  const toggle = (val: string) => {
    const next = values.includes(val)
      ? values.filter((v) => v !== val)
      : [...values, val];
    onChange(next);
  };
  return (
    <div>
      {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = values.includes(opt.value);
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-input bg-background hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReadOnlyRow({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
      <span className="font-medium shrink-0">{label}</span>
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center bg-background border border-border rounded-full px-2 py-0.5"
        >
          {v}
        </span>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

export default function BuyerOnboardingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const tr = t.buyerOnboarding;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/buyer/onboarding", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("load_error");
        return r.json();
      })
      .then((data) => {
        if (data.profile) {
          const p = data.profile as OnboardingProfile;
          setProfile(p);
          setForm(prefill(p));
          // Resume at first incomplete step
          const done: string[] = p.p2SectionsDone ?? [];
          if (done.includes("S3") || done.includes("S4")) setStep(3);
          else if (done.includes("S2")) setStep(2);
          else if (done.includes("S1")) setStep(1);
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const setField = (field: keyof FormState, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldError(null);
  };

  // Conditional flags — verified against buyer-register.tsx PRODUCT_CATEGORY_VALUES
  // "COFFEE", "CACAO", "AVOCADO", "EXOTIC_FRUIT", "SUPERFOOD", "PROCESSED", "TEXTILE", "OTHER"
  const hasCoffee = profile?.targetProducts?.includes("COFFEE") ?? false;
  const hasCacao = profile?.targetProducts?.includes("CACAO") ?? false;
  const hasFruit = profile?.targetProducts?.includes("EXOTIC_FRUIT") ?? false;

  const validate = (): string | null => {
    const req = tr.requiredField;
    switch (step) {
      case 0:
        if (!form.buyerSegment || !form.locationCount || !form.annualBudgetUsd) return req;
        return null;
      case 1:
        if (!form.availabilityRequirement || !form.orderFrequency) return req;
        return null;
      case 2:
        if (!form.priceSensitivity) return req;
        if (form.priceTransparency.length === 0) return req;
        return null;
      case 3:
        if (!form.traceabilityLevel || !form.sourceConsistency || !form.sustainabilityImportance) return req;
        if (form.qualityDocRequired.length === 0) return req;
        return null;
      default:
        return null;
    }
  };

  const getSectionPayload = () => {
    switch (step) {
      case 0:
        return {
          buyerSegment: form.buyerSegment,
          locationCount: form.locationCount,
          annualBudgetUsd: form.annualBudgetUsd,
        };
      case 1:
        return {
          ...(hasCoffee && {
            coffeeQualityTier: form.coffeeQualityTier,
            coffeeFlavorProfile: form.coffeeFlavorProfile,
          }),
          ...(hasCacao && { cacaoFlavorProfile: form.cacaoFlavorProfile }),
          ...(hasFruit && { fruitForm: form.fruitForm }),
          availabilityRequirement: form.availabilityRequirement,
          orderFrequency: form.orderFrequency,
        };
      case 2:
        return {
          ...(hasCoffee && { coffeeOrderSizeKg: form.coffeeOrderSizeKg }),
          ...(hasCacao && { cacaoOrderSizeKg: form.cacaoOrderSizeKg }),
          ...(hasFruit && { fruitOrderSizeKg: form.fruitOrderSizeKg }),
          priceSensitivity: form.priceSensitivity,
          priceTransparency: form.priceTransparency,
        };
      case 3:
        return {
          certsNiceToHave: form.certsNiceToHave,
          traceabilityLevel: form.traceabilityLevel,
          qualityDocRequired: form.qualityDocRequired,
          ...(hasCoffee && { coffeeDefectRate: form.coffeeDefectRate }),
          ...(hasCacao && { cacaoMoldPct: form.cacaoMoldPct }),
          sourceConsistency: form.sourceConsistency,
          qualityVerification: form.qualityVerification,
          sustainabilityImportance: form.sustainabilityImportance,
          ...(form.sustainabilityImportance !== "not_important" && {
            sustainabilityDimensions: form.sustainabilityDimensions,
          }),
        };
      default:
        return {};
    }
  };

  const handleNext = async () => {
    const err = validate();
    if (err) {
      setFieldError(err);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/buyer/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(getSectionPayload()),
      });
      if (!res.ok) {
        toast({ title: tr.saveError, variant: "destructive" });
        return;
      }
      if (step < TOTAL_STEPS - 1) {
        setStep((s) => s + 1);
        setFieldError(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast({ title: tr.successToast });
        navigate("/dashboard");
      }
    } catch {
      toast({ title: tr.saveError, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Option arrays
  const buyerSegmentOptions = [
    { value: "specialty_roaster", label: tr.buyerSegmentOpts.specialty_roaster },
    { value: "commodity_trader", label: tr.buyerSegmentOpts.commodity_trader },
    { value: "craft_chocolatier", label: tr.buyerSegmentOpts.craft_chocolatier },
    { value: "food_distributor", label: tr.buyerSegmentOpts.food_distributor },
    { value: "grocery_retailer", label: tr.buyerSegmentOpts.grocery_retailer },
    { value: "specialty_retailer", label: tr.buyerSegmentOpts.specialty_retailer },
    { value: "food_manufacturer", label: tr.buyerSegmentOpts.food_manufacturer },
    { value: "restaurant_hospitality", label: tr.buyerSegmentOpts.restaurant_hospitality },
    { value: "other", label: tr.buyerSegmentOpts.other },
  ];
  const locationCountOptions = [
    { value: "one", label: tr.locationCountOpts.one },
    { value: "two_to_five", label: tr.locationCountOpts.two_to_five },
    { value: "six_to_twenty", label: tr.locationCountOpts.six_to_twenty },
    { value: "twenty_plus", label: tr.locationCountOpts.twenty_plus },
  ];
  const annualBudgetOptions = [
    { value: "under_50k", label: tr.annualBudgetOpts.under_50k },
    { value: "50k_to_250k", label: tr.annualBudgetOpts.b50k_to_250k },
    { value: "250k_to_1m", label: tr.annualBudgetOpts.b250k_to_1m },
    { value: "1m_to_5m", label: tr.annualBudgetOpts.b1m_to_5m },
    { value: "over_5m", label: tr.annualBudgetOpts.over_5m },
  ];
  const coffeeQualityOptions = [
    { value: "specialty_sca80", label: tr.coffeeQualityOpts.specialty_sca80 },
    { value: "high_commercial_75_79", label: tr.coffeeQualityOpts.high_commercial_75_79 },
    { value: "standard_commercial_70_74", label: tr.coffeeQualityOpts.standard_commercial_70_74 },
    { value: "bulk_commodity", label: tr.coffeeQualityOpts.bulk_commodity },
  ];
  const coffeeFlavorOptions = [
    { value: "fruity_bright", label: tr.coffeeFlavorOpts.fruity_bright },
    { value: "chocolatey_nutty", label: tr.coffeeFlavorOpts.chocolatey_nutty },
    { value: "floral_aromatic", label: tr.coffeeFlavorOpts.floral_aromatic },
    { value: "heavy_body", label: tr.coffeeFlavorOpts.heavy_body },
    { value: "single_origin_critical", label: tr.coffeeFlavorOpts.single_origin_critical },
    { value: "blends_acceptable", label: tr.coffeeFlavorOpts.blends_acceptable },
  ];
  const cacaoFlavorOptions = [
    { value: "fruity_floral_citrus", label: tr.cacaoFlavorOpts.fruity_floral_citrus },
    { value: "chocolate_nutty_caramel", label: tr.cacaoFlavorOpts.chocolate_nutty_caramel },
    { value: "balanced_blending", label: tr.cacaoFlavorOpts.balanced_blending },
    { value: "no_preference", label: tr.cacaoFlavorOpts.no_preference },
  ];
  const fruitFormOptions = [
    { value: "fresh_airshipped", label: tr.fruitFormOpts.fresh_airshipped },
    { value: "frozen_pulp", label: tr.fruitFormOpts.frozen_pulp },
    { value: "dehydrated_dried", label: tr.fruitFormOpts.dehydrated_dried },
    { value: "concentrate_juice", label: tr.fruitFormOpts.concentrate_juice },
  ];
  const availabilityOptions = [
    { value: "year_round_critical", label: tr.availabilityOpts.year_round_critical },
    { value: "seasonal_acceptable", label: tr.availabilityOpts.seasonal_acceptable },
    { value: "flexible", label: tr.availabilityOpts.flexible },
  ];
  const orderFrequencyOptions = [
    { value: "weekly_biweekly", label: tr.orderFrequencyOpts.weekly_biweekly },
    { value: "monthly", label: tr.orderFrequencyOpts.monthly },
    { value: "quarterly", label: tr.orderFrequencyOpts.quarterly },
    { value: "annual_contracts", label: tr.orderFrequencyOpts.annual_contracts },
    { value: "ad_hoc", label: tr.orderFrequencyOpts.ad_hoc },
  ];
  const coffeeOrderOptions = [
    { value: "under_500", label: tr.coffeeOrderOpts.under_500 },
    { value: "500_to_2000", label: tr.coffeeOrderOpts.b500_to_2000 },
    { value: "2000_to_10000", label: tr.coffeeOrderOpts.b2000_to_10000 },
    { value: "10000_to_50000", label: tr.coffeeOrderOpts.b10000_to_50000 },
    { value: "over_50000", label: tr.coffeeOrderOpts.over_50000 },
  ];
  const cacaoOrderOptions = [
    { value: "under_500", label: tr.cacaoOrderOpts.under_500 },
    { value: "500_to_5000", label: tr.cacaoOrderOpts.b500_to_5000 },
    { value: "5000_to_20000", label: tr.cacaoOrderOpts.b5000_to_20000 },
    { value: "over_20000", label: tr.cacaoOrderOpts.over_20000 },
  ];
  const fruitOrderOptions = [
    { value: "under_500", label: tr.fruitOrderOpts.under_500 },
    { value: "500_to_2000", label: tr.fruitOrderOpts.b500_to_2000 },
    { value: "2000_to_10000", label: tr.fruitOrderOpts.b2000_to_10000 },
    { value: "over_10000", label: tr.fruitOrderOpts.over_10000 },
  ];
  const priceSensitivityOptions = [
    { value: "quality_first", label: tr.priceSensitivityOpts.quality_first },
    { value: "balanced", label: tr.priceSensitivityOpts.balanced },
    { value: "cost_driven", label: tr.priceSensitivityOpts.cost_driven },
  ];
  const priceTransparencyOptions = [
    { value: "single_price", label: tr.priceTransparencyOpts.single_price },
    { value: "full_breakdown", label: tr.priceTransparencyOpts.full_breakdown },
    { value: "carbon_cost", label: tr.priceTransparencyOpts.carbon_cost },
    { value: "price_history", label: tr.priceTransparencyOpts.price_history },
  ];
  const certsNiceToHaveOptions = [
    { value: "Fairtrade", label: tr.certsNiceToHaveOpts.fairtrade },
    { value: "Fair Trade USA", label: tr.certsNiceToHaveOpts.fair_trade_usa },
    { value: "Rainforest Alliance", label: tr.certsNiceToHaveOpts.rainforest_alliance },
    { value: "4C (Coffee)", label: tr.certsNiceToHaveOpts.cert4cCoffee },
    { value: "USDA/EU Organic", label: tr.certsNiceToHaveOpts.usda_eu_organic },
    { value: "GLOBALG.A.P.", label: tr.certsNiceToHaveOpts.globalgap },
    { value: "HACCP", label: tr.certsNiceToHaveOpts.haccp },
    { value: "IFS or BRC", label: tr.certsNiceToHaveOpts.ifs_brc },
    { value: "Cacao-Trace", label: tr.certsNiceToHaveOpts.cacao_trace },
    { value: "Carbon-Verified", label: tr.certsNiceToHaveOpts.carbon_verified },
    { value: "None Required", label: tr.certsNiceToHaveOpts.none_required },
  ];
  const traceabilityOptions = [
    { value: "farm_to_cup", label: tr.traceabilityOpts.farm_to_cup },
    { value: "lot_level", label: tr.traceabilityOpts.lot_level },
    { value: "preferred_not_mandatory", label: tr.traceabilityOpts.preferred_not_mandatory },
    { value: "no_requirement", label: tr.traceabilityOpts.no_requirement },
  ];
  const qualityDocOptions = [
    { value: "sca_cupping", label: tr.qualityDocOpts.sca_cupping },
    { value: "sensory_analysis", label: tr.qualityDocOpts.sensory_analysis },
    { value: "lab_analysis", label: tr.qualityDocOpts.lab_analysis },
    { value: "fermentation_records", label: tr.qualityDocOpts.fermentation_records },
    { value: "phytosanitary", label: tr.qualityDocOpts.phytosanitary },
    { value: "carbon_footprint", label: tr.qualityDocOpts.carbon_footprint },
    { value: "social_audit", label: tr.qualityDocOpts.social_audit },
  ];
  const coffeeDefectOptions = [
    { value: "under_1pct", label: tr.coffeeDefectOpts.under_1pct },
    { value: "one_to_5pct", label: tr.coffeeDefectOpts.one_to_5pct },
    { value: "five_to_10pct", label: tr.coffeeDefectOpts.five_to_10pct },
    { value: "ten_plus_acceptable", label: tr.coffeeDefectOpts.ten_plus_acceptable },
  ];
  const cacaoMoldOptions = [
    { value: "under_1pct", label: tr.cacaoMoldOpts.under_1pct },
    { value: "one_to_2pct", label: tr.cacaoMoldOpts.one_to_2pct },
    { value: "two_to_5pct", label: tr.cacaoMoldOpts.two_to_5pct },
    { value: "no_requirement", label: tr.cacaoMoldOpts.no_requirement },
  ];
  const sourceConsistencyOptions = [
    { value: "single_source_preferred", label: tr.sourceConsistencyOpts.single_source_preferred },
    { value: "approved_pool", label: tr.sourceConsistencyOpts.approved_pool },
    { value: "variety_acceptable", label: tr.sourceConsistencyOpts.variety_acceptable },
    { value: "no_preference", label: tr.sourceConsistencyOpts.no_preference },
  ];
  const qualityVerificationOptions = [
    { value: "inhouse_lab", label: tr.qualityVerificationOpts.inhouse_lab },
    { value: "supplier_certs", label: tr.qualityVerificationOpts.supplier_certs },
    { value: "sensory_cupping", label: tr.qualityVerificationOpts.sensory_cupping },
    { value: "quality_consultant", label: tr.qualityVerificationOpts.quality_consultant },
    { value: "multiple", label: tr.qualityVerificationOpts.multiple },
  ];
  const sustainabilityOptions = [
    { value: "critical_to_brand", label: tr.sustainabilityOpts.critical_to_brand },
    { value: "important_to_market", label: tr.sustainabilityOpts.important_to_market },
    { value: "secondary", label: tr.sustainabilityOpts.secondary },
    { value: "not_important", label: tr.sustainabilityOpts.not_important },
  ];
  const sustainabilityDimOptions = [
    { value: "carbon_neutral", label: tr.sustainabilityDimOpts.carbon_neutral },
    { value: "fair_wages", label: tr.sustainabilityDimOpts.fair_wages },
    { value: "organic", label: tr.sustainabilityDimOpts.organic },
    { value: "biodiversity", label: tr.sustainabilityDimOpts.biodiversity },
    { value: "water_conservation", label: tr.sustainabilityDimOpts.water_conservation },
    { value: "women_minority", label: tr.sustainabilityDimOpts.women_minority },
    { value: "community_investment", label: tr.sustainabilityDimOpts.community_investment },
    { value: "all_equally", label: tr.sustainabilityDimOpts.all_equally },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-destructive mb-4">{tr.loadError}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const stepTitle = tr.steps[step];
  const progressPct = (step / TOTAL_STEPS) * 100;

  return (
    <div className="container max-w-2xl mx-auto px-4 py-10">
      {/* Skip link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        {tr.skipLink}
      </Link>

      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">
            {tr.stepOf.replace("{step}", String(step + 1)).replace("{total}", String(TOTAL_STEPS))}
          </p>
          <p className="text-xs font-medium text-emerald-700">{stepTitle}</p>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold tracking-tight">{tr.pageTitle}</h1>
        <p className="text-muted-foreground text-sm mt-1">{tr.pageDesc}</p>
      </div>

      {/* Read-only context badges — shown from step 1 onward */}
      {profile && step >= 1 && (
        <div className="mb-4 space-y-2">
          {profile.companyName && (
            <ReadOnlyRow
              label={tr.sourcingFor}
              values={[
                `${profile.companyName}${profile.country ? `, ${profile.country}` : ""}`,
              ]}
            />
          )}
          {profile.targetProducts.length > 0 && (
            <ReadOnlyRow label={tr.youAreSourcing} values={profile.targetProducts} />
          )}
          {profile.requiredCertsP1.length > 0 && (
            <ReadOnlyRow label={tr.requiredCertsLabel} values={profile.requiredCertsP1} />
          )}
        </div>
      )}

      {/* Section card */}
      <Card>
        <CardContent className="pt-6 space-y-8" data-testid="onboarding-card">
          {/* ── Step 0: Company Profile ── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <FieldLabel label={tr.q2Label} />
                <SingleSelect
                  options={buyerSegmentOptions}
                  value={form.buyerSegment}
                  onChange={(v) => setField("buyerSegment", v)}
                />
              </div>
              <div>
                <FieldLabel label={tr.q3Label} />
                <SingleSelect
                  options={locationCountOptions}
                  value={form.locationCount}
                  onChange={(v) => setField("locationCount", v)}
                />
              </div>
              <div>
                <FieldLabel label={tr.q4Label} />
                <SingleSelect
                  options={annualBudgetOptions}
                  value={form.annualBudgetUsd}
                  onChange={(v) => setField("annualBudgetUsd", v)}
                />
              </div>
            </div>
          )}

          {/* ── Step 1: Product Interests ── */}
          {step === 1 && (
            <div className="space-y-6">
              {hasCoffee && (
                <>
                  <div>
                    <FieldLabel label={tr.q6Label} />
                    <SingleSelect
                      options={coffeeQualityOptions}
                      value={form.coffeeQualityTier}
                      onChange={(v) => setField("coffeeQualityTier", v)}
                    />
                  </div>
                  <div>
                    <FieldLabel label={tr.q7Label} />
                    <MultiSelect
                      options={coffeeFlavorOptions}
                      values={form.coffeeFlavorProfile}
                      onChange={(v) => setField("coffeeFlavorProfile", v)}
                      hint="Choose all that apply"
                    />
                  </div>
                </>
              )}
              {hasCacao && (
                <div>
                  <FieldLabel label={tr.q8Label} />
                  <SingleSelect
                    options={cacaoFlavorOptions}
                    value={form.cacaoFlavorProfile}
                    onChange={(v) => setField("cacaoFlavorProfile", v)}
                  />
                </div>
              )}
              {hasFruit && (
                <div>
                  <FieldLabel label={tr.q9Label} />
                  <MultiSelect
                    options={fruitFormOptions}
                    values={form.fruitForm}
                    onChange={(v) => setField("fruitForm", v)}
                    hint="Choose all that apply"
                  />
                </div>
              )}
              <div>
                <FieldLabel label={tr.q10Label} />
                <SingleSelect
                  options={availabilityOptions}
                  value={form.availabilityRequirement}
                  onChange={(v) => setField("availabilityRequirement", v)}
                />
              </div>
              <div>
                <FieldLabel label={tr.q11Label} />
                <SingleSelect
                  options={orderFrequencyOptions}
                  value={form.orderFrequency}
                  onChange={(v) => setField("orderFrequency", v)}
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Volume & Pricing ── */}
          {step === 2 && (
            <div className="space-y-6">
              {hasCoffee && (
                <div>
                  <FieldLabel label={tr.q12Label} />
                  <SingleSelect
                    options={coffeeOrderOptions}
                    value={form.coffeeOrderSizeKg}
                    onChange={(v) => setField("coffeeOrderSizeKg", v)}
                  />
                </div>
              )}
              {hasCacao && (
                <div>
                  <FieldLabel label={tr.q13Label} />
                  <SingleSelect
                    options={cacaoOrderOptions}
                    value={form.cacaoOrderSizeKg}
                    onChange={(v) => setField("cacaoOrderSizeKg", v)}
                  />
                </div>
              )}
              {hasFruit && (
                <div>
                  <FieldLabel label={tr.q14Label} />
                  <SingleSelect
                    options={fruitOrderOptions}
                    value={form.fruitOrderSizeKg}
                    onChange={(v) => setField("fruitOrderSizeKg", v)}
                  />
                </div>
              )}
              <div>
                <FieldLabel label={tr.q15Label} />
                <SingleSelect
                  options={priceSensitivityOptions}
                  value={form.priceSensitivity}
                  onChange={(v) => setField("priceSensitivity", v)}
                />
              </div>
              <div>
                <FieldLabel label={tr.q16Label} />
                <MultiSelect
                  options={priceTransparencyOptions}
                  values={form.priceTransparency}
                  onChange={(v) => setField("priceTransparency", v)}
                  hint="Choose all that apply"
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Quality & Your Values ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <FieldLabel label={tr.q18Label} />
                <MultiSelect
                  options={certsNiceToHaveOptions}
                  values={form.certsNiceToHave}
                  onChange={(v) => setField("certsNiceToHave", v)}
                  hint="Choose all that apply"
                />
              </div>
              <div>
                <FieldLabel label={tr.q19Label} />
                <SingleSelect
                  options={traceabilityOptions}
                  value={form.traceabilityLevel}
                  onChange={(v) => setField("traceabilityLevel", v)}
                />
              </div>
              <div>
                <FieldLabel label={tr.q20Label} />
                <MultiSelect
                  options={qualityDocOptions}
                  values={form.qualityDocRequired}
                  onChange={(v) => setField("qualityDocRequired", v)}
                  hint="Choose all that apply"
                />
              </div>
              {hasCoffee && (
                <div>
                  <FieldLabel label={tr.q21Label} />
                  <SingleSelect
                    options={coffeeDefectOptions}
                    value={form.coffeeDefectRate}
                    onChange={(v) => setField("coffeeDefectRate", v)}
                  />
                </div>
              )}
              {hasCacao && (
                <div>
                  <FieldLabel label={tr.q22Label} />
                  <SingleSelect
                    options={cacaoMoldOptions}
                    value={form.cacaoMoldPct}
                    onChange={(v) => setField("cacaoMoldPct", v)}
                  />
                </div>
              )}
              <div>
                <FieldLabel label={tr.q23Label} />
                <SingleSelect
                  options={sourceConsistencyOptions}
                  value={form.sourceConsistency}
                  onChange={(v) => setField("sourceConsistency", v)}
                />
              </div>
              <div>
                <FieldLabel label={tr.q24Label} />
                <MultiSelect
                  options={qualityVerificationOptions}
                  values={form.qualityVerification}
                  onChange={(v) => setField("qualityVerification", v)}
                  hint="Choose all that apply"
                />
              </div>
              <hr className="border-border" />
              <div>
                <FieldLabel label={tr.q31Label} />
                <SingleSelect
                  options={sustainabilityOptions}
                  value={form.sustainabilityImportance}
                  onChange={(v) => setField("sustainabilityImportance", v)}
                />
              </div>
              {form.sustainabilityImportance && form.sustainabilityImportance !== "not_important" && (
                <div>
                  <FieldLabel label={tr.q32Label} />
                  <MultiSelect
                    options={sustainabilityDimOptions}
                    values={form.sustainabilityDimensions}
                    onChange={(v) => setField("sustainabilityDimensions", v)}
                    hint="Choose all that apply"
                  />
                </div>
              )}
            </div>
          )}

          {/* Validation error */}
          {fieldError && (
            <p className="text-sm font-medium text-destructive" data-testid="field-error">
              {fieldError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setStep((s) => s - 1);
            setFieldError(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          disabled={step === 0 || saving}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {tr.back}
        </Button>
        <Button
          onClick={handleNext}
          disabled={saving}
          data-testid="button-next"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {step < TOTAL_STEPS - 1 ? tr.next : tr.submit}
        </Button>
      </div>
    </div>
  );
}
