import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Inbox, Package, FileText, Clock, ChevronRight } from "lucide-react";

interface OpenRfq {
  id: number;
  title: string;
  productCategory: string;
  quantityKg: number;
  destination: string;
  deadline: string;
  buyerName: string;
  buyerCountry: string | null;
  responseCount: number;
  createdAt: string;
}

interface PendingInquiry {
  id: number;
  productId: number;
  productName: string;
  supplierName: string;
  buyerName: string;
  buyerEmail: string;
  buyerCompany: string | null;
  country: string | null;
  quantityKg: number | null;
  message: string;
  status: string;
  createdAt: string;
}

interface OpenIntroductions {
  rfqs: OpenRfq[];
  inquiries: PendingInquiry[];
}

function ageLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminIntroductions() {
  const { data, isLoading, isError } = useQuery<OpenIntroductions>({
    queryKey: ["admin", "open-introductions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/open-introductions", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const rfqs = data?.rfqs ?? [];
  const inquiries = data?.inquiries ?? [];
  const total = rfqs.length + inquiries.length;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <Inbox className="h-6 w-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">Open Introductions</h1>
          {!isLoading && (
            <span className="ml-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              {total} pending
            </span>
          )}
        </div>
        <p className="text-white/50 mt-1 text-sm">All open RFQs and pending inquiries awaiting operator action.</p>
      </div>

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}
      {isError && <p className="text-red-400 text-sm">Failed to load introductions. Please refresh.</p>}

      {/* ── Open RFQs ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Open RFQs
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold normal-case tracking-normal">
            {rfqs.length}
          </span>
        </h2>

        {!isLoading && rfqs.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/30 text-sm">
            No open RFQs
          </div>
        )}

        {rfqs.length > 0 && (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-white/40 font-medium">Title</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium hidden lg:table-cell">Qty (kg)</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium hidden lg:table-cell">Destination</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium hidden md:table-cell">Buyer</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium">Deadline</th>
                  <th className="px-4 py-3 text-right text-white/40 font-medium">Responses</th>
                  <th className="px-4 py-3 text-right text-white/40 font-medium hidden sm:table-cell">Age</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq, i) => (
                  <tr
                    key={rfq.id}
                    className={`border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
                  >
                    <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">{rfq.title}</td>
                    <td className="px-4 py-3 text-white/60 hidden md:table-cell">{rfq.productCategory}</td>
                    <td className="px-4 py-3 text-white/60 hidden lg:table-cell">{rfq.quantityKg.toLocaleString()}</td>
                    <td className="px-4 py-3 text-white/60 hidden lg:table-cell">{rfq.destination}</td>
                    <td className="px-4 py-3 text-white/60 hidden md:table-cell">
                      {rfq.buyerName}
                      {rfq.buyerCountry && <span className="text-white/30 ml-1">· {rfq.buyerCountry}</span>}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {new Date(rfq.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${rfq.responseCount > 0 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-white/5 text-white/30 border-white/10"}`}>
                        {rfq.responseCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white/30 text-xs hidden sm:table-cell">
                      <span className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {ageLabel(rfq.createdAt)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/rfq/${rfq.id}`} className="text-white/20 hover:text-emerald-400 transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Pending Inquiries ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <Package className="h-4 w-4" />
          Pending Inquiries
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold normal-case tracking-normal">
            {inquiries.length}
          </span>
        </h2>

        {!isLoading && inquiries.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/30 text-sm">
            No pending inquiries
          </div>
        )}

        {inquiries.length > 0 && (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-white/40 font-medium">Product</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium hidden md:table-cell">Supplier</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium">Buyer</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium hidden lg:table-cell">Country</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium hidden lg:table-cell">Qty (kg)</th>
                  <th className="px-4 py-3 text-right text-white/40 font-medium hidden sm:table-cell">Age</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inq, i) => (
                  <tr
                    key={inq.id}
                    className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
                  >
                    <td className="px-4 py-3 text-white font-medium">{inq.productName}</td>
                    <td className="px-4 py-3 text-white/60 hidden md:table-cell">{inq.supplierName}</td>
                    <td className="px-4 py-3 text-white/60">
                      <div>{inq.buyerName}</div>
                      {inq.buyerCompany && <div className="text-white/30 text-xs">{inq.buyerCompany}</div>}
                    </td>
                    <td className="px-4 py-3 text-white/60 hidden lg:table-cell">{inq.country ?? "—"}</td>
                    <td className="px-4 py-3 text-white/60 hidden lg:table-cell">
                      {inq.quantityKg != null ? inq.quantityKg.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-white/30 text-xs hidden sm:table-cell">
                      <span className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {ageLabel(inq.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
