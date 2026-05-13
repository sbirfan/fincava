import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Package, Globe, AlertCircle, CheckCircle2, FileText, FlaskConical, Award, BookOpen } from "lucide-react";

interface MarketData {
  trendingProducts: Array<{ name: string; category: string; price: number; inquiries: number }>;
  openRfqsByCategory: Record<string, number>;
  marketHighlights: Array<{ market: string; signal: string; demand: string; growth: string; note: string }>;
  avgPricesByCategory: Record<string, number>;
}

const MARKETS = [
  {
    id: "uae", name: "UAE & Gulf", flag: "🇦🇪", growth: "+34%", signal: "HIGH",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600",
    description: "The Gulf Cooperation Council is Fincava's fastest-growing market, driven by rising specialty coffee culture, demand for organic health foods, and a large South Asian diaspora population creating demand for tropical fruits.",
    topProducts: ["Specialty Coffee", "Hass Avocado", "Goldenberry Powder", "Maca"],
    ports: ["Jebel Ali (Dubai)", "Abu Dhabi Port", "Khalifa Port"],
    currency: "USD",
  },
  {
    id: "china", name: "China & East Asia", flag: "🇨🇳", growth: "+28%", signal: "HIGH",
    image: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=600",
    description: "China's premium food segment is booming. Consumers are paying premiums for traceable, origin-certified products. Colombia's SCA-graded coffees and certified cacao are attracting significant importer interest.",
    topProducts: ["Specialty Coffee", "Fine Flavor Cacao", "Processed Superfood Powders"],
    ports: ["Shanghai Port", "Guangzhou Nansha", "Tianjin Port"],
    currency: "USD/RMB",
  },
  {
    id: "korea", name: "South Korea", flag: "🇰🇷", growth: "+19%", signal: "MEDIUM",
    image: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=600",
    description: "South Korea has one of the world's highest per-capita coffee consumption rates. Specialty single-origin beans from Colombian regions like Huila and Nariño command premium shelf placement.",
    topProducts: ["Specialty Coffee", "Cold Brew Grade Coffee", "Cacao"],
    ports: ["Busan New Port", "Incheon Port"],
    currency: "USD/KRW",
  },
  {
    id: "west-africa", name: "West Africa", flag: "🌍", growth: "+42%", signal: "EMERGING",
    image: "https://images.unsplash.com/photo-1522776851755-3914469f0ca2?w=600",
    description: "Nigeria, Ghana, and Côte d'Ivoire represent a rapidly growing middle class with increasing disposable income and appetite for premium imported goods. The lowest cost-of-entry of Fincava's target markets.",
    topProducts: ["Coffee", "Cacao", "Processed Goods"],
    ports: ["Apapa Port (Lagos)", "Tema Port (Ghana)"],
    currency: "USD",
  },
];

const COMPLIANCE: Record<string, Record<string, { req: string; category: string; mandatory: boolean }[]>> = {
  uae: {
    COFFEE: [
      { req: "Halal Certificate", category: "CERTIFICATION", mandatory: true },
      { req: "Phytosanitary Certificate (ICA)", category: "DOCUMENT", mandatory: true },
      { req: "Certificate of Origin", category: "DOCUMENT", mandatory: true },
      { req: "Health Certificate", category: "DOCUMENT", mandatory: true },
      { req: "Bill of Lading", category: "DOCUMENT", mandatory: true },
    ],
    CACAO: [
      { req: "Halal Certificate", category: "CERTIFICATION", mandatory: true },
      { req: "Heavy Metal Analysis (Cd/Pb)", category: "LAB", mandatory: true },
      { req: "Certificate of Origin", category: "DOCUMENT", mandatory: true },
      { req: "HACCP Certificate", category: "CERTIFICATION", mandatory: false },
    ],
    AVOCADO: [
      { req: "GlobalGAP Certification", category: "CERTIFICATION", mandatory: false },
      { req: "Phytosanitary Certificate", category: "DOCUMENT", mandatory: true },
      { req: "Certificate of Origin", category: "DOCUMENT", mandatory: true },
    ],
    SUPERFOOD: [
      { req: "Halal Certificate", category: "CERTIFICATION", mandatory: true },
      { req: "HACCP Certificate", category: "CERTIFICATION", mandatory: true },
      { req: "Organic Certificate (USDA/EU)", category: "CERTIFICATION", mandatory: false },
      { req: "Certificate of Analysis (CoA)", category: "LAB", mandatory: true },
    ],
  },
  china: {
    COFFEE: [
      { req: "GB Standard Compliance (GB/T 26432)", category: "STANDARD", mandatory: true },
      { req: "GACC/CIQ Exporter Registration", category: "REGISTRATION", mandatory: true },
      { req: "Phytosanitary Certificate", category: "DOCUMENT", mandatory: true },
    ],
    CACAO: [
      { req: "GACC Facility Registration", category: "REGISTRATION", mandatory: true },
      { req: "Heavy Metal Analysis", category: "LAB", mandatory: true },
      { req: "Certificate of Origin", category: "DOCUMENT", mandatory: true },
    ],
    SUPERFOOD: [
      { req: "NMPA Health Food Registration", category: "REGISTRATION", mandatory: true },
      { req: "Certificate of Analysis (CoA)", category: "LAB", mandatory: true },
    ],
  },
  korea: {
    COFFEE: [
      { req: "Korean Food Standards Compliance (MFDS)", category: "STANDARD", mandatory: true },
      { req: "Multi-Residue Pesticide Analysis", category: "LAB", mandatory: true },
      { req: "Certificate of Origin", category: "DOCUMENT", mandatory: true },
    ],
  },
};

