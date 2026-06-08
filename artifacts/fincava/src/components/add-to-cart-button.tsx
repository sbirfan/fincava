import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ENABLE_CART } from "@/lib/flags";

interface AddToCartButtonProps {
  productId: number;
  quantity: number;
  disabled?: boolean;
  className?: string;
}

export function AddToCartButton({ productId, quantity, disabled, className }: AddToCartButtonProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<"idle" | "loading" | "added">("idle");

  if (!ENABLE_CART) return null;

  async function handleAdd() {
    if (state !== "idle") return;
    setState("loading");
    try {
      const res = await fetch("/api/retail/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      await queryClient.invalidateQueries({ queryKey: ["retail", "cart"] });
      setState("added");
      setTimeout(() => setState("idle"), 2000);
    } catch (err: any) {
      console.error("add-to-cart:", err);
      setState("idle");
      alert(err.message ?? "No se pudo agregar al carrito");
    }
  }

  return (
    <Button
      size="lg"
      className={className ?? "w-full"}
      disabled={disabled || state === "loading"}
      onClick={handleAdd}
    >
      {state === "loading" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {state === "added"   && <Check   className="h-4 w-4 mr-2" />}
      {state === "idle"    && <ShoppingCart className="h-4 w-4 mr-2" />}
      {state === "added" ? "Agregado" : "Agregar al carrito"}
    </Button>
  );
}
