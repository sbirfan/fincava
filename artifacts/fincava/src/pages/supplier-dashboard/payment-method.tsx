import { useState, useEffect } from "react";
import { Wallet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Preferred = "NEQUI" | "BANK_TRANSFER";
type IdType = "CC" | "NIT" | "CE";
type AccountType = "AHORROS" | "CORRIENTE";

interface PaymentMethod {
  id: number;
  preferred: Preferred;
  nequiPhone: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountType: string | null;
  bankHolderName: string | null;
  bankHolderIdType: string | null;
  bankHolderId: string | null;
  updatedAt: string;
}

const COLOMBIAN_BANKS = [
  "Bancolombia", "Davivienda", "Banco de Bogotá", "BBVA Colombia",
  "Banco Popular", "Banco de Occidente", "Banco Agrario", "Banco Caja Social",
  "Colpatria", "Itaú", "Scotiabank Colpatria", "Banco Falabella", "Otro",
];

export default function SupplierPaymentMethod() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<PaymentMethod | null>(null);

  const [preferred, setPreferred] = useState<Preferred>("NEQUI");
  const [nequiPhone, setNequiPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountType, setBankAccountType] = useState<AccountType>("AHORROS");
  const [bankHolderName, setBankHolderName] = useState("");
  const [bankHolderIdType, setBankHolderIdType] = useState<IdType>("CC");
  const [bankHolderId, setBankHolderId] = useState("");

  useEffect(() => {
    fetch("/api/supplier/payment-method", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: PaymentMethod | null) => {
        if (data) {
          setExisting(data);
          setPreferred(data.preferred as Preferred);
          setNequiPhone(data.nequiPhone ?? "");
          setBankName(data.bankName ?? "");
          setBankAccountNumber(data.bankAccountNumber ?? "");
          setBankAccountType((data.bankAccountType as AccountType) ?? "AHORROS");
          setBankHolderName(data.bankHolderName ?? "");
          setBankHolderIdType((data.bankHolderIdType as IdType) ?? "CC");
          setBankHolderId(data.bankHolderId ?? "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (preferred === "NEQUI" && !nequiPhone.trim()) {
      toast({ title: "Número Nequi requerido", variant: "destructive" }); return;
    }
    if (preferred === "BANK_TRANSFER" && (!bankName.trim() || !bankAccountNumber.trim())) {
      toast({ title: "Banco y número de cuenta son requeridos", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/supplier/payment-method", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferred,
          nequiPhone: preferred === "NEQUI" ? nequiPhone.trim() : undefined,
          bankName: preferred === "BANK_TRANSFER" ? bankName.trim() : undefined,
          bankAccountNumber: preferred === "BANK_TRANSFER" ? bankAccountNumber.trim() : undefined,
          bankAccountType: preferred === "BANK_TRANSFER" ? bankAccountType : undefined,
          bankHolderName: preferred === "BANK_TRANSFER" ? bankHolderName.trim() || undefined : undefined,
          bankHolderIdType: preferred === "BANK_TRANSFER" ? bankHolderIdType : undefined,
          bankHolderId: preferred === "BANK_TRANSFER" ? bankHolderId.trim() || undefined : undefined,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? `HTTP ${res.status}`); }
      const updated: PaymentMethod = await res.json();
      setExisting(updated);
      toast({ title: "Método de pago guardado ✓", description: preferred === "NEQUI" ? `Nequi: ${nequiPhone}` : `${bankName} — ${bankAccountNumber}` });
    } catch (err: any) {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const isConfigured = !!existing;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">Método de Pago</h1>
        </div>
        <p className="text-white/50 mt-1 text-sm">
          Configura cómo quieres recibir el pago cuando se cierre un trato. Fincava usará estos datos para transferirte los fondos.
        </p>
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border ${isConfigured ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-amber-500/10 border-amber-500/20 text-amber-300"}`}>
        {isConfigured
          ? <><CheckCircle2 className="h-4 w-4" /> Configurado — {existing.preferred === "NEQUI" ? `Nequi ${existing.nequiPhone}` : `${existing.bankName} · ${existing.bankAccountNumber}`}</>
          : <><AlertCircle className="h-4 w-4" /> Sin configurar — por favor configura tu método de pago para recibir fondos.</>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-6">
          {/* Method toggle */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Método preferido</label>
            <div className="flex gap-3">
              {(["NEQUI", "BANK_TRANSFER"] as Preferred[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPreferred(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${preferred === m ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"}`}
                >
                  {m === "NEQUI" ? "Nequi" : "Transferencia Bancaria"}
                </button>
              ))}
            </div>
          </div>

          {/* Nequi branch */}
          {preferred === "NEQUI" && (
            <div>
              <label className="block text-sm text-white/70 mb-1">
                Número de teléfono Nequi <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={nequiPhone}
                onChange={(e) => setNequiPhone(e.target.value)}
                placeholder="+573001234567"
                className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
              />
              <p className="text-xs text-white/30 mt-1">El número registrado en tu cuenta Nequi (con código de país +57).</p>
            </div>
          )}

          {/* Bank transfer branch */}
          {preferred === "BANK_TRANSFER" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Banco <span className="text-red-400">*</span></label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#0a140e] text-white px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Seleccionar banco…</option>
                    {COLOMBIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Tipo de cuenta</label>
                  <select
                    value={bankAccountType}
                    onChange={(e) => setBankAccountType(e.target.value as AccountType)}
                    className="w-full rounded-lg border border-white/10 bg-[#0a140e] text-white px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="AHORROS">Ahorros</option>
                    <option value="CORRIENTE">Corriente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Número de cuenta <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="000-000000-00"
                  className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Nombre del titular</label>
                <input
                  type="text"
                  value={bankHolderName}
                  onChange={(e) => setBankHolderName(e.target.value)}
                  placeholder="Nombre completo del titular"
                  className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Tipo de documento</label>
                  <select
                    value={bankHolderIdType}
                    onChange={(e) => setBankHolderIdType(e.target.value as IdType)}
                    className="w-full rounded-lg border border-white/10 bg-[#0a140e] text-white px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Número de documento</label>
                  <input
                    type="text"
                    value={bankHolderId}
                    onChange={(e) => setBankHolderId(e.target.value)}
                    placeholder="1234567890"
                    className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            {isConfigured ? "Actualizar método de pago" : "Guardar método de pago"}
          </button>
        </div>
      )}

      <p className="text-xs text-white/20">
        Tus datos de pago son privados y solo son visibles para el equipo de Fincava. Solo se usarán para transferirte los fondos de tus ventas.
      </p>
    </div>
  );
}
