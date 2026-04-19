import { useState, useEffect, useCallback, useRef } from "react";
import { isTokenExpiringSoon, getTokenRemainingMs } from "@/lib/officer-auth";

const CHECK_INTERVAL_MS = 60_000;

function msToHoursMinutes(ms: number): { hours: number; minutes: number } {
  const total = Math.max(0, Math.floor(ms / 60_000));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

export function useSessionExpiryWarning() {
  const initiallyExpiring = isTokenExpiringSoon();
  const [showWarning, setShowWarning] = useState(initiallyExpiring);
  const [dismissed, setDismissed] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(() => getTokenRemainingMs());
  const prevExpiringRef = useRef(initiallyExpiring);

  useEffect(() => {
    const interval = setInterval(() => {
      const expiringSoon = isTokenExpiringSoon();
      if (expiringSoon && !prevExpiringRef.current) {
        setDismissed(false);
      }
      prevExpiringRef.current = expiringSoon;
      setShowWarning(expiringSoon);
      setRemainingMs(getTokenRemainingMs());
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  const onRenewed = useCallback(() => {
    setShowWarning(false);
    setDismissed(false);
    setRemainingMs(getTokenRemainingMs());
    prevExpiringRef.current = false;
  }, []);

  const remaining = remainingMs != null ? msToHoursMinutes(remainingMs) : null;

  return {
    showWarning: showWarning && !dismissed,
    dismiss,
    onRenewed,
    remaining,
  };
}