const catIcon: Record<string, any> = {
  CERTIFICATION: Award,
  DOCUMENT: FileText,
  LAB: FlaskConical,
  STANDARD: BookOpen,
  REGISTRATION: FileText,
};

const signalColor: Record<string, string> = {
  HIGH: "bg-green-100 text-green-700 border-green-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  EMERGING: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function Markets() {
  const [productFilter, setProductFilter] = useState("COFFEE");

  const { data: intelligence, isLoading } = useQuery<MarketData>({
    queryKey: ["/api/markets/intelligence"],
    queryFn: () => fetch("/api/markets/intelligence").then(r => r.json()),
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Market Intelligence</h1>
        <p className="text-lg text-muted-foreground">Current demand signals, price benchmarks, and compliance requirements for Colombia's top export markets.</p>
      </div>

      {/* Global signals bar */}
      {!isLoading && intelligence && (intelligence.marketHighlights ?? []).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {(intelligence.marketHighlights ?? []).map(m => (
            <Card key={m.market} className="text-center">
              <CardContent className="py-4 px-3">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{m.market}</span>
                  <Badge className={`text-xs ${signalColor[m.signal]}`}>{m.signal}</Badge>
                </div>
                <div className="text-2xl font-bold text-primary">{m.growth}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.demand}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="markets" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="markets">Market Profiles</TabsTrigger>
          <TabsTrigger value="demand">Demand Signals</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Guide</TabsTrigger>
          <TabsTrigger value="prices">Price Benchmarks</TabsTrigger>
        </TabsList>

        {/* Market Profiles */}
        <TabsContent value="markets">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MARKETS.map(market => (
              <Card key={market.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-44 relative overflow-hidden">
                  <img src={market.image} alt={market.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-5">
                    <div className="flex items-end justify-between w-full">
                      <h2 className="text-xl font-serif font-bold text-white">{market.flag} {market.name}</h2>
                      <div className="text-right">
                        <Badge className={`mb-1 ${signalColor[market.signal]}`}>{market.signal}</Badge>
                        <div className="text-white font-bold">{market.growth}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{market.description}</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Top Products in Demand</p>
                      <div className="flex flex-wrap gap-1.5">
                        {market.topProducts.map(p => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Main Entry Ports</p>
                      <div className="flex flex-wrap gap-1.5">
                        {market.ports.map(p => <span key={p} className="text-xs bg-muted px-2 py-0.5 rounded">{p}</span>)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Demand Signals */}
        <TabsContent value="demand">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Trending Products</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {intelligence?.trendingProducts?.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <span className="text-xl font-bold text-muted-foreground/40 w-6">{i + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-sm">${p.price}/kg</p>
                          <p className="text-xs text-muted-foreground">{p.inquiries} inquiries</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Package className="w-5 h-5 text-primary" />Open RFQs by Category</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(intelligence?.openRfqsByCategory ?? {}).map(([cat, count]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{cat}</span>
                            <span className="text-primary font-bold">{count} RFQ{count !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (count / 5) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {Object.keys(intelligence?.openRfqsByCategory ?? {}).length === 0 && (
                      <p className="text-muted-foreground text-sm text-center py-6">No open RFQs right now.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Guide */}
        <TabsContent value="compliance">
          <div className="mb-6 flex gap-4 items-center">
            <p className="text-sm text-muted-foreground">Filter by product:</p>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COFFEE">Coffee</SelectItem>
                <SelectItem value="CACAO">Cacao</SelectItem>
                <SelectItem value="AVOCADO">Avocado</SelectItem>
                <SelectItem value="SUPERFOOD">Superfoods</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MARKETS.map(market => {
              const reqs = COMPLIANCE[market.id]?.[productFilter] ?? [];
              if (!reqs.length) return (
                <Card key={market.id} className="opacity-60">
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-2">{market.flag} {market.name}</h3>
                    <p className="text-sm text-muted-foreground">No specific requirements documented for this product in this market.</p>
                  </CardContent>
                </Card>
              );
              return (
                <Card key={market.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{market.flag} {market.name}</h3>
                      <Badge className={`text-xs ${signalColor[market.signal]}`}>{market.signal}</Badge>
                    </div>
                    <div className="space-y-2.5">
                      {reqs.map((r, i) => {
                        const Icon = catIcon[r.category] ?? FileText;
                        return (
                          <div key={i} className="flex items-start gap-2.5 text-sm">
                            <div className={`rounded-md p-1 shrink-0 mt-0.5 ${r.mandatory ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              <Icon className="w-3 h-3" />
                            </div>
                            <div>
                              <span className={r.mandatory ? "font-medium" : "text-muted-foreground"}>{r.req}</span>
                              {r.mandatory && <span className="text-xs text-primary ml-1.5">Required</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-3 border-t flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" />{reqs.filter(r => r.mandatory).length} mandatory</span>
                      <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500" />{reqs.filter(r => !r.mandatory).length} recommended</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Price Benchmarks */}
        <TabsContent value="prices">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(intelligence?.avgPricesByCategory ?? { COFFEE: 18.50, CACAO: 3.50, AVOCADO: 1.80, SUPERFOOD: 30.00, EXOTIC_FRUIT: 3.20 }).map(([cat, price]) => (
              <Card key={cat}>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-1">Average Price</p>
                  <p className="text-3xl font-bold text-primary mb-1">${price}<span className="text-base font-normal text-muted-foreground">/kg</span></p>
                  <p className="font-semibold">{cat}</p>
                  <p className="text-xs text-muted-foreground mt-2">Colombian export grade, FOB Cartagena</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-6">Prices are indicative benchmarks based on recent Fincava platform data. Actual prices vary by quality grade, certification, and volume.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
