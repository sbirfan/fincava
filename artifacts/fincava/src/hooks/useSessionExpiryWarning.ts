import { useState, useEffect, useCallback, useRef } from "react";
import { isTokenExpiringSoon } from "@/lib/officer-auth";

const CHECK_INTERVAL_MS = 60_000;

export function useSessionExpiryWarning() {
  const initiallyExpiring = isTokenExpiringSoon();
  const [showWarning, setShowWarning] = useState(initiallyExpiring);
  const [dismissed, setDismissed] = useState(false);
  const prevExpiringRef = useRef(initiallyExpiring);

  useEffect(() => {
    const interval = setInterval(() => {
      const expiringSoon = isTokenExpiringSoon();
      if (expiringSoon && !prevExpiringRef.current) {
        setDismissed(false);
      }
      prevExpiringRef.current = expiringSoon;
      setShowWarning(expiringSoon);
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  const onRenewed = useCallback(() => {
    setShowWarning(false);
    setDismissed(false);
    prevExpiringRef.current = false;
  }, []);

  return {
    showWarning: showWarning && !dismissed,
    dismiss,
    onRenewed,
  };
}
