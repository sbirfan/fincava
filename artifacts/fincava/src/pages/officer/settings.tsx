import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, Clock, Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { officerAuthHeaders, setOfficerToken } from "@/lib/officer-auth";
import { useOfficerInactivity } from "@/hooks/useOfficerInactivity";
import { useSessionExpiryWarning } from "@/hooks/useSessionExpiryWarning";
import { SessionRenewalModal } from "@/components/SessionRenewalModal";
import { AlertTriangle, X, RotateCcw } from "lucide-react";

export default function OfficerSettings() {
  const [, navigate] = useLocation();

  useOfficerInactivity();
  const { showWarning, dismiss, onRenewed, remaining } = useSessionExpiryWarning();
  const [showRenewalModal, setShowRenewalModal] = useState(false);

  const [pinLastChanged, setPinLastChanged] = useState<string | null | undefined | "error">(undefined);
  const [currentPin, setCurrentPin] = useState("");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [tokenWindowDays, setTokenWindowDays] = useState<number | null>(null);
  const [tokenWindowInput, setTokenWindowInput] = useState("");
  const [tokenWindowIsDefault, setTokenWindowIsDefault] = useState(false);
  const [tokenWindowLoading, setTokenWindowLoading] = useState(false);
  const [tokenWindowError, setTokenWindowError] = useState("");
  const [tokenWindowSuccess, setTokenWindowSuccess] = useState(false);
  const [tokenResetLoading, setTokenResetLoading] = useState(false);

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const PIN_STALE_DAYS = 90;

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
          setPinLastChanged("error");
        }
      } catch {
        setPinLastChanged("error");
      }
    }
    void fetchPinInfo();
  }, [base]);

  useEffect(() => {
    async function fetchTokenWindow() {
      try {
        const res = await fetch(`${base}/api/officer/token-window`, {
          headers: officerAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json() as { days: number; isDefault: boolean };
          setTokenWindowDays(data.days);
          setTokenWindowInput(String(data.days));
          setTokenWindowIsDefault(data.isDefault);
        }
      } catch {
        // silent — not critical UI
      }
    }
    void fetchTokenWindow();
  }, [base]);

  async function handleSaveTokenWindow(e: React.FormEvent) {
    e.preventDefault();
    setTokenWindowError("");
    setTokenWindowSuccess(false);
    const parsed = parseInt(tokenWindowInput, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
      setTokenWindowError("Ingresa un número entre 1 y 365");
      return;
    }
    setTokenWindowLoading(true);
    try {
      const res = await fetch(`${base}/api/officer/token-window`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...officerAuthHeaders() },
        body: JSON.stringify({ days: parsed }),
      });
      if (res.status === 401) {
        navigate("/officer/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTokenWindowError((data as { error?: string }).error ?? "Error al guardar");
        return;
      }
      setTokenWindowDays(parsed);
      setTokenWindowIsDefault(false);
      setTokenWindowSuccess(true);
    } catch {
      setTokenWindowError("Error de conexión. Intente nuevamente.");
    } finally {
      setTokenWindowLoading(false);
    }
  }

  async function handleResetTokenWindow() {
    setTokenResetLoading(true);
    setTokenWindowError("");
    setTokenWindowSuccess(false);
    try {
      const res = await fetch(`${base}/api/officer/token-window/reset`, {
        method: "POST",
        headers: officerAuthHeaders(),
      });
      if (res.status === 401) { navigate("/officer/login"); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTokenWindowError((data as { error?: string }).error ?? "Error al restablecer");
        return;
      }
      const data = await res.json() as { days: number };
      setTokenWindowDays(data.days);
      setTokenWindowInput(String(data.days));
      setTokenWindowIsDefault(true);
      setTokenWindowSuccess(true);
    } catch {
      setTokenWindowError("Error de conexión.");
    } finally {
      setTokenResetLoading(false);
    }
  }

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
      {showRenewalModal && (
        <SessionRenewalModal
          onRenewed={() => { onRenewed(); setShowRenewalModal(false); }}
          onClose={() => setShowRenewalModal(false)}
        />
      )}
      <div className="max-w-lg mx-auto space-y-6">

        {showWarning && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
            <div className="flex-1 text-sm">
              <span className="font-semibold">Tu sesión expira pronto.</span>{" "}
              {remaining && (remaining.hours > 0 || remaining.minutes > 0) ? (
                <span>Tiempo restante: {remaining.hours > 0 ? `${remaining.hours}h ` : ""}{remaining.minutes}min. </span>
              ) : null}
              Renuévala para no perder tu trabajo.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" className="h-7 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowRenewalModal(true)}>Renovar sesión</Button>
              <button type="button" onClick={dismiss} className="text-amber-500 hover:text-amber-700 transition-colors" aria-label="Descartar aviso"><X className="h-4 w-4" /></button>
            </div>
          </div>
        )}

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
            ) : pinLastChanged === "error" ? (
              <span className="text-gray-400">No se pudo obtener información del PIN</span>
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

          {pinLastChanged !== undefined && pinLastChanged !== "error" && (() => {
            const isNeverChanged = pinLastChanged === null;
            const ageDays = isNeverChanged
              ? null
              : Math.floor((Date.now() - new Date(pinLastChanged).getTime()) / (24 * 60 * 60 * 1000));
            const isStale = isNeverChanged || (ageDays !== null && ageDays >= PIN_STALE_DAYS);
            if (!isStale) return null;
            return (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-medium">Recomendación de seguridad</p>
                <p className="mt-1">
                  {isNeverChanged
                    ? "Tu PIN nunca se ha cambiado. Considera actualizarlo para mantener la cuenta segura."
                    : `Tu PIN no se ha cambiado en ${ageDays} días. Considera actualizarlo para mantener la cuenta segura.`}
                </p>
              </div>
            );
          })()}

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

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
          <div className="flex items-center gap-2 border-b pb-3">
            <Timer className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-800">Duración de sesión</h2>
          </div>

          {tokenWindowDays !== null && (
            <p className="text-sm text-gray-500">
              Las sesiones actualmente vencen a los{" "}
              <span className="font-medium text-gray-700">{tokenWindowDays} días</span>
              {tokenWindowIsDefault && (
                <span className="text-gray-400"> (valor por defecto)</span>
              )}
              .
            </p>
          )}

          {tokenWindowSuccess && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="font-medium">Duración de sesión actualizada</p>
            </div>
          )}

          {tokenWindowError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {tokenWindowError}
            </div>
          )}

          <form onSubmit={handleSaveTokenWindow} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium text-gray-700 block">
                Días de validez del token (1–365)
              </label>
              <Input
                type="number"
                min={1}
                max={365}
                value={tokenWindowInput}
                onChange={(e) => { setTokenWindowInput(e.target.value); setTokenWindowError(""); setTokenWindowSuccess(false); }}
                placeholder="Ej. 7"
              />
            </div>
            <Button
              type="submit"
              className="bg-blue-700 hover:bg-blue-800 shrink-0"
              disabled={tokenWindowLoading || !tokenWindowInput.trim()}
            >
              {tokenWindowLoading ? "Guardando..." : "Guardar"}
            </Button>
            {!tokenWindowIsDefault && (
              <Button
                type="button"
                variant="outline"
                className="shrink-0 text-gray-600 border-gray-300"
                disabled={tokenResetLoading || tokenWindowLoading}
                onClick={handleResetTokenWindow}
                title="Restablecer al valor por defecto"
              >
                {tokenResetLoading ? <span className="text-xs">...</span> : <RotateCcw className="h-4 w-4" />}
              </Button>
            )}
          </form>

          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
            Este valor controla cuántos días puede usarse un token de acceso sin volver a ingresar el PIN. Los cambios aplican a la próxima verificación de token.
          </p>
        </div>

      </div>
    </div>
  );
}
