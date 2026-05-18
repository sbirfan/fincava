import { useListMyProducts, useDeleteProduct } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PlusCircle, Edit, Trash2, Package, ImageOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListMyProductsQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SupplierProducts() {
  const { t } = useLanguage();
  const p = t.supplierDash.products;
  const { data: products, isLoading } = useListMyProducts();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteProduct.mutate({ id }, {
        onSuccess: () => {
          toast({ title: p.productDeleted });
          queryClient.invalidateQueries({ queryKey: getListMyProductsQueryKey() });
        },
        onError: () => {
          toast({ title: p.deleteFailed, variant: "destructive" });
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">{p.heading}</h1>
          <p className="text-muted-foreground mt-2">{p.description}</p>
        </div>
        <Link href="/supplier-dashboard/products/new">
          <Button>
            <PlusCircle className="w-4 h-4 mr-2" />
            {p.addProduct}
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden flex flex-col">
              <div className="aspect-video bg-muted relative">
                {product.images && product.images[0] ? (
                  <img
                    src={product.images[0].startsWith("/objects/") ? `/api/storage${product.images[0]}` : product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <ImageOff className="w-8 h-8 opacity-40" />
                    <span className="text-xs">{p.noImage}</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <Badge variant={product.active ? "default" : "secondary"}>
                    {product.active ? p.active : p.inactive}
                  </Badge>
                  <Badge variant="outline" className="bg-background/80 backdrop-blur text-xs">
                    {product.category}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1 truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.description}</p>
                <div className="mt-auto grid grid-cols-2 gap-4 text-sm border-t pt-4">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">{p.priceKg}</p>
                    <p className="font-bold">${product.pricePerKgUSD.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">{p.available}</p>
                    <p className="font-medium">{product.availableKg} kg</p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="px-4 pb-4 pt-0 flex gap-2">
                <Link href={`/supplier-dashboard/products/${product.id}/edit`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="w-3.5 h-3.5 mr-1.5" />
                    {p.edit}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={deleteProduct.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {p.delete}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-xl font-serif font-bold mb-2">{p.emptyHeading}</p>
            <p className="text-muted-foreground mb-6 max-w-md">{p.emptyDesc}</p>
            <Link href="/supplier-dashboard/products/new">
              <Button>
                <PlusCircle className="w-4 h-4 mr-2" />
                {p.addFirst}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
