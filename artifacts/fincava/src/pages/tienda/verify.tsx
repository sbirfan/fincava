// Handles magic link clicks: /tienda/auth/verify?token=<raw>
// Calls the backend verify endpoint, then redirects to /tienda (or redirect param).

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function TiendaVerify() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const redirect = params.get("redirect") ?? "/tienda";

    if (!token) {
      setStatus("error");
      setMessage("Enlace inválido — no se encontró el token.");
      return;
    }

    fetch(`/api/retail/auth/verify-magic?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Enlace inválido o expirado.");
        }
        return res.json();
      })
      .then(() => {
        setLocation(redirect);
      })
      .catch((err: Error) => {
        setStatus("error");
        setMessage(err.message);
      });
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a140e] px-4">
      <div className="text-center space-y-4 max-w-sm">
        {status === "loading" ? (
          <>
            <Loader2 className="h-10 w-10 text-emerald-400 animate-spin mx-auto" />
            <p className="text-white font-semibold">Verificando tu enlace…</p>
            <p className="text-white/40 text-sm">Esto toma un momento.</p>
          </>
        ) : (
          <>
            <XCircle className="h-10 w-10 text-red-400 mx-auto" />
            <p className="text-white font-semibold">Enlace inválido o expirado</p>
            <p className="text-white/40 text-sm">{message}</p>
            <a
              href="/tienda/auth"
              className="inline-block mt-2 text-sm text-emerald-400 hover:underline"
            >
              Solicitar un nuevo enlace
            </a>
          </>
        )}
      </div>
    </div>
  );
}
