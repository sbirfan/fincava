import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const ORDER_STATUSES = ["INQUIRY", "SAMPLE_REQUESTED", "QUOTED", "CONFIRMED", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"] as const;
type OrderStatus = typeof ORDER_STATUSES[number];

const statusColor: Record<string, string> = {
  INQUIRY: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  SAMPLE_REQUESTED: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  QUOTED: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  CONFIRMED: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  IN_PRODUCTION: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  SHIPPED: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  DELIVERED: "bg-teal-500/15 text-teal-300 border-teal-500/20",
  COMPLETED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  CANCELLED: "bg-red-500/15 text-red-300 border-red-500/20",
};

function authHeader() {
  const token = localStorage.getItem("fincava_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function StatusSelect({ orderId, current }: { orderId: number; current: string }) {
  const qc = useQueryClient();
  const [localStatus, setLocalStatus] = useState(current);

  const mutation = useMutation({
    mutationFn: async (status: OrderStatus) => {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return status;
    },
    onSuccess: (status) => {
      setLocalStatus(status);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: () => setLocalStatus(current),
  });

  return (
    <select
      value={localStatus}
      disabled={mutation.isPending}
      onChange={(e) => {
        const next = e.target.value as OrderStatus;
        setLocalStatus(next);
        mutation.mutate(next);
      }}
      onClick={(e) => e.stopPropagation()}
      className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none focus:border-white/30 hover:border-white/20 disabled:opacity-50 cursor-pointer"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s} className="bg-[#111]">{s}</option>
      ))}
    </select>
  );
}

export default function AdminOrders() {
  const [filter, setFilter] = useState("ALL");

  const { data: resp, isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const token = localStorage.getItem("fincava_token");
      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });
  const orders: any[] = resp?.data ?? [];
  const totalOrders: number = resp?.total ?? orders.length;

  const statuses = ["ALL", ...ORDER_STATUSES];
  const filtered = filter === "ALL" ? orders : orders.filter((o: any) => o.status === filter);
  const totalGMV = filtered.reduce((sum: number, o: any) => sum + (o.totalUSD ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <p className="text-white/50 text-sm mt-1">
          {isLoading ? "Loading…" : `${totalOrders} orders — GMV $${totalGMV.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === s
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10" style={{ background: "rgba(255,255,255,0.04)" }}>
              <th className="text-left px-4 py-3 text-white/50 font-medium">ID</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Buyer</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Total</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium hidden md:table-cell">Incoterm</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium hidden lg:table-cell">Destination</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium hidden xl:table-cell">Placed</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Change Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/40">Loading orders…</td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/40">No orders found.</td>
              </tr>
            )}
            {filtered.map((o: any, i: number) => (
              <tr
                key={o.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}
              >
                <td className="px-4 py-3 text-white/40 font-mono text-xs">#{o.id}</td>
                <td className="px-4 py-3 text-white">
                  <div>{o.buyerFirstName} {o.buyerLastName}</div>
                  <div className="text-white/40 text-xs">{o.buyerEmail}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${statusColor[o.status] ?? "bg-white/10 text-white/60"}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-emerald-300 font-semibold">
                  ${(o.totalUSD ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 text-white/60 hidden md:table-cell">{o.incoterm ?? "—"}</td>
                <td className="px-4 py-3 text-white/60 hidden lg:table-cell">{o.destinationPort ?? "—"}</td>
                <td className="px-4 py-3 text-white/40 text-xs hidden xl:table-cell">
                  {new Date(o.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <StatusSelect orderId={o.id} current={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
