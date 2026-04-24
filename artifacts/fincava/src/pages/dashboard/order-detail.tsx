import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetBuyerOrder, getGetBuyerOrderQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Package, MapPin, Truck, CheckCircle2, Circle, Clock, DollarSign, Anchor, Ship, Home, Lock, Unlock } from "lucide-react";
import { format } from "date-fns";

const SHIPMENT_STATUSES = [
  { key: "CREATED", label: "Order Confirmed", icon: CheckCircle2 },
  { key: "EXPORT_CUSTOMS", label: "Export Customs", icon: Anchor },
  { key: "IN_TRANSIT", label: "In Transit", icon: Ship },
  { key: "IMPORT_CUSTOMS", label: "Import Customs", icon: Anchor },
  { key: "DELIVERED", label: "Delivered", icon: Home },
];

const STATUS_ORDER = ["CREATED", "EXPORT_CUSTOMS", "IN_TRANSIT", "IMPORT_CUSTOMS", "DELIVERED"];

function ShipmentTimeline({ shipment }: { shipment: any }) {
  const currentIdx = STATUS_ORDER.indexOf(shipment.status);
  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-muted" />
        <div className="space-y-4">
          {SHIPMENT_STATUSES.map((step, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            const Icon = step.icon;
            return (
              <div key={step.key} className="relative flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 ${
                  done ? "bg-primary border-primary text-white" : "bg-background border-muted text-muted-foreground"
                } ${active ? "ring-4 ring-primary/20" : ""}`}>
                  {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                  {active && shipment.lastUpdate && (
                    <p className="text-xs text-muted-foreground">{format(new Date(shipment.lastUpdate), "MMM dd, yyyy HH:mm")}</p>
                  )}
                </div>
                {active && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Current</Badge>}
              </div>
            );
          })}
        </div>
      </div>

      {shipment.trackingNumber && (
        <div className="mt-4 pt-4 border-t text-sm">
          <span className="text-muted-foreground">Tracking #: </span>
          <span className="font-mono font-medium">{shipment.trackingNumber}</span>
        </div>
      )}
      {shipment.carrierName && (
        <div className="text-sm">
          <span className="text-muted-foreground">Carrier: </span>
          <span className="font-medium">{shipment.carrierName}</span>
        </div>
      )}
      {shipment.eta && (
        <div className="text-sm">
          <span className="text-muted-foreground">Estimated Arrival: </span>
          <span className="font-medium">{format(new Date(shipment.eta), "MMMM dd, yyyy")}</span>
        </div>
      )}
    </div>
  );
}

function PaymentMilestones({ milestones, orderId, totalUSD }: { milestones: any[], orderId: number, totalUSD: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const release = useMutation({
    mutationFn: (milestoneId: number) => fetch(`/api/orders/${orderId}/milestones/${milestoneId}/release`, {
      method: "POST",
      credentials: "include",
    }).then(r => r.json()),
    onSuccess: (res) => {
      if (res.error) { toast({ title: "Error", description: res.error, variant: "destructive" }); return; }
      toast({ title: "Payment released!", description: "Funds sent to supplier." });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
    },
  });

  const released = milestones.filter(m => m.status === "RELEASED");
  const totalReleased = released.reduce((s, m) => s + (m.amountUSD ?? 0), 0);
  const pct = totalUSD > 0 ? Math.round((totalReleased / totalUSD) * 100) : 0;

  const milestoneName: Record<string, string> = {
    DEPOSIT: "Deposit (30%)",
    PRE_SHIPMENT: "Pre-Shipment (40%)",
    ON_DELIVERY: "On Delivery (30%)",
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-muted-foreground">Amount Released</span>
          <span className="font-bold text-primary">${totalReleased.toLocaleString()} / ${totalUSD.toLocaleString()}</span>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">{pct}% paid</p>
      </div>

      <div className="space-y-3 mt-4">
        {milestones.map(m => {
          const done = m.status === "RELEASED";
          return (
            <div key={m.id} className={`border rounded-lg p-3 ${done ? "bg-muted/40 opacity-75" : "bg-card"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{milestoneName[m.milestoneType] ?? m.milestoneType}</p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">${m.amountUSD?.toLocaleString()}</p>
                  {done ? (
                    <p className="text-xs text-primary">Released</p>
                  ) : (
                    <Button size="sm" variant="outline" className="mt-1 h-7 text-xs" onClick={() => release.mutate(m.id)} disabled={release.isPending}>
                      <Unlock className="w-3 h-3 mr-1" />Release
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BuyerOrderDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const { data: order, isLoading } = useGetBuyerOrder(id, {
    query: { enabled: !!id, queryKey: getGetBuyerOrderQueryKey(id) }
  });

  const { data: shipment } = useQuery({
    queryKey: [`/api/orders/${id}/shipment`],
    queryFn: () => fetch(`/api/orders/${id}/shipment`, { credentials: "include" }).then(r => r.json()),
    enabled: !!id,
  });

  const { data: milestones } = useQuery<any[]>({
    queryKey: [`/api/orders/${id}/milestones`],
    queryFn: () => fetch(`/api/orders/${id}/milestones`, { credentials: "include" }).then(r => r.json()),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
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
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item: any) => (
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
                        <div className="font-bold">${item.totalUSD.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shipment Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Shipment Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipment && !shipment.error ? (
                <ShipmentTimeline shipment={shipment} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Ship className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Shipment tracking will appear once the order is confirmed and dispatched.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {order.messages && order.messages.length > 0 ? (
                <div className="space-y-4">
                  {order.messages.map((msg: any) => (
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

        {/* Sidebar */}
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

          {/* Payment Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Payment Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {milestones && Array.isArray(milestones) && milestones.length > 0 ? (
                <PaymentMilestones milestones={milestones} orderId={id} totalUSD={order.totalUSD} />
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Lock className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Payment milestones will appear once the order is confirmed.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Details */}
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
