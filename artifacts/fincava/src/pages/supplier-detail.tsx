import { useParams, Link } from "wouter";
import { useGetSupplier } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, MapPin, Globe, Calendar, Star } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { TrustBadge, TrustScoreBar } from "@/components/trust-badge";

export default function SupplierDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const { data: supplier, isLoading } = useGetSupplier(id, {
    query: {
      enabled: !!id,
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-[200px] w-full rounded-xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Skeleton className="h-[400px] rounded-xl" />
          <div className="lg:col-span-3">
            <Skeleton className="h-10 w-1/3 mb-6" />
            <Skeleton className="h-[300px] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Supplier not found</h2>
        <Link href="/suppliers">
          <Button>Back to Suppliers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Header Banner */}
      <div className="bg-primary/5 h-48 md:h-64 border-b relative">
        <div className="container mx-auto px-4 h-full relative">
          <div className="absolute -bottom-16 left-4 md:left-8 w-32 h-32 md:w-40 md:h-40 rounded-xl border-4 border-background bg-card overflow-hidden shadow-md flex items-center justify-center">
            {supplier.logoUrl ? (
              <img src={supplier.logoUrl} alt={supplier.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl md:text-5xl font-bold text-primary">{supplier.name.charAt(0)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center flex-wrap gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-serif font-bold">{supplier.name}</h1>
              {supplier.verified && (
                <Badge className="bg-primary text-primary-foreground border-transparent h-6 text-xs px-2 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </Badge>
              )}
              {(supplier as any).trustScore && (
                <TrustBadge score={Math.round((supplier as any).trustScore)} size="md" showLabel />
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-3">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1.5 text-primary" />
                {supplier.region ? `${supplier.region}, ` : ''}{supplier.country}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1.5 text-primary" />
                Member since {new Date(supplier.memberSince).getFullYear()}
              </div>
              {supplier.avgRating && (
                <div className="flex items-center">
                  <Star className="w-4 h-4 mr-1.5 text-yellow-500 fill-current" />
                  {supplier.avgRating.toFixed(1)} ({supplier.reviews?.length || 0} reviews)
                </div>
              )}
              {supplier.website && (
                <div className="flex items-center">
                  <Globe className="w-4 h-4 mr-1.5 text-primary" />
                  <a href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary">
                    Website
                  </a>
                </div>
              )}
            </div>
          </div>
          
          <Button size="lg" className="md:w-auto w-full">Contact Supplier</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            {(supplier as any).trustScore && (
              <div className="bg-card border rounded-lg p-5">
                <TrustScoreBar score={Math.round((supplier as any).trustScore)} />
                {(supplier as any).responseTimeHours && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                    Avg. response time: <strong>{(supplier as any).responseTimeHours}h</strong>
                  </p>
                )}
              </div>
            )}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-bold text-lg mb-4 font-serif">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {supplier.description}
              </p>
              
              <div className="mt-6 pt-6 border-t space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Company Type</div>
                  <div className="font-medium text-sm">{supplier.type}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Main Categories</div>
                  <div className="flex flex-wrap gap-2">
                    {supplier.productCategories.map((cat, i) => (
                      <Badge key={i} variant="secondary" className="font-normal">{cat}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <Tabs defaultValue="products" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
                <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                  Products ({supplier.products?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="origin" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                  Origin Story
                </TabsTrigger>
                <TabsTrigger value="certifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                  Certifications
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="products">
                {supplier.products && supplier.products.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {supplier.products.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-lg bg-card/50">
                    <p className="text-muted-foreground">No products listed currently.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="origin">
                {supplier.originStory ? (
                  <div className="bg-card border rounded-lg p-8">
                    <div className="max-w-3xl">
                      <h3 className="text-2xl font-serif font-bold mb-6 text-primary">The Story of {supplier.name}</h3>
                      {supplier.farmerName && (
                        <p className="font-medium text-lg mb-4">Led by {supplier.farmerName}</p>
                      )}
                      <div className="prose prose-sm sm:prose-base text-muted-foreground">
                        {supplier.originStory.split('\n\n').map((paragraph, i) => (
                          <p key={i} className="mb-4">{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-lg bg-card/50">
                    <p className="text-muted-foreground">No origin story available.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="certifications">
                {supplier.certificationDetails && supplier.certificationDetails.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {supplier.certificationDetails.map(cert => (
                      <div key={cert.id} className="border rounded-lg p-6 flex items-start">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4 flex-shrink-0">
                          <ShieldCheck className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg mb-1">{cert.type}</h4>
                          <p className="text-sm text-muted-foreground mb-2">Issued by: {cert.issuer}</p>
                          {cert.verified && <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-transparent">Verified by Fincava</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-lg bg-card/50">
                    <p className="text-muted-foreground">No certifications listed.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
