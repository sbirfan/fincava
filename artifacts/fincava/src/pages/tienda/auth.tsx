import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Mail, KeyRound, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

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
    <div className="flex items-center justify-center bg-[#0a140e] px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">

          {step === "input" && (
            <>
              <div>
                <h1 className="text-lg font-semibold text-white">{ti.authTitle}</h1>
                <p className="text-white/40 text-sm mt-1">{ti.authSub}</p>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">{ti.emailLabel}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && requestToken("MAGIC_LINK")}
                  placeholder={ti.emailPlaceholder}
                  className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2.5 text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => requestToken("MAGIC_LINK")}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                >
                  {loading && channel === "MAGIC_LINK" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {ti.sendLink}
                </button>
                <button
                  onClick={() => requestToken("EMAIL_OTP")}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white/70 text-sm font-medium transition-colors"
                >
                  {loading && channel === "EMAIL_OTP" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {ti.sendCode}
                </button>
              </div>
            </>
          )}

          {step === "link-sent" && (
            <div className="text-center space-y-4 py-2">
              <Mail className="h-10 w-10 text-emerald-400 mx-auto" />
              <div>
                <p className="text-white font-semibold">{ti.checkEmail}</p>
                <p className="text-white/40 text-sm mt-1">
                  {ti.linkSent} <span className="text-white/70">{email}</span>.
                </p>
                <p className="text-white/30 text-xs mt-2">{ti.linkExpiry}</p>
              </div>
              <button onClick={() => setStep("input")} className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mx-auto transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> {ti.changeEmail}
              </button>
            </div>
          )}

          {step === "otp-sent" && (
            <div className="space-y-4">
              <div>
                <p className="text-white font-semibold">{ti.enterCode}</p>
                <p className="text-white/40 text-sm mt-1">
                  {ti.codeSent} <span className="text-white/70">{email}</span>.
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
                className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-3 text-2xl text-center font-mono tracking-[0.5em] placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                autoFocus
              />
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {ti.verifyCode}
              </button>
              <div className="flex items-center justify-between text-xs text-white/30">
                <button onClick={() => requestToken("EMAIL_OTP")} className="hover:text-white/60 transition-colors">{ti.resendCode}</button>
                <button onClick={() => setStep("input")} className="hover:text-white/60 transition-colors">{ti.changeEmail}</button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-white/20">{ti.terms}</p>
      </div>
    </div>
  );
}
