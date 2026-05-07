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

const PAGE_SIZE = 20;

export default function Marketplace() {
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

  // Server already applies impact filters; keep client-side pass as safety fallback.
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
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">Marketplace</h1>
          <p className="text-muted-foreground">Discover premium agricultural products from verified Colombian producers.</p>
        </div>
        <Link href="/impact" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
          View Impact Report &rarr;
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 font-medium border-b pb-3 mb-4">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search"
                    placeholder="Search products..." 
                    className="pl-9"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={category} onValueChange={(v) => { setCategory(v); resetPage(); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Coffee">Coffee</SelectItem>
                    <SelectItem value="Cacao">Cacao</SelectItem>
                    <SelectItem value="Exotic Fruits">Exotic Fruits</SelectItem>
                    <SelectItem value="Superfoods">Superfoods</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <Select value={sort} onValueChange={(v) => { setSort(v); resetPage(); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Newest" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest Arrivals</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Impact Filters */}
              <div>
                <div className="text-sm font-medium mb-3 pb-2 border-b flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5 text-primary" />
                  Impact Sourcing
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
                        <Handshake className="w-3 h-3 text-emerald-600" /> Direct Trade
                      </span>
                      <span className="text-xs text-muted-foreground">No commodity brokers</span>
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
                        <Users className="w-3 h-3 text-amber-600" /> Smallholder Farm
                      </span>
                      <span className="text-xs text-muted-foreground">Under 10 hectares</span>
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
                      <span className="font-medium text-sm">Women-Led Farm</span>
                      <span className="text-xs text-muted-foreground block">Female-owned or managed</span>
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
                        <Leaf className="w-3 h-3 text-green-600" /> Certified Organic
                      </span>
                      <span className="text-xs text-muted-foreground">No synthetic inputs</span>
                    </Label>
                  </div>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={clearAll}
              >
                Clear All Filters
              </Button>
            </div>
          </div>

          {/* Impact CTA */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">Every purchase directly supports Colombian farming families.</p>
            <Link href="/impact" className="text-primary text-xs font-medium hover:underline">
              See the impact &rarr;
            </Link>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {hasImpactFilter && (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between text-sm">
              <span className="text-primary font-medium flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5" />
                Impact filters active — showing {filteredProducts.length} matching products
              </span>
              <button onClick={() => { setFilterSmallholder(false); setFilterWomenLed(false); setFilterDirectTrade(false); setFilterOrganic(false); }} className="text-muted-foreground hover:text-foreground text-xs">
                Clear
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
                <p className="text-lg font-medium mb-2">Export-ready products are being listed.</p>
                <p className="text-muted-foreground mb-4">Verified suppliers are preparing their first shipments.</p>
                <Button variant="outline" onClick={clearAll}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {/* Pagination controls — shown only when more than one page exists */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
