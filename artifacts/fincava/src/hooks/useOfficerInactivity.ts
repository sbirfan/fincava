import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { clearOfficerToken, setLastActivity, isSessionExpired, INACTIVITY_TIMEOUT_MS } from "@/lib/officer-auth";

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export function useOfficerInactivity() {
  const [, navigate] = useLocation();
  const checkRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function recordActivity() {
      setLastActivity();
    }

    EVENTS.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));

    checkRef.current = setInterval(() => {
      if (isSessionExpired()) {
        clearOfficerToken();
        navigate("/officer/login");
      }
    }, 60_000);

    return () => {
      EVENTS.forEach((event) => window.removeEventListener(event, recordActivity));
      if (checkRef.current) clearInterval(checkRef.current);
    };
  }, [navigate]);
}
