import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@workspace/api-client-react";
import { Star, Leaf, Handshake, Droplets, Users } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const p = product as any;
  const flags = [
    p.smallholder && { label: "Smallholder", icon: Users, color: "bg-amber-50 text-amber-700 border-amber-200" },
    p.directTrade && { label: "Direct Trade", icon: Handshake, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    p.organic && { label: "Organic", icon: Leaf, color: "bg-green-50 text-green-700 border-green-200" },
    p.climateResilient && { label: "Climate-Resilient", icon: Droplets, color: "bg-sky-50 text-sky-700 border-sky-200" },
  ].filter(Boolean) as { label: string; icon: any; color: string }[];

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="h-full overflow-hidden hover-elevate transition-all duration-300 cursor-pointer border-border group flex flex-col">
        <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: "4/3" }}>
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground">No image</div>
          )}
          {product.featured && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">Featured</Badge>
          )}
          {flags.length > 0 && (
            <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
              {flags.slice(0, 2).map(f => (
                <span key={f.label} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border backdrop-blur-sm ${f.color}`}>
                  <f.icon className="w-2.5 h-2.5" />
                  {f.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <CardContent className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{product.category}</span>
            <div className="flex items-center text-sm font-medium">
              <Star className="w-3 h-3 text-yellow-500 mr-1 fill-current" />
              {product.avgRating ? product.avgRating.toFixed(1) : "New"}
            </div>
          </div>
          <h3 className="font-serif font-semibold text-lg line-clamp-1 mb-0.5 group-hover:text-primary transition-colors">{product.name}</h3>
          {p.farmerName ? (
            <p className="text-xs text-muted-foreground mb-2">
              <span className="text-primary font-medium">by {p.farmerName}</span>
              {p.farmName && <span className="text-muted-foreground"> · {p.farmName}</span>}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mb-2">{product.supplierName}</p>
          )}
          {p.familiesSupported && (
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="w-3 h-3 text-primary" />
              Supports {p.familiesSupported} families
            </p>
          )}

          <div className="flex justify-between items-end mt-auto pt-3 border-t border-border">
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
