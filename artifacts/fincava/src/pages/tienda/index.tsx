import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SlidersHorizontal, Leaf, Users, Package, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
      <div className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all overflow-hidden cursor-pointer">
        <div className="aspect-square bg-white/5 overflow-hidden">
          {img
            ? <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full flex items-center justify-center"><Leaf className="h-10 w-10 text-white/10" /></div>
          }
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white font-semibold text-sm leading-snug">{p.name}</p>
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium border ${p.stockState === "IN_STOCK" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" : "bg-amber-500/15 text-amber-300 border-amber-500/25"}`}>
              {p.stockState === "IN_STOCK" ? ti.available : ti.waitlist}
            </span>
          </div>
          <p className="text-white/40 text-xs">{p.supplierName} · {p.municipio}, {p.department}</p>
          <div className="flex items-center justify-between pt-1">
            <div>
              {p.retailPriceCop
                ? <p className="text-emerald-300 font-bold text-sm">{formatCOP(p.retailPriceCop)}</p>
                : <p className="text-white/20 text-sm">—</p>
              }
              {p.retailUnitLabel && <p className="text-white/30 text-xs">{p.retailUnitLabel}</p>}
            </div>
            <div className="flex gap-1.5">
              {p.organic && <span title={ti.organic}><Leaf className="h-3.5 w-3.5 text-emerald-400" /></span>}
              {p.womenLed && <span title={ti.womenLed}><Users className="h-3.5 w-3.5 text-purple-400" /></span>}
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
    <div className="min-h-screen bg-[#0a140e] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between sticky top-0 bg-[#0a140e]/95 backdrop-blur z-10">
        <Link href="/">
          <span className="font-serif text-xl font-bold text-white cursor-pointer">
            Fincava <span className="text-emerald-400 text-sm font-sans">tienda</span>
          </span>
        </Link>
        <Link href="/tienda/auth">
          <span className="text-sm text-white/60 hover:text-white transition-colors cursor-pointer">{ti.access}</span>
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-bold text-white">{ti.heroTitle}</h1>
          <p className="text-white/40 text-sm mt-1">{ti.heroSub}</p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${showFilters || activeFilters > 0 ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "border-white/10 text-white/60 hover:bg-white/5"}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {ti.filters} {activeFilters > 0 && `(${activeFilters})`}
          </button>

          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => { setCategory(category === c ? "" : c); setPage(1); }}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${category === c ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "border-white/10 text-white/50 hover:bg-white/5"}`}
            >
              {ti.categories[c]}
            </button>
          ))}

          {activeFilters > 0 && (
            <button
              onClick={() => { setCategory(""); setInStock(false); setOrganic(false); setWomenLed(false); setPage(1); }}
              className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="h-3 w-3" /> {ti.clearFilters}
            </button>
          )}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-white/10 bg-white/5">
            {([
              { label: ti.inStockOnly, value: inStock, set: setInStock },
              { label: ti.organic, value: organic, set: setOrganic },
              { label: ti.womenLed, value: womenLed, set: setWomenLed },
            ] as { label: string; value: boolean; set: (v: boolean) => void }[]).map(({ label, value, set }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={value} onChange={e => { set(e.target.checked); setPage(1); }} className="accent-emerald-500 w-4 h-4" />
                <span className="text-sm text-white/70">{label}</span>
              </label>
            ))}
          </div>
        )}

        {/* Grid */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/5 aspect-[3/4] animate-pulse" />
            ))}
          </div>
        )}

        {isError && <p className="text-red-400 text-sm">{ti.loadError}</p>}

        {!isLoading && !isError && products.length === 0 && (
          <div className="text-center py-16">
            <Package className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">{ti.noProducts}</p>
          </div>
        )}

        {products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => <ProductCard key={p.id} p={p} />)}
          </div>
        )}

        {products.length === (data?.limit ?? 20) && (
          <div className="flex justify-center pt-4">
            <button onClick={() => setPage(p => p + 1)} className="px-6 py-2.5 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">
              {ti.loadMore}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
