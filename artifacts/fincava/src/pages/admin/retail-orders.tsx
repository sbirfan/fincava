import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Loader2, ChevronRight, CheckCircle2, Truck, Package, Clock, Send, CreditCard, MapPin, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface RetailOrder {
  orderId: number;
  status: string;
  createdAt: string;
  shippingName: string;
  shippingCity: string;
  shippingDepartment: string;
  unitQuantity: number;
  unitLabel: string | null;
  amountCents: number;
  paymentStatus: string;
  productName: string;
  buyerEmail: string;
  carrier: string | null;
  trackingNumber: string | null;
  deliveredAt: string | null;
  farmerPaidAt: string | null;
}

function formatCOP(cents: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(cents / 100);
}

function ageLabel(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diffMs / 3_600_000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  INQUIRY:          "bg-amber-50 text-amber-700 border-amber-200",
  AUTHORIZED:       "bg-blue-50 text-blue-700 border-blue-200",
  READY_TO_SHIP:    "bg-violet-50 text-violet-700 border-violet-200",
  CAPTURED:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  IN_TRANSIT:       "bg-sky-50 text-sky-700 border-sky-200",
  DELIVERED_RETAIL: "bg-green-50 text-green-700 border-green-200",
  CANCELLED:        "bg-red-50 text-red-700 border-red-200",
  REFUNDED:         "bg-red-50 text-red-700 border-red-200",
};

interface ActionPanelProps { order: RetailOrder; onDone: () => void }

function ActionPanel({ order, onDone }: ActionPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [farmerRef, setFarmerRef] = useState("");
  const [farmerAmount, setFarmerAmount] = useState("");
  const [showTracking, setShowTracking] = useState(false);
  const [showFarmerPay, setShowFarmerPay] = useState(false);

  async function act(action: string, body?: object) {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/retail/orders/${order.orderId}/${action}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? `Error ${res.status}`); }
      toast({ title: "Done" });
      onDone();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  const s = order.status;
  const isLoading = (a: string) => loading === a;

  return (
    <div className="border-t border-border bg-muted/30 p-4 space-y-3">
      {/* Action 1: Notify farmer */}
      {s === "INQUIRY" && (
        <button onClick={() => act("notify-farmer")} disabled={!!loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors disabled:opacity-40 w-full">
          {isLoading("notify-farmer") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-primary" />}
          1. Notify farmer via WhatsApp
        </button>
      )}

      {/* Action 2: Mark authorized */}
      {s === "INQUIRY" && (
        <button onClick={() => act("mark-authorized")} disabled={!!loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors disabled:opacity-40 w-full">
          {isLoading("mark-authorized") ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4 text-blue-600" />}
          2. Mark payment authorized (Wompi)
        </button>
      )}

      {/* Action 3: Mark farmer ready */}
      {s === "AUTHORIZED" && (
        <button onClick={() => act("mark-ready")} disabled={!!loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors disabled:opacity-40 w-full">
          {isLoading("mark-ready") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4 text-violet-600" />}
          3. Mark farmer ready (LISTO)
        </button>
      )}

      {/* Action 4: Capture payment */}
      {(s === "READY_TO_SHIP" || s === "AUTHORIZED") && (
        <button onClick={() => act("capture")} disabled={!!loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors disabled:opacity-40 w-full">
          {isLoading("capture") ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          4. Capture payment
        </button>
      )}

      {/* Action 5: Enter tracking */}
      {(s === "CAPTURED" || s === "READY_TO_SHIP") && (
        <div className="space-y-2">
          <button onClick={() => setShowTracking(!showTracking)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors w-full">
            <Truck className="h-4 w-4 text-sky-600" /> 5. Enter tracking number
          </button>
          {showTracking && (
            <div className="flex gap-2 pl-2">
              <input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Servientrega" className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none" />
              <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Tracking #" className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none" />
              <button onClick={() => act("tracking", { carrier, trackingNumber: tracking })} disabled={!carrier || !tracking || !!loading}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs disabled:opacity-40">
                {isLoading("tracking") ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action 6: Mark delivered */}
      {s === "IN_TRANSIT" && (
        <button onClick={() => act("mark-delivered")} disabled={!!loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors disabled:opacity-40 w-full">
          {isLoading("mark-delivered") ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4 text-green-600" />}
          6. Mark delivered + send review request
        </button>
      )}

      {/* Action 7: Record farmer payment */}
      {(s === "DELIVERED_RETAIL" || s === "CAPTURED" || s === "IN_TRANSIT") && !order.farmerPaidAt && (
        <div className="space-y-2">
          <button onClick={() => setShowFarmerPay(!showFarmerPay)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors w-full">
            <Wallet className="h-4 w-4 text-emerald-600" /> 7. Record farmer payment (Nequi)
          </button>
          {showFarmerPay && (
            <div className="flex gap-2 pl-2">
              <input value={farmerRef} onChange={e => setFarmerRef(e.target.value)} placeholder="NQ-ref" className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none" />
              <input type="number" value={farmerAmount} onChange={e => setFarmerAmount(e.target.value)} placeholder="COP cents" className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none" />
              <button onClick={() => act("pay-farmer", { farmerPaymentRef: farmerRef, farmerPaymentAmountCents: parseInt(farmerAmount) })}
                disabled={!farmerRef || !farmerAmount || !!loading}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs disabled:opacity-40">
                {isLoading("pay-farmer") ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </button>
            </div>
          )}
        </div>
      )}

      {s === "DELIVERED_RETAIL" && order.farmerPaidAt && (
        <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Farmer paid {ageLabel(order.farmerPaidAt)}</p>
      )}
    </div>
  );
}

export default function AdminRetailOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("INQUIRY");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: orders = [], isLoading } = useQuery<RetailOrder[]>({
    queryKey: ["admin", "retail-orders", statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/retail/orders${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const STATUSES = ["", "INQUIRY", "AUTHORIZED", "READY_TO_SHIP", "CAPTURED", "IN_TRANSIT", "DELIVERED_RETAIL"];
  const STATUS_LABELS: Record<string, string> = {
    "": "All", INQUIRY: "Pending", AUTHORIZED: "Authorized", READY_TO_SHIP: "Ready",
    CAPTURED: "Captured", IN_TRANSIT: "Shipped", DELIVERED_RETAIL: "Delivered",
  };

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin", "retail-orders"] });
    setExpanded(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white">Retail Orders</h1>
        {!isLoading && <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{orders.length}</span>}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${statusFilter === s ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "border-white/10 text-white/50 hover:bg-white/5"}`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      {!isLoading && orders.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/30 text-sm">
          No orders with this status.
        </div>
      )}

      {orders.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {orders.map((order, i) => (
            <div key={order.orderId} className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
              {/* Row */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(expanded === order.orderId ? null : order.orderId)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">#{order.orderId}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[order.status] ?? "bg-white/5 text-white/40 border-white/10"}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="text-white/50 text-xs mt-0.5 truncate">{order.productName} × {order.unitQuantity} · {order.shippingCity}</p>
                  <p className="text-white/30 text-xs">{order.buyerEmail}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-emerald-300 font-semibold text-sm">{formatCOP(order.amountCents)}</p>
                  <p className="text-white/30 text-xs">{ageLabel(order.createdAt)}</p>
                </div>
                <ChevronRight className={`h-4 w-4 text-white/30 transition-transform ${expanded === order.orderId ? "rotate-90" : ""}`} />
              </div>

              {/* Expanded actions */}
              {expanded === order.orderId && <ActionPanel order={order} onDone={refresh} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
