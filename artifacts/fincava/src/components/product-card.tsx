import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@workspace/api-client-react";
import { Star } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`}>
      <Card className="h-full overflow-hidden hover-elevate transition-all duration-300 cursor-pointer border-border group">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.images && product.images.length > 0 ? (
            <img 
              src={product.images[0]} 
              alt={product.name} 
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground">
              No image
            </div>
          )}
          {product.featured && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
              Featured
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{product.category}</span>
            <div className="flex items-center text-sm font-medium">
              <Star className="w-3 h-3 text-yellow-500 mr-1 fill-current" />
              {product.avgRating ? product.avgRating.toFixed(1) : "New"}
            </div>
          </div>
          <h3 className="font-serif font-semibold text-lg line-clamp-1 mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
          <p className="text-sm text-muted-foreground mb-3">{product.supplierName}</p>
          
          <div className="flex justify-between items-end mt-auto pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Price / kg</p>
              <p className="font-bold text-lg">${product.pricePerKgUSD.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Min. Order</p>
              <p className="font-medium text-sm">{product.minOrderKg} kg</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
