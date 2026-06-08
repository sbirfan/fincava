import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ShoppingCart, X, Loader2, AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ENABLE_CART } from "@/lib/flags";

interface CartItem {
  itemId:              number;
  productId:           number;
  productName:         string;
  quantity:            number;
  unitLabelSnapshot:   string;
  priceCopSnapshot:    number;
  maxPerOrderSnapshot: number;
  priceChanged:        boolean;
  insufficientStock:   boolean;
}

interface CartData {
  cartId: number;
  items:  CartItem[];
}

function formatCOP(cents: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(cents / 100);
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function CartDrawer() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ data: CartData }>({
    queryKey: ["retail", "cart"],
    queryFn: () => apiFetch("/api/retail/cart"),
    enabled: ENABLE_CART,
    staleTime: 30_000,
  });

  const cart = data?.data;
  const itemCount = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const total = cart?.items.reduce((s, i) => s + i.priceCopSnapshot * i.quantity, 0) ?? 0;
  const hasWarnings = cart?.items.some(i => i.priceChanged || i.insufficientStock) ?? false;

  const updateQty = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      apiFetch(`/api/retail/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retail", "cart"] }),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: number) =>
      apiFetch(`/api/retail/cart/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retail", "cart"] }),
  });

  if (!ENABLE_CART) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Carrito">
          <ShoppingCart className="h-5 w-5 text-foreground" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrito {itemCount > 0 && <Badge variant="secondary">{itemCount}</Badge>}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (!cart || cart.items.length === 0) && (
            <div className="text-center py-12 space-y-2">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground text-sm">Tu carrito está vacío</p>
              <Link href="/tienda">
                <span className="text-primary text-sm hover:underline cursor-pointer">Ver productos →</span>
              </Link>
            </div>
          )}

          {cart?.items.map(item => (
            <div key={item.itemId} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground leading-snug">{item.productName}</p>
                <button
                  onClick={() => removeItem.mutate(item.itemId)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {item.priceChanged && (
                <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  El precio cambió desde que lo agregaste
                </div>
              )}
              {item.insufficientStock && (
                <div className="flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Stock insuficiente para esta cantidad
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => item.quantity > 1 && updateQty.mutate({ itemId: item.itemId, quantity: item.quantity - 1 })}
                    disabled={item.quantity <= 1 || updateQty.isPending}
                    className="w-7 h-7 rounded border border-border text-foreground hover:bg-muted disabled:opacity-40 flex items-center justify-center"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => item.quantity < item.maxPerOrderSnapshot && updateQty.mutate({ itemId: item.itemId, quantity: item.quantity + 1 })}
                    disabled={item.quantity >= item.maxPerOrderSnapshot || updateQty.isPending}
                    className="w-7 h-7 rounded border border-border text-foreground hover:bg-muted disabled:opacity-40 flex items-center justify-center"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  {item.unitLabelSnapshot && (
                    <span className="text-xs text-muted-foreground">{item.unitLabelSnapshot}</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatCOP(item.priceCopSnapshot * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="border-t border-border pt-4 space-y-3">
            {hasWarnings && (
              <p className="text-xs text-amber-700 text-center">
                Revisa las advertencias antes de continuar
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold text-foreground">{formatCOP(total)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">+ envío calculado en el checkout</p>
            <Link href="/tienda/checkout">
              <Button size="lg" className="w-full">
                Ir al checkout →
              </Button>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
