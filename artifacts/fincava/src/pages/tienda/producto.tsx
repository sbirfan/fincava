import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Leaf, ShieldCheck, Users, MapPin, Loader2, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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

  // Pick bilingual content based on current language
  const farmerVoice = lang === "es" ? p?.originStory?.farmerVoiceEs : (p?.originStory?.farmerVoiceEn ?? p?.originStory?.farmerVoiceEs);
  const buyerCopy = lang === "es" ? p?.originStory?.buyerCopyEs : (p?.originStory?.buyerCopyEn ?? p?.originStory?.buyerCopyEs);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a140e]">
      <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
    </div>
  );

  if (isError || !p) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a140e]">
      <div className="text-center space-y-3">
        <p className="text-white/40">{ti.notFound}</p>
        <Link href="/tienda">
          <span className="text-emerald-400 text-sm hover:underline cursor-pointer">← {ti.navBack}</span>
        </Link>
      </div>
    </div>
  );

  const mainImage = p.images?.[0] ?? null;
  const inStock = p.stockState === "IN_STOCK";
  const totalCents = (p.retailPriceCop ?? 0) * qty + (shipping?.rateCents ?? 0);

  // Format visit date in current language locale
  const visitLocale = lang === "es" ? "es-CO" : "en-GB";
  const visitDateStr = p.verificationSignal
    ? new Date(p.verificationSignal.visitedAt).toLocaleDateString(visitLocale, { day: "numeric", month: "long", year: "numeric" })
    : null;

  const nextWindowStr = p.nextWindowStart
    ? new Date(p.nextWindowStart).toLocaleDateString(visitLocale, { month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-[#0a140e] text-white">
      <header className="border-b border-white/10 px-4 py-4 sticky top-0 bg-[#0a140e]/95 backdrop-blur z-10">
        <Link href="/tienda">
          <span className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors cursor-pointer w-fit">
            <ArrowLeft className="h-4 w-4" /> {ti.navBack}
          </span>
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-10">
        {/* Left — image + story */}
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden aspect-square bg-white/5">
            {mainImage
              ? <img src={mainImage} alt={p.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Leaf className="h-16 w-16 text-white/10" /></div>
            }
          </div>

          {p.originStory && (
            <div className="space-y-3">
              {p.originStory.farmerPhoto && (
                <img src={p.originStory.farmerPhoto} alt={p.originStory.farmerName} className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/30" />
              )}
              <div>
                <p className="text-white font-semibold">{p.originStory.farmerName}</p>
                <p className="text-white/40 text-sm">{p.originStory.farmName} · {p.originStory.region}</p>
              </div>
              {(farmerVoice || p.originStory.story) && (
                <blockquote className="border-l-2 border-emerald-500/40 pl-4 text-white/60 text-sm italic leading-relaxed">
                  "{farmerVoice ?? p.originStory.story}"
                </blockquote>
              )}
              {buyerCopy && (
                <p className="text-white/50 text-sm leading-relaxed">{buyerCopy}</p>
              )}
            </div>
          )}
        </div>

        {/* Right — purchase panel */}
        <div className="space-y-5">
          <div>
            <p className="text-white/40 text-sm">{ti.categories[p.category as keyof typeof ti.categories] ?? p.category}</p>
            <h1 className="text-2xl font-bold text-white mt-0.5">{p.name}</h1>
            <p className="text-white/50 text-sm flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5" /> {p.supplier.municipio}, {p.supplier.department}
            </p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {p.organic && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                <Leaf className="h-3 w-3" /> {ti.organic}
              </span>
            )}
            {p.womenLed && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">
                <Users className="h-3 w-3" /> {ti.womenLed}
              </span>
            )}
            {p.complianceBadges.map(b => (
              <span key={b.requirementCode} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
                <ShieldCheck className="h-3 w-3" /> {b.badgeLabel ?? b.requirementCode}
              </span>
            ))}
          </div>

          {/* Verification signal */}
          {p.verificationSignal && visitDateStr && (
            <div className="flex items-center gap-2 text-xs text-white/40 border border-white/10 rounded-lg px-3 py-2 bg-white/5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              {ti.verifiedVisit} {visitDateStr}
            </div>
          )}

          {/* Stock state */}
          {!inStock && (
            <div className="flex items-center gap-2 text-sm text-amber-300 border border-amber-500/20 rounded-lg px-3 py-2 bg-amber-500/10">
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
              <p className="text-3xl font-bold text-emerald-300">{formatCOP(p.retailPriceCop)}</p>
              {p.retailUnitLabel && (
                <p className="text-white/30 text-sm">
                  {lang === "es" ? "por" : "per"} {p.retailUnitLabel}
                  {p.retailUnitWeightG ? ` (${p.retailUnitWeightG}g)` : ""}
                </p>
              )}
            </div>
          )}

          {/* Quantity */}
          {inStock && (
            <div>
              <label className="block text-sm text-white/50 mb-1.5">{ti.quantity}</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg border border-white/10 text-white/60 hover:bg-white/10 transition-colors text-lg">−</button>
                <span className="text-white font-semibold w-8 text-center">{qty}</span>
                <button onClick={() => setQty(q => Math.min(p.retailMaxPerOrder ?? 10, q + 1))} className="w-9 h-9 rounded-lg border border-white/10 text-white/60 hover:bg-white/10 transition-colors text-lg">+</button>
                {p.retailStockUnits && <span className="text-white/30 text-xs ml-1">{p.retailStockUnits} {lang === "es" ? "disponibles" : "available"}</span>}
              </div>
            </div>
          )}

          {/* Shipping estimate */}
          <div>
            <label className="block text-sm text-white/50 mb-1.5">{ti.shippingEstimate}</label>
            <select
              value={dept}
              onChange={e => setDept(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0a140e] text-white px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">{ti.selectDept}</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {shipping && (
              <p className="text-white/40 text-xs mt-1.5">
                {lang === "es" ? "Envío:" : "Shipping:"} <span className="text-white/70">{formatCOP(shipping.rateCents)}</span>
                {shipping.estimated && ` ${ti.shippingEstimated}`}
                {p.retailPriceCop && ` · ${lang === "es" ? "Total:" : "Total:"} ${formatCOP(totalCents)}`}
              </p>
            )}
          </div>

          {/* CTA */}
          {inStock ? (
            <Link href="/tienda/auth">
              <button className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors">
                {ti.buy} — {p.retailPriceCop ? formatCOP(p.retailPriceCop * qty) : ti.verPrice}
              </button>
            </Link>
          ) : (
            <button className="w-full py-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 font-semibold text-sm hover:bg-amber-500/20 transition-colors">
              {ti.joinWaitlist}
            </button>
          )}

          <p className="text-xs text-white/20 text-center">{ti.paymentNote}</p>
        </div>
      </div>
    </div>
  );
}
