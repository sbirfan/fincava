import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, ShieldCheck, Star, Leaf, ArrowLeft } from "lucide-react";
import { TrustBadge } from "@/components/trust-badge";

interface MarketplaceSupplier {
  id: number;
  name: string;
  region?: string | null;
  country: string;
  description?: string | null;
  logoUrl?: string | null;
  verified: boolean;
  avgRating?: number | null;
  trustScore?: number | null;
  productCategories: string[];
  productCount: number;
}

interface OnboardingSupplier {
  id: number;
  name: string | null;
  region: string | null;
  department: string | null;
  storyExcerpt: string;
  imageUrl: string | null;
  productCategories: string[];
}

export default function Suppliers() {
  const [search, setSearch] = useState("");
  const [suppliers, setSuppliers] = useState<MarketplaceSupplier[]>([]);
  const [onboardingSuppliers, setOnboardingSuppliers] = useState<OnboardingSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/suppliers/marketplace?include_onboarding=true")
      .then((r) => r.json())
      .then((data) => {
        const list: MarketplaceSupplier[] = (data.suppliers ?? []).map((s: any) => ({
          id: s.id,
          name: s.name ?? s.nombreCompleto ?? "",
          region: s.region ?? s.municipio ?? null,
          country: s.country ?? "Colombia",
          description: s.description ?? null,
          logoUrl: s.logoUrl ?? null,
          verified: !!(s.claimStatus === "CLAIMED" || s.verified),
          avgRating: s.avgRating ?? null,
          trustScore: s.public_trust_score ?? s.trustScore ?? null,
          productCategories: s.productCategories ?? (s.products ?? []).map((p: any) => p.category).filter(Boolean),
          productCount: s.productCount ?? (s.products ?? []).length,
        }));
        setSuppliers(list);
        setOnboardingSuppliers(data.onboarding_suppliers ?? []);
      })
      .catch(() => {
        setSuppliers([]);
        setOnboardingSuppliers([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const q = search.trim().toLowerCase();

  const filteredExportReady = q
    ? suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.region ?? "").toLowerCase().includes(q) ||
          s.productCategories.some((c) => c.toLowerCase().includes(q)),
      )
    : suppliers;

  const filteredOnboarding = q
    ? onboardingSuppliers.filter(
        (s) =>
          (s.name ?? "").toLowerCase().includes(q) ||
          (s.region ?? "").toLowerCase().includes(q) ||
          s.productCategories.some((c) => c.toLowerCase().includes(q)),
      )
    : onboardingSuppliers;

  const bothEmpty = filteredExportReady.length === 0 && filteredOnboarding.length === 0;

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Back navigation */}
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Page header */}
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Supplier Network</h1>
        <p className="text-lg text-muted-foreground">
          Connecting global buyers with Colombia's finest agricultural producers. Explore verified
          exporters and discover emerging farms building their export journey.
        </p>
        <div className="mt-8 max-w-md mx-auto relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-10 h-12 text-base rounded-full bg-background border-border"
            placeholder="Search by company name, region, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        /* Loading skeleton */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-32 bg-muted relative">
                <Skeleton className="absolute -bottom-8 left-6 w-16 h-16 rounded-full" />
              </div>
              <CardContent className="pt-12 pb-6 px-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bothEmpty ? (
        /* Page-level empty state — neither section has any results */
        <div className="text-center py-20 bg-card border rounded-lg border-dashed">
          <p className="text-lg font-medium mb-2">No suppliers found</p>
          {q ? (
            <>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search to see more results.
              </p>
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear Search
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">
              Our first verified suppliers are being prepared. Check back soon.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-16">
          {/* ── Section A: Export Ready ─────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-2xl font-serif font-semibold">Export Ready</h2>
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium text-xs">
                Verified
              </Badge>
            </div>

            {filteredExportReady.length === 0 ? (
              /* Section A per-section empty state */
              <div className="text-center py-12 bg-card border rounded-lg border-dashed">
                <p className="text-base font-medium mb-1">No export-ready suppliers found</p>
                {q ? (
                  <p className="text-sm text-muted-foreground">Try a different search term.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Our first verified suppliers are being prepared. Check back soon.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExportReady.map((supplier) => (
                  <Link key={supplier.id} href={`/supplier/${supplier.id}`}>
                    <Card className="h-full overflow-hidden hover-elevate transition-all duration-300 cursor-pointer border-border group flex flex-col">
                      <div className="h-24 bg-primary/5 relative">
                        <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-full border-4 border-card bg-background overflow-hidden flex items-center justify-center">
                          {supplier.logoUrl ? (
                            <img
                              src={supplier.logoUrl}
                              alt={supplier.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-bold text-primary">
                              {supplier.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        {supplier.verified && (
                          <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center text-xs font-medium text-primary">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Verified
                          </div>
                        )}
                      </div>

                      <CardContent className="pt-12 pb-6 px-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-serif font-bold text-xl group-hover:text-primary transition-colors line-clamp-1">
                            {supplier.name}
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {supplier.avgRating && (
                              <div className="flex items-center text-sm font-medium bg-secondary/10 text-secondary px-2 py-0.5 rounded">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                {supplier.avgRating.toFixed(1)}
                              </div>
                            )}
                            {supplier.trustScore != null && (
                              <TrustBadge score={Math.round(supplier.trustScore)} size="sm" />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center text-sm text-muted-foreground mb-4">
                          <MapPin className="w-3.5 h-3.5 mr-1" />
                          {supplier.region ? `${supplier.region}, ` : ""}Colombia
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                          {supplier.description}
                        </p>

                        <div className="space-y-4 border-t pt-4 mt-auto">
                          <div>
                            <span className="text-xs text-muted-foreground block mb-2">
                              Categories
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {supplier.productCategories.slice(0, 3).map((cat, idx) => (
                                <Badge key={idx} variant="outline" className="font-normal">
                                  {cat}
                                </Badge>
                              ))}
                              {supplier.productCategories.length > 3 && (
                                <Badge
                                  variant="outline"
                                  className="font-normal text-muted-foreground"
                                >
                                  +{supplier.productCategories.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{supplier.productCount} Products</span>
                            <span className="text-primary group-hover:underline">
                              View Profile &rarr;
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ── Section B: Building Export Readiness ────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Leaf className="w-5 h-5 text-amber-600" />
              <h2 className="text-2xl font-serif font-semibold">Building Export Readiness</h2>
              <Badge className="bg-amber-100 text-amber-800 border border-amber-200 font-medium text-xs">
                Coming Soon
              </Badge>
            </div>

            {filteredOnboarding.length === 0 ? (
              /* Section B per-section empty state */
              <div className="text-center py-10 bg-card border rounded-lg border-dashed">
                {q ? (
                  <p className="text-sm text-muted-foreground">
                    No results in this section for your search.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No farms are currently preparing for export. Check back soon.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOnboarding.map((supplier) => (
                  <Card
                    key={supplier.id}
                    className="h-full overflow-hidden border-border flex flex-col"
                  >
                    {supplier.imageUrl && (
                      <div className="h-40 bg-muted overflow-hidden">
                        <img
                          src={supplier.imageUrl}
                          alt={supplier.name ?? "Supplier"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent
                      className={`px-6 pb-6 flex-1 flex flex-col ${supplier.imageUrl ? "pt-4" : "pt-6"}`}
                    >
                      <h3 className="font-serif font-bold text-xl mb-1 line-clamp-1">
                        {supplier.name ?? "—"}
                      </h3>
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <MapPin className="w-3.5 h-3.5 mr-1" />
                        {[supplier.region, supplier.department].filter(Boolean).join(", ") ||
                          "Colombia"}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 flex-1 leading-relaxed">
                        {supplier.storyExcerpt}
                      </p>
                      {supplier.productCategories.length > 0 && (
                        <div className="mb-4">
                          <span className="text-xs text-muted-foreground block mb-2">
                            Categories
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {supplier.productCategories.slice(0, 3).map((cat, idx) => (
                              <Badge key={idx} variant="outline" className="font-normal text-xs">
                                {cat}
                              </Badge>
                            ))}
                            {supplier.productCategories.length > 3 && (
                              <Badge
                                variant="outline"
                                className="font-normal text-xs text-muted-foreground"
                              >
                                +{supplier.productCategories.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 mt-auto">
                        This supplier is preparing for export — check back soon
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
