import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please check the link in your email.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message ?? "Your email has been verified.");
          // Refresh the user profile so emailVerifiedAt is updated in the UI
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        } else {
          setStatus("error");
          setMessage(data.error ?? "This verification link is invalid or has expired.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [queryClient]);

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
            <p className="text-muted-foreground">Verifying your email address…</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500" />
            <div>
              <h1 className="text-xl font-semibold mb-2">Email verified!</h1>
              <p className="text-muted-foreground text-sm">{message}</p>
            </div>
            <div className="flex flex-col gap-3">
              {user ? (
                <Button onClick={() => navigate(dashboardPath)} className="w-full">
                  Go to Dashboard
                </Button>
              ) : (
                <Button onClick={() => navigate("/login")} className="w-full">
                  Sign in
                </Button>
              )}
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h1 className="text-xl font-semibold mb-2">Verification failed</h1>
              <p className="text-muted-foreground text-sm">{message}</p>
            </div>
            <div className="flex flex-col gap-3">
              {user ? (
                <>
                  <Button onClick={() => navigate(dashboardPath)} className="w-full">
                    Go to Dashboard
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
                        setMessage("A new verification email has been sent. Please check your inbox.");
                        setStatus("success");
                      } else {
                        const data = await res.json().catch(() => ({}));
                        setMessage(data.error ?? "Failed to resend verification email. Please try again.");
                      }
                    }}
                  >
                    Resend verification email
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate("/login")} className="w-full">
                  Sign in to resend
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
