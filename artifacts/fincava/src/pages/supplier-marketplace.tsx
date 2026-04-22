import { useEffect, useState } from "react";

interface Supplier {
  id: number;
  name: string;
  location: string;
  sellableStatus: "SELLABLE" | "PUBLISHED";
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  SELLABLE: "bg-amber-100 text-amber-800",
};

export default function SupplierMarketplace() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/suppliers/marketplace")
      .then((res) => {
        if (!res.ok) throw new Error("non-2xx");
        return res.json();
      })
      .then((data) => {
        setSuppliers(data.suppliers ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
        Supplier Marketplace
      </h1>
      <p className="text-muted-foreground mb-8">
        Verified Colombian agricultural suppliers ready to trade.
      </p>

      {loading && (
        <p className="text-muted-foreground">Loading...</p>
      )}

      {error && (
        <p className="text-destructive">Failed to load suppliers</p>
      )}

      {!loading && !error && suppliers.length === 0 && (
        <div className="border border-dashed rounded-lg p-10 text-center">
          <p className="text-muted-foreground">No suppliers available yet</p>
        </div>
      )}

      {!loading && !error && suppliers.length > 0 && (
        <ul className="space-y-3">
          {suppliers.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border bg-card px-5 py-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-foreground">{s.name}</p>
                <p className="text-sm text-muted-foreground">{s.location}</p>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[s.sellableStatus] ?? "bg-muted text-muted-foreground"}`}
              >
                {s.sellableStatus}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
