import { useListSupplierOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UpdateOrderStatusBodyStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListSupplierOrdersQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SupplierOrders() {
  const { t } = useLanguage();
  const o = t.supplierDash.orders;
  const { data: orders, isLoading } = useListSupplierOrders();
  const updateStatus = useUpdateOrderStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusChange = (id: number, newStatus: UpdateOrderStatusBodyStatus) => {
    updateStatus.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        toast({ title: o.orderUpdated });
        queryClient.invalidateQueries({ queryKey: getListSupplierOrdersQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">{o.heading}</h1>
        <p className="text-muted-foreground mt-2">{o.description}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
                <div>
                  <CardTitle className="text-lg font-serif">{o.order}{order.id}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {o.buyer}: {order.buyerName} &bull; {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">{o.status}</span>
                  <Select 
                    defaultValue={order.status} 
                    onValueChange={(val) => handleStatusChange(order.id, val as UpdateOrderStatusBodyStatus)}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(UpdateOrderStatusBodyStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-muted/30 p-4 rounded-lg border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{o.totalValue}</p>
                    <p className="font-bold text-lg">${order.totalUSD.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{o.items}</p>
                    <p className="font-medium">{order.itemCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{o.incoterm}</p>
                    <p className="font-medium">{order.incoterm}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{o.destination}</p>
                    <p className="font-medium">{order.destinationPort || o.na}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-xl font-serif font-bold mb-2">{o.emptyHeading}</p>
            <p className="text-muted-foreground">{o.emptyDesc}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
