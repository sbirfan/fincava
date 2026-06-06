import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Loader2, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const DEPARTMENTS = [
  "Antioquia","Atlántico","Bogotá D.C.","Bolívar","Boyacá","Caldas",
  "Caquetá","Casanare","Cauca","Cesar","Córdoba","Cundinamarca",
  "Huila","La Guajira","Magdalena","Meta","Nariño","Norte de Santander",
  "Putumayo","Quindío","Risaralda","San Andrés","Santander","Sucre",
  "Tolima","Valle del Cauca","Vaupés","Vichada",
];

function formatCOP(cents: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(cents / 100);
}

export default function TiendaCheckout() {
  const { t, lang } = useLanguage();
  const ti = t.tienda;
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // productId + quantity come from query params set by product page
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("productId");
  const qty = parseInt(params.get("qty") ?? "1") || 1;

  // Form state
  const [shippingName, setShippingName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [dept, setDept] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentInstrument, setPaymentInstrument] = useState<"NEQUI"|"PSE"|"CARD">("CARD");
  const [submitting, setSubmitting] = useState(false);

  // Load product for summary
  const { data: prodRes } = useQuery<{ data: any }>({
    queryKey: ["tienda", "product", productId],
    queryFn: async () => {
      const r = await fetch(`/api/retail/products/${productId}`);
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
    enabled: !!productId,
  });

  // Shipping estimate
  const { data: shippingRes } = useQuery<{ data: { rateCents: number } }>({
    queryKey: ["tienda", "shipping", productId, dept],
    queryFn: async () => {
      const r = await fetch(`/api/retail/products/${productId}/shipping-estimate?department=${encodeURIComponent(dept)}&weightClass=SMALL`);
      if (!r.ok) throw new Error("No estimate");
      return r.json();
    },
    enabled: !!productId && !!dept,
  });

  const product = prodRes?.data;
  const shippingCents = shippingRes?.data?.rateCents ?? 0;
  const priceCents = product?.retailPriceCop ?? 0;
  const subtotalCents = priceCents * qty;
  const totalCents = subtotalCents + shippingCents;

  async function handleSubmit() {
    if (!shippingName || !addressLine1 || !city || !dept || !email) {
      toast({ title: ti.fillRequired, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/retail/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: parseInt(productId!),
          quantity: qty,
          shippingName, shippingAddressLine1: addressLine1,
          shippingAddressLine2: addressLine2 || undefined,
          shippingCity: city, shippingDepartment: dept,
          shippingPostalCode: postalCode || undefined,
          email, phone: phone || undefined,
          paymentInstrument, lang,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? `Error ${res.status}`); }
      const { data } = await res.json();
      setLocation(`/tienda/orders/${data.orderId}`);
    } catch (err: any) {
      toast({ title: ti.orderError, description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!productId) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">{ti.orderNotFound}</p>
      <Link href="/tienda"><span className="text-primary text-sm hover:underline cursor-pointer mt-2 block">← {ti.orderBack}</span></Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-serif font-bold text-foreground mb-6">{ti.checkoutTitle}</h1>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        {/* Left — form */}
        <div className="space-y-6">
          {/* Shipping info */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-foreground">{ti.shippingInfo}</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{ti.fullName} *</label>
              <input value={shippingName} onChange={e => setShippingName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{ti.address} *</label>
              <input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="Calle 80 # 12-34" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{ti.addressLine2}</label>
              <input value={addressLine2} onChange={e => setAddressLine2(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{ti.city} *</label>
                <input value={city} onChange={e => setCity(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{ti.postalCode}</label>
                <input value={postalCode} onChange={e => setPostalCode(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{ti.selectDept} *</label>
              <select value={dept} onChange={e => setDept(e.target.value)} className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">{ti.selectDept}</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-foreground">{ti.contactInfo}</h2>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{ti.emailLabel} *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={ti.emailPlaceholder} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{ti.phonePlaceholder}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+57 300 000 0000" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          {/* Payment method */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-foreground">{ti.paymentMethod}</h2>
            {(["CARD","NEQUI","PSE"] as const).map(m => (
              <label key={m} className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="payment" value={m} checked={paymentInstrument === m} onChange={() => setPaymentInstrument(m)} className="accent-primary" />
                <span className="text-sm text-foreground">{m === "CARD" ? ti.cardLabel : m}</span>
              </label>
            ))}
            {/* FIN-114: Nequi interim instructions — buyer needs to know before placing */}
            {paymentInstrument === "NEQUI" && (
              <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 space-y-1">
                <p className="font-semibold">{ti.nequiManualTitle}</p>
                <p className="text-xs text-emerald-700">{ti.nequiManualNote}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right — summary */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 sticky top-24">
            <h2 className="font-semibold text-foreground">{ti.orderSummary}</h2>
            {product && (
              <div className="flex gap-3">
                {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="w-14 h-14 rounded-lg object-cover bg-muted" />}
                <div>
                  <p className="text-sm font-medium text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{qty} × {product.retailUnitLabel ?? "unidades"}</p>
                </div>
              </div>
            )}
            <div className="border-t border-border pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>{ti.subtotal}</span><span>{formatCOP(subtotalCents)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>{ti.shipping}</span><span>{dept ? formatCOP(shippingCents) : "—"}</span></div>
              <div className="flex justify-between font-bold text-foreground text-base border-t border-border pt-2"><span>{ti.total}</span><span className="text-primary">{dept ? formatCOP(totalCents) : "—"}</span></div>
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={submitting || !dept}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{ti.placing}</> : ti.placeOrder}
            </Button>
            <p className="text-xs text-muted-foreground text-center">{ti.paymentNote2}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
