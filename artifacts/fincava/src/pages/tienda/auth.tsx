import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Mail, KeyRound, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

type Step = "input" | "otp-sent" | "link-sent";
type Channel = "MAGIC_LINK" | "EMAIL_OTP";

export default function TiendaAuth() {
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const ti = t.tienda;
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [channel, setChannel] = useState<Channel>("MAGIC_LINK");
  const [loading, setLoading] = useState(false);

  async function requestToken(selectedChannel: Channel) {
    if (!email.trim()) { toast({ title: ti.emailLabel, description: ti.authSub, variant: "destructive" }); return; }
    setLoading(true);
    setChannel(selectedChannel);
    try {
      const res = await fetch("/api/retail/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), channel: selectedChannel, lang }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? `Error ${res.status}`); }
      setStep(selectedChannel === "EMAIL_OTP" ? "otp-sent" : "link-sent");
    } catch (err: any) {
      toast({ title: ti.sendError, description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6) { toast({ title: ti.codeLength, variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/retail/auth/verify-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? `Error ${res.status}`); }
      setLocation("/tienda");
    } catch (err: any) {
      toast({ title: ti.wrongCode, description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">

        <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-sm">

          {step === "input" && (
            <>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{ti.authTitle}</h1>
                <p className="text-muted-foreground text-sm mt-1">{ti.authSub}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{ti.emailLabel}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && requestToken("MAGIC_LINK")}
                  placeholder={ti.emailPlaceholder}
                  className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => requestToken("MAGIC_LINK")}
                  disabled={loading}
                >
                  {loading && channel === "MAGIC_LINK" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  {ti.sendLink}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => requestToken("EMAIL_OTP")}
                  disabled={loading}
                >
                  {loading && channel === "EMAIL_OTP" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                  {ti.sendCode}
                </Button>
              </div>
            </>
          )}

          {step === "link-sent" && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{ti.checkEmail}</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {ti.linkSent} <span className="text-foreground font-medium">{email}</span>.
                </p>
                <p className="text-muted-foreground text-xs mt-2">{ti.linkExpiry}</p>
              </div>
              <button onClick={() => setStep("input")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mx-auto transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> {ti.changeEmail}
              </button>
            </div>
          )}

          {step === "otp-sent" && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-foreground">{ti.enterCode}</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {ti.codeSent} <span className="text-foreground font-medium">{email}</span>.
                </p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && verifyOtp()}
                placeholder="000000"
                className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-3 text-2xl text-center font-mono tracking-[0.5em] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {ti.verifyCode}
              </Button>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button onClick={() => requestToken("EMAIL_OTP")} className="hover:text-foreground transition-colors">{ti.resendCode}</button>
                <button onClick={() => setStep("input")} className="hover:text-foreground transition-colors">{ti.changeEmail}</button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">{ti.terms}</p>
      </div>
    </div>
  );
}
