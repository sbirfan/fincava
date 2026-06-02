import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Leaf, ShieldCheck, Users, MapPin, Loader2, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RetailProductDetail {
  id: number;
  name: string;
  category: string;
  retailPriceCop: number | null;
  retailStockUnits: number | null;
  retailUnitLabel: string | null;
  retailUnitWeightG: number | null;
  retailMaxPerOrder: number | null;
  images: string[];
  certifications: string[];
  organic: boolean;
  womenLed: boolean;
  stockState: "IN_STOCK" | "HARVEST_WAIT";
  nextWindowStart: string | null;
  nextWindowEnd: string | null;
  supplier: { id: number; name: string; municipio: string; department: string };
  originStory: {
    farmerName: string; farmerPhoto: string | null; farmName: string; region: string;
    story: string; farmerVoiceEs: string | null; farmerVoiceEn: string | null;
    buyerCopyEs: string | null; buyerCopyEn: string | null; farmerApprovedAt: string | null;
  } | null;
  verificationSignal: { visitedAt: string; officerName: string } | null;
  complianceBadges: { requirementCode: string; badgeLabel: string | null }[];
  waitlistCount: number;
}

interface ShippingEstimate { rateCents: number; currency: string; estimated: boolean }

const DEPARTMENTS = [
  "Antioquia", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas",
  "Caquetá", "Casanare", "Cauca", "Cesar", "Córdoba", "Cundinamarca",
  "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander",
  "Putumayo", "Quindío", "Risaralda", "San Andrés", "Santander", "Sucre",
  "Tolima", "Valle del Cauca", "Vaupés", "Vichada",
];

function formatCOP(cents: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(cents / 100);
}

