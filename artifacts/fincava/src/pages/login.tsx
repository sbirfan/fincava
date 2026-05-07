import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useLoginUser } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login, user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const { lang, t } = useLanguage();
  const tr = t.login;

  const loginSchema = useMemo(() => z.object({
    email: z.string().email(tr.errors.invalidEmail),
    password: z.string().min(1, tr.errors.passwordRequired),
  }), [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const loginMutation = useLoginUser();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    form.clearErrors();
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    if (user.role === "ADMIN") setLocation("/admin");
    else if (user.role === "SUPPLIER") setLocation("/supplier-dashboard");
    else setLocation("/dashboard");
  }, [isAuthenticated, user, setLocation]);

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        login(data.token, data.user);
        toast({
          title: tr.toasts.welcome,
          description: `${tr.toasts.loggedIn} ${data.user.firstName}`,
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: tr.toasts.failed,
          description: error.data?.error || tr.toasts.invalidCreds,
        });
      }
    });
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md border-border shadow-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-serif font-bold text-primary">{tr.title}</CardTitle>
          <CardDescription>{tr.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tr.email}</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tr.password}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} className="pr-10" {...field} />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                          aria-label={showPassword ? tr.hidePassword : tr.showPassword}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {tr.loginBtn}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-3 border-t p-6">
          <div className="text-sm text-muted-foreground text-center">
            {tr.noAccount}{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">{tr.signUp}</Link>
          </div>
          <div className="text-sm text-muted-foreground text-center">
            {tr.forgotPassword}{" "}
            <Link href="/forgot-password" className="text-primary hover:underline font-medium">{tr.resetIt}</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
