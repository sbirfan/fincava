import { useState, useEffect } from "react";
import { Wallet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Método de Pago</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Configura cómo quieres recibir el pago cuando se cierre un trato. Fincava usará estos datos para transferirte los fondos.
        </p>
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border ${isConfigured ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
        {isConfigured
          ? <><CheckCircle2 className="h-4 w-4 shrink-0" /> Configurado — {existing.preferred === "NEQUI" ? `Nequi ${existing.nequiPhone}` : `${existing.bankName} · ${existing.bankAccountNumber}`}</>
          : <><AlertCircle className="h-4 w-4 shrink-0" /> Sin configurar — por favor configura tu método de pago para recibir fondos.</>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Método preferido</CardTitle>
            <CardDescription>Selecciona cómo quieres recibir tus pagos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Method toggle */}
            <div className="flex gap-3">
              {(["NEQUI", "BANK_TRANSFER"] as Preferred[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPreferred(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${preferred === m ? "bg-primary/10 text-primary border-primary/30" : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"}`}
                >
                  {m === "NEQUI" ? "Nequi" : "Transferencia Bancaria"}
                </button>
              ))}
            </div>

            {/* Nequi branch */}
            {preferred === "NEQUI" && (
              <div className="space-y-1.5">
                <Label htmlFor="nequiPhone">
                  Número de teléfono Nequi <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nequiPhone"
                  type="tel"
                  value={nequiPhone}
                  onChange={(e) => setNequiPhone(e.target.value)}
                  placeholder="+573001234567"
                />
                <p className="text-xs text-muted-foreground">El número registrado en tu cuenta Nequi (con código de país +57).</p>
              </div>
            )}

            {/* Bank transfer branch */}
            {preferred === "BANK_TRANSFER" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bankName">Banco <span className="text-destructive">*</span></Label>
                    <Select value={bankName} onValueChange={setBankName}>
                      <SelectTrigger id="bankName">
                        <SelectValue placeholder="Seleccionar banco…" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOMBIAN_BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bankAccountType">Tipo de cuenta</Label>
                    <Select value={bankAccountType} onValueChange={(v) => setBankAccountType(v as AccountType)}>
                      <SelectTrigger id="bankAccountType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AHORROS">Ahorros</SelectItem>
                        <SelectItem value="CORRIENTE">Corriente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bankAccountNumber">Número de cuenta <span className="text-destructive">*</span></Label>
                  <Input
                    id="bankAccountNumber"
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="000-000000-00"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bankHolderName">Nombre del titular</Label>
                  <Input
                    id="bankHolderName"
                    type="text"
                    value={bankHolderName}
                    onChange={(e) => setBankHolderName(e.target.value)}
                    placeholder="Nombre completo del titular"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bankHolderIdType">Tipo de documento</Label>
                    <Select value={bankHolderIdType} onValueChange={(v) => setBankHolderIdType(v as IdType)}>
                      <SelectTrigger id="bankHolderIdType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                        <SelectItem value="NIT">NIT</SelectItem>
                        <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bankHolderId">Número de documento</Label>
                    <Input
                      id="bankHolderId"
                      type="text"
                      value={bankHolderId}
                      onChange={(e) => setBankHolderId(e.target.value)}
                      placeholder="1234567890"
                    />
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {isConfigured ? "Actualizar método de pago" : "Guardar método de pago"}
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Tus datos de pago son privados y solo son visibles para el equipo de Fincava. Solo se usarán para transferirte los fondos de tus ventas.
      </p>
    </div>
  );
}
