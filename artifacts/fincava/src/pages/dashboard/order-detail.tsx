import { useParams, Link } from "wouter";
import { useGetBuyerOrder } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Package, MapPin, Truck } from "lucide-react";
import { format } from "date-fns";

export default function BuyerOrderDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const { data: order, isLoading } = useGetBuyerOrder(id, {
    query: {
      enabled: !!id,
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium mb-4">Order not found</p>
        <Link href="/dashboard/orders">
          <Button variant="outline">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Order #{order.id}</h1>
          <p className="text-muted-foreground">Placed on {format(new Date(order.createdAt), 'MMMM dd, yyyy')}</p>
        </div>
        <div className="ml-auto">
          <Badge className="text-sm px-3 py-1" variant="outline">{order.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 border-b last:border-0 pb-4 last:pb-0">
                    <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Link href={`/product/${item.productId}`} className="font-medium hover:text-primary hover:underline">
                        {item.productName}
                      </Link>
                      <div className="flex justify-between items-end mt-2">
                        <div className="text-sm text-muted-foreground">
                          {item.quantityKg} kg &times; ${item.pricePerKg.toFixed(2)}/kg
                        </div>
                        <div className="font-bold">
                          ${item.totalUSD.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {order.messages && order.messages.length > 0 ? (
                <div className="space-y-4">
                  {order.messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.senderId === order.buyerId ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-medium">{msg.senderName}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt), 'MMM dd, HH:mm')}</span>
                      </div>
                      <div className={`p-3 rounded-lg max-w-[80%] text-sm ${msg.senderId === order.buyerId ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4 text-sm">No messages yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${order.totalUSD.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping ({order.incoterm})</span>
                  <span>TBD</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Total (USD)</span>
                  <span>${order.totalUSD.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">Shipping Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Incoterm</p>
                  <p className="text-sm text-muted-foreground">{order.incoterm}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Destination Port</p>
                  <p className="text-sm text-muted-foreground">{order.destinationPort || "Not specified"}</p>
                </div>
              </div>
              {order.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="font-medium text-sm mb-1">Order Notes</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
