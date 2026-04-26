import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const tr = t.verifyEmail;
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage(tr.noToken);
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message ?? tr.successTitle);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        } else {
          setStatus("error");
          setMessage(data.error ?? tr.invalidOrExpired);
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage(tr.genericError);
      });
  }, [queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const dashboardPath = user?.role === "SUPPLIER" ? "/supplier-dashboard" : "/dashboard";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
      <div className="max-w-md w-full bg-card rounded-2xl border shadow-sm p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="font-serif text-2xl font-bold text-primary">Fincava</div>
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            <p className="text-muted-foreground">{tr.loading}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500" />
            <div>
              <h1 className="text-xl font-semibold mb-2">{tr.successTitle}</h1>
              <p className="text-muted-foreground text-sm">{message}</p>
            </div>
            <div className="flex flex-col gap-3">
              {user ? (
                <Button onClick={() => navigate(dashboardPath)} className="w-full">
                  {tr.goToDashboard}
                </Button>
              ) : (
                <Button onClick={() => navigate("/login")} className="w-full">
                  {tr.signIn}
                </Button>
              )}
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h1 className="text-xl font-semibold mb-2">{tr.failedTitle}</h1>
              <p className="text-muted-foreground text-sm">{message}</p>
            </div>
            <div className="flex flex-col gap-3">
              {user ? (
                <>
                  <Button onClick={() => navigate(dashboardPath)} className="w-full">
                    {tr.goToDashboard}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      const res = await fetch("/api/auth/resend-verification", {
                        method: "POST",
                        credentials: "include",
                      });
                      if (res.ok) {
                        setMessage(tr.resentMsg);
                        setStatus("success");
                      } else {
                        const data = await res.json().catch(() => ({}));
                        setMessage(data.error ?? tr.resentFailMsg);
                      }
                    }}
                  >
                    {tr.resend}
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate("/login")} className="w-full">
                  {tr.signInToResend}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
