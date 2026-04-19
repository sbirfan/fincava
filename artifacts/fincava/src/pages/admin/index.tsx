import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@workspace/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, ShoppingCart, Landmark, TrendingUp, AlertTriangle, DollarSign, ShieldCheck, Eye, EyeOff, CheckCircle2 } from "lucide-react";

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

function OfficerPinSection() {
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPin.trim().length < 4) {
      setError("El PIN debe tener al menos 4 caracteres");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Los PINs no coinciden");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("fincava_token");
      const res = await fetch("/api/admin/officer-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPin: newPin.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Error al cambiar el PIN");
        return;
      }
      setSuccess(true);
      setNewPin("");
      setConfirmPin("");
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
          PIN del Officer de Campo
        </h2>
      </div>
      <p className="text-sm text-white/50">
        Rota el PIN que usan los officers para acceder al panel de gestión de proveedores.
        Al cambiarlo, las sesiones activas en otros dispositivos quedarán invalidadas
        la próxima vez que intenten operar.
      </p>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          PIN del officer actualizado exitosamente.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/15 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-white/50 font-medium block">Nuevo PIN</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPin}
              onChange={(e) => { setNewPin(e.target.value); setError(""); setSuccess(false); }}
              placeholder="Mínimo 4 caracteres"
              autoComplete="new-password"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 pr-9 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-white/50 font-medium block">Confirmar nuevo PIN</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value); setError(""); setSuccess(false); }}
              placeholder="Repita el PIN"
              autoComplete="new-password"
              className={`w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 pr-9 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${confirmPin && confirmPin !== newPin ? "border-red-500/50" : "border-white/10"}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {confirmPin && confirmPin !== newPin && (
            <p className="text-xs text-red-400 mt-0.5">Los PINs no coinciden</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading || !newPin.trim() || !confirmPin.trim()}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 text-sm font-medium text-white transition-colors"
          >
            {loading ? "Cambiando PIN…" : "Cambiar PIN del officer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const token = localStorage.getItem("fincava_token");
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
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
            { label: "Monitor Loans", href: "/admin/loans", icon: Landmark },
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

      <OfficerPinSection />
    </div>
  );
}
