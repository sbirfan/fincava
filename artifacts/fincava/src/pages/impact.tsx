import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Sprout, Handshake, Leaf, Heart, Globe, ArrowRight } from "lucide-react";

interface ImpactData {
  farmersSupported: number;
  avgFarmSizeHa: number;
  regionsRepresented: string[];
  directTradeProducts: number;
  smallholderProducts: number;
  womenLedFarms: number;
  organicProducts: number;
  totalFamiliesSupported: number;
}

const SDG_GOALS = [
  { number: 1, label: "No Poverty", icon: Heart, description: "Premiums fund year-round income stability for smallholder families" },
  { number: 2, label: "Zero Hunger", icon: Sprout, description: "Supporting local food system resilience alongside export crops" },
  { number: 8, label: "Decent Work", icon: Users, description: "Fair wages and guaranteed contracts for farm workers" },
  { number: 13, label: "Climate Action", icon: Leaf, description: "Agroforestry and sustainable practices across all partner farms" },
  { number: 15, label: "Life on Land", icon: Globe, description: "Biodiversity corridors and forest protection through sustainable sourcing" },
  { number: 17, label: "Partnerships", icon: Handshake, description: "Direct trade relationships that bypass extractive commodity chains" },
];

export default function Impact() {
  const { data, isLoading } = useQuery<ImpactData>({
    queryKey: ["/api/impact"],
    queryFn: () => fetch("/api/impact").then(r => r.json()),
  });

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-primary text-primary-foreground py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1600" alt="Colombian landscape" className="w-full h-full object-cover" />
        </div>
        <div className="relative container mx-auto px-4 text-center">
          <Badge className="bg-white/20 text-white border-white/30 mb-6 text-sm px-4 py-1.5">Impact Report</Badge>
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">Trade that matters.</h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto text-primary-foreground/80 font-light">
            Every sourcing decision on Fincava is a vote for smallholder farmers, rural communities, and a more equitable supply chain. Here is what your purchases do.
          </p>
        </div>
      </section>

      {/* Impact Numbers */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
            ) : ([
              { label: "Farmers Directly Supported", value: data?.farmersSupported ?? 0, icon: Users, color: "text-primary" },
              { label: "Families Reached", value: data?.totalFamiliesSupported ?? 0, icon: Heart, color: "text-rose-500" },
              { label: "Regions Represented", value: data?.regionsRepresented?.length ?? 0, icon: MapPin, color: "text-sky-500" },
              { label: "Direct Trade Products", value: data?.directTradeProducts ?? 0, icon: Handshake, color: "text-emerald-500" },
            ]).map(stat => (
              <Card key={stat.label} className="text-center py-6">
                <CardContent className="p-4">
                  <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                  <div className="text-4xl font-bold mb-2">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            ) : ([
              { label: "Women-Led Farms", value: data?.womenLedFarms ?? 0, icon: Users },
              { label: "Organic Products", value: data?.organicProducts ?? 0, icon: Leaf },
              { label: "Smallholder Farms", value: data?.smallholderProducts ?? 0, icon: Sprout },
              { label: "Avg Farm Size", value: data?.avgFarmSizeHa ? `${data.avgFarmSizeHa.toFixed(1)} ha` : "–", icon: MapPin },
            ]).map(stat => (
              <Card key={stat.label} className="bg-muted/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <stat.icon className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <div className="text-xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Direct Trade */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">The problem with commodity trade</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                In a conventional coffee supply chain, a farmer selling at the C-market price receives approximately $1.80–2.40 per kg of green coffee. By the time that coffee lands on a retail shelf, its price has multiplied 10–15x. The farmer captures less than 5% of final value.
              </p>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Fincava's direct trade model bypasses 3–5 intermediary layers. Buyers get traceability, origin stories, and quality assurance. Farmers get 40–70% premiums over C-market and the dignity of having their name on the bag.
              </p>
              <div className="space-y-4">
                {[
                  { label: "Commodity supply chain value to farmer", pct: 5, color: "bg-red-400" },
                  { label: "Fincava direct trade value to farmer", pct: 35, color: "bg-primary" },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.label}</span>
                      <span className="font-bold">{item.pct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">40–70%</div>
                <div className="text-sm text-muted-foreground">Premium above C-market paid to farms</div>
              </div>
              <div className="bg-muted rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">0</div>
                <div className="text-sm text-muted-foreground">Commodity brokers between you and the farm</div>
              </div>
              <div className="bg-muted rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">100%</div>
                <div className="text-sm text-muted-foreground">Traceability — you know the farmer's name</div>
              </div>
              <div className="bg-muted rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">3–5x</div>
                <div className="text-sm text-muted-foreground">More rural employment vs commodity</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SDG Alignment */}
      <section className="py-20 bg-primary/5 border-y">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">UN Sustainable Development Goals</h2>
            <p className="text-muted-foreground">Fincava's trade model contributes directly to six SDGs</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SDG_GOALS.map(goal => (
              <div key={goal.number} className="flex items-start gap-4 p-4 bg-card rounded-xl border">
                <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 text-sm">
                  {goal.number}
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">{goal.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{goal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Source with purpose</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Every RFQ you post, every order you place, every supplier you contact on Fincava is a direct investment in Colombian farming communities. Start sourcing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/marketplace">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Explore Products <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/rfqs">
              <Button size="lg" variant="outline">Post a Sourcing Request</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
