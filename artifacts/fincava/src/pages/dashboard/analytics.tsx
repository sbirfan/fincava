import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ShoppingCart, DollarSign, Package, FlaskConical } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const VOLUME_DATA = [
  { month: "Oct", orders: 2, value: 8400 },
  { month: "Nov", orders: 4, value: 18200 },
  { month: "Dec", orders: 3, value: 12600 },
  { month: "Jan", orders: 7, value: 31000 },
  { month: "Feb", orders: 5, value: 22800 },
  { month: "Mar", orders: 9, value: 41200 },
  { month: "Apr", orders: 12, value: 54900 },
];

const CATEGORY_COLORS: Record<string, string> = {
  COFFEE: "#0F6E56",
  CACAO: "#7C3D12",
  AVOCADO: "#65A30D",
  SUPERFOOD: "#7C3AED",
  FRUIT: "#EA580C",
  OTHER: "#94A3B8",
};

const REGION_DATA = [
  { region: "UAE / Gulf", demand: 38, fill: "#0F6E56" },
  { region: "Saudi Arabia", demand: 27, fill: "#16A34A" },
  { region: "South Korea", demand: 18, fill: "#2563EB" },
  { region: "China", demand: 32, fill: "#DC2626" },
  { region: "Morocco", demand: 14, fill: "#D97706" },
  { region: "Nigeria", demand: 11, fill: "#7C3AED" },
];

interface TrendingProduct {
  productId: number;
  productName: string;
  category: string;
  views: number;
  inquiries: number;
  saves: number;
  pricePerKgUSD: number;
}

export default function AnalyticsDashboard() {
  const { t } = useLanguage();
  const an = t.buyerDash.analytics;

  const SAMPLE_STAT_CARDS = [
    { label: an.totalOrders, value: "42", change: "+18% MoM", icon: ShoppingCart, color: "text-primary" },
    { label: an.tradeValue, value: "$189K", change: "+31% MoM", icon: DollarSign, color: "text-green-600" },
    { label: an.productsSourced, value: "8", change: "Active", icon: Package, color: "text-amber-600" },
    { label: an.avgOrderValue, value: "$4,500", change: "+12% MoM", icon: TrendingUp, color: "text-blue-600" },
  ];

  const { data: trending, isLoading } = useQuery<TrendingProduct[]>({
    queryKey: ["/api/analytics/trending"],
    queryFn: () =>
      fetch("/api/analytics/trending", { credentials: "include" }).then(r => r.json()),
  });

  const productPerformance = trending?.slice(0, 6).map(p => ({
    name: p.productName.length > 20 ? p.productName.slice(0, 18) + "…" : p.productName,
    views: p.views,
    inquiries: p.inquiries,
    category: p.category,
  })) ?? [];

  const categoryTotals = trending?.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + p.views;
    return acc;
  }, {} as Record<string, number>);

  const categoryPieData = Object.entries(categoryTotals ?? {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-serif font-bold tracking-tight">{an.heading}</h1>
          <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 gap-1.5 text-xs font-medium">
            <FlaskConical className="w-3 h-3" />
            {an.sampleBadge}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">{an.description}</p>
      </div>

      {/* Sample stat cards */}
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SAMPLE_STAT_CARDS.map(card => (
            <Card key={card.label} className="opacity-70">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                    <p className="text-xs text-green-600 mt-1 font-medium">{card.change}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 ml-1">{an.sampleNote}</p>
      </div>

      {/* Trade volume line chart */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{an.tradeVolumeTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={VOLUME_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="orders" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="value" orientation="right" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(val: any, name: string) => name === "value" ? [`$${val.toLocaleString()}`, "Trade Value"] : [val, "Orders"]}
              />
              <Legend />
              <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="#0F6E56" strokeWidth={2.5} dot={{ r: 4, fill: "#0F6E56" }} name="Orders" />
              <Line yAxisId="value" type="monotone" dataKey="value" stroke="#7C3AED" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: "#7C3AED" }} name="Value (USD)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-serif text-lg">{an.productPerformance}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productPerformance} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend />
                  <Bar dataKey="views" fill="#0F6E56" name="Views" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inquiries" fill="#16A34A80" name="Inquiries" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif text-lg">{an.categoryBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? "#94A3B8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Regional demand */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{an.regionalDemand}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {REGION_DATA.map(r => (
              <div key={r.region} className="flex items-center gap-4">
                <span className="w-36 text-sm font-medium shrink-0">{r.region}</span>
                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${r.demand}%`, backgroundColor: r.fill }}
                  />
                </div>
                <span className="w-10 text-right text-sm text-muted-foreground tabular-nums">{r.demand}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">{an.regionalDemandDesc}</p>
        </CardContent>
      </Card>
    </div>
  );
}
