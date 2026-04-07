import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrustBadge } from "@/components/trust-badge";
import { MapPin, Calendar, Package, DollarSign, MessageSquare, Plus, Filter, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface RFQ {
  id: number;
  title: string;
  description: string;
  productCategory: string;
  quantityKg: number;
  targetPriceUSD: number | null;
  destination: string;
  incoterm: string;
  deadline: string;
  status: string;
  buyerName: string;
  buyerCountry: string | null;
  responseCount: number;
}

function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    COFFEE: "Coffee", CACAO: "Cacao", AVOCADO: "Avocado",
    SUPERFOOD: "Superfood", EXOTIC_FRUIT: "Exotic Fruit",
  };
  return map[cat] ?? cat;
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export default function RFQs() {
  const { user } = useAuth();
  const [category, setCategory] = useState("all");

  const { data: rfqs, isLoading } = useQuery<RFQ[]>({
    queryKey: ["/api/rfqs", category],
    queryFn: () => fetch(`/api/rfqs${category !== "all" ? `?category=${category}` : ""}`).then(r => r.json()),
  });

  const filtered = rfqs?.filter(r => r.status === "OPEN") ?? [];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold mb-2">Open RFQs</h1>
          <p className="text-muted-foreground">Requests for Quote from verified international buyers. Submit a bid to compete.</p>
        </div>
        <div className="flex gap-3 items-center">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="COFFEE">Coffee</SelectItem>
              <SelectItem value="CACAO">Cacao</SelectItem>
              <SelectItem value="AVOCADO">Avocado</SelectItem>
              <SelectItem value="SUPERFOOD">Superfoods</SelectItem>
              <SelectItem value="EXOTIC_FRUIT">Exotic Fruits</SelectItem>
            </SelectContent>
          </Select>
          {user?.role === "BUYER" && (
            <Link href="/dashboard/rfqs/new">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Post RFQ
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Open RFQs", value: filtered.length, icon: MessageSquare },
          { label: "Total Volume", value: filtered.reduce((s, r) => s + r.quantityKg, 0).toLocaleString() + " kg", icon: Package },
          { label: "Markets", value: [...new Set(filtered.map(r => r.destination))].length, icon: Globe },
        ].map(stat => (
          <Card key={stat.label} className="text-center py-4">
            <div className="flex items-center justify-center gap-2">
              <stat.icon className="w-4 h-4 text-primary" />
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border rounded-xl border-dashed">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl font-medium mb-2">No open RFQs</p>
          <p className="text-muted-foreground">Check back soon or post your own sourcing request.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(rfq => {
            const days = daysUntil(rfq.deadline);
            const urgent = days <= 14;
            return (
              <Link key={rfq.id} href={`/rfq/${rfq.id}`}>
                <Card className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <Badge variant="outline" className="text-xs shrink-0">{categoryLabel(rfq.productCategory)}</Badge>
                          {urgent && <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">Closes in {days}d</Badge>}
                        </div>
                        <h3 className="text-xl font-semibold group-hover:text-primary transition-colors mb-2">{rfq.title}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{rfq.description}</p>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-primary" />
                            <strong className="text-foreground">{rfq.quantityKg.toLocaleString()} kg</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-primary" />
                            {rfq.destination}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-primary" />
                            {rfq.targetPriceUSD ? `Target: $${rfq.targetPriceUSD}/kg` : "Open pricing"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-primary" />
                            {new Date(rfq.deadline).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                      </div>

                      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-3 md:min-w-[140px] shrink-0">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{rfq.responseCount}</div>
                          <div className="text-xs text-muted-foreground">bids received</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground mb-1">Buyer</div>
                          <div className="font-medium text-sm">{rfq.buyerName}</div>
                          {rfq.buyerCountry && <div className="text-xs text-muted-foreground">{rfq.buyerCountry}</div>}
                        </div>
                        <Badge variant="outline" className="text-xs">{rfq.incoterm}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
