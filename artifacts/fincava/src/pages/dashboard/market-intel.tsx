import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Package, Globe, DollarSign, FileQuestion, BarChart2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface MarketData {
  trendingProducts: Array<{ name: string; category: string; price: number; inquiries: number }>;
  openRfqsByCategory: Record<string, number>;
  marketHighlights: Array<{ market: string; signal: string; demand: string; growth: string; note: string }>;
  avgPricesByCategory: Record<string, number>;
}

const signalColor: Record<string, string> = {
  HIGH: "bg-green-100 text-green-700 border-green-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  EMERGING: "bg-blue-100 text-blue-700 border-blue-200",
  LOW: "bg-muted text-muted-foreground",
};

const PRICE_BENCHMARKS = [
  { category: "Specialty Coffee (SCA 85+)", low: 16, high: 28, avg: 20.50, unit: "kg" },
  { category: "Commodity Coffee (Green)", low: 5, high: 8, avg: 6.20, unit: "kg" },
  { category: "Fine Flavor Cacao", low: 3, high: 7, avg: 4.80, unit: "kg" },
  { category: "Hass Avocado (Export)", low: 1.2, high: 2.8, avg: 1.90, unit: "kg" },
  { category: "Goldenberry (Cape Gooseberry)", low: 2, high: 5, avg: 3.40, unit: "kg" },
  { category: "Maca Powder", low: 15, high: 45, avg: 28, unit: "kg" },
  { category: "Açaí Powder (Freeze-dried)", low: 18, high: 50, avg: 32, unit: "kg" },
];

const COMPLIANCE_ALERTS = [
  { market: "🇨🇳 China", product: "Cacao", severity: "HIGH", message: "GACC facility registration required for all cacao exporters effective Jan 2025" },
  { market: "🇦🇪 UAE", product: "All Food", severity: "MEDIUM", message: "Halal certification is mandatory for all food products entering UAE" },
  { market: "🇰🇷 South Korea", product: "Coffee", severity: "MEDIUM", message: "Multi-residue pesticide panel analysis now required by MFDS" },
  { market: "🇩🇪 EU", product: "Cacao", severity: "HIGH", message: "EU Deforestation Regulation (EUDR) enforcement begins Dec 2025 — geolocation data required" },
];

export default function BuyerMarketIntel() {
  const { data, isLoading } = useQuery<MarketData>({
    queryKey: ["/api/markets/intelligence"],
    queryFn: () => fetch("/api/markets/intelligence").then(r => r.json()),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Market Intelligence</h1>
        <p className="text-muted-foreground">Price benchmarks, demand signals, and regulatory alerts for Colombian agricultural commodities</p>
      </div>

      {/* Market Signal Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          data?.marketHighlights?.map(m => (
            <Card key={m.market}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <span className="font-semibold text-sm">{m.market}</span>
                  <Badge className={`text-xs ${signalColor[m.signal]}`}>{m.signal}</Badge>
                </div>
                <div className="text-2xl font-bold text-primary">{m.growth}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.demand}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Tabs defaultValue="prices">
        <TabsList>
          <TabsTrigger value="prices">Price Benchmarks</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="rfqs">Open RFQs</TabsTrigger>
          <TabsTrigger value="alerts">Compliance Alerts</TabsTrigger>
        </TabsList>

        {/* Price Benchmarks */}
        <TabsContent value="prices" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Colombian Export Price Benchmarks (FOB Cartagena, USD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 pr-4">Product</th>
                      <th className="text-right py-2 pr-4">Low</th>
                      <th className="text-right py-2 pr-4">Average</th>
                      <th className="text-right py-2 pr-4">High</th>
                      <th className="text-right py-2">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRICE_BENCHMARKS.map(p => (
                      <tr key={p.category} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-3 pr-4 font-medium">{p.category}</td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">${p.low}</td>
                        <td className="py-3 pr-4 text-right">
                          <span className="font-bold text-primary">${p.avg}</span>
                        </td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">${p.high}</td>
                        <td className="py-3 text-right text-muted-foreground">/{p.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
                Indicative benchmarks based on recent platform data. Prices vary by quality grade, certification level, and contracted volume. Updated weekly.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trending Products */}
        <TabsContent value="trending" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Most Inquired Products</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10" />)}</div>
                ) : data?.trendingProducts?.length ? (
                  <div className="space-y-2">
                    {data.trendingProducts.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <span className="text-xl font-bold text-muted-foreground/30 w-6 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-primary text-sm">${p.price}/kg</p>
                          <p className="text-xs text-muted-foreground">{p.inquiries} inquiries</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-6">No data yet.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart2 className="w-5 h-5 text-primary" />Category Avg Prices</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(data?.avgPricesByCategory ?? {}).map(([cat, price]) => (
                      <div key={cat} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                        <span className="font-medium">{cat}</span>
                        <span className="font-bold text-primary">${price}/kg</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Open RFQs */}
        <TabsContent value="rfqs" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><FileQuestion className="w-5 h-5 text-primary" />Open Sourcing Requests</CardTitle>
                <Link href="/rfqs"><Button variant="outline" size="sm">View All RFQs</Button></Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data?.openRfqsByCategory ?? {}).map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-4">
                      <Badge variant="outline" className="w-32 justify-center shrink-0">{cat}</Badge>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (count / 5) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-bold text-primary w-16 text-right">{count} open</span>
                    </div>
                  ))}
                  {Object.keys(data?.openRfqsByCategory ?? {}).length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-8">No open RFQs right now. Check back or post a sourcing request.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="mt-4">
            <Link href="/dashboard/rfqs">
              <Button className="w-full"><FileQuestion className="w-4 h-4 mr-2" />Post a New RFQ</Button>
            </Link>
          </div>
        </TabsContent>

        {/* Compliance Alerts */}
        <TabsContent value="alerts" className="pt-4">
          <div className="space-y-3">
            {COMPLIANCE_ALERTS.map((alert, i) => (
              <Card key={i} className={alert.severity === "HIGH" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${alert.severity === "HIGH" ? "text-red-500" : "text-amber-500"}`} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{alert.market}</span>
                        <Badge variant="outline" className="text-xs">{alert.product}</Badge>
                        <Badge className={`text-xs ${alert.severity === "HIGH" ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-2">Regulatory updates are sourced from official trade bodies. Always verify with a trade compliance advisor.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
