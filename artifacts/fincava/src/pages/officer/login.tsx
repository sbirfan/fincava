import { useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setOfficerToken } from "@/lib/officer-auth";

export default function OfficerLogin() {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();

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

      const data = await res.json() as { token: string };
      setOfficerToken(data.token);
      navigate("/officer/dashboard");
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full">
              <ShieldCheck className="h-7 w-7 text-blue-700" />
            </div>
            <h1 className="text-2xl font-bold text-blue-900">Panel Officer</h1>
            <p className="text-sm text-gray-500">
              Ingrese el PIN para acceder al panel de gestión de proveedores.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="pin" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" />
                PIN de acceso
              </label>
              <div className="relative">
                <Input
                  id="pin"
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
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-700 hover:bg-blue-800"
              disabled={isLoading || !pin.trim()}
            >
              {isLoading ? "Verificando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400">
            El formulario de registro de agricultores no requiere PIN.{" "}
            <a href="/officer/register" className="text-blue-600 hover:underline">
              Ir al registro
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
