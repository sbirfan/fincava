import { useParams, Link, useLocation } from "wouter";
import NotFound from "./not-found";
import { useState } from "react";
import { ENABLE_TRANSACTIONS } from "@/lib/flags";
import { useGetProduct, useGetSimilarProducts, getGetProductQueryKey, getGetSimilarProductsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Star, ShieldCheck, MapPin, ChevronRight, Users, Handshake, Leaf, Droplets, Mountain, Calendar, ArrowRight, Package, Loader2 } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { resolveImageUrl, safeImageUrl } from "@/lib/utils";
import { ComplianceBadges } from "@/components/compliance-widget";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ProductDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const pd = t.productDetail;

  const [orderOpen, setOrderOpen] = useState(false);
  const [qty, setQty] = useState("");
  const [incoterm, setIncoterm] = useState("FOB");
  const [destPort, setDestPort] = useState("");
  const [shipMethod, setShipMethod] = useState("Sea Freight");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryQty, setInquiryQty] = useState("");
  const [inquirySubmitting, setInquirySubmitting] = useState(false);

  async function handlePlaceOrder() {
    const qtyNum = parseFloat(qty);
    if (!qtyNum || qtyNum <= 0) {
      toast({ title: "Invalid quantity", description: "Please enter a valid quantity in kg.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/buyer/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incoterm,
          destinationPort: destPort || null,
          shippingMethod: shipMethod || null,
          notes: notes || null,
          items: [{ productId: id, quantityKg: qtyNum }],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Order placed!", description: "Your order has been submitted and is pending supplier confirmation." });
      setOrderOpen(false);
      setLocation("/dashboard/orders");
    } catch (e: any) {
      toast({ title: "Order failed", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function openOrderDialog() {
    if (!isAuthenticated) {
      toast({ title: "Login required", description: "Please log in to place an order.", variant: "destructive" });
      setLocation("/login");
      return;
    }
    if (user?.role !== "BUYER") {
      toast({ title: "Buyers only", description: "Only registered buyers can place orders.", variant: "destructive" });
      return;
    }
    setOrderOpen(true);
  }

  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: getGetProductQueryKey(id) }
  });

  const { data: similarProducts } = useGetSimilarProducts(id, {
    query: { enabled: !!id, queryKey: getGetSimilarProductsQueryKey(id) }
  });

  if (!Number.isFinite(id) || id <= 0) return <NotFound />;

  const p = product as any;

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
        <h2 className="text-2xl font-bold mb-4">{pd.notFound}</h2>
        <Link href="/marketplace">
          <Button>{pd.backToMarketplace}</Button>
        </Link>
      </div>
    );
  }

  const story = p.story;
  const impactFlags = [
    p.smallholder && { label: "Smallholder Farm", icon: Users, color: "bg-amber-50 text-amber-700 border-amber-200" },
    p.directTrade && { label: "Direct Trade", icon: Handshake, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    p.organic && { label: "Certified Organic", icon: Leaf, color: "bg-green-50 text-green-700 border-green-200" },
    p.climateResilient && { label: "Climate-Resilient", icon: Droplets, color: "bg-sky-50 text-sky-700 border-sky-200" },
  ].filter(Boolean) as { label: string; icon: any; color: string }[];

  function handleInquiry() {
    if (!isAuthenticated) {
      toast({ title: "Login required", description: "Please log in to send an inquiry.", variant: "destructive" });
      setLocation("/login");
      return;
    }
    setInquiryOpen(true);
  }

  async function submitInquiry() {
    if (!inquiryMessage.trim()) {
      toast({ title: "Message required", description: "Please write a message to the supplier.", variant: "destructive" });
      return;
    }
    setInquirySubmitting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: id,
          buyerEmail: user?.email ?? "",
          buyerName: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : (user as any)?.email ?? "",
          company: (user as any)?.companyName ?? "Independent Buyer",
          country: (user as any)?.country ?? "Unknown",
          message: inquiryMessage.trim(),
          quantityKg: inquiryQty ? parseFloat(inquiryQty) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: pd.inquirySent, description: pd.inquirySentDesc });
      setInquiryOpen(false);
      setInquiryMessage("");
      setInquiryQty("");
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setInquirySubmitting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-muted-foreground mb-8">
        <Link href="/marketplace" className="hover:text-primary">{pd.backToMarketplace}</Link>
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
              <img src={resolveImageUrl(product.images[0])} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image available</div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.slice(1).map((img: string, idx: number) => (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity">
                  <img src={resolveImageUrl(img)} alt={`${product.name} ${idx+1}`} className="w-full h-full object-cover" />
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

            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">{product.name}</h1>

            {/* Farmer Identity */}
            {story ? (
              <div className="flex items-center gap-3 mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                {safeImageUrl(story.farmerPhoto) && (
                  <img src={safeImageUrl(story.farmerPhoto)} alt={story.farmerName} className="w-10 h-10 rounded-full object-cover object-top border-2 border-primary/20 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{story.farmerName}</p>
                  <p className="text-xs text-muted-foreground truncate">{story.farmName} · {story.region}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4 mb-4 pb-4 border-b">
                <Link href={`/supplier/${product.companyId}`} className="flex items-center text-sm font-medium hover:text-primary group">
                  <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
                  <span className="group-hover:underline">{product.supplierName}</span>
                  {product.supplierVerified && (
                    <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0 h-4">Verified</Badge>
                  )}
                </Link>
              </div>
            )}

            {/* Impact badges */}
            {impactFlags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {impactFlags.map(f => (
                  <span key={f.label} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${f.color}`}>
                    <f.icon className="w-3 h-3" />
                    {f.label}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center mb-6 pb-6 border-b">
              <div className="flex items-center text-sm">
                <Star className="w-4 h-4 text-yellow-500 mr-1 fill-current" />
                <span className="font-medium">{product.avgRating?.toFixed(1) || "New"}</span>
                <span className="text-muted-foreground ml-1">({product.reviewCount} reviews)</span>
              </div>
              {p.familiesSupported && (
                <span className="ml-4 text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3 text-primary" /> Supports {p.familiesSupported} families
                </span>
              )}
            </div>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline mb-2">
                {product.pricePerKgUSD > 0 ? (
                  <span className="text-4xl font-bold">${product.pricePerKgUSD.toFixed(2)}</span>
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">Price on request</span>
                )}
                <span className="text-muted-foreground ml-2">/ {pd.kg} (USD)</span>
              </div>
              {product.pricePerKgUSD > 0 && p.directTrade && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <Handshake className="w-3 h-3" />
                  Direct trade price — 40–70% above commodity market paid to farmer
                </p>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-8 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{pd.minOrder}</span>
                <span className="font-medium">{product.minOrderKg} {pd.kg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{pd.available}</span>
                <span className="font-medium">{product.availableKg} {pd.kg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{pd.origin}</span>
                <span className="font-medium flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {product.origin}
                </span>
              </div>
              {story?.elevation && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{pd.altitude}</span>
                  <span className="font-medium flex items-center">
                    <Mountain className="w-3 h-3 mr-1" />{story.elevation}
                  </span>
                </div>
              )}
            </div>

            {ENABLE_TRANSACTIONS && (
              <Button className="w-full h-12 text-lg mb-3" onClick={openOrderDialog}>
                <Package className="w-5 h-5 mr-2" />
                {pd.addToCart}
              </Button>
            )}
            <Button variant="outline" className="w-full h-11 mb-4" onClick={handleInquiry}>
              {pd.inquire}
            </Button>
            {ENABLE_TRANSACTIONS && (
              <p className="text-center text-xs text-muted-foreground flex items-center justify-center">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Fincava Trade Assurance protects your orders
              </p>
            )}
          </div>
        </div>
      </div>

      {/* MEET THE FARMER */}
      {story && (
        <div className="mb-16 rounded-2xl overflow-hidden border bg-card">
          <div className="grid grid-cols-1 lg:grid-cols-5">
            <div className="lg:col-span-2 relative min-h-[300px] bg-muted">
              {safeImageUrl(story.farmerPhoto) ? (
                <img src={safeImageUrl(story.farmerPhoto)} alt={story.farmerName} className="w-full h-full object-cover object-top absolute inset-0" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">No photo</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 text-white">
                <h3 className="text-2xl font-serif font-bold">{story.farmerName}</h3>
                <p className="text-white/80 text-sm mt-1">{story.farmName}</p>
                <p className="text-white/60 text-xs mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {story.region}
                </p>
              </div>
            </div>

            <div className="lg:col-span-3 p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">{pd.aboutFarmer}</p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {story.yearsFarming && (
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-xl font-bold text-primary">{story.yearsFarming}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Years farming</div>
                  </div>
                )}
                {story.farmSizeHa && (
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-xl font-bold text-primary">{story.farmSizeHa} ha</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Farm size</div>
                  </div>
                )}
                {story.elevation && (
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-xl font-bold text-primary leading-tight">{story.elevation.split(" ")[0]}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Altitude</div>
                  </div>
                )}
              </div>

              <p className="text-muted-foreground leading-relaxed text-sm">{story.story}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 border-t divide-y md:divide-y-0 md:divide-x">
            <div className="p-8">
              <h4 className="font-serif font-bold text-lg mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-bold">!</span>
                The Challenge
              </h4>
              <p className="text-muted-foreground text-sm leading-relaxed">{story.challenges}</p>
            </div>
            <div className="p-8 bg-primary/3">
              <h4 className="font-serif font-bold text-lg mb-3 flex items-center gap-2 text-primary">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">✓</span>
                Your Impact
              </h4>
              <p className="text-muted-foreground text-sm leading-relaxed">{story.impact}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-24">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-8">
            <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              {pd.productDetails}
            </TabsTrigger>
            <TabsTrigger value="certifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              {pd.certifications}
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
                  <span className="text-muted-foreground">{pd.altitude}</span>
                  <span className="font-medium">{product.altitude}</span>
                </div>
              )}
              {product.process && (
                <div className="flex justify-between py-3 border-b">
                  <span className="text-muted-foreground">{pd.process}</span>
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
                  <span className="text-muted-foreground">{pd.harvest}</span>
                  <span className="font-medium">{product.harvestSeason}</span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="certifications">
            {product.supplierCertifications && product.supplierCertifications.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {product.supplierCertifications.map((cert: any) => (
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
                {safeImageUrl(product.supplierLogoUrl) ? (
                  <img src={safeImageUrl(product.supplierLogoUrl)} alt={product.supplierName} className="w-16 h-16 rounded-full object-cover border" />
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
              {p.supplierId && (
                <div className="mb-6">
                  <ComplianceBadges supplierId={p.supplierId} className="flex-wrap" />
                </div>
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
            {similarProducts.slice(0, 4).map((prod: any) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>
      )}

      {/* Place Order Dialog */}
      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Place Order</DialogTitle>
            <DialogDescription>
              {product && (product.pricePerKgUSD > 0 ? `${product.name} · $${product.pricePerKgUSD.toFixed(2)} / kg` : product.name)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="qty">{pd.quantityKg} <span className="text-destructive">*</span></Label>
              <Input
                id="qty"
                type="number"
                min={product?.minOrderKg ?? 1}
                placeholder={`Min. ${product?.minOrderKg ?? 100} kg`}
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="mt-1"
              />
              {qty && product && (
                <p className="text-sm text-primary font-medium mt-1">
                  {product.pricePerKgUSD > 0
                    ? `Total: $${(parseFloat(qty) * product.pricePerKgUSD).toFixed(2)} USD`
                    : "Pricing to be confirmed — submit inquiry to discuss terms"}
                </p>
              )}
            </div>

            <div>
              <Label>Incoterm</Label>
              <Select value={incoterm} onValueChange={setIncoterm}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["FOB", "CIF", "CFR", "EXW", "DDP"].map(term => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="port">Destination Port</Label>
              <Input
                id="port"
                placeholder="e.g. Dubai, Jebel Ali, Singapore"
                value={destPort}
                onChange={e => setDestPort(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Shipping Method</Label>
              <Select value={shipMethod} onValueChange={setShipMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Sea Freight", "Air Freight", "Road Freight", "Multimodal"].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Certifications required, packaging preferences, delivery window..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="mt-1 h-20"
              />
            </div>

            <Button className="w-full h-11" onClick={handlePlaceOrder} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Confirm Order"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Your order will be reviewed by the supplier before confirmation.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Quote / Inquiry Dialog */}
      <Dialog open={inquiryOpen} onOpenChange={setInquiryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{pd.inquiryForm}</DialogTitle>
            <DialogDescription>
              {product && (product.pricePerKgUSD > 0 ? `${product.name} · $${product.pricePerKgUSD.toFixed(2)} / kg` : product.name)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="inquiry-qty">{pd.quantityKg} — optional</Label>
              <Input
                id="inquiry-qty"
                type="number"
                min={1}
                placeholder={`e.g. ${product?.minOrderKg ?? 100} kg`}
                value={inquiryQty}
                onChange={(e) => setInquiryQty(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="inquiry-msg">
                {pd.yourMessage} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="inquiry-msg"
                placeholder={pd.messagePlaceholder}
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                className="mt-1 min-h-[100px]"
              />
            </div>

            <Button className="w-full h-11" onClick={submitInquiry} disabled={inquirySubmitting || !inquiryMessage.trim()}>
              {inquirySubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</> : pd.sendInquiry}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              The supplier will be notified and can respond in your dashboard.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
