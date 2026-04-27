import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Users, ShoppingCart, Landmark, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { ChangePasswordCard } from "@/components/change-password-card";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "emerald",
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    blue: "bg-blue-500/15 text-blue-300 border-blue-500/20",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/20",
    red: "bg-red-500/15 text-red-300 border-red-500/20",
  };
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colors[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-white/50">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      return res.json();
    },
  });

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : n >= 1_000
      ? `$${(n / 1_000).toFixed(1)}K`
      : `$${n.toFixed(0)}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good morning, {user?.firstName ?? "Admin"}
        </h1>
        <p className="text-white/50 mt-1 text-sm">Platform overview — all numbers are live.</p>
      </div>

      {isLoading ? (
        <div className="text-white/50 text-sm">Loading stats…</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats?.users ?? 0}
            sub="Registered accounts"
            accent="emerald"
          />
          <StatCard
            icon={ShoppingCart}
            label="Total Orders"
            value={stats?.orders ?? 0}
            sub="All-time order count"
            accent="blue"
          />
          <StatCard
            icon={DollarSign}
            label="Gross GMV"
            value={fmt(stats?.totalGMV ?? 0)}
            sub="Total order value"
            accent="emerald"
          />
          <StatCard
            icon={Landmark}
            label="Active Loans"
            value={stats?.activeLoans ?? 0}
            sub={`of ${stats?.loans ?? 0} total`}
            accent="amber"
          />
          <StatCard
            icon={TrendingUp}
            label="Capital Deployed"
            value={fmt(stats?.totalLoanPrincipal ?? 0)}
            sub="Principal outstanding"
            accent="blue"
          />
          <StatCard
            icon={AlertTriangle}
            label="Defaults"
            value={stats?.defaultedLoans ?? 0}
            sub="Loans in default"
            accent="red"
          />
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
          Quick Links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Manage Users", href: "/admin/users", icon: Users },
            { label: "Review Orders", href: "/admin/orders", icon: ShoppingCart },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <link.icon className="h-4 w-4 text-emerald-400" />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="max-w-md">
        <ChangePasswordCard />
      </div>
    </div>
  );
}
