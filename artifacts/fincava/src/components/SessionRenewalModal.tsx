import { useState } from "react";
import { Lock, Eye, EyeOff, X, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setOfficerToken } from "@/lib/officer-auth";

interface SessionRenewalModalProps {
  onRenewed: () => void;
  onClose: () => void;
}

export function SessionRenewalModal({ onRenewed, onClose }: SessionRenewalModalProps) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${base}/api/officer/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "PIN incorrecto");
        return;
      }

      const data = (await res.json()) as { token: string };
      setOfficerToken(data.token);
      onRenewed();
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-900">Renovar sesión</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600">
          Ingrese su PIN para renovar la sesión y continuar trabajando sin interrupciones.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="renewal-pin" className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" />
              PIN de acceso
            </label>
            <div className="relative">
              <Input
                id="renewal-pin"
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError("");
                }}
                placeholder="Ingrese el PIN"
                className={`pr-10 ${error ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                autoComplete="current-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isLoading || !pin.trim()}
            >
              {isLoading ? "Verificando..." : "Renovar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
