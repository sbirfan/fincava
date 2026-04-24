import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrustBadge, TrustScoreBar } from "@/components/trust-badge";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart2, TrendingUp, Package, Clock, Star, Globe, ShieldCheck } from "lucide-react";

interface TradeRecord { product: string; volumeKg: number; destination: string; year: number; valueUSD: number | null; }

export default function SupplierPerformance() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["/api/supplier/profile"],
    queryFn: () => fetch("/api/supplier/profile", { credentials: "include" }).then(r => r.json()),
  });

  const { data: trust } = useQuery({
    queryKey: [`/api/trust/${profile?.id}`],
    queryFn: () => fetch(`/api/trust/${profile?.id}`).then(r => r.json()),
    enabled: !!profile?.id,
  });

  const { data: tradeHistory } = useQuery<TradeRecord[]>({
    queryKey: [`/api/analytics/trade-history/${profile?.id}`],
    queryFn: () => fetch(`/api/analytics/trade-history/${profile?.id}`).then(r => r.json()),
    enabled: !!profile?.id,
  });

  const totalVolume = tradeHistory?.reduce((s, r) => s + r.volumeKg, 0) ?? 0;
  const totalValue = tradeHistory?.reduce((s, r) => s + (r.valueUSD ?? 0), 0) ?? 0;
  const destinations = [...new Set(tradeHistory?.map(r => r.destination) ?? [])];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Performance</h1>
        <p className="text-muted-foreground">Your trust score, trade history, and market metrics</p>
      </div>

      {/* Trust Score Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Your Trust Score</p>
              <div className="flex items-center gap-3">
                <span className="text-5xl font-bold text-primary">{trust?.score?.toFixed(0) ?? profile?.trustScore?.toFixed(0) ?? "—"}</span>
                <div>
                  <TrustBadge score={trust?.score ?? profile?.trustScore ?? 0} size="lg" showLabel />
                  <p className="text-xs text-muted-foreground mt-1">{trust?.tier ?? "—"} Tier</p>
                </div>
              </div>
            </div>
            <ShieldCheck className="w-10 h-10 text-primary/40" />
          </div>
          <TrustScoreBar score={trust?.score ?? profile?.trustScore ?? 0} />

          {trust?.factors && (
            <div className="grid grid-cols-5 gap-3 mt-6 pt-4 border-t border-primary/20">
              {[
                { label: "Orders", value: trust.factors.ordersCompleted, max: 25 },
                { label: "Certs", value: trust.factors.certificationsCount, max: 25 },
                { label: "Response", value: trust.factors.responseTime, max: 20 },
                { label: "Profile", value: trust.factors.profileCompleteness, max: 15 },
                { label: "Volume", value: trust.factors.tradeVolume, max: 15 },
              ].map(f => (
                <div key={f.label} className="text-center">
                  <div className="text-lg font-bold text-primary">{f.value?.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                  <div className="text-xs text-muted-foreground">/{f.max}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Volume Exported", value: totalVolume > 0 ? `${(totalVolume / 1000).toFixed(0)} MT` : "—", icon: Package },
          { label: "Total Trade Value", value: totalValue > 0 ? `$${(totalValue / 1000).toFixed(0)}k` : "—", icon: TrendingUp },
          { label: "Export Destinations", value: destinations.length || "—", icon: Globe },
          { label: "Avg Response Time", value: profile?.responseTimeHours ? `${profile.responseTimeHours}h` : "—", icon: Clock },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trade History Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart2 className="w-5 h-5 text-primary" />Trade History</CardTitle></CardHeader>
        <CardContent>
          {!tradeHistory?.length ? (
            <p className="text-muted-foreground text-sm text-center py-8">No trade history recorded yet. Complete orders to build your history.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-4">Product</th>
                    <th className="text-right py-2 pr-4">Volume</th>
                    <th className="text-left py-2 pr-4">Destination</th>
                    <th className="text-right py-2 pr-4">Value</th>
                    <th className="text-right py-2">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 pr-4 font-medium">{r.product}</td>
                      <td className="py-3 pr-4 text-right">{r.volumeKg.toLocaleString()} kg</td>
                      <td className="py-3 pr-4 text-muted-foreground">{r.destination}</td>
                      <td className="py-3 pr-4 text-right font-medium text-primary">{r.valueUSD ? `$${r.valueUSD.toLocaleString()}` : "—"}</td>
                      <td className="py-3 text-right text-muted-foreground">{r.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export destinations */}
      {destinations.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-primary" />Export Destinations</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {destinations.map(d => (
                <div key={d} className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-sm font-medium">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  {d}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
