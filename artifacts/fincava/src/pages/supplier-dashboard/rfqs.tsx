import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Package, MapPin, Calendar, DollarSign, CheckCircle, ArrowRight, Inbox } from "lucide-react";

const TOKEN = () => localStorage.getItem("fincava_token") ?? "";

interface RFQ {
  id: number;
  title: string;
  productCategory: string;
  quantityKg: number;
  targetPriceUSD: number | null;
  destination: string;
  incoterm: string;
  deadline: string;
  status: string;
  hasResponded: boolean;
}

export default function SupplierRFQs() {
  const { data: rfqs, isLoading } = useQuery<RFQ[]>({
    queryKey: ["/api/supplier/rfqs"],
    queryFn: () => fetch("/api/supplier/rfqs", { headers: { Authorization: `Bearer ${TOKEN()}` } }).then(r => r.json()),
  });

  const daysUntil = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
  const catLabel: Record<string, string> = { COFFEE: "Coffee", CACAO: "Cacao", AVOCADO: "Avocado", SUPERFOOD: "Superfood", EXOTIC_FRUIT: "Exotic Fruit" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">RFQ Inbox</h1>
        <p className="text-muted-foreground">Open sourcing requests from international buyers. Submit bids to win contracts.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : !rfqs?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No open RFQs</p>
            <p className="text-muted-foreground">Check back soon — buyers post new sourcing requests regularly.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rfqs.map(rfq => {
            const days = daysUntil(rfq.deadline);
            const urgent = days <= 10;
            return (
              <Link key={rfq.id} href={`/rfq/${rfq.id}`}>
                <Card className={`hover:border-primary/40 transition-colors cursor-pointer group ${rfq.hasResponded ? "opacity-75" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">{catLabel[rfq.productCategory] ?? rfq.productCategory}</Badge>
                          {rfq.hasResponded && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
                              <CheckCircle className="w-3 h-3" />Bid Submitted
                            </Badge>
                          )}
                          {urgent && !rfq.hasResponded && (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">{days}d left</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold group-hover:text-primary transition-colors mb-3">{rfq.title}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-primary" />{rfq.quantityKg?.toLocaleString()} kg</span>
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{rfq.destination}</span>
                          {rfq.targetPriceUSD && <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-primary" />Target: ${rfq.targetPriceUSD}/kg</span>}
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary" />Closes {new Date(rfq.deadline).toLocaleDateString()}</span>
                          <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">{rfq.incoterm}</span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {!rfq.hasResponded ? (
                          <Button size="sm">Bid Now</Button>
                        ) : (
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        )}
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
