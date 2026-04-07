import { useParams, Link } from "wouter";
import { useGetProduct, useGetSimilarProducts } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, ShieldCheck, MapPin, Truck, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";

export default function ProductDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const { data: product, isLoading } = useGetProduct(id, {
    query: {
      enabled: !!id,
    }
  });

  const { data: similarProducts, isLoading: isSimilarLoading } = useGetSimilarProducts(id, {
    query: {
      enabled: !!id,
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Product not found</h2>
        <Link href="/marketplace">
          <Button>Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-muted-foreground mb-8">
        <Link href="/marketplace" className="hover:text-primary">Marketplace</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="capitalize">{product.category}</span>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-foreground font-medium truncate">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
        {/* Images */}
        <div className="lg:col-span-6 xl:col-span-7">
          <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-4 border">
            {product.images && product.images.length > 0 ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image available</div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.slice(1).map((img, idx) => (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity">
                  <img src={img} alt={`${product.name} ${idx+1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info & CTA */}
        <div className="lg:col-span-6 xl:col-span-5">
          <div className="sticky top-24">
            <div className="flex justify-between items-start mb-4">
              <Badge variant="outline" className="uppercase tracking-wide">{product.category}</Badge>
              {product.featured && <Badge className="bg-primary text-primary-foreground">Featured</Badge>}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">{product.name}</h1>
            
            <div className="flex items-center space-x-6 mb-6 pb-6 border-b">
              <Link href={`/supplier/${product.companyId}`} className="flex items-center text-sm font-medium hover:text-primary group">
                <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
                <span className="group-hover:underline">{product.supplierName}</span>
                {product.supplierVerified && (
                  <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0 h-4">Verified</Badge>
                )}
              </Link>
              <div className="flex items-center text-sm">
                <Star className="w-4 h-4 text-yellow-500 mr-1 fill-current" />
                <span className="font-medium">{product.avgRating?.toFixed(1) || "New"}</span>
                <span className="text-muted-foreground ml-1">({product.reviewCount} reviews)</span>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-bold">${product.pricePerKgUSD.toFixed(2)}</span>
                <span className="text-muted-foreground ml-2">/ kg (USD)</span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-8 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min. Order</span>
                <span className="font-medium">{product.minOrderKg} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available</span>
                <span className="font-medium">{product.availableKg} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Origin</span>
                <span className="font-medium flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {product.origin}
                </span>
              </div>
            </div>

            <Button className="w-full h-12 text-lg mb-4">Request Quote / Inquiry</Button>
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Fincava Trade Assurance protects your orders
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-24">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-8">
            <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              Product Details
            </TabsTrigger>
            <TabsTrigger value="certifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              Certifications
            </TabsTrigger>
            <TabsTrigger value="supplier" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              About Supplier
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-8">
            <div>
              <h3 className="text-xl font-serif font-bold mb-4">Description</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {product.altitude && (
                <div className="flex justify-between py-3 border-b">
                  <span className="text-muted-foreground">Altitude</span>
                  <span className="font-medium">{product.altitude}</span>
                </div>
              )}
              {product.process && (
                <div className="flex justify-between py-3 border-b">
                  <span className="text-muted-foreground">Process</span>
                  <span className="font-medium">{product.process}</span>
                </div>
              )}
              {product.variety && (
                <div className="flex justify-between py-3 border-b">
                  <span className="text-muted-foreground">Variety</span>
                  <span className="font-medium">{product.variety}</span>
                </div>
              )}
              {product.cupping && (
                <div className="flex justify-between py-3 border-b">
                  <span className="text-muted-foreground">Cupping Score</span>
                  <span className="font-medium">{product.cupping} / 100</span>
                </div>
              )}
              {product.harvestSeason && (
                <div className="flex justify-between py-3 border-b">
                  <span className="text-muted-foreground">Harvest Season</span>
                  <span className="font-medium">{product.harvestSeason}</span>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="certifications">
            {product.supplierCertifications && product.supplierCertifications.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {product.supplierCertifications.map(cert => (
                  <div key={cert.id} className="border rounded-lg p-6 flex flex-col items-center text-center">
                    <ShieldCheck className="w-10 h-10 text-primary mb-4" />
                    <h4 className="font-bold mb-1">{cert.type}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{cert.issuer}</p>
                    {cert.verified && <Badge variant="secondary">Verified by Fincava</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                No certifications listed for this product.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="supplier">
            <div className="border rounded-lg p-8">
              <div className="flex items-center gap-4 mb-6">
                {product.supplierLogoUrl ? (
                  <img src={product.supplierLogoUrl} alt={product.supplierName} className="w-16 h-16 rounded-full object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {product.supplierName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-serif font-bold">{product.supplierName}</h3>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3 mr-1" /> {product.supplierCountry || "Colombia"}
                    {product.supplierMemberSince && <span className="ml-4">&middot; Member since {new Date(product.supplierMemberSince).getFullYear()}</span>}
                  </div>
                </div>
              </div>
              {product.supplierDescription && (
                <p className="text-muted-foreground mb-6">{product.supplierDescription}</p>
              )}
              <Link href={`/supplier/${product.companyId}`}>
                <Button variant="outline">View Full Supplier Profile</Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Similar Products */}
      {similarProducts && similarProducts.length > 0 && (
        <div className="border-t pt-16">
          <h2 className="text-2xl font-serif font-bold mb-8">Similar Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {similarProducts.slice(0, 4).map(prod => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
