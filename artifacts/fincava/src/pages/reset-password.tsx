import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { API } from "@/lib/api-routes";
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { lang, t } = useLanguage();
  const tr = t.resetPassword;

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const schema = useMemo(() => z.object({
    password: z.string().min(MIN_PASSWORD_LENGTH, tr.errors.minLength),
    confirm: z.string(),
  }).refine((d) => d.password === d.confirm, {
    message: tr.errors.noMatch,
    path: ["confirm"],
  }), [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setErrorMsg("");
    const res = await fetch(API.AUTH_RESET_PASSWORD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: values.password }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus("success");
      setTimeout(() => setLocation("/login"), 3000);
    } else {
      setStatus("error");
      setErrorMsg(data.error ?? tr.errors.minLength);
    }
  }

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md border-border shadow-md">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-base font-medium">{tr.invalidLink}</p>
            <p className="text-sm text-muted-foreground">{tr.invalidLinkMsg}</p>
            <Link href="/forgot-password" className="text-primary hover:underline text-sm font-medium">{tr.requestNew}</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md border-border shadow-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-serif font-bold text-primary">{tr.title}</CardTitle>
          <CardDescription>{tr.description}</CardDescription>
        </CardHeader>

        <CardContent>
          {status === "success" ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="text-base font-medium">{tr.successTitle}</p>
              <p className="text-sm text-muted-foreground">{tr.successMsg}</p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {status === "error" && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr.newPassword}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPw ? "text" : "password"} className="pr-10" autoFocus {...field} />
                          <button
                            type="button"
                            onClick={() => setShowPw(v => !v)}
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                            aria-label={showPw ? t.login.hidePassword : t.login.showPassword}
                          >
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr.confirmPassword}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showConfirm ? "text" : "password"} className="pr-10" {...field} />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(v => !v)}
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                            aria-label={showConfirm ? t.login.hidePassword : t.login.showPassword}
                          >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 text-base"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {tr.updateBtn}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>

        {status !== "success" && (
          <CardFooter className="flex justify-center border-t p-6">
            <div className="text-sm text-muted-foreground text-center">
              <Link href="/forgot-password" className="text-primary hover:underline font-medium">{tr.requestNew}</Link>
              {" · "}
              <Link href="/login" className="text-primary hover:underline font-medium">{tr.backToLogin}</Link>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
