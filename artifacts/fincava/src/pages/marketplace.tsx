import { useState } from "react";
import { useListProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, SlidersHorizontal, Users, Handshake, Leaf, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const PAGE_SIZE = 20;

export default function Marketplace() {
  const { t } = useLanguage();
  const m = t.marketplace;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<string>("newest");
  const [filterSmallholder, setFilterSmallholder] = useState(false);
  const [filterWomenLed, setFilterWomenLed] = useState(false);
  const [filterDirectTrade, setFilterDirectTrade] = useState(false);
  const [filterOrganic, setFilterOrganic] = useState(false);
  const [page, setPage] = useState(1);

  const hasImpactFilter = filterSmallholder || filterWomenLed || filterDirectTrade || filterOrganic;

  const { data, isLoading } = useListProducts({
    search: search || undefined,
    category: category === "all" ? undefined : category,
    sort: sort,
    page,
    limit: PAGE_SIZE,
    smallholder: filterSmallholder || undefined,
    womenLed: filterWomenLed || undefined,
    directTrade: filterDirectTrade || undefined,
    organic: filterOrganic || undefined,
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const products = (data?.products ?? []) as any[];
  const filteredProducts = products.filter(p => {
    if (filterSmallholder && !p.smallholder) return false;
    if (filterWomenLed && !p.womenLed) return false;
    if (filterDirectTrade && !p.directTrade) return false;
    if (filterOrganic && !p.organic) return false;
    return true;
  });

  function resetPage() { setPage(1); }

  function clearAll() {
    setSearch("");
    setCategory("all");
    setSort("newest");
    setFilterSmallholder(false);
    setFilterWomenLed(false);
    setFilterDirectTrade(false);
    setFilterOrganic(false);
    setPage(1);
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">{m.heading}</h1>
          <p className="text-muted-foreground">{m.description}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 font-medium border-b pb-3 mb-4">
              <SlidersHorizontal className="w-4 h-4" />
              {m.filters.title}
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block">{m.filters.search}</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search"
                    placeholder={m.filters.searchPlaceholder}
                    className="pl-9"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{m.filters.category}</label>
                <Select value={category} onValueChange={(v) => { setCategory(v); resetPage(); }}>
                  <SelectTrigger>
                    <SelectValue placeholder={m.filters.allCategories} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{m.filters.allCategories}</SelectItem>
                    <SelectItem value="Coffee">{m.filters.coffee}</SelectItem>
                    <SelectItem value="Cacao">{m.filters.cacao}</SelectItem>
                    <SelectItem value="Exotic Fruits">{m.filters.exoticFruits}</SelectItem>
                    <SelectItem value="Superfoods">{m.filters.superfoods}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{m.filters.sortBy}</label>
                <Select value={sort} onValueChange={(v) => { setSort(v); resetPage(); }}>
                  <SelectTrigger>
                    <SelectValue placeholder={m.filters.newest} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{m.filters.newest}</SelectItem>
                    <SelectItem value="price_asc">{m.filters.priceLow}</SelectItem>
                    <SelectItem value="price_desc">{m.filters.priceHigh}</SelectItem>
                    <SelectItem value="rating">{m.filters.topRated}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Impact Filters */}
              <div>
                <div className="text-sm font-medium mb-3 pb-2 border-b flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5 text-primary" />
                  {m.filters.impactSourcing}
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="directTrade"
                      checked={filterDirectTrade}
                      onCheckedChange={(v) => { setFilterDirectTrade(!!v); resetPage(); }}
                      className="mt-0.5"
                    />
                    <Label htmlFor="directTrade" className="text-sm leading-snug cursor-pointer">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Handshake className="w-3 h-3 text-emerald-600" /> {m.filters.directTrade}
                      </span>
                      <span className="text-xs text-muted-foreground">{m.filters.directTradeDesc}</span>
                    </Label>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="smallholder"
                      checked={filterSmallholder}
                      onCheckedChange={(v) => { setFilterSmallholder(!!v); resetPage(); }}
                      className="mt-0.5"
                    />
                    <Label htmlFor="smallholder" className="text-sm leading-snug cursor-pointer">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="w-3 h-3 text-amber-600" /> {m.filters.smallholder}
                      </span>
                      <span className="text-xs text-muted-foreground">{m.filters.smallholderDesc}</span>
                    </Label>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="womenLed"
                      checked={filterWomenLed}
                      onCheckedChange={(v) => { setFilterWomenLed(!!v); resetPage(); }}
                      className="mt-0.5"
                    />
                    <Label htmlFor="womenLed" className="text-sm leading-snug cursor-pointer">
                      <span className="font-medium text-sm">{m.filters.womenLed}</span>
                      <span className="text-xs text-muted-foreground block">{m.filters.womenLedDesc}</span>
                    </Label>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="organic"
                      checked={filterOrganic}
                      onCheckedChange={(v) => { setFilterOrganic(!!v); resetPage(); }}
                      className="mt-0.5"
                    />
                    <Label htmlFor="organic" className="text-sm leading-snug cursor-pointer">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Leaf className="w-3 h-3 text-green-600" /> {m.filters.organic}
                      </span>
                      <span className="text-xs text-muted-foreground">{m.filters.organicDesc}</span>
                    </Label>
                  </div>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={clearAll}
              >
                {m.filters.clearAll}
              </Button>
            </div>
          </div>

        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {hasImpactFilter && (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between text-sm">
              <span className="text-primary font-medium flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5" />
                {m.impactActive} ({filteredProducts.length})
              </span>
              <button onClick={() => { setFilterSmallholder(false); setFilterWomenLed(false); setFilterDirectTrade(false); setFilterOrganic(false); }} className="text-muted-foreground hover:text-foreground text-xs">
                {m.clear}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[250px] w-full rounded-xl" />
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              ))
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-20 bg-card border rounded-lg border-dashed">
                <p className="text-lg font-medium mb-2">{m.emptyHeading}</p>
                <p className="text-muted-foreground mb-4">{m.emptyDesc}</p>
                <Button variant="outline" onClick={clearAll}>
                  {m.clearFilters}
                </Button>
              </div>
            )}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {m.prev}
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {m.pageOf.replace("{page}", String(page)).replace("{total}", String(totalPages))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
              >
                {m.next}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
