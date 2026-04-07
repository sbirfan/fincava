import { useState } from "react";
import { useListSuppliers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, ShieldCheck, Star } from "lucide-react";
import { TrustBadge } from "@/components/trust-badge";

export default function Suppliers() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useListSuppliers({
    search: search || undefined,
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Verified Suppliers</h1>
        <p className="text-lg text-muted-foreground">Partner with top-tier Colombian agricultural producers. Every supplier is vetted for quality, capacity, and fair trade practices.</p>
        
        <div className="mt-8 max-w-md mx-auto relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input 
            className="pl-10 h-12 text-base rounded-full bg-background border-border"
            placeholder="Search by company name, region, or product..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-32 bg-muted relative">
                <Skeleton className="absolute -bottom-8 left-6 w-16 h-16 rounded-full" />
              </div>
              <CardContent className="pt-12 pb-6 px-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : data && data.length > 0 ? (
          data.map((supplier) => (
            <Link key={supplier.id} href={`/supplier/${supplier.id}`}>
              <Card className="h-full overflow-hidden hover-elevate transition-all duration-300 cursor-pointer border-border group flex flex-col">
                <div className="h-24 bg-primary/5 relative">
                  <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-full border-4 border-card bg-background overflow-hidden flex items-center justify-center">
                    {supplier.logoUrl ? (
                      <img src={supplier.logoUrl} alt={supplier.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-primary">{supplier.name.charAt(0)}</span>
                    )}
                  </div>
                  {supplier.verified && (
                    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center text-xs font-medium text-primary">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Verified
                    </div>
                  )}
                </div>
                
                <CardContent className="pt-12 pb-6 px-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-serif font-bold text-xl group-hover:text-primary transition-colors line-clamp-1">{supplier.name}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {supplier.avgRating && (
                        <div className="flex items-center text-sm font-medium bg-secondary/10 text-secondary px-2 py-0.5 rounded">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          {supplier.avgRating.toFixed(1)}
                        </div>
                      )}
                      {supplier.trustScore && <TrustBadge score={Math.round(supplier.trustScore)} size="sm" />}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                    {supplier.region ? `${supplier.region}, ` : ''}{supplier.country}
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                    {supplier.description}
                  </p>
                  
                  <div className="space-y-4 border-t pt-4 mt-auto">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-2">Categories</span>
                      <div className="flex flex-wrap gap-1.5">
                        {supplier.productCategories.slice(0, 3).map((cat, idx) => (
                          <Badge key={idx} variant="outline" className="font-normal">{cat}</Badge>
                        ))}
                        {supplier.productCategories.length > 3 && (
                          <Badge variant="outline" className="font-normal text-muted-foreground">+{supplier.productCategories.length - 3}</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{supplier.productCount} Products</span>
                      <span className="text-primary group-hover:underline">View Profile &rarr;</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center py-20 bg-card border rounded-lg border-dashed">
            <p className="text-lg font-medium mb-2">No suppliers found</p>
            <p className="text-muted-foreground mb-4">Try adjusting your search to see more results.</p>
            <Button 
              variant="outline"
              onClick={() => setSearch("")}
            >
              Clear Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
