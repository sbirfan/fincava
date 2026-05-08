import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { ShieldCheck, MapPin, Loader2, MessageSquare, ArrowLeft, Clock, FileText, Handshake } from "lucide-react";
import { Product } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { ComplianceBadges } from "@/components/compliance-widget";

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

function formatSupplierType(raw: string): string {
  return raw.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SupplierDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const { lang } = useLanguage();
  const [, setLocation] = useLocation();

  const [profile, setProfile] = useState<MarketplaceSupplierDetail | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [intentOpen, setIntentOpen] = useState(false);
  const [intentSent, setIntentSent] = useState(false);
  const [intentQuantityKg, setIntentQuantityKg] = useState("");
  const [intentNotes, setIntentNotes] = useState("");
  const [intentSubmitting, setIntentSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setProfileLoading(true);
    fetch(`/api/suppliers/marketplace/${id}`, { credentials: "include" })
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

  function openIntent() {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to confirm purchase interest.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
    setIntentOpen(true);
  }

  async function submitIntent() {
    const qty = parseFloat(intentQuantityKg);
    if (!intentQuantityKg || isNaN(qty) || qty <= 0) {
      toast({ title: lang === "es" ? "Cantidad requerida" : "Quantity required", description: lang === "es" ? "Por favor ingresa una cantidad válida en kg." : "Please enter a valid quantity in kg.", variant: "destructive" });
      return;
    }
    setIntentSubmitting(true);
    try {
      const res = await fetch("/api/buyer/intent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: id,
          estimatedQuantityKg: qty,
          notes: intentNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`;
        try {
          const json = await res.json();
          if (typeof json?.error === "string") errMsg = json.error;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }
      setIntentQuantityKg("");
      setIntentNotes("");
      setIntentSent(true);
    } catch (e: any) {
      toast({ title: "Failed to submit", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setIntentSubmitting(false);
    }
  }

  async function submitInquiry() {
    if (!selectedProductId && (profile?.products ?? []).length > 0) {
      toast({ title: lang === "es" ? "Selecciona un producto" : "Select a product", description: lang === "es" ? "Por favor elige el producto sobre el que consultas." : "Please choose which product you are inquiring about.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: lang === "es" ? "Mensaje requerido" : "Message required", description: lang === "es" ? "Por favor escribe un mensaje al proveedor." : "Please write a message to the supplier.", variant: "destructive" });
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
          buyerName: user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : (user as any)?.email ?? "",
          company: (user as any)?.companyName ?? "Independent Buyer",
          country: (user as any)?.country ?? "Unknown",
          message: message.trim(),
          quantityKg: quantityKg ? parseFloat(quantityKg) : null,
        }),
      });
      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`;
        try {
          const json = await res.json();
          if (typeof json?.error === "string") errMsg = json.error;
        } catch {
          // body was not JSON — keep the status-code fallback
        }
        throw new Error(errMsg);
      }
      setMessage("");
      setQuantityKg("");
      setSelectedProductId("");
      setInquirySent(true);
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (profileLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-5 w-48 mb-6 rounded" />
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
          <Button>Back to Supplier Network</Button>
        </Link>
      </div>
    );
  }

  const products = profile.products;
  const isExportReady = profile.isExportReady;
  const heroImage = profile.originStory?.imageUrl ?? null;
  const safeHeroImage =
    heroImage && (/^\//.test(heroImage) || /^https?:\/\//.test(heroImage))
      ? heroImage
      : null;
  const locationLabel = profile.department
    ? `${profile.region ?? ""}, ${profile.department}`.replace(/^, /, "")
    : (profile.region ?? "Colombia");

  const defaultTab = profile.originStory
    ? "origin"
    : isExportReady
    ? "products"
    : "";

  return (
    <div className="pb-12">
      {/* ── Section 6: Back navigation ── */}
      <div className="container mx-auto px-4 pt-6">
        <Link
          href="/suppliers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Supplier Network
        </Link>
      </div>

      {/* ── Hero Banner ── */}
      <div
        className="h-56 md:h-80 border-b relative overflow-hidden bg-primary/10 mt-4"
        style={
          safeHeroImage
            ? { backgroundImage: `url(${safeHeroImage})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {safeHeroImage && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        )}
      </div>

      <div className="container mx-auto px-4 pt-8">
        {/* ── Section 1: Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            {/* Name + badges */}
            <div className="flex items-center flex-wrap gap-2 mb-3">
              <h1 className="text-3xl md:text-4xl font-serif font-bold">{profile.name}</h1>

              {/* Supplier type badge */}
              {profile.supplierType && (
                <Badge variant="outline" className="h-6 text-xs px-2 font-medium">
                  {formatSupplierType(profile.supplierType)}
                </Badge>
              )}

              {/* Export Ready (green) */}
              {isExportReady && (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-transparent h-6 text-xs px-2 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Export Ready
                </Badge>
              )}

              {/* Preparing for Export (amber) */}
              {!isExportReady && (
                <Badge className="bg-amber-50 text-amber-700 border border-amber-200 h-6 text-xs px-2 flex items-center gap-1 hover:bg-amber-50">
                  <Clock className="w-3 h-3" />
                  Preparing for Export
                </Badge>
              )}
            </div>

            {/* Location row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1.5 text-primary" />
                {locationLabel}
              </div>
            </div>
          </div>

          {/* ── Section 5: CTAs (export-ready only) ── */}
          {isExportReady && (
            <div className="flex flex-wrap gap-3">
              {/* Tertiary: Create RFQ */}
              <Link href="/dashboard/rfqs">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <FileText className="w-4 h-4 mr-2" />
                  Create RFQ
                </Button>
              </Link>
              {/* Secondary: Confirm Purchase Interest */}
              <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={openIntent}>
                <Handshake className="w-4 h-4 mr-2" />
                Confirm Purchase Interest
              </Button>
              {/* Primary: Send Inquiry (dialog) */}
              <Button size="lg" className="w-full sm:w-auto" onClick={openInquiry}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Inquiry
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Sidebar ── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Non-export-ready notice — text only, no CTA */}
            {!isExportReady && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                <p className="text-sm text-amber-800 leading-relaxed">
                  This supplier is building export readiness. Check back when they are verified.
                </p>
              </div>
            )}

            {/* CC-1E: compliance badges — hidden when none are verified */}
            <ComplianceBadges supplierId={profile.id} className="flex-wrap" />

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
                    <div className="font-medium">{formatSupplierType(profile.supplierType)}</div>
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

          {/* ── Main Content: Tabs ── */}
          <div className="lg:col-span-9">
            {defaultTab ? (
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
                  {/* ── Section 2: Origin Story tab — only when originStory is non-null ── */}
                  {profile.originStory && (
                    <TabsTrigger
                      value="origin"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Origin Story
                    </TabsTrigger>
                  )}

                  {/* ── Section 4: Products tab — export-ready only ── */}
                  {isExportReady && (
                    <TabsTrigger
                      value="products"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Products ({products.length})
                    </TabsTrigger>
                  )}

                  {/* ── Section 3: Certifications tab ── */}
                  {isExportReady && profile.certifications.length > 0 && (
                    <TabsTrigger
                      value="certifications"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Certifications
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Origin Story content — farmerName + location attribution + story text */}
                {profile.originStory && (
                  <TabsContent value="origin">
                    <div className="bg-card border rounded-lg overflow-hidden">
                      {/* Attribution header */}
                      <div className="px-8 pt-7 pb-5 border-b bg-muted/30">
                        <p className="font-serif font-semibold text-lg leading-tight">
                          {profile.originStory.farmerName}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          {profile.originStory.location}
                        </p>
                      </div>
                      {/* Story paragraphs */}
                      <div className="p-8">
                        <div className="prose prose-sm sm:prose-base text-muted-foreground max-w-none">
                          {profile.originStory.story.split("\n\n").map((paragraph, i) => (
                            <p key={i} className="mb-4 last:mb-0">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}

                {/* Products content */}
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

                {/* Certifications content — Card/CardContent per spec */}
                {isExportReady && profile.certifications.length > 0 && (
                  <TabsContent value="certifications">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {profile.certifications.map((cert, i) => (
                        <Card key={i}>
                          <CardContent className="p-6 flex items-start gap-4">
                            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <ShieldCheck className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-base mb-1 truncate">{cert.name}</h4>
                              <p className="text-sm text-muted-foreground">Issued by: {cert.issuedBy}</p>
                              {cert.validUntil && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Valid until: {new Date(cert.validUntil).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            ) : (
              /* Edge case: no origin story, not export-ready → no tabs to show */
              <div className="text-center py-16 border rounded-lg bg-card/50">
                <p className="text-muted-foreground text-sm">
                  Supplier information will be available once they complete onboarding.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirm Purchase Interest Dialog ── */}
      <Dialog open={intentOpen} onOpenChange={(open) => { setIntentOpen(open); if (!open) setIntentSent(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Confirm Purchase Interest</DialogTitle>
            {!intentSent && (
              <DialogDescription>
                Express structured purchase intent for <strong>{profile.name}</strong>. The Fincava team will coordinate next steps within 48 hours.
              </DialogDescription>
            )}
          </DialogHeader>

          {intentSent ? (
            <div className="flex flex-col items-center text-center gap-4 py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold mb-1">Your interest has been confirmed.</p>
                <p className="text-sm text-muted-foreground">The Fincava team will reach out within 48 hours to coordinate next steps.</p>
              </div>
              <Button variant="outline" className="mt-2" onClick={() => { setIntentOpen(false); setIntentSent(false); }}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Supplier</Label>
                <div className="mt-1 px-3 py-2 rounded-md border bg-muted/50 text-sm font-medium text-muted-foreground">
                  {profile.name}
                </div>
              </div>

              <div>
                <Label htmlFor="intent-quantity">
                  Estimated Quantity (kg) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="intent-quantity"
                  type="number"
                  min={1}
                  placeholder="e.g. 2000"
                  value={intentQuantityKg}
                  onChange={(e) => setIntentQuantityKg(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="intent-notes">Notes — optional</Label>
                <Textarea
                  id="intent-notes"
                  placeholder="Desired delivery timeline, quality grade, incoterm preference, etc."
                  value={intentNotes}
                  onChange={(e) => setIntentNotes(e.target.value)}
                  className="mt-1 min-h-[90px]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIntentOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={submitIntent}
                  disabled={intentSubmitting || (() => { const n = Number(intentQuantityKg); return !Number.isFinite(n) || n <= 0; })()}
                >
                  {intentSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Confirm Interest"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Contact Supplier Dialog ── */}
      <Dialog open={inquiryOpen} onOpenChange={(open) => { setInquiryOpen(open); if (!open) setInquirySent(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Send Inquiry</DialogTitle>
            {!inquirySent && (
              <DialogDescription>
                Send an inquiry to <strong>{profile.name}</strong>. They will respond via your Fincava dashboard.
              </DialogDescription>
            )}
          </DialogHeader>

          {inquirySent ? (
            <div className="flex flex-col items-center text-center gap-4 py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold mb-1">Inquiry sent.</p>
                <p className="text-sm text-muted-foreground">You will hear from the supplier within 2–3 business days.</p>
              </div>
              <Button variant="outline" className="mt-2" onClick={() => { setInquiryOpen(false); setInquirySent(false); }}>
                Close
              </Button>
            </div>
          ) : (
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
