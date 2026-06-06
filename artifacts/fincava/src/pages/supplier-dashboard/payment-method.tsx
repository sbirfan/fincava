import { useState, useEffect } from "react";
import { Wallet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
  const pm = t.supplierDash.paymentMethod;

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
      toast({ title: pm.validationNequi, variant: "destructive" }); return;
    }
    if (preferred === "BANK_TRANSFER" && (!bankName.trim() || !bankAccountNumber.trim())) {
      toast({ title: pm.validationBank, variant: "destructive" }); return;
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
      toast({
        title: pm.toastSaved,
        description: preferred === "NEQUI" ? `${pm.toastNequiDesc}${nequiPhone}` : `${bankName} — ${bankAccountNumber}`,
      });
    } catch (err: any) {
      toast({ title: pm.toastError, description: err.message, variant: "destructive" });
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
          <h1 className="text-2xl font-bold">{pm.title}</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{pm.subtitle}</p>
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border ${isConfigured ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
        {isConfigured
          ? <><CheckCircle2 className="h-4 w-4 shrink-0" /> {pm.configured} — {existing.preferred === "NEQUI" ? `Nequi ${existing.nequiPhone}` : `${existing.bankName} · ${existing.bankAccountNumber}`}</>
          : <><AlertCircle className="h-4 w-4 shrink-0" /> {pm.notConfigured}</>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> {pm.loading}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{pm.sectionTitle}</CardTitle>
            <CardDescription>{pm.sectionDesc}</CardDescription>
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
                  {m === "NEQUI" ? pm.nequi : pm.bankTransfer}
                </button>
              ))}
            </div>

            {/* Nequi branch */}
            {preferred === "NEQUI" && (
              <div className="space-y-1.5">
                <Label htmlFor="nequiPhone">
                  {pm.nequiPhone} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nequiPhone"
                  type="tel"
                  value={nequiPhone}
                  onChange={(e) => setNequiPhone(e.target.value)}
                  placeholder="+573001234567"
                />
                <p className="text-xs text-muted-foreground">{pm.nequiPhoneHint}</p>
              </div>
            )}

            {/* Bank transfer branch */}
            {preferred === "BANK_TRANSFER" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bankName">{pm.bank} <span className="text-destructive">*</span></Label>
                    <Select value={bankName} onValueChange={setBankName}>
                      <SelectTrigger id="bankName">
                        <SelectValue placeholder={pm.bankPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOMBIAN_BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bankAccountType">{pm.accountType}</Label>
                    <Select value={bankAccountType} onValueChange={(v) => setBankAccountType(v as AccountType)}>
                      <SelectTrigger id="bankAccountType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AHORROS">{pm.savings}</SelectItem>
                        <SelectItem value="CORRIENTE">{pm.checking}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bankAccountNumber">{pm.accountNumber} <span className="text-destructive">*</span></Label>
                  <Input
                    id="bankAccountNumber"
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="000-000000-00"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bankHolderName">{pm.holderName}</Label>
                  <Input
                    id="bankHolderName"
                    type="text"
                    value={bankHolderName}
                    onChange={(e) => setBankHolderName(e.target.value)}
                    placeholder={pm.holderNamePlaceholder}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bankHolderIdType">{pm.idType}</Label>
                    <Select value={bankHolderIdType} onValueChange={(v) => setBankHolderIdType(v as IdType)}>
                      <SelectTrigger id="bankHolderIdType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CC">{pm.idCC}</SelectItem>
                        <SelectItem value="NIT">{pm.idNIT}</SelectItem>
                        <SelectItem value="CE">{pm.idCE}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bankHolderId">{pm.idNumber}</Label>
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
              {isConfigured ? pm.update : pm.save}
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">{pm.privacy}</p>
    </div>
  );
}
