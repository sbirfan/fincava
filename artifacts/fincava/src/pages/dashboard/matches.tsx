import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Award,
  MapPin,
  Boxes,
  Sparkles,
  AlertCircle,
  Mountain,
  Coffee,
  Tag,
  ShieldCheck,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ScoreBreakdown = {
  product?: number;
  certifications?: number;
  origin?: number;
  volume?: number;
  supplier_type?: number;
};

interface TopProduct {
  id: number;
  name: string;
  category: string;
  subCategory: string | null;
  origin: string;
  altitude: string | null;
  cupping: number | null;
  process: string | null;
  variety: string | null;
  certifications: string[];
}

interface MatchRow {
  id: number;
  supplierId: number;
  matchScore: string; // decimal returned as string
  scoreBreakdown: ScoreBreakdown;
  disqualifiers: string[] | null;
  matchNotes: string | null;
  sectionsAtRun: string[];
  createdAt: string;
  supplierName: string;
  supplierMunicipio: string;
  supplierDepartment: string | null;
  supplierType: string;
  sellableStatus: string | null;
  graduationPathway: string | null;
  commercialScore: number | null;
  productCategories: string[];
  productSubCategories: string[];
  certifications: string[];
  altitudes: string[];
  cuppingMin: number | null;
  cuppingMax: number | null;
  productCount: number;
  topProducts: TopProduct[];
}

interface MatchesResponse {
  preview: false;
  matches: MatchRow[];
  fields_that_improve_match: string[];
  matching_run_count: number;
  last_matched_at: string | null;
  state: string;
}

interface BuyerProfileResponse {
  profile: {
    id: number;
    state: string;
    p2SectionsDone: string[];
    p2CompletionPct: number;
    matchingRunCount: number;
  };
}

// ── Field labels (mirror the matching prompt's rubric) ───────────────────────

const FIELD_LABELS: Record<string, { label: string; href: string }> = {
  targetProducts: { label: "Target product categories", href: "/dashboard/profile" },
  requiredCertsP1: { label: "Required certifications", href: "/dashboard/profile" },
  traceabilityLevel: { label: "Traceability level (Section A)", href: "/dashboard/profile" },
  intendedVolumeMt: { label: "Intended volume in MT (Section B)", href: "/dashboard/profile" },
  preferredIncoterm: { label: "Preferred Incoterm (Section B)", href: "/dashboard/profile" },
  importFrequency: { label: "Import frequency (Section B)", href: "/dashboard/profile" },
  supplierTypePref: { label: "Supplier type preference (Section E)", href: "/dashboard/profile" },
  auditStandard: { label: "Audit standard (Section C)", href: "/dashboard/profile" },
};

// ── MatchConfidenceIndicator ──────────────────────────────────────────────────

