import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, MapPin, Loader2, MessageSquare, Leaf } from "lucide-react";
import { Product } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface MarketplaceSupplierDetail {
  id: number;
  name: string;
  supplierType: string | null;
  region: string | null;
  department: string | null;
  isExportReady: boolean;
  inquiryCTAEnabled: boolean;
  originStory: {
    farmerName: string;
    story: string;
    imageUrl: string | null;
    location: string;
  } | null;
  certifications: { name: string; issuedBy: string; validUntil: string | null }[];
  products: {
    id: number;
    name: string;
    category: string;
    description: string;
    pricePerKgUSD: number;
    unit: string;
    imageUrl: string | null;
  }[];
}

export default function SupplierDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [profile, setProfile] = useState<MarketplaceSupplierDetail | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setProfileLoading(true);
    fetch(`/api/suppliers/marketplace/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setProfile(data ?? null))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [id]);

  function openInquiry() {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to contact this supplier.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
    setInquiryOpen(true);
  }

  async function submitInquiry() {
    if (!selectedProductId && (profile?.products ?? []).length > 0) {
      toast({ title: "Select a product", description: "Please choose which product you are inquiring about.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Message required", description: "Please write a message to the supplier.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: parseInt(selectedProductId, 10),
          buyerEmail: user?.email ?? "",
          buyerName: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : (user as any)?.email ?? "",
          company: (user as any)?.companyName ?? "Independent Buyer",
          country: (user as any)?.country ?? "Unknown",
          message: message.trim(),
          quantityKg: quantityKg ? parseFloat(quantityKg) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Inquiry sent!", description: "The supplier has been notified and will respond via your dashboard." });
      setInquiryOpen(false);
      setMessage("");
      setQuantityKg("");
      setSelectedProductId("");
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (profileLoading) {
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

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Supplier not found</h2>
        <Link href="/suppliers">
          <Button>Back to Suppliers</Button>
        </Link>
      </div>
    );
  }

  const products = profile.products;
  const isExportReady = profile.isExportReady;
  const heroImage = profile.originStory?.imageUrl ?? null;
  const locationLabel = profile.department
    ? `${profile.region ?? ""}, ${profile.department}`.replace(/^, /, "")
    : (profile.region ?? "Colombia");

  return (
    <div className="pb-12">
      {/* Hero Banner */}
      <div
        className="h-56 md:h-80 border-b relative overflow-hidden bg-primary/10"
        style={
          heroImage
            ? { backgroundImage: `url(${heroImage})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {heroImage && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        )}
      </div>

      <div className="container mx-auto px-4 pt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center flex-wrap gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-serif font-bold">{profile.name}</h1>
              {isExportReady && (
                <Badge className="bg-primary text-primary-foreground border-transparent h-6 text-xs px-2 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Fincava Certified
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-3">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1.5 text-primary" />
                {locationLabel}
              </div>
            </div>
          </div>

          {isExportReady && isAuthenticated && (
            <Button size="lg" className="md:w-auto w-full" onClick={openInquiry}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Inquire About This Supplier
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            {/* Phase 1 teaser card — shown when not yet export-ready */}
            {!isExportReady && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                  Getting Started
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This supplier is preparing for export. Full commercial details will be available once they complete certification.
                </p>
              </div>
            )}

            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h3 className="font-bold text-lg font-serif">Farm Details</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Location</div>
                  <div className="font-medium">{locationLabel}</div>
                </div>
                {profile.supplierType && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Type</div>
                    <div className="font-medium capitalize">{profile.supplierType.toLowerCase().replace(/_/g, " ")}</div>
                  </div>
                )}
                {profile.originStory?.farmerName && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Producer</div>
                    <div className="font-medium">{profile.originStory.farmerName}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <Tabs defaultValue="origin" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
                <TabsTrigger value="origin" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                  Origin Story
                </TabsTrigger>
                {isExportReady && (
                  <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                    Products ({products.length})
                  </TabsTrigger>
                )}
                {isExportReady && profile.certifications.length > 0 && (
                  <TabsTrigger value="certifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                    Certifications
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="origin">
                {profile.originStory ? (
                  <div className="bg-card border rounded-lg overflow-hidden">
                    <div className="p-8">
                      <div className="prose prose-sm sm:prose-base text-muted-foreground max-w-none">
                        {profile.originStory.story.split('\n\n').map((paragraph, i) => (
                          <p key={i} className="mb-4">{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-lg bg-card/50">
                    <div className="max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Leaf className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-medium text-foreground mb-2">Farm story coming soon</p>
                      <p className="text-sm text-muted-foreground">
                        We are working with this farm to document their story. Check back soon.
                      </p>
                    </div>
                  </div>
                )}

                {/* Non-export-ready: contact teaser below origin story */}
                {!isExportReady && (
                  <div className="mt-6 border border-dashed border-primary/30 rounded-lg p-6 bg-primary/5 text-center">
                    <p className="text-sm font-medium text-foreground mb-1">
                      Interested in sourcing from this farm?
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Pricing and order details will be available once this supplier completes Fincava certification.
                      Reach out early to get priority access.
                    </p>
                    <Button size="sm" onClick={openInquiry}>
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                      Get in Touch
                    </Button>
                  </div>
                )}
              </TabsContent>

              {isExportReady && (
                <TabsContent value="products">
                  {products.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {products.map((product) => (
                        <ProductCard key={product.id} product={product as unknown as Product} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border rounded-lg bg-card/50">
                      <p className="text-muted-foreground">No products listed currently.</p>
                    </div>
                  )}
                </TabsContent>
              )}

              {isExportReady && profile.certifications.length > 0 && (
                <TabsContent value="certifications">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {profile.certifications.map((cert, i) => (
                      <div key={i} className="border rounded-lg p-6 flex items-start">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4 flex-shrink-0">
                          <ShieldCheck className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg mb-1">{cert.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">Issued by: {cert.issuedBy}</p>
                          {cert.validUntil && (
                            <p className="text-xs text-muted-foreground">Valid until: {new Date(cert.validUntil).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>

      {/* ── Contact Supplier Dialog ── */}
      <Dialog open={inquiryOpen} onOpenChange={setInquiryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Contact Supplier</DialogTitle>
            <DialogDescription>
              Send an inquiry to <strong>{profile.name}</strong>. They will respond via your Fincava dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {products.length > 0 ? (
              <div>
                <Label htmlFor="product-select">
                  Product <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger id="product-select" className="mt-1">
                    <SelectValue placeholder="Select a product…" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground border rounded p-3 bg-muted/40">
                This supplier has no products listed yet. You can still send a general message.
              </p>
            )}

            <div>
              <Label htmlFor="quantity">Quantity (kg) — optional</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                placeholder="e.g. 500"
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="inquiry-message">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="inquiry-message"
                placeholder="Describe what you're looking for, your requirements, timeline, etc."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setInquiryOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={submitInquiry}
                disabled={submitting || (products.length > 0 && !selectedProductId) || !message.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Inquiry"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
