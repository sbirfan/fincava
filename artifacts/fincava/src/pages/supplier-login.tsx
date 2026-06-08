// FIN-002 — Supplier self-service login
// Public page with two tabs: WhatsApp OTP and email magic link.
// Farmers who were onboarded via field officer or WhatsApp can access
// their supplier dashboard without needing to know a password.

import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Mail, Leaf } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type WhatsAppStep = "phone" | "otp" | "sent";
type EmailStep    = "email" | "sent";

export default function SupplierLoginPage() {
  const { t } = useLanguage();
  const s = t.supplierLogin;

  // ── WhatsApp OTP state ────────────────────────────────────────────────────
  const [phone,       setPhone]       = useState("");
  const [otp,         setOtp]         = useState("");
  const [waStep,      setWaStep]      = useState<WhatsAppStep>("phone");
  const [waSending,   setWaSending]   = useState(false);
  const [waVerifying, setWaVerifying] = useState(false);
  const [waError,     setWaError]     = useState<string | null>(null);

  // ── Email magic link state ────────────────────────────────────────────────
  const [email,       setEmail]       = useState("");
  const [emailStep,   setEmailStep]   = useState<EmailStep>("email");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError,  setEmailError]  = useState<string | null>(null);

  // ── WhatsApp handlers ─────────────────────────────────────────────────────

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaError(null);
    setWaSending(true);
    try {
      await fetch("/api/supplier-auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      // Always move to OTP step — we don't reveal whether the number matched.
      setWaStep("otp");
    } catch {
      setWaError(s.errorGeneric);
    } finally {
      setWaSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaError(null);
    setWaVerifying(true);
    try {
      const res = await fetch("/api/supplier-auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, otp }),
      });
      if (res.ok) {
        window.location.href = "/supplier-dashboard";
      } else {
        setWaError(s.errorInvalid);
      }
    } catch {
      setWaError(s.errorGeneric);
    } finally {
      setWaVerifying(false);
    }
  };

  // ── Email handlers ────────────────────────────────────────────────────────

  const handleRequestMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSending(true);
    try {
      await fetch("/api/supplier-auth/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setEmailStep("sent");
    } catch {
      setEmailError(s.errorGeneric);
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Logo / brand */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[#1B5E20]">
            <Leaf className="w-7 h-7" />
            <span className="text-2xl font-serif font-bold">Fincava</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-800">{s.pageTitle}</h1>
          <p className="text-sm text-muted-foreground text-center">{s.pageSubtitle}</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-serif text-center">
              {s.pageTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="whatsapp">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="whatsapp" className="flex-1 gap-1.5">
                  <MessageSquare className="w-4 h-4" /> {s.tabWhatsapp}
                </TabsTrigger>
                <TabsTrigger value="email" className="flex-1 gap-1.5">
                  <Mail className="w-4 h-4" /> {s.tabEmail}
                </TabsTrigger>
              </TabsList>

              {/* ── WhatsApp OTP tab ─────────────────────────────────── */}
              <TabsContent value="whatsapp">
                {waStep === "phone" && (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">{s.phoneLabel}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={s.phonePlaceholder}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                    {waError && <p className="text-sm text-red-600">{waError}</p>}
                    <Button
                      type="submit"
                      className="w-full bg-[#1B5E20] hover:bg-[#145218] text-white"
                      disabled={waSending}
                    >
                      {waSending ? s.sending : s.sendOtp}
                    </Button>
                  </form>
                )}

                {waStep === "otp" && (
                  <div className="space-y-4">
                    <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                      <p className="font-medium">{s.otpSentTitle}</p>
                      <p className="mt-0.5 text-green-700">{s.otpSentDesc}</p>
                    </div>
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="otp">{s.otpLabel}</Label>
                        <Input
                          id="otp"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder={s.otpPlaceholder}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                          required
                        />
                      </div>
                      {waError && <p className="text-sm text-red-600">{waError}</p>}
                      <Button
                        type="submit"
                        className="w-full bg-[#1B5E20] hover:bg-[#145218] text-white"
                        disabled={waVerifying}
                      >
                        {waVerifying ? s.verifying : s.verifyOtp}
                      </Button>
                    </form>
                    <button
                      type="button"
                      onClick={() => { setWaStep("phone"); setWaError(null); setOtp(""); }}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {s.backToLogin}
                    </button>
                  </div>
                )}
              </TabsContent>

              {/* ── Email magic link tab ─────────────────────────────── */}
              <TabsContent value="email">
                {emailStep === "email" && (
                  <form onSubmit={handleRequestMagicLink} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">{s.emailLabel}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={s.emailPlaceholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    {emailError && <p className="text-sm text-red-600">{emailError}</p>}
                    <Button
                      type="submit"
                      className="w-full bg-[#1B5E20] hover:bg-[#145218] text-white"
                      disabled={emailSending}
                    >
                      {emailSending ? s.sending : s.sendLink}
                    </Button>
                  </form>
                )}

                {emailStep === "sent" && (
                  <div className="space-y-4">
                    <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                      <p className="font-medium">{s.linkSentTitle}</p>
                      <p className="mt-0.5 text-green-700">{s.linkSentDesc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEmailStep("email"); setEmailError(null); }}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {s.backToLogin}
                    </button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          {s.noAccount}{" "}
          <Link href="/register?role=supplier" className="text-[#1B5E20] hover:underline font-medium">
            {s.registerLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
