import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { officerAuthHeaders, setOfficerToken } from "@/lib/officer-auth";
import { useOfficerInactivity } from "@/hooks/useOfficerInactivity";

export default function OfficerSettings() {
  const [, navigate] = useLocation();

  useOfficerInactivity();
  const [pinLastChanged, setPinLastChanged] = useState<string | null | undefined>(undefined);
  const [currentPin, setCurrentPin] = useState("");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    async function fetchPinInfo() {
      try {
        const res = await fetch(`${base}/api/officer/pin/info`, {
          headers: officerAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json() as { lastChanged: string | null };
          setPinLastChanged(data.lastChanged);
        } else {
          setPinLastChanged(null);
        }
      } catch {
        setPinLastChanged(null);
      }
    }
    void fetchPinInfo();
  }, [base]);

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!currentPin.trim()) {
      setError("Debes ingresar tu PIN actual");
      return;
    }
    if (newPin.trim().length < 4) {
      setError("El nuevo PIN debe tener al menos 4 caracteres");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Los PINs no coinciden");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${base}/api/officer/pin/change`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...officerAuthHeaders(),
        },
        body: JSON.stringify({ currentPin: currentPin.trim(), newPin: newPin.trim() }),
      });

      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as { error?: string }).error ?? "";
        if (msg === "El PIN actual es incorrecto") {
          setError(msg);
        } else {
          navigate("/officer/login");
        }
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Error al cambiar el PIN");
        return;
      }

      const data = await res.json() as { token: string };
      setOfficerToken(data.token);
      setSuccess(true);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setPinLastChanged(new Date().toISOString());
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/officer/dashboard")}
            className="p-2 rounded-xl hover:bg-blue-100 text-blue-700 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-700" />
            <h1 className="text-xl font-bold text-blue-900">Configuración del Officer</h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
          <div className="flex items-center gap-2 border-b pb-3">
            <Lock className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-800">Cambiar PIN de acceso</h2>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4 shrink-0 text-gray-400" />
            {pinLastChanged === undefined ? (
              <span className="text-gray-400">Cargando...</span>
            ) : pinLastChanged === null ? (
              <span>PIN nunca cambiado <span className="text-gray-400">(usando valor por defecto)</span></span>
            ) : (
              <span>
                PIN cambiado por última vez:{" "}
                <span className="font-medium text-gray-700">
                  {new Date(pinLastChanged).toLocaleString("es-CO", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            )}
          </div>

          {success && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">PIN actualizado exitosamente</p>
                <p className="text-xs mt-0.5 text-green-600">Su sesión sigue activa con el nuevo PIN.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleChangePin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">PIN actual</label>
              <div className="relative">
                <Input
                  type={showCurrentPin ? "text" : "password"}
                  value={currentPin}
                  onChange={(e) => { setCurrentPin(e.target.value); setError(""); setSuccess(false); }}
                  placeholder="Ingrese su PIN actual"
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showCurrentPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Nuevo PIN</label>
              <div className="relative">
                <Input
                  type={showNewPin ? "text" : "password"}
                  value={newPin}
                  onChange={(e) => { setNewPin(e.target.value); setError(""); setSuccess(false); }}
                  placeholder="Mínimo 4 caracteres"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Confirmar nuevo PIN</label>
              <div className="relative">
                <Input
                  type={showConfirmPin ? "text" : "password"}
                  value={confirmPin}
                  onChange={(e) => { setConfirmPin(e.target.value); setError(""); setSuccess(false); }}
                  placeholder="Repita el nuevo PIN"
                  className={`pr-10 ${confirmPin && confirmPin !== newPin ? "border-red-400" : ""}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirmPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPin && confirmPin !== newPin && (
                <p className="text-xs text-red-600 mt-1">Los PINs no coinciden</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-700 hover:bg-blue-800"
              disabled={isLoading || !currentPin.trim() || !newPin.trim() || !confirmPin.trim()}
            >
              {isLoading ? "Cambiando PIN..." : "Cambiar PIN"}
            </Button>
          </form>

          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
            Al cambiar el PIN, todos los dispositivos con sesión iniciada quedarán desconectados la próxima vez que intenten usar el panel.
          </p>
        </div>

      </div>
    </div>
  );
}
