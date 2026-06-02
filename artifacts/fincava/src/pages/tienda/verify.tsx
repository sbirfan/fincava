import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TiendaVerify() {
  const { t } = useLanguage();
  const ti = t.tienda;
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const redirect = params.get("redirect") ?? "/tienda";

    if (!token) {
      setStatus("error");
      setMessage(ti.invalidLink);
      return;
    }

    fetch(`/api/retail/auth/verify-magic?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? ti.invalidLink);
        }
        return res.json();
      })
      .then(() => setLocation(redirect))
      .catch((err: Error) => {
        setStatus("error");
        setMessage(err.message);
      });
  }, [setLocation, ti.invalidLink]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a140e] px-4">
      <div className="text-center space-y-4 max-w-sm">
        {status === "loading" ? (
          <>
            <Loader2 className="h-10 w-10 text-emerald-400 animate-spin mx-auto" />
            <p className="text-white font-semibold">{ti.verifying}</p>
            <p className="text-white/40 text-sm">{ti.verifyingNote}</p>
          </>
        ) : (
          <>
            <XCircle className="h-10 w-10 text-red-400 mx-auto" />
            <p className="text-white font-semibold">{ti.invalidLink}</p>
            <p className="text-white/40 text-sm">{message}</p>
            <a href="/tienda/auth" className="inline-block mt-2 text-sm text-emerald-400 hover:underline">
              {ti.requestNew}
            </a>
          </>
        )}
      </div>
    </div>
  );
}