function MatchConfidenceIndicator({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const tone =
    pct >= 75
      ? { label: "Strong match", color: "bg-emerald-600" }
      : pct >= 50
      ? { label: "Good match", color: "bg-amber-500" }
      : { label: "Weak match", color: "bg-stone-400" };
  return (
    <div className="flex items-center gap-3" aria-label={`${tone.label} — ${pct}%`}>
      <div className="flex flex-col items-end">
        <span className="text-2xl font-bold tabular-nums">{pct}%</span>
        <span className="text-xs text-muted-foreground">{tone.label}</span>
      </div>
      <div className={`h-12 w-2 rounded-full ${tone.color}`} />
    </div>
  );
}

// ── ImproveMatchPrompt ────────────────────────────────────────────────────────

function ImproveMatchPrompt({ fields }: { fields: string[] }) {
  if (fields.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Your buyer profile is fully populated
          </CardTitle>
          <CardDescription>
            Every signal that drives matching is filled. Re-runs will use the freshest catalog.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-serif flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Improve your matches
        </CardTitle>
        <CardDescription>
          Filling these fields will lift your scores on the next run.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-2">
          {fields.map((f) => {
            const meta = FIELD_LABELS[f] ?? { label: f, href: "/dashboard/profile" };
            return (
              <li key={f} className="flex items-center justify-between gap-3 text-sm">
                <span>{meta.label}</span>
                <Link href={meta.href}>
                  <Button variant="outline" size="sm">
                    Fill in
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── SupplierMatchCard ─────────────────────────────────────────────────────────

function SupplierMatchCard({ row }: { row: MatchRow }) {
  const score = Number(row.matchScore);
  const breakdown: { key: keyof ScoreBreakdown; label: string }[] = [
    { key: "product", label: "Product" },
    { key: "certifications", label: "Certs" },
    { key: "origin", label: "Origin" },
    { key: "volume", label: "Volume" },
    { key: "supplier_type", label: "Type" },
  ];
  const isDisqualified =
    Array.isArray(row.disqualifiers) && row.disqualifiers.length > 0;

  const cuppingLabel =
    row.cuppingMin != null && row.cuppingMax != null
      ? row.cuppingMin === row.cuppingMax
        ? `SCA ${row.cuppingMin.toFixed(1)}`
        : `SCA ${row.cuppingMin.toFixed(1)}–${row.cuppingMax.toFixed(1)}`
      : null;

  return (
    <Card className="overflow-hidden" data-testid={`match-card-${row.supplierId}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-serif flex items-center gap-2 truncate">
              {row.supplierName}
              {row.sellableStatus === "PUBLISHED" && (
                <Badge variant="default">Published</Badge>
              )}
              {row.sellableStatus === "SELLABLE" && (
                <Badge variant="secondary">Sellable</Badge>
              )}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="inline-flex items-center gap-1 text-xs">
                <MapPin className="w-3 h-3" />
                {row.supplierMunicipio}
                {row.supplierDepartment ? `, ${row.supplierDepartment}` : ""}
              </span>
              <span className="inline-flex items-center gap-1 text-xs">
                <Boxes className="w-3 h-3" />
                {row.supplierType}
              </span>
              {row.graduationPathway && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Award className="w-3 h-3" />
                  Pathway {row.graduationPathway}
                </span>
              )}
              {row.commercialScore != null && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <TrendingUp className="w-3 h-3" />
                  Score {row.commercialScore}/100
                </span>
              )}
            </CardDescription>
          </div>
          <MatchConfidenceIndicator score={score} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {row.matchNotes && (
          <p className="text-sm leading-relaxed text-stone-700">{row.matchNotes}</p>
        )}

        {/* Categories */}
        {row.productCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" aria-label="Categories" />
            {row.productCategories.map((c) => (
              <Badge key={c} variant="secondary" className="text-xs">
                {c}
              </Badge>
            ))}
            {row.productSubCategories.slice(0, 4).map((sc) => (
              <Badge key={`sub-${sc}`} variant="outline" className="text-xs">
                {sc}
              </Badge>
            ))}
          </div>
        )}

        {/* Certifications */}
        {row.certifications.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" aria-label="Certifications" />
            {row.certifications.map((c) => (
              <Badge
                key={c}
                variant="outline"
                className="text-xs border-emerald-300 text-emerald-800"
              >
                {c}
              </Badge>
            ))}
          </div>
        )}

        {/* Altitude + SCA cupping signals */}
        {(row.altitudes.length > 0 || cuppingLabel) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-700">
            {row.altitudes.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5 text-stone-500" />
                {row.altitudes.join(" · ")} masl
              </span>
            )}
            {cuppingLabel && (
              <span className="inline-flex items-center gap-1">
                <Coffee className="w-3.5 h-3.5 text-amber-700" />
                {cuppingLabel}
              </span>
            )}
            {row.productCount > 0 && (
              <span className="text-muted-foreground">
                {row.productCount} active product{row.productCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}

        {/* Sample products */}
        {row.topProducts.length > 0 && (
          <div className="rounded-md border border-stone-200 bg-stone-50 p-2.5 space-y-1.5">
            {row.topProducts.map((p) => (
              <div key={p.id} className="flex items-baseline justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-muted-foreground ml-2">
                    {p.origin}
                    {p.process ? ` · ${p.process}` : ""}
                    {p.variety ? ` · ${p.variety}` : ""}
                  </span>
                </div>
                {p.cupping != null && (
                  <span className="tabular-nums text-amber-800 shrink-0">
                    SCA {p.cupping.toFixed(1)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {isDisqualified && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-900 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Disqualifiers</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {row.disqualifiers!.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {breakdown.map((b) => {
            const v = Number(row.scoreBreakdown?.[b.key] ?? 0);
            const pct = Math.round(Math.max(0, Math.min(1, v)) * 100);
            return (
              <div key={b.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{b.label}</span>
                  <span className="tabular-nums">{pct}%</span>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Link href={`/supplier/${row.supplierId}`}>
            <Button size="sm" variant="outline">
              View supplier
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ── MatchResultsPanel ─────────────────────────────────────────────────────────

function MatchResultsPanel({ data }: { data: MatchesResponse }) {
  if (data.matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-serif">No matches yet</CardTitle>
          <CardDescription>
            We ran the matching engine but didn't find a strong fit against the
            current supplier catalog. Filling more profile fields typically
            unlocks more candidates on the next run.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <div className="space-y-4" data-testid="match-results-panel">
      {data.matches.map((m) => (
        <SupplierMatchCard key={m.id} row={m} />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BuyerMatchesPage() {
  const { data: profileResp, isLoading: profileLoading } = useQuery<BuyerProfileResponse>({
    queryKey: ["buyer", "profile"],
    queryFn: async () => {
      const res = await fetch("/api/buyers/profile", { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
      return res.json();
    },
  });

  const profileId = profileResp?.profile.id;

  const {
    data: matchesData,
    isLoading: matchesLoading,
    error: matchesError,
  } = useQuery<MatchesResponse>({
    queryKey: ["buyer", "matches", profileId],
    enabled: !!profileId,
    refetchInterval: (query) => {
      const d = query.state.data;
      // Poll while a profile exists but matches haven't landed yet (model run).
      if (!d) return 4000;
      if (d.matches.length === 0 && d.matching_run_count === 0) return 5000;
      return false;
    },
    queryFn: async () => {
      const res = await fetch(`/api/buyers/${profileId}/matches`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to load matches (${res.status})`);
      return res.json();
    },
  });

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!profileResp?.profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif font-bold tracking-tight">Your matches</h1>
        <Card>
          <CardHeader>
            <CardTitle>Buyer profile not found</CardTitle>
            <CardDescription>
              Complete buyer registration to start matching.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const sectionsDone = profileResp.profile.p2SectionsDone ?? [];
  const hasAB = sectionsDone.includes("A") && sectionsDone.includes("B");
  const lastRunLabel =
    matchesData?.last_matched_at
      ? new Date(matchesData.last_matched_at).toLocaleString()
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Your matches</h1>
        <p className="text-muted-foreground mt-2">
          Ranked Colombian suppliers selected by Fincava's matching engine for your sourcing profile.
        </p>
        {lastRunLabel && (
          <p className="text-xs text-muted-foreground mt-1">
            Last run: {lastRunLabel} · Run #{matchesData?.matching_run_count}
          </p>
        )}
      </div>

      {!hasAB && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base font-serif">Finish Sections A &amp; B to start matching</CardTitle>
            <CardDescription>
              We need your Product Detail and Commercial Terms before we can run
              a full match against the supplier catalog.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/profile">
              <Button>Complete my profile</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {matchesError && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-serif text-red-700">Couldn't load matches</CardTitle>
            <CardDescription>{(matchesError as Error).message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {hasAB && matchesLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {hasAB && matchesData && matchesData.matching_run_count === 0 && matchesData.matches.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-serif">Matching in progress…</CardTitle>
            <CardDescription>
              We're running our matching engine over the supplier catalog. This page
              will refresh automatically as soon as the run completes.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {hasAB && matchesData && (matchesData.matches.length > 0 || matchesData.matching_run_count > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MatchResultsPanel data={matchesData} />
          </div>
          <div className="space-y-4">
            <ImproveMatchPrompt fields={matchesData.fields_that_improve_match} />
          </div>
        </div>
      )}
    </div>
  );
}
