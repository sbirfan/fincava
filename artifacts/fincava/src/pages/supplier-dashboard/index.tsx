import { useGetSupplierStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, MessageSquare, ShoppingCart, DollarSign, CheckCircle2, Circle, ChevronRight, Leaf, ShieldCheck } from "lucide-react";
import { ComplianceProgressWidget } from "@/components/compliance-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type ProfileCompleteness = {
  hasFarmData: boolean;
  hasEconomicsData: boolean;
  hasComplianceData: boolean;
  hasAiScore: boolean;
  isGraduated: boolean;
};

type MyProfileResponse =
  | { found: false; reason?: "email_unverified" | "no_record" }
  | {
      found: true;
      supplierId: number;
      supplier: {
        nombreCompleto: string | null;
        municipio: string | null;
        claimStatus: string | null;
        sellableStatus: string | null;
        graduationPathway: string | null;
        lastEvaluatedAt: string | null;
      };
      profileCompleteness: ProfileCompleteness;
    };

function ProfileCompletenessWidget() {
  const { t } = useLanguage();
  const s = t.supplierDash.index;
  const [data, setData] = useState<MyProfileResponse | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimDone, setClaimDone] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/suppliers/my-profile", { credentials: "include" })
      .then((r) => r.json())
      .then((json: MyProfileResponse) => setData(json))
      .catch(() => setData({ found: false }));
  }, []);

  const handleClaim = async (supplierId: number) => {
    setClaiming(true);
    setClaimError(null);
    try {
      const r = await fetch(`/api/suppliers/${supplierId}/claim`, {
        method: "PATCH",
        credentials: "include",
      });
      if (r.ok) {
        setClaimDone(true);
      } else {
        const body = await r.json().catch(() => ({}));
        setClaimError(body?.error ?? "Unable to claim profile. Please try again.");
      }
    } finally {
      setClaiming(false);
    }
  };

  if (data === null) return null;

  if (!data.found && data.reason === "email_unverified") {
    return (
      <Card className="border-l-4 border-l-blue-400">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <CardTitle className="text-base font-serif">{s.verifyEmail}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{s.verifyEmailDesc}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data.found) {
    return (
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-amber-600" />
            <CardTitle className="text-base font-serif">{s.connectProfile}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{s.connectProfileDesc}</p>
          <Link
            href="/onboarding"
            className="mt-3 block w-full text-center text-sm font-medium bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 transition-colors"
          >
            {s.connectBtn}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { supplierId, supplier, profileCompleteness: pc } = data;
  const isClaimed = claimDone || supplier.claimStatus === "CLAIMED";

  const dimensions = [
    { label: s.farmData, done: pc.hasFarmData, link: null },
    { label: s.economics, done: pc.hasEconomicsData, link: null },
    { label: s.complianceDocs, done: pc.hasComplianceData, link: null },
    { label: s.aiScore, done: pc.hasAiScore, link: null },
    { label: s.graduated, done: pc.isGraduated, link: null },
  ];

  const completedCount = dimensions.filter((d) => d.done).length;
  const pct = Math.round((completedCount / dimensions.length) * 100);

  return (
    <Card className="border-l-4 border-l-[#1B5E20]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-[#1B5E20]" />
          <CardTitle className="text-base font-serif">{s.profileCompleteness}</CardTitle>
          <Badge variant="outline" className="ml-auto text-xs font-semibold text-[#1B5E20] border-[#1B5E20]">
            {pct}%
          </Badge>
        </div>
        {supplier.nombreCompleto && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {supplier.nombreCompleto}
            {supplier.municipio ? ` · ${supplier.municipio}` : ""}
          </p>
        )}
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
          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-center">
            <p className="text-xs text-muted-foreground">{s.editComingSoon}</p>
          </div>
        )}

        {!isClaimed && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-800">{s.claimProfile}</p>
              <p className="text-xs text-amber-700 mt-0.5">{s.claimDesc}</p>
              {claimError && <p className="text-xs text-red-700 mt-1.5 font-medium">{claimError}</p>}
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs border-amber-400 text-amber-800 hover:bg-amber-100"
                disabled={claiming}
                onClick={() => handleClaim(supplierId)}
              >
                {claiming ? s.claiming : s.claimBtn}
              </Button>
            </div>
          </div>
        )}
        {isClaimed && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2.5">
            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs text-green-700 font-medium">{s.claimSuccess}</p>
          </div>
        )}

        {(supplier.sellableStatus || supplier.graduationPathway) && (
          <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-3 space-y-1.5">
            <p className="text-xs font-medium text-gray-700">{s.graduationStatus}</p>
            <div className="flex flex-wrap gap-2 items-center">
              {supplier.sellableStatus && (
                <Badge variant="outline" className="text-xs">
                  {supplier.sellableStatus.replace("_", " ")}
                </Badge>
              )}
              {supplier.graduationPathway && (
                <Badge variant="outline" className="text-xs">
                  {s.pathway} {supplier.graduationPathway}
                </Badge>
              )}
            </div>
            {supplier.lastEvaluatedAt && (
              <p className="text-xs text-muted-foreground">
                {s.lastEvaluated} {new Date(supplier.lastEvaluatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SupplierDashboard() {
  const { t } = useLanguage();
  const s = t.supplierDash.index;
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
        <h1 className="text-3xl font-serif font-bold tracking-tight">{s.heading}</h1>
        <p className="text-muted-foreground mt-2">{s.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{s.listedProducts}</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.listedProducts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{s.activeInquiries}</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeInquiries || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{s.totalOrders}</CardTitle>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{s.totalRevenue}</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalRevenueUSD?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
      </div>

      <ProfileCompletenessWidget />
      <ComplianceProgressWidget />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif">{s.recentInquiries}</CardTitle>
            <Link href="/supplier-dashboard/inquiries" className="text-sm text-primary hover:underline">{s.viewAll}</Link>
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
                {s.noInquiries}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif">{s.recentOrders}</CardTitle>
            <Link href="/supplier-dashboard/orders" className="text-sm text-primary hover:underline">{s.viewAll}</Link>
          </CardHeader>
          <CardContent>
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-4">
                {stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">{s.order}{order.id}</p>
                      <p className="font-bold">${order.totalUSD.toLocaleString()}</p>
                    </div>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                {s.noOrders}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
