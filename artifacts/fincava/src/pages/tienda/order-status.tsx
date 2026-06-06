import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Loader2, CheckCircle2, Clock, Truck, Package, XCircle, Smartphone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface OrderData {
  orderId: number;
  status: string;
  paymentStatus: string;
  instrumentType: string | null;
  totalCents: number;
  currency: string;
  shippingDepartment: string | null;
  shippingCity: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  deliveredAt: string | null;
  createdAt: string;
  // FIN-114
  nequiPhone: string | null;
  buyerPaymentRef: string | null;
}

function formatCOP(cents: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(cents / 100);
}

const STATUS_CONFIG: Record<string, { label: (ti: any) => string; icon: any; color: string }> = {
  INQUIRY:          { label: ti => ti.orderPending,        icon: Clock,         color: "text-amber-600 bg-amber-50 border-amber-200" },
  AUTHORIZED:       { label: ti => ti.orderAuthorized,     icon: CheckCircle2,  color: "text-blue-600 bg-blue-50 border-blue-200" },
  READY_TO_SHIP:    { label: ti => ti.orderReadyToShip,    icon: Package,       color: "text-violet-600 bg-violet-50 border-violet-200" },
  CAPTURED:         { label: ti => ti.orderCaptured,       icon: CheckCircle2,  color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  IN_TRANSIT:       { label: ti => ti.orderInTransit,      icon: Truck,         color: "text-blue-600 bg-blue-50 border-blue-200" },
  DELIVERED_RETAIL: { label: ti => ti.orderDeliveredRetail, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  CANCELLED:        { label: _  => "Cancelled",             icon: XCircle,       color: "text-red-600 bg-red-50 border-red-200" },
  REFUNDED:         { label: _  => "Refunded",              icon: XCircle,       color: "text-red-600 bg-red-50 border-red-200" },
};

export default function TiendaOrderStatus() {
  const { t, lang } = useLanguage(); // lang still needed for interpolated amount strings
  const ti = t.tienda;
  const [, params] = useRoute("/tienda/orders/:id");
  const orderId = params?.id;
  const queryClient = useQueryClient();

  // FIN-114: buyer submits their Nequi transaction reference
  const [nequiRef, setNequiRef] = useState("");
  const [submittingRef, setSubmittingRef] = useState(false);
  const [refSubmitted, setRefSubmitted] = useState(false);

  const tokenParam = new URLSearchParams(window.location.search).get("token") ?? undefined;

  const { data: res, isLoading, isError } = useQuery<{ data: OrderData }>({
    queryKey: ["tienda", "order", orderId, tokenParam],
    queryFn: async () => {
      const url = `/api/retail/orders/${orderId}${tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ""}`;
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    enabled: !!orderId,
    refetchInterval: 30_000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="h-6 w-6 text-primary animate-spin" />
    </div>
  );

  if (isError || !res?.data) return (
    <div className="container mx-auto px-4 py-16 text-center space-y-3">
      <p className="text-muted-foreground">{ti.orderNotFound}</p>
      <Link href="/tienda"><span className="text-primary text-sm hover:underline cursor-pointer">← {ti.orderBack}</span></Link>
    </div>
  );

  const order = res.data;
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG["INQUIRY"];
  const Icon = cfg.icon;

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link href="/tienda"><span className="text-muted-foreground hover:text-foreground text-sm transition-colors cursor-pointer">← {ti.orderBack}</span></Link>
          <h1 className="text-2xl font-serif font-bold text-foreground mt-3">
            {ti.orderTitle} #{order.orderId}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date(order.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Status card */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-medium ${cfg.color}`}>
          <Icon className="h-5 w-5 shrink-0" />
          <span>{cfg.label(ti)}</span>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{ti.orderStatus}</span>
            <span className="font-medium text-foreground">{cfg.label(ti)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{ti.orderPayment}</span>
            <span className="font-medium text-foreground">{order.paymentStatus}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-3">
            <span className="text-muted-foreground font-medium">{ti.total}</span>
            <span className="font-bold text-primary">{formatCOP(order.totalCents)}</span>
          </div>
        </div>

        {/* FIN-114: Nequi manual transfer panel — shown while order is INQUIRY and payment is NEQUI */}
        {order.instrumentType === "NEQUI" && order.status === "INQUIRY" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-600 shrink-0" />
              <h2 className="font-semibold text-emerald-800 text-sm">{ti.nequiPaymentTitle}</h2>
            </div>

            {order.nequiPhone ? (
              <div className="rounded-lg bg-white border border-emerald-200 px-4 py-3 text-sm space-y-1">
                <p className="text-emerald-700 text-xs font-medium uppercase tracking-wide">
                  {ti.nequiSellerPhoneLabel}
                </p>
                <p className="text-2xl font-bold text-emerald-800 tracking-wider">{order.nequiPhone}</p>
                {/* Amount line must interpolate formatCOP — kept inline intentionally */}
                <p className="text-xs text-emerald-600">
                  {lang === "es"
                    ? `Transfiere ${formatCOP(order.totalCents)} por Nequi a este número, luego ingresa tu código de transacción abajo.`
                    : `Transfer ${formatCOP(order.totalCents)} via Nequi to this number, then enter your transaction code below.`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-emerald-700">{ti.nequiAdminWillSend}</p>
            )}

            {/* Ref submission */}
            {order.buyerPaymentRef || refSubmitted ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {/* Interpolated ref — kept inline */}
                <span>
                  {lang === "es"
                    ? `Código enviado: ${order.buyerPaymentRef ?? nequiRef}. Verificaremos y confirmaremos tu pedido.`
                    : `Code submitted: ${order.buyerPaymentRef ?? nequiRef}. We'll verify and confirm your order.`}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-emerald-800 block">{ti.nequiRefLabel}</label>
                <div className="flex gap-2">
                  <input
                    value={nequiRef}
                    onChange={e => setNequiRef(e.target.value)}
                    placeholder={ti.nequiRefPlaceholder}
                    maxLength={100}
                    className="flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    disabled={!nequiRef.trim() || submittingRef}
                    onClick={async () => {
                      setSubmittingRef(true);
                      try {
                        const url = `/api/retail/orders/${orderId}/payment-ref${tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ""}`;
                        const r = await fetch(url, {
                          method: "PATCH",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ref: nequiRef.trim() }),
                        });
                        if (!r.ok) throw new Error(`HTTP ${r.status}`);
                        setRefSubmitted(true);
                        void queryClient.invalidateQueries({ queryKey: ["tienda", "order", orderId] });
                      } catch {
                        // fail silently — user can retry
                      } finally {
                        setSubmittingRef(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                  >
                    {submittingRef ? <Loader2 className="h-4 w-4 animate-spin" /> : ti.nequiRefSubmit}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shipping */}
        {(order.shippingCity || order.carrier) && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm">
            <h2 className="font-semibold text-foreground">{ti.orderShipping}</h2>
            {order.shippingCity && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{ti.selectDept}</span>
                <span className="text-foreground">{order.shippingCity}, {order.shippingDepartment}</span>
              </div>
            )}
            {order.carrier && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{ti.orderTracking}</span>
                <span className="font-medium text-foreground">{order.carrier} · {order.trackingNumber}</span>
              </div>
            )}
            {order.deliveredAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{ti.orderDelivered}</span>
                <span className="text-emerald-600 font-medium">
                  {new Date(order.deliveredAt).toLocaleDateString("es-CO", { day: "numeric", month: "long" })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer note */}
        <p className="text-xs text-muted-foreground text-center">{ti.paymentNote2}</p>
      </div>
    </div>
  );
}
