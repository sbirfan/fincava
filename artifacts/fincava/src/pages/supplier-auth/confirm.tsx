// FIN-002 — Magic link confirm page
// Farmer clicks the link from their email → lands here → token auto-verified
// on mount → session cookie set → redirect to /supplier-dashboard.

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Leaf, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Status = "verifying" | "success" | "error";

export default function SupplierAuthConfirmPage() {
  const { t } = useLanguage();
  const s = t.supplierAuthConfirm;
  const [status, setStatus] = useState<Status>("verifying");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    if (!token) { setStatus("error"); return; }

    fetch(`/api/supplier-auth/verify-magic-link?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) {
          setStatus("success");
          setTimeout(() => { window.location.href = "/supplier-dashboard"; }, 1200);
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">

        <div className="flex items-center justify-center gap-2 text-[#1B5E20]">
          <Leaf className="w-7 h-7" />
          <span className="text-2xl font-serif font-bold">Fincava</span>
        </div>

        {status === "verifying" && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B5E20]" />
            <p className="text-sm">{s.verifying}</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3 text-green-700">
            <CheckCircle2 className="w-8 h-8" />
            <p className="text-sm font-medium">{s.success}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 text-red-600">
            <XCircle className="w-8 h-8" />
            <p className="text-sm font-medium">{s.error}</p>
            <Link href="/supplier-login" className="text-sm text-[#1B5E20] hover:underline">
              {s.requestNew}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
