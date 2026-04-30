import { useGetBuyerStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, MessageSquare, ShoppingCart, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BuyerDashboard() {
  const { data: stats, isLoading } = useGetBuyerStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Buyer Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage your sourcing operations, inquiries, and orders.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/inquiries" className="block group">
          <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Inquiries</CardTitle>
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeInquiries || 0}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/orders" className="block group">
          <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Orders in Progress</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.ordersInProgress || 0}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/orders" className="block group">
          <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Saved Products</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.savedProducts || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif">Recent Inquiries</CardTitle>
            <Link href="/dashboard/inquiries" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {stats?.recentInquiries && stats.recentInquiries.length > 0 ? (
              <div className="space-y-4">
                {stats.recentInquiries.map((inquiry) => (
                  <div key={inquiry.id} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                    <div>
                      <p className="font-medium">{inquiry.productName}</p>
                      <p className="text-sm text-muted-foreground">{inquiry.supplierName}</p>
                    </div>
                    <Badge variant={inquiry.status === 'RESPONDED' ? 'default' : 'secondary'}>
                      {inquiry.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No recent inquiries.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif">Recent Orders</CardTitle>
            <Link href="/dashboard/orders" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-4">
                {stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">Order #{order.id}</p>
                      <p className="font-bold">${order.totalUSD.toLocaleString()}</p>
                    </div>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No recent orders.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