export default function TiendaProducto() {
  const { t, lang } = useLanguage();
  const ti = t.tienda;
  const [, params] = useRoute("/tienda/producto/:id");
  const id = params?.id;

  const [dept, setDept] = useState("");
  const [qty, setQty] = useState(1);

  const { data: res, isLoading, isError } = useQuery<{ data: RetailProductDetail }>({
    queryKey: ["tienda", "product", id],
    queryFn: async () => {
      const r = await fetch(`/api/retail/products/${id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    enabled: !!id,
  });

  const { data: shippingRes } = useQuery<{ data: ShippingEstimate }>({
    queryKey: ["tienda", "shipping", id, dept],
    queryFn: async () => {
      const r = await fetch(`/api/retail/products/${id}/shipping-estimate?department=${encodeURIComponent(dept)}&weightClass=SMALL`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    enabled: !!id && !!dept,
  });

  const p = res?.data;
  const shipping = shippingRes?.data;

  const farmerVoice = lang === "es" ? p?.originStory?.farmerVoiceEs : (p?.originStory?.farmerVoiceEn ?? p?.originStory?.farmerVoiceEs);
  const buyerCopy = lang === "es" ? p?.originStory?.buyerCopyEs : (p?.originStory?.buyerCopyEn ?? p?.originStory?.buyerCopyEs);

  if (isLoading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="h-6 w-6 text-primary animate-spin" />
    </div>
  );

  if (isError || !p) return (
    <div className="container mx-auto px-4 py-16 text-center space-y-3">
      <p className="text-muted-foreground">{ti.notFound}</p>
      <Link href="/tienda">
        <span className="text-primary text-sm hover:underline cursor-pointer">← {ti.navBack}</span>
      </Link>
    </div>
  );

  const mainImage = p.images?.[0] ?? null;
  const inStock = p.stockState === "IN_STOCK";
  const totalCents = (p.retailPriceCop ?? 0) * qty + (shipping?.rateCents ?? 0);
  const visitLocale = lang === "es" ? "es-CO" : "en-GB";
  const visitDateStr = p.verificationSignal
    ? new Date(p.verificationSignal.visitedAt).toLocaleDateString(visitLocale, { day: "numeric", month: "long", year: "numeric" })
    : null;
  const nextWindowStr = p.nextWindowStart
    ? new Date(p.nextWindowStart).toLocaleDateString(visitLocale, { month: "long", year: "numeric" })
    : null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Back link */}
      <Link href="/tienda">
        <span className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors cursor-pointer w-fit">
          <ArrowLeft className="h-4 w-4" /> {ti.navBack}
        </span>
      </Link>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Left — image + story */}
        <div className="space-y-6">
          <div className="rounded-xl overflow-hidden aspect-square bg-muted border border-border">
            {mainImage
              ? <img src={mainImage} alt={p.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Leaf className="h-16 w-16 text-muted-foreground/30" /></div>
            }
          </div>

          {p.originStory && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                {p.originStory.farmerPhoto && (
                  <img src={p.originStory.farmerPhoto} alt={p.originStory.farmerName} className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" />
                )}
                <div>
                  <p className="font-semibold text-foreground">{p.originStory.farmerName}</p>
                  <p className="text-muted-foreground text-sm">{p.originStory.farmName} · {p.originStory.region}</p>
                </div>
              </div>
              {(farmerVoice || p.originStory.story) && (
                <blockquote className="border-l-2 border-primary/40 pl-4 text-muted-foreground text-sm italic leading-relaxed">
                  "{farmerVoice ?? p.originStory.story}"
                </blockquote>
              )}
              {buyerCopy && (
                <p className="text-muted-foreground text-sm leading-relaxed">{buyerCopy}</p>
              )}
            </div>
          )}
        </div>

        {/* Right — purchase panel */}
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {ti.categories[p.category as keyof typeof ti.categories] ?? p.category}
            </p>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mt-1">{p.name}</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> {p.supplier.municipio}, {p.supplier.department}
            </p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {p.organic && (
              <Badge variant="outline" className="gap-1 border-emerald-200 text-emerald-700 bg-emerald-50">
                <Leaf className="h-3 w-3" /> {ti.organic}
              </Badge>
            )}
            {p.womenLed && (
              <Badge variant="outline" className="gap-1 border-violet-200 text-violet-700 bg-violet-50">
                <Users className="h-3 w-3" /> {ti.womenLed}
              </Badge>
            )}
            {p.complianceBadges.map(b => (
              <Badge key={b.requirementCode} variant="outline" className="gap-1 border-sky-200 text-sky-700 bg-sky-50">
                <ShieldCheck className="h-3 w-3" /> {b.badgeLabel ?? b.requirementCode}
              </Badge>
            ))}
          </div>

          {/* Verification signal */}
          {p.verificationSignal && visitDateStr && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-lg px-3 py-2 bg-muted/50">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              {ti.verifiedVisit} {visitDateStr}
            </div>
          )}

          {/* Out of stock notice */}
          {!inStock && (
            <div className="flex items-center gap-2 text-sm text-amber-700 border border-amber-200 rounded-lg px-3 py-2 bg-amber-50">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                {ti.outOfStock}{" "}
                {nextWindowStr ? `${ti.nextHarvest} ${nextWindowStr}.` : ti.joinWaitlistFallback}
                {p.waitlistCount > 0 && ` ${p.waitlistCount} ${ti.peopleWaiting}`}
              </span>
            </div>
          )}

          {/* Price */}
          {p.retailPriceCop && (
            <div>
              <p className="text-3xl font-bold text-primary">{formatCOP(p.retailPriceCop)}</p>
              {p.retailUnitLabel && (
                <p className="text-muted-foreground text-sm">
                  {lang === "es" ? "por" : "per"} {p.retailUnitLabel}
                  {p.retailUnitWeightG ? ` (${p.retailUnitWeightG}g)` : ""}
                </p>
              )}
            </div>
          )}

          {/* Quantity */}
          {inStock && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{ti.quantity}</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-lg">−</button>
                <span className="text-foreground font-semibold w-8 text-center">{qty}</span>
                <button onClick={() => setQty(q => Math.min(p.retailMaxPerOrder ?? 10, q + 1))} className="w-9 h-9 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-lg">+</button>
                {p.retailStockUnits && <span className="text-muted-foreground text-xs ml-1">{p.retailStockUnits} {lang === "es" ? "disponibles" : "available"}</span>}
              </div>
            </div>
          )}

          {/* Shipping estimate */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{ti.shippingEstimate}</label>
            <select
              value={dept}
              onChange={e => setDept(e.target.value)}
              className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{ti.selectDept}</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {shipping && (
              <p className="text-muted-foreground text-xs mt-1.5">
                {lang === "es" ? "Envío:" : "Shipping:"} <span className="text-foreground font-medium">{formatCOP(shipping.rateCents)}</span>
                {shipping.estimated && ` ${ti.shippingEstimated}`}
                {p.retailPriceCop && ` · ${lang === "es" ? "Total:" : "Total:"} ${formatCOP(totalCents)}`}
              </p>
            )}
          </div>

          {/* CTA */}
          {inStock ? (
            <Link href={`/tienda/checkout?productId=${p.id}&qty=${qty}`}>
              <Button size="lg" className="w-full bg-primary hover:bg-primary/90">
                {ti.buy} — {p.retailPriceCop ? formatCOP(p.retailPriceCop * qty) : ti.verPrice}
              </Button>
            </Link>
          ) : (
            <Button size="lg" variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50">
              {ti.joinWaitlist}
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center">{ti.paymentNote}</p>
        </div>
      </div>
    </div>
  );
}
