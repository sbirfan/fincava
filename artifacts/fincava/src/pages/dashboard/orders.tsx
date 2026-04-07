import { useListBuyerOrders } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { format } from "date-fns";

export default function BuyerOrders() {
  const { data: orders, isLoading } = useListBuyerOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">My Orders</h1>
        <p className="text-muted-foreground mt-2">Track and manage your agricultural sourcing orders.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer mb-4">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">Order #{order.id}</h3>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Placed on {format(new Date(order.createdAt), 'MMM dd, yyyy')}</p>
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
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium mb-2">No orders yet</p>
            <p className="text-muted-foreground">You haven't placed any orders yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
