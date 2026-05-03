import { useGetBuyerStats } from "@workspace/api-client-react";
import { ENABLE_TRANSACTIONS } from "@/lib/flags";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Package, MessageSquare, ShoppingCart, Clock, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

// P2-B2 — amber completion banner shown when buyer has started but not finished onboarding.
function CompletionBanner() {
  const { t } = useLanguage();
  const tr = t.buyerOnboarding;
  const { data, isError } = useQuery<{ profile: { p2CompletionPct: number } | null }>({
    queryKey: ["buyer-onboarding-pct"],
    queryFn: async () => {
      const res = await fetch("/api/buyer/onboarding", { credentials: "include" });
      if (!res.ok) return { profile: null };
      return res.json();
    },
  });

  const pct = data?.profile?.p2CompletionPct ?? null;
  if (pct === null || pct >= 100 || isError) return null;

  return (
    <Card className="border-amber-200 bg-amber-50" data-testid="completion-banner">
      <CardContent className="flex items-center justify-between py-4 px-5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">
            {tr.dashBannerText.replace("{pct}", String(pct))}
          </p>
          <div className="mt-2 h-1.5 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${Math.max(pct, 4)}%` }}
            />
          </div>
        </div>
        <Link href="/buyer/onboarding" className="ml-4 shrink-0">
          <Button size="sm" variant="outline" className="border-amber-300 hover:bg-amber-100 text-amber-800">
            {tr.dashBannerLink}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// Phase 3 — teaser banner shown on the main dashboard before/while matches are loading.
function TeaserMatchBanner() {
  const { data: profileResp } = useQuery<{
    profile: {
      id: number;
      state: string;
      p2SectionsDone: string[];
      matchingRunCount: number;
    };
  }>({
    queryKey: ["buyer-profile"],
    queryFn: async () => {
      const res = await fetch("/api/buyers/profile", { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
      return res.json();
    },
  });

  const profile = profileResp?.profile;
  const profileId = profile?.id;
  const teaserStates = ["REGISTERED", "ACTIVE", "PROFILING"];
  const inTeaserState = profile ? teaserStates.includes(profile.state) : false;

  const { data: preview } = useQuery<{
    preview: true;
    candidate_count: number;
    state: string;
    matching_run_count: number;
  }>({
    queryKey: ["buyer-matches-preview", profileId],
    enabled: !!profileId && inTeaserState,
    queryFn: async () => {
      const res = await fetch(`/api/buyers/${profileId}/matches?preview=true`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to load preview (${res.status})`);
      return res.json();
    },
  });

  if (!profile || !inTeaserState) return null;

  const sectionsDone = profile.p2SectionsDone ?? [];
  const hasAB = sectionsDone.includes("A") && sectionsDone.includes("B");
  const candidateCount = preview?.candidate_count ?? 0;

  // Title and body adapt based on whether the buyer has finished A+B and
  // whether the coarse Phase-1 prefilter already found candidate suppliers.
  let title: string;
  let body: string;
  if (hasAB) {
    if (candidateCount > 0) {
      title = `We see ~${candidateCount} potential supplier${candidateCount === 1 ? "" : "s"} for you`;
      body = "Open your matches dashboard for ranked, scored supplier recommendations.";
    } else {
      title = "We're scanning Colombian suppliers for your fit";
      body = "Complete more profile fields to expand your candidate pool.";
    }
  } else {
    if (candidateCount > 0) {
      title = `We've identified ~${candidateCount} candidate supplier${candidateCount === 1 ? "" : "s"} for you`;
      body = "Complete Product Detail and Commercial Terms to unlock ranked, scored matches.";
    } else {
      title = "Unlock matches with Sections A & B";
      body = "Finish Product Detail and Commercial Terms so our matching engine can run.";
    }
  }

  return (
    <Card
      className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-amber-50"
      data-testid="teaser-match-banner"
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          {title}
        </CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={hasAB ? "/dashboard/matches" : "/buyer/onboarding"}>
          <Button>
            {hasAB ? "View matches" : "Complete my profile"}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function BuyerDashboard() {
  const { data: stats, isLoading } = useGetBuyerStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Buyer Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage your sourcing operations, inquiries, and orders.</p>
        </div>
        <Link href="/dashboard/profile" className="shrink-0 mt-1">
          <Button variant="outline" size="sm" className="gap-1.5">
            Edit Profile <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      <CompletionBanner />
      <TeaserMatchBanner />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/inquiries" className="block group">
          <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Inquiries</CardTitle>
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeInquiries || 0}</div>
            </CardContent>
          </Card>
        </Link>
        {/* Order stat cards — hidden until ENABLE_TRANSACTIONS is on */}
        {ENABLE_TRANSACTIONS && (
          <Link href="/dashboard/orders" className="block group">
            <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Orders in Progress</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.ordersInProgress || 0}</div>
              </CardContent>
            </Card>
          </Link>
        )}
        {ENABLE_TRANSACTIONS && (
          <Link href="/dashboard/orders" className="block group">
            <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
              </CardContent>
            </Card>
          </Link>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Saved Products</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.savedProducts || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif">Recent Inquiries</CardTitle>
            <Link href="/dashboard/inquiries" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {stats?.recentInquiries && stats.recentInquiries.length > 0 ? (
              <div className="space-y-4">
                {stats.recentInquiries.map((inquiry) => (
                  <div key={inquiry.id} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                    <div>
                      <p className="font-medium">{inquiry.productName}</p>
                      <p className="text-sm text-muted-foreground">{inquiry.supplierName}</p>
                    </div>
                    <Badge variant={inquiry.status === 'RESPONDED' ? 'default' : 'secondary'}>
                      {inquiry.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No recent inquiries.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders card — hidden until ENABLE_TRANSACTIONS is on */}
        {ENABLE_TRANSACTIONS && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif">Recent Orders</CardTitle>
            <Link href="/dashboard/orders" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-4">
                {stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">Order #{order.id}</p>
                      <p className="font-bold">${order.totalUSD.toLocaleString()}</p>
                    </div>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No recent orders.
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
