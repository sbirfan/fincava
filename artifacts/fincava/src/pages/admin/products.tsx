import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, ChevronRight, CheckCircle2, XCircle, Clock, Loader2,
  Sparkles, ShieldCheck, Store, RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductListItem {
  id:                 number;
  name:               string;
  category:           string;
  productStatus:      string;
  productTypeKey:     string | null;
  wholesaleEnabled:   boolean;
  retailEnabled:      boolean;
  wholesaleApprovedAt: string | null;
  retailApprovedAt:   string | null;
  supplierId:         number | null;
  companyId:          number;
  createdAt:          string;
}

interface ProductListResponse {
  products:   ProductListItem[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCOP(cents: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(cents / 100);
}

const STATUS_COLORS: Record<string, string> = {
  draft:          "bg-gray-100 text-gray-700 border-gray-300",
  pending_review: "bg-amber-50 text-amber-700 border-amber-200",
  active:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive:       "bg-red-50 text-red-700 border-red-200",
};

// ── Pre-flight checklist ──────────────────────────────────────────────────────

interface ChecklistItem {
  label:  string;
  pass:   boolean;
}

function wholesaleChecklist(p: ProductDetail): ChecklistItem[] {
  return [
    { label: "Supplier linked",       pass: p.supplierId != null },
    { label: "Name set",              pass: !!p.name },
    { label: "Origin set",            pass: !!p.origin },
    { label: "Wholesale price set",   pass: !!p.pricePerKgUSD && p.pricePerKgUSD > 0 },
    { label: "Min order set",         pass: !!p.minOrderKg && p.minOrderKg > 0 },
    { label: "At least 1 image",      pass: Array.isArray(p.images) && p.images.length > 0 },
  ];
}

function retailChecklist(p: ProductDetail): ChecklistItem[] {
  return [
    { label: "Wholesale approved first",  pass: !!p.wholesaleApprovedAt },
    { label: "Supplier linked",           pass: p.supplierId != null },
    { label: "Retail price (COP) set",    pass: !!p.retailPriceCop && p.retailPriceCop > 0 },
    { label: "Stock units set",           pass: !!p.retailStockUnits && p.retailStockUnits > 0 },
    { label: "Unit label set",            pass: !!p.retailUnitLabel },
    { label: "Unit weight (g) set",       pass: !!p.retailUnitWeightG && p.retailUnitWeightG > 0 },
    { label: "At least 1 image",          pass: Array.isArray(p.images) && p.images.length > 0 },
  ];
}

function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-sm">
          {item.pass
            ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            : <XCircle     className="h-4 w-4 text-red-400 shrink-0" />}
          <span className={item.pass ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Detail panel types ────────────────────────────────────────────────────────

interface ProductDetail extends ProductListItem {
  origin:           string | null;
  pricePerKgUSD:    number | null;
  minOrderKg:       number | null;
  retailPriceCop:   number | null;
  retailStockUnits: number | null;
  retailUnitLabel:  string | null;
  retailUnitWeightG: number | null;
  retailMaxPerOrder: number | null;
  harvestWindowStart: string | null;
  harvestWindowEnd:   string | null;
  images:           string[] | null;
  aiContent:        { enrichedAt?: string; shortEn?: string } | null;
}

// ── SKU Form ──────────────────────────────────────────────────────────────────

interface SkuFormProps {
  product:  ProductDetail;
  onSaved:  () => void;
}

function SkuForm({ product, onSaved }: SkuFormProps) {
  const { toast } = useToast();
  const [fields, setFields] = useState({
    retailPriceCop:    product.retailPriceCop ?? "",
    retailStockUnits:  product.retailStockUnits ?? "",
    retailUnitLabel:   product.retailUnitLabel ?? "",
    retailUnitWeightG: product.retailUnitWeightG ?? "",
    retailMaxPerOrder: product.retailMaxPerOrder ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, number | string> = {};
      if (fields.retailPriceCop    !== "") body.retailPriceCop    = Number(fields.retailPriceCop);
      if (fields.retailStockUnits  !== "") body.retailStockUnits  = Number(fields.retailStockUnits);
      if (fields.retailUnitLabel   !== "") body.retailUnitLabel   = String(fields.retailUnitLabel);
      if (fields.retailUnitWeightG !== "") body.retailUnitWeightG = Number(fields.retailUnitWeightG);
      if (fields.retailMaxPerOrder !== "") body.retailMaxPerOrder = Number(fields.retailMaxPerOrder);

      const r = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error ?? `HTTP ${r.status}`); }
    },
    onSuccess: () => {
      toast({ title: "SKU fields saved" });
      onSaved();
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function field(key: keyof typeof fields, label: string, type: "text" | "number" = "number") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <Input
          type={type}
          value={fields[key]}
          onChange={(e) => setFields(f => ({ ...f, [key]: e.target.value }))}
          className="h-8 text-sm"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {field("retailPriceCop",    "Retail Price (COP cents)")}
        {field("retailStockUnits",  "Stock Units")}
        {field("retailUnitLabel",   "Unit Label", "text")}
        {field("retailUnitWeightG", "Unit Weight (g)")}
        {field("retailMaxPerOrder", "Max Per Order")}
      </div>
      <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
        Save SKU Fields
      </Button>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

interface DetailPanelProps {
  productId: number;
  onAction:  () => void;
}

function DetailPanel({ productId, onAction }: DetailPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: product, isLoading, error } = useQuery<ProductDetail>({
    queryKey: ["admin", "product", productId],
    queryFn: async () => {
      const r = await fetch(`/api/products/${productId}`, { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      return j.data ?? j;
    },
  });

  const [enriching, setEnriching] = useState(false);

  async function approve(channel: "wholesale" | "retail") {
    const r = await fetch(`/api/admin/products/${productId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ channel }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast({ title: `Approval failed`, description: j.error ?? `HTTP ${r.status}`, variant: "destructive" });
      return;
    }
    toast({ title: `${channel === "wholesale" ? "Wholesale" : "Retail"} approved` });
    qc.invalidateQueries({ queryKey: ["admin", "product", productId] });
    onAction();
  }

  async function enrich() {
    setEnriching(true);
    try {
      const r = await fetch(`/api/supplier/products/${productId}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ force: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      toast({ title: "AI enrichment complete" });
      qc.invalidateQueries({ queryKey: ["admin", "product", productId] });
    } catch (e: any) {
      toast({ title: "Enrichment failed", description: e.message, variant: "destructive" });
    } finally {
      setEnriching(false);
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
  if (error || !product) return (
    <p className="text-sm text-destructive p-4">Failed to load product.</p>
  );

  const wChecklist = wholesaleChecklist(product);
  const rChecklist = retailChecklist(product);
  const wReady = wChecklist.every(c => c.pass);
  const rReady = rChecklist.every(c => c.pass);

  return (
    <div className="p-4 space-y-5 overflow-y-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-start gap-2 flex-wrap">
          <h2 className="font-semibold text-base leading-tight">{product.name}</h2>
          <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[product.productStatus] ?? "bg-gray-100"}`}>
            {product.productStatus}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {product.category}{product.productTypeKey ? ` · ${product.productTypeKey}` : ""} · ID {product.id}
        </p>
        <div className="flex gap-2 flex-wrap pt-1">
          {product.wholesaleApprovedAt && <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700">Wholesale ✓</Badge>}
          {product.retailApprovedAt    && <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">Retail ✓</Badge>}
          {!product.supplierId         && <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">No supplier</Badge>}
          {product.aiContent?.enrichedAt && <Badge variant="outline" className="text-xs border-violet-300 text-violet-700">✨ Enriched</Badge>}
        </div>
      </div>

      <hr />

      {/* Wholesale channel */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Wholesale Channel</p>
        </div>
        <Checklist items={wChecklist} />
        {!product.wholesaleApprovedAt && (
          <Button
            size="sm" variant="outline"
            disabled={!wReady}
            onClick={() => approve("wholesale")}
            className="w-full"
          >
            {wReady ? "Approve Wholesale" : "Pre-flight incomplete"}
          </Button>
        )}
      </div>

      <hr />

      {/* Retail channel */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Retail Channel</p>
        </div>
        <Checklist items={rChecklist} />
        {!product.retailApprovedAt && (
          <Button
            size="sm" variant="outline"
            disabled={!rReady}
            onClick={() => approve("retail")}
            className="w-full"
          >
            {rReady ? "Approve Retail" : "Pre-flight incomplete"}
          </Button>
        )}
      </div>

      <hr />

      {/* Retail SKU form */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Retail SKU Fields</p>
        <SkuForm
          product={product}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "product", productId] });
            onAction();
          }}
        />
      </div>

      <hr />

      {/* AI enrichment */}
      <div className="space-y-2">
        <p className="text-sm font-medium">AI Enrichment</p>
        {product.aiContent?.shortEn && (
          <p className="text-xs text-muted-foreground line-clamp-2">{product.aiContent.shortEn}</p>
        )}
        <Button size="sm" variant="outline" onClick={enrich} disabled={enriching} className="w-full">
          {enriching
            ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Enriching…</>
            : <><Sparkles className="h-3.5 w-3.5 mr-1.5" />{product.aiContent?.enrichedAt ? "Re-enrich" : "Enrich with AI"}</>}
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: "All",            value: undefined },
  { label: "Pending Review", value: "pending_review" },
  { label: "Active",         value: "active" },
  { label: "Draft",          value: "draft" },
] as const;

export default function AdminProducts() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<ProductListResponse>({
    queryKey: ["admin", "products", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (statusFilter) params.set("productStatus", statusFilter);
      const r = await fetch(`/api/admin/products?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    if (selectedId) qc.invalidateQueries({ queryKey: ["admin", "product", selectedId] });
  }

  const products = data?.products ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Products</h1>
          {data && <span className="text-sm text-muted-foreground">({data.total})</span>}
        </div>
        <Button size="sm" variant="outline" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="px-6 py-2 border-b flex gap-1">
        {STATUS_FILTERS.map(f => (
          <button
            key={String(f.value)}
            onClick={() => { setStatusFilter(f.value); setPage(1); setSelectedId(null); }}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              statusFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Split pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: product list */}
        <div className="w-80 border-r overflow-y-auto shrink-0">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && products.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No products found.</p>
          )}

          {products.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors ${
                selectedId === p.id ? "bg-muted" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.category}{p.productTypeKey ? ` · ${p.productTypeKey}` : ""}
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_COLORS[p.productStatus] ?? "bg-gray-100"}`}>
                      {p.productStatus}
                    </span>
                    {p.wholesaleApprovedAt && <span className="text-xs px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700">WS</span>}
                    {p.retailApprovedAt    && <span className="text-xs px-1.5 py-0.5 rounded border border-blue-200 text-blue-700">RT</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              </div>
            </button>
          ))}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40">← Prev</button>
              <span>{page} / {data.totalPages}</span>
              <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40">Next →</button>
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedId ? (
            <DetailPanel
              key={selectedId}
              productId={selectedId}
              onAction={refresh}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <Package className="h-8 w-8 opacity-30" />
              <p className="text-sm">Select a product to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
