import { useListBuyerOrders } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export default function BuyerOrders() {
  const { data: orders, isLoading } = useListBuyerOrders();

  const intents = (orders ?? []).filter((o) => o.status === "INQUIRY");
  const confirmed = (orders ?? []).filter((o) => o.status !== "INQUIRY");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Orders & Deal Intentions</h1>
        <p className="text-muted-foreground mt-2">Track your sourcing intentions and confirmed orders.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Pending Coordination section ── */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Pending Coordination</h2>
              <p className="text-sm text-muted-foreground">Fincava team is reviewing and will reach out within 48 hours.</p>
            </div>

            {intents.length > 0 ? (
              intents.map((order) => (
                <Card key={order.id} className="border-amber-200 bg-amber-50/40">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">Intent #{order.id}</h3>
                          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100">
                            Pending Coordination
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Submitted on {format(new Date(order.createdAt), "MMM dd, yyyy")}
                        </p>
                        {order.notes && (
                          <p className="text-sm text-muted-foreground mt-1 max-w-lg truncate">{order.notes}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-lg font-medium mb-2">No active intentions</p>
                  <p className="text-muted-foreground">
                    When you confirm interest in a supplier, it appears here.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* ── Confirmed Orders section ── */}
          {confirmed.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Confirmed Orders</h2>
              </div>
              {confirmed.map((order) => (
                <Card key={order.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">Order #{order.id}</h3>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Placed on {format(new Date(order.createdAt), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:text-right">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Items</p>
                          <p className="font-medium">{order.itemCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Incoterm</p>
                          <p className="font-medium">{order.incoterm}</p>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-xs text-muted-foreground mb-1">Total (USD)</p>
                          <p className="font-bold text-lg">${order.totalUSD.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
