import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { clearOfficerToken, setLastActivity, isSessionExpired, isTokenExpired, INACTIVITY_TIMEOUT_MS } from "@/lib/officer-auth";

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

const CHECK_INTERVAL_MS = 30_000;

export function useOfficerInactivity() {
  const [, navigate] = useLocation();
  const checkRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function signOutIfExpired() {
      if (isSessionExpired() || isTokenExpired()) {
        clearOfficerToken();
        navigate("/officer/login");
        return true;
      }
      return false;
    }

    if (signOutIfExpired()) return;

    function recordActivity() {
      setLastActivity();
    }

    EVENTS.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));

    checkRef.current = setInterval(signOutIfExpired, CHECK_INTERVAL_MS);

    return () => {
      EVENTS.forEach((event) => window.removeEventListener(event, recordActivity));
      if (checkRef.current) clearInterval(checkRef.current);
    };
  }, [navigate]);
}

export { INACTIVITY_TIMEOUT_MS };
