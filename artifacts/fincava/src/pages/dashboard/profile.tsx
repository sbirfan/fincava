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
import { Textarea } from "@/components/ui/textarea";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChangePasswordCard } from "@/components/change-password-card";
import {
  Check,
  Info,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
type SectionKey = "A" | "B" | "C" | "D" | "E" | "F";
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface BuyerProfileShape {
  id: number;
  userId: number;
  companyName: string | null;
  country: string | null;
  destinationPort: string | null;
  preferredIncoterm: string | null;
  intendedVolumeMt: number | null;
  importFrequency: string | null;
  p2CompletionPct: number;
  p2SectionsDone: SectionKey[];
  // Section A
  traceabilityLevel: string | null;
  existingColombiaRel: boolean | null;
  // Section B
  tradeFinanceOpen: boolean;
  // Section C
  auditStandard: string | null;
  // Section D
  logisticsPartner: string | null;
  // Section E
  prevSourcingChannel: string | null;
  discoveryBudgetBand: string | null;
  supplierDevOpen: boolean;
  supplierTypePref: string[];
  socialImpactReqs: string[];
  earlyStageSupplierOpen: boolean;
  // Section F
  marketingOptIn: boolean;
  marketingTopics: string[];
  platformIntent: string[];
  sampleReady: boolean;
  languagePreference: string[];
}

interface PatchResponse {
  section: SectionKey;
  completion_pct: number;
  sections_done: SectionKey[];
  matching_triggered: boolean;
}

// ── Section metadata ───────────────────────────────────────────────────────────
const SECTIONS: { key: SectionKey; title: string; description: string }[] = [
  {
    key: "A",
    title: "A — Product Detail",
    description: "Tell us what you source and how deep the traceability needs to go.",
  },
  {
    key: "B",
    title: "B — Commercial Terms",
    description: "Pricing terms, volume and frequency expectations.",
  },
  {
    key: "C",
    title: "C — Quality & Compliance",
    description: "Audit standards and certifications you require.",
  },
  {
    key: "D",
    title: "D — Logistics",
    description: "Where shipments land and who handles freight on your side.",
  },
  {
    key: "E",
    title: "E — Gap Sourcing",
    description:
      "If you cannot find a supplier on Fincava, we can commission new sourcing for you. (Paid service in Phase 4.)",
  },
  {
    key: "F",
    title: "F — Platform Intent",
    description: "How you want to use Fincava and which support you need.",
  },
];

const TRACEABILITY_OPTIONS = [
  { value: "NONE", label: "None — bulk OK" },
  { value: "LOT", label: "Lot-level" },
  { value: "FARM", label: "Farm-level" },
  { value: "COOP", label: "Cooperative-level" },
];

const INCOTERM_OPTIONS = ["FOB", "CIF", "DAP", "EXW", "CFR"];
const FREQUENCY_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "BIANNUAL", label: "Twice a year" },
  { value: "ANNUAL", label: "Once a year" },
  { value: "SPOT", label: "Spot / one-off" },
];

const AUDIT_OPTIONS = [
  "BRC",
  "SQF",
  "FSSC 22000",
  "IFS Food",
  "GlobalGAP",
  "Rainforest Alliance",
  "EU Organic",
  "USDA Organic",
  "Fair Trade",
];

const DISCOVERY_BUDGET_OPTIONS = [
  { value: "<1k", label: "<$1k" },
  { value: "1-5k", label: "$1k – $5k" },
  { value: "5-25k", label: "$5k – $25k" },
  { value: "25k+", label: "$25k+" },
];

const SOURCING_CHANNEL_OPTIONS = [
  "Trade shows",
  "Brokers",
  "Direct visits",
  "Referrals",
  "Online marketplaces",
  "Cold outreach",
  "Other",
];

const SUPPLIER_TYPE_OPTIONS = [
  "Cooperative",
  "Smallholder",
  "Mid-size farm",
  "Large estate",
  "Processor",
  "Exporter",
];

const SOCIAL_IMPACT_OPTIONS = [
  "Women-led",
  "Indigenous-led",
  "Youth-led",
  "Post-conflict regions",
  "Regenerative agriculture",
  "Living-wage certified",
];

