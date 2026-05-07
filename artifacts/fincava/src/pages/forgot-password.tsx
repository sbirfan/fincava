import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";
import { API } from "@/lib/api-routes";

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { t } = useLanguage();
  const tr = t.forgotPassword;
  const { toast } = useToast();

  const schema = z.object({
    email: z.string().email(tr.emailError),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    const res = await fetch(API.AUTH_FORGOT_PASSWORD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: values.email }),
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Something went wrong. Please try again." });
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md border-border shadow-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-serif font-bold text-primary">{tr.title}</CardTitle>
          <CardDescription>{tr.description}</CardDescription>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="text-base font-medium">{tr.sentTitle}</p>
              <p className="text-sm text-muted-foreground">{tr.sentMsg}</p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr.emailLabel}</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" type="email" autoFocus {...field} />
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
                  {tr.sendBtn}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t p-6">
          <div className="text-sm text-muted-foreground text-center">
            {tr.rememberedIt}{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">{tr.backToLogin}</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
