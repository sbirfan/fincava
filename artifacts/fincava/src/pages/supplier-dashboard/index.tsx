import { useGetSupplierStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, MessageSquare, ShoppingCart, DollarSign, CheckCircle2, Circle, ChevronRight, Leaf, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

// ── Profile completeness types ─────────────────────────────────────────────────

type ProfileCompleteness = {
  hasFarmData: boolean;
  hasEconomicsData: boolean;
  hasComplianceData: boolean;
  hasAiScore: boolean;
  isGraduated: boolean;
};

type MyProfileResponse =
  | { found: false }
  | {
      found: true;
      supplierId: number;
      supplier: {
        nombreCompleto: string | null;
        municipio: string | null;
        claimStatus: string | null;
      };
      profileCompleteness: ProfileCompleteness;
    };

// ── Self-completion widget ─────────────────────────────────────────────────────

function ProfileCompletenessWidget() {
  const [data, setData] = useState<MyProfileResponse | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimDone, setClaimDone] = useState(false);

  useEffect(() => {
    fetch("/api/suppliers/my-profile", { credentials: "include" })
      .then((r) => r.json())
      .then((json: MyProfileResponse) => setData(json))
      .catch(() => setData({ found: false }));
  }, []);

  const handleClaim = async (supplierId: number) => {
    setClaiming(true);
    try {
      const r = await fetch(`/api/suppliers/${supplierId}/claim`, {
        method: "PATCH",
        credentials: "include",
      });
      if (r.ok) setClaimDone(true);
    } finally {
      setClaiming(false);
    }
  };

  if (data === null) return null;
  if (!data.found) return null;

  const { supplierId, supplier, profileCompleteness: pc } = data;
  const isClaimed = claimDone || supplier.claimStatus === "CLAIMED";
  const onboardingBase = `/onboarding?supplierId=${supplierId}&prefill=1`;

  const dimensions = [
    {
      label: "Farm data",
      done: pc.hasFarmData,
      link: onboardingBase,
    },
    {
      label: "Economics",
      done: pc.hasEconomicsData,
      link: onboardingBase,
    },
    {
      label: "Compliance docs",
      done: pc.hasComplianceData,
      link: onboardingBase,
    },
    {
      label: "AI readiness score",
      done: pc.hasAiScore,
      link: null,
    },
    {
      label: "Graduated",
      done: pc.isGraduated,
      link: null,
    },
  ];

  const completedCount = dimensions.filter((d) => d.done).length;
  const pct = Math.round((completedCount / dimensions.length) * 100);

  return (
    <Card className="border-l-4 border-l-[#1B5E20]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-[#1B5E20]" />
          <CardTitle className="text-base font-serif">Profile Completeness</CardTitle>
          <Badge
            variant="outline"
            className="ml-auto text-xs font-semibold text-[#1B5E20] border-[#1B5E20]"
          >
            {pct}%
          </Badge>
        </div>
        {supplier.nombreCompleto && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {supplier.nombreCompleto}
            {supplier.municipio ? ` · ${supplier.municipio}` : ""}
          </p>
        )}
        {/* Progress bar */}
        <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#1B5E20] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {dimensions.map((dim) => (
            <li key={dim.label} className="flex items-center gap-2 text-sm">
              {dim.done ? (
                <CheckCircle2 className="w-4 h-4 text-[#1B5E20] shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300 shrink-0" />
              )}
              <span className={dim.done ? "text-gray-700" : "text-gray-500"}>
                {dim.label}
              </span>
              {!dim.done && dim.link && (
                <Link
                  href={dim.link}
                  className="ml-auto flex items-center gap-0.5 text-xs text-[#1B5E20] hover:underline shrink-0"
                >
                  Complete <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </li>
          ))}
        </ul>
        {pct < 100 && (
          <div className="mt-4">
            <Link
              href={onboardingBase}
              className="block w-full text-center text-sm font-medium bg-[#1B5E20] text-white py-2 px-4 rounded-md hover:bg-[#154a18] transition-colors"
            >
              Complete your farm profile
            </Link>
          </div>
        )}

        {/* Claim profile section */}
        {!isClaimed && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-800">Claim your profile</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Claiming links your farmer record to your account and boosts your public trust score.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs border-amber-400 text-amber-800 hover:bg-amber-100"
                disabled={claiming}
                onClick={() => handleClaim(supplierId)}
              >
                {claiming ? "Claiming…" : "Claim profile"}
              </Button>
            </div>
          </div>
        )}
        {isClaimed && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2.5">
            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs text-green-700 font-medium">Profile claimed — trust score boosted</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

export default function SupplierDashboard() {
  const { data: stats, isLoading } = useGetSupplierStats();

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
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Supplier Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage your products, inquiries, and orders.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Listed Products</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.listedProducts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Inquiries</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeInquiries || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalRevenueUSD?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Profile completeness widget — visible only when the logged-in supplier
          has a matching supplier record (email match). Renders nothing otherwise. */}
      <ProfileCompletenessWidget />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif">Recent Inquiries</CardTitle>
            <Link href="/supplier-dashboard/inquiries" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {stats?.recentInquiries && stats.recentInquiries.length > 0 ? (
              <div className="space-y-4">
                {stats.recentInquiries.map((inquiry) => (
                  <div key={inquiry.id} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                    <div>
                      <p className="font-medium">{inquiry.productName}</p>
                      <p className="text-sm text-muted-foreground">{(inquiry as any).buyerCompany || inquiry.buyerName}</p>
                    </div>
                    <Badge variant={inquiry.status === 'PENDING' ? 'default' : 'secondary'}>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif">Recent Orders</CardTitle>
            <Link href="/supplier-dashboard/orders" className="text-sm text-primary hover:underline">View all</Link>
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
      </div>
    </div>
  );
}