const PLATFORM_INTENT_OPTIONS = [
  "Direct sourcing",
  "Sample requests",
  "RFQ broadcast",
  "Trade finance",
  "Logistics support",
  "Market intelligence",
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BuyerProfile() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: profileResp,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery<{ profile: BuyerProfileShape }>({
    queryKey: ["buyer-profile"],
    queryFn: async () => {
      const res = await fetch("/api/buyers/profile", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to load profile (${res.status})`);
      }
      return res.json();
    },
  });

  const profile = profileResp?.profile;
  const profileId = profile?.id;
  const sectionsDone = profile?.p2SectionsDone ?? [];
  const completionPct = profile?.p2CompletionPct ?? 0;

  // Per-field save status, keyed by `${section}:${field}`.
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Local mirror of editable values so inputs stay responsive while saving.
  const [local, setLocal] = useState<Partial<BuyerProfileShape> | null>(null);
  useEffect(() => {
    if (profile && local === null) {
      setLocal({ ...profile });
    }
  }, [profile, local]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const saveField = (
    section: SectionKey,
    field: keyof BuyerProfileShape,
    value: unknown,
    debounceMs = 600,
  ) => {
    if (!profileId) return;
    const key = `${section}:${field as string}`;
    setLocal((prev) => ({ ...(prev ?? {}), [field]: value as never }));
    setSaveStatus((s) => ({ ...s, [key]: "saving" }));

    if (timersRef.current[key]) clearTimeout(timersRef.current[key]);
    timersRef.current[key] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/buyers/${profileId}/profile`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, field, value }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof json?.error === "string"
              ? json.error
              : `Save failed (${res.status})`;
          throw new Error(msg);
        }
        const data = json as PatchResponse;
        // Merge progress + the just-saved field into the cache.
        queryClient.setQueryData<{ profile: BuyerProfileShape }>(
          ["buyer-profile"],
          (prev) =>
            prev?.profile
              ? {
                  profile: {
                    ...prev.profile,
                    [field]: value as never,
                    p2CompletionPct: data.completion_pct,
                    p2SectionsDone: data.sections_done,
                  },
                }
              : prev,
        );
        setSaveStatus((s) => ({ ...s, [key]: "saved" }));
        if (data.matching_triggered) {
          toast({
            title: "Matching unlocked",
            description:
              "Sections A and B are complete — supplier matching will run when Phase 3 ships.",
          });
        }
      } catch (err) {
        setSaveStatus((s) => ({ ...s, [key]: "error" }));
        toast({
          title: "Could not save",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      }
    }, debounceMs);
  };

  const isLoading = userLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-32 w-full max-w-3xl rounded-xl" />
        <Skeleton className="h-64 w-full max-w-3xl rounded-xl" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">
            Profile Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account and sourcing profile.
          </p>
        </div>

        {/* ── Phase 2 widget ───────────────────────────────────────────── */}
        {profile ? (
          <Card data-testid="card-phase2-widget">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    Sourcing profile completeness
                  </CardTitle>
                  <CardDescription>
                    The more we know, the better we match. Sections A + B
                    unlock supplier matching.
                  </CardDescription>
                </div>
                <div
                  className="text-3xl font-bold tabular-nums"
                  data-testid="text-completion-pct"
                >
                  {completionPct}%
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={completionPct} />
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map((s) => {
                  const done = sectionsDone.includes(s.key);
                  return (
                    <Badge
                      key={s.key}
                      variant={done ? "default" : "outline"}
                      data-testid={`pill-section-${s.key}`}
                      className={
                        done
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "text-muted-foreground"
                      }
                    >
                      {done ? <Check className="mr-1 h-3 w-3" /> : null}
                      Section {s.key}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : profileError ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Could not load your sourcing profile. If you just registered,
              please reload the page.
            </CardContent>
          </Card>
        ) : null}

        {/* ── Six collapsible sections ────────────────────────────────── */}
        {profile && local ? (
          <Card data-testid="card-phase2-sections">
            <CardHeader>
              <CardTitle>Deepen your profile</CardTitle>
              <CardDescription>
                Changes save automatically. Sections fill in at your pace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion
                type="multiple"
                defaultValue={["A"]}
                className="w-full"
              >
                {SECTIONS.map((s) => (
                  <SectionAccordionItem
                    key={s.key}
                    section={s.key}
                    title={s.title}
                    description={s.description}
                    isDone={sectionsDone.includes(s.key)}
                    saveStatus={saveStatus}
                    saveField={saveField}
                    local={local}
                  />
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ) : null}

        {/* ── Marketing preferences ───────────────────────────────────── */}
        {profile && profileId ? (
          <MarketingPreferencesCard
            profileId={profileId}
            initialOptIn={profile.marketingOptIn ?? false}
            initialTopics={profile.marketingTopics ?? []}
          />
        ) : null}

        {/* ── Existing personal info card ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input defaultValue={user?.firstName} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input defaultValue={user?.lastName} />
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
              <Input defaultValue={user?.country || ""} />
            </div>
            <Button className="mt-4">Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>
              Information about your purchasing organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <Input defaultValue={user?.companyName || ""} />
            </div>
            <Button className="mt-4">Save Company Details</Button>
          </CardContent>
        </Card>

        <ChangePasswordCard />
      </div>
    </TooltipProvider>
  );
}

// ── Section accordion item ────────────────────────────────────────────────────
function SectionAccordionItem({
  section,
  title,
  description,
  isDone,
  saveStatus,
  saveField,
  local,
}: {
  section: SectionKey;
  title: string;
  description: string;
  isDone: boolean;
  saveStatus: Record<string, SaveStatus>;
  saveField: (
    section: SectionKey,
    field: keyof BuyerProfileShape,
    value: unknown,
    debounceMs?: number,
  ) => void;
  local: Partial<BuyerProfileShape>;
}) {
  const isE = section === "E";

  return (
    <AccordionItem
      value={section}
      className={
        isE
          ? "border border-amber-300 rounded-lg my-2 px-3 bg-amber-50/40"
          : ""
      }
      data-testid={`accordion-section-${section}`}
    >
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 flex-1 text-left">
          <span className="font-medium">{title}</span>
          {isE ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="h-4 w-4 text-amber-700" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Gap sourcing commissions our team to find new suppliers when
                the marketplace doesn't already have a match.
              </TooltipContent>
            </Tooltip>
          ) : null}
          {isDone ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 ml-2">
              <Check className="mr-1 h-3 w-3" />
              Complete
            </Badge>
          ) : null}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <SectionFields
          section={section}
          local={local}
          saveStatus={saveStatus}
          saveField={saveField}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

// ── Field renderers per section ───────────────────────────────────────────────
function SectionFields({
  section,
  local,
  saveStatus,
  saveField,
}: {
  section: SectionKey;
  local: Partial<BuyerProfileShape>;
  saveStatus: Record<string, SaveStatus>;
  saveField: (
    section: SectionKey,
    field: keyof BuyerProfileShape,
    value: unknown,
    debounceMs?: number,
  ) => void;
}) {
  const statusFor = (field: keyof BuyerProfileShape) =>
    saveStatus[`${section}:${field as string}`] ?? "idle";

  switch (section) {
    case "A":
      return (
        <div className="space-y-4">
          <FieldRow
            label="Traceability level required"
            status={statusFor("traceabilityLevel")}
          >
            <Select
              value={local.traceabilityLevel ?? ""}
              onValueChange={(v) =>
                saveField("A", "traceabilityLevel", v, 200)
              }
            >
              <SelectTrigger
                className="w-full"
                data-testid="select-traceabilityLevel"
              >
                <SelectValue placeholder="Choose a level…" />
              </SelectTrigger>
              <SelectContent>
                {TRACEABILITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow
            label="Do you have an existing relationship with a Colombian supplier?"
            status={statusFor("existingColombiaRel")}
          >
            <YesNoToggle
              value={local.existingColombiaRel ?? null}
              onChange={(v) =>
                saveField("A", "existingColombiaRel", v, 200)
              }
              testId="toggle-existingColombiaRel"
            />
          </FieldRow>
        </div>
      );

    case "B":
      return (
        <div className="space-y-4">
          <FieldRow
            label="Preferred Incoterm"
            status={statusFor("preferredIncoterm")}
          >
            <Select
              value={local.preferredIncoterm ?? ""}
              onValueChange={(v) =>
                saveField("B", "preferredIncoterm", v, 200)
              }
            >
              <SelectTrigger
                className="w-full"
                data-testid="select-preferredIncoterm"
              >
                <SelectValue placeholder="Choose Incoterm…" />
              </SelectTrigger>
              <SelectContent>
                {INCOTERM_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow
            label="Intended annual volume (MT)"
            status={statusFor("intendedVolumeMt")}
          >
            <Input
              type="number"
              min={0}
              step="0.1"
              value={local.intendedVolumeMt ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                const num = raw === "" ? null : Number(raw);
                if (num !== null && (Number.isNaN(num) || num <= 0)) return;
                saveField("B", "intendedVolumeMt", num);
              }}
              data-testid="input-intendedVolumeMt"
            />
          </FieldRow>
          <FieldRow
            label="Import frequency"
            status={statusFor("importFrequency")}
          >
            <Select
              value={local.importFrequency ?? ""}
              onValueChange={(v) =>
                saveField("B", "importFrequency", v, 200)
              }
            >
              <SelectTrigger
                className="w-full"
                data-testid="select-importFrequency"
              >
                <SelectValue placeholder="Choose frequency…" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow
            label="Open to trade-finance offers from Fincava"
            status={statusFor("tradeFinanceOpen")}
            inline
          >
            <Switch
              checked={!!local.tradeFinanceOpen}
              onCheckedChange={(v) =>
                saveField("B", "tradeFinanceOpen", v, 200)
              }
              data-testid="switch-tradeFinanceOpen"
            />
          </FieldRow>
        </div>
      );

    case "C":
      return (
        <div className="space-y-4">
          <FieldRow
            label="Required audit standard"
            status={statusFor("auditStandard")}
          >
            <Select
              value={local.auditStandard ?? ""}
              onValueChange={(v) => saveField("C", "auditStandard", v, 200)}
            >
              <SelectTrigger
                className="w-full"
                data-testid="select-auditStandard"
              >
                <SelectValue placeholder="Choose a standard…" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </div>
      );

    case "D":
      return (
        <div className="space-y-4">
          <FieldRow
            label="Destination port"
            status={statusFor("destinationPort")}
          >
            <Input
              value={local.destinationPort ?? ""}
              onChange={(e) =>
                saveField(
                  "D",
                  "destinationPort",
                  e.target.value === "" ? null : e.target.value,
                )
              }
              placeholder="e.g. Hamburg"
              data-testid="input-destinationPort"
            />
          </FieldRow>
          <FieldRow
            label="Logistics partner / freight forwarder"
            status={statusFor("logisticsPartner")}
          >
            <Input
              value={local.logisticsPartner ?? ""}
              onChange={(e) =>
                saveField(
                  "D",
                  "logisticsPartner",
                  e.target.value === "" ? null : e.target.value,
                )
              }
              placeholder="e.g. DHL Global Forwarding"
              data-testid="input-logisticsPartner"
            />
          </FieldRow>
        </div>
      );

    case "E":
      return (
        <div className="space-y-4">
          <FieldRow
            label="Where did you previously source from?"
            status={statusFor("prevSourcingChannel")}
          >
            <Select
              value={local.prevSourcingChannel ?? ""}
              onValueChange={(v) =>
                saveField("E", "prevSourcingChannel", v, 200)
              }
            >
              <SelectTrigger
                className="w-full"
                data-testid="select-prevSourcingChannel"
              >
                <SelectValue placeholder="Choose a channel…" />
              </SelectTrigger>
              <SelectContent>
                {SOURCING_CHANNEL_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow
            label="Discovery budget for new sourcing"
            status={statusFor("discoveryBudgetBand")}
          >
            <Select
              value={local.discoveryBudgetBand ?? ""}
              onValueChange={(v) =>
                saveField("E", "discoveryBudgetBand", v, 200)
              }
            >
              <SelectTrigger
                className="w-full"
                data-testid="select-discoveryBudgetBand"
              >
                <SelectValue placeholder="Choose a budget band…" />
              </SelectTrigger>
              <SelectContent>
                {DISCOVERY_BUDGET_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow
            label="Open to supplier development (multi-month onboarding)"
            status={statusFor("supplierDevOpen")}
            inline
          >
            <Switch
              checked={!!local.supplierDevOpen}
              onCheckedChange={(v) =>
                saveField("E", "supplierDevOpen", v, 200)
              }
              data-testid="switch-supplierDevOpen"
            />
          </FieldRow>
          <CheckboxGroupField
            label="Preferred supplier types"
            options={SUPPLIER_TYPE_OPTIONS}
            value={local.supplierTypePref ?? []}
            onChange={(next) =>
              saveField("E", "supplierTypePref", next, 200)
            }
            status={statusFor("supplierTypePref")}
            testIdPrefix="supplierTypePref"
          />
          <CheckboxGroupField
            label="Social impact requirements"
            options={SOCIAL_IMPACT_OPTIONS}
            value={local.socialImpactReqs ?? []}
            onChange={(next) =>
              saveField("E", "socialImpactReqs", next, 200)
            }
            status={statusFor("socialImpactReqs")}
            testIdPrefix="socialImpactReqs"
          />
          <FieldRow
            label="Open to early-stage / pre-export suppliers"
            status={statusFor("earlyStageSupplierOpen")}
            inline
          >
            <Switch
              checked={!!local.earlyStageSupplierOpen}
              onCheckedChange={(v) =>
                saveField("E", "earlyStageSupplierOpen", v, 200)
              }
              data-testid="switch-earlyStageSupplierOpen"
            />
          </FieldRow>
        </div>
      );

    case "F":
      return (
        <div className="space-y-4">
          <CheckboxGroupField
            label="What do you want to do on Fincava?"
            options={PLATFORM_INTENT_OPTIONS}
            value={local.platformIntent ?? []}
            onChange={(next) => saveField("F", "platformIntent", next, 200)}
            status={statusFor("platformIntent")}
            testIdPrefix="platformIntent"
          />
          <FieldRow
            label="Ready to receive samples"
            status={statusFor("sampleReady")}
            inline
          >
            <Switch
              checked={!!local.sampleReady}
              onCheckedChange={(v) =>
                saveField("F", "sampleReady", v, 200)
              }
              data-testid="switch-sampleReady"
            />
          </FieldRow>
          <CheckboxGroupField
            label="Languages you want to use"
            options={LANGUAGE_OPTIONS}
            value={local.languagePreference ?? []}
            onChange={(next) =>
              saveField("F", "languagePreference", next, 200)
            }
            status={statusFor("languagePreference")}
            testIdPrefix="languagePreference"
          />
        </div>
      );

    default:
      return null;
  }
}

// ── Reusable field bits ──────────────────────────────────────────────────────
function FieldRow({
  label,
  status,
  children,
  inline = false,
}: {
  label: string;
  status: SaveStatus;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "flex items-center justify-between gap-4" : "space-y-2"}>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">{label}</label>
        <SaveIndicator status={status} />
      </div>
      <div>{children}</div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
    );
  }
  if (status === "saved") {
    return <Check className="h-3 w-3 text-emerald-600" />;
  }
  if (status === "error") {
    return <AlertCircle className="h-3 w-3 text-destructive" />;
  }
  return null;
}

function YesNoToggle({
  value,
  onChange,
  testId,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  testId?: string;
}) {
  return (
    <div className="flex gap-2" data-testid={testId}>
      <Button
        type="button"
        size="sm"
        variant={value === true ? "default" : "outline"}
        onClick={() => onChange(true)}
      >
        Yes
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === false ? "default" : "outline"}
        onClick={() => onChange(false)}
      >
        No
      </Button>
    </div>
  );
}

function CheckboxGroupField({
  label,
  options,
  value,
  onChange,
  status,
  testIdPrefix,
}: {
  label: string;
  options: readonly (string | { value: string; label: string })[];
  value: string[];
  onChange: (next: string[]) => void;
  status: SaveStatus;
  testIdPrefix: string;
}) {
  const normalized = useMemo(
    () =>
      options.map((o) =>
        typeof o === "string" ? { value: o, label: o } : o,
      ),
    [options],
  );

  const toggle = (v: string) => {
    const next = value.includes(v)
      ? value.filter((x) => x !== v)
      : [...value, v];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">{label}</label>
        <SaveIndicator status={status} />
      </div>
      <div className="flex flex-wrap gap-2">
        {normalized.map((o) => {
          const checked = value.includes(o.value);
          return (
            <label
              key={o.value}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                checked
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-input hover:bg-muted"
              }`}
              data-testid={`checkbox-${testIdPrefix}-${o.value}`}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(o.value)}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

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
      queryClient.invalidateQueries({ queryKey: ["buyer-profile"] });
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
