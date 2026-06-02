import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SlidersHorizontal, Leaf, Users, Package, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

interface RetailProduct {
  id: number;
  name: string;
  category: string;
  retailPriceCop: number | null;
  retailStockUnits: number | null;
  retailUnitLabel: string | null;
  images: string[];
  stockState: "IN_STOCK" | "HARVEST_WAIT";
  supplierName: string;
  municipio: string;
  department: string;
  organic: boolean;
  womenLed: boolean;
  nextWindowStart: string | null;
  nextWindowEnd: string | null;
}

const CATEGORIES = ["COFFEE", "CACAO", "AVOCADO", "EXOTIC_FRUIT", "SUPERFOOD", "PROCESSED"] as const;

function formatCOP(cents: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(cents / 100);
}

function ProductCard({ p }: { p: RetailProduct }) {
  const { t } = useLanguage();
  const ti = t.tienda;
  const img = p.images?.[0] ?? null;
  return (
    <Link href={`/tienda/producto/${p.id}`}>
      <div className="group rounded-xl border border-border bg-card hover:shadow-md transition-all overflow-hidden cursor-pointer flex flex-col">
        <div className="aspect-square bg-muted overflow-hidden">
          {img
            ? <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full flex items-center justify-center"><Leaf className="h-10 w-10 text-muted-foreground/30" /></div>
          }
        </div>
        <div className="p-4 space-y-2 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm leading-snug text-foreground">{p.name}</p>
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium border ${p.stockState === "IN_STOCK" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
              {p.stockState === "IN_STOCK" ? ti.available : ti.waitlist}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">{p.supplierName} · {p.municipio}, {p.department}</p>
          <div className="flex items-center justify-between pt-1 mt-auto">
            <div>
              {p.retailPriceCop
                ? <p className="text-primary font-bold text-sm">{formatCOP(p.retailPriceCop)}</p>
                : <p className="text-muted-foreground text-sm">—</p>
              }
              {p.retailUnitLabel && <p className="text-muted-foreground text-xs">{p.retailUnitLabel}</p>}
            </div>
            <div className="flex gap-1.5">
              {p.organic && <span title={ti.organic}><Leaf className="h-3.5 w-3.5 text-emerald-600" /></span>}
              {p.womenLed && <span title={ti.womenLed}><Users className="h-3.5 w-3.5 text-violet-600" /></span>}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function TiendaIndex() {
  const { t } = useLanguage();
  const ti = t.tienda;

  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState("");
  const [inStock, setInStock] = useState(false);
  const [organic, setOrganic] = useState(false);
  const [womenLed, setWomenLed] = useState(false);
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (inStock) params.set("inStock", "true");
  if (organic) params.set("organic", "true");
  if (womenLed) params.set("womenLed", "true");
  params.set("page", String(page));

  const { data, isLoading, isError } = useQuery<{ data: RetailProduct[]; page: number; limit: number }>({
    queryKey: ["tienda", "products", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/retail/products?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const products = data?.data ?? [];
  const activeFilters = [category, inStock, organic, womenLed].filter(Boolean).length;

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">{ti.heroTitle}</h1>
        <p className="text-muted-foreground">{ti.heroSub}</p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${showFilters || activeFilters > 0 ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {ti.filters} {activeFilters > 0 && `(${activeFilters})`}
        </button>

        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => { setCategory(category === c ? "" : c); setPage(1); }}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${category === c ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {ti.categories[c]}
          </button>
        ))}

        {activeFilters > 0 && (
          <button
            onClick={() => { setCategory(""); setInStock(false); setOrganic(false); setWomenLed(false); setPage(1); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" /> {ti.clearFilters}
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 rounded-lg border border-border bg-card mb-6">
          {([
            { label: ti.inStockOnly, value: inStock, set: setInStock },
            { label: ti.organic, value: organic, set: setOrganic },
            { label: ti.womenLed, value: womenLed, set: setWomenLed },
          ] as { label: string; value: boolean; set: (v: boolean) => void }[]).map(({ label, value, set }) => (
            <label key={label} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={value} onChange={e => { set(e.target.checked); setPage(1); }} className="accent-primary w-4 h-4" />
              <span className="text-sm text-foreground">{label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Grid */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted aspect-[3/4] animate-pulse" />
          ))}
        </div>
      )}

      {isError && <p className="text-destructive text-sm py-8">{ti.loadError}</p>}

      {!isLoading && !isError && products.length === 0 && (
        <div className="text-center py-20 border border-border rounded-xl border-dashed bg-card">
          <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{ti.noProducts}</p>
        </div>
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      )}

      {products.length === (data?.limit ?? 20) && (
        <div className="flex justify-center pt-8">
          <Button variant="outline" onClick={() => setPage(p => p + 1)}>
            {ti.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
}
