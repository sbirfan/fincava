import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, ShoppingCart, Check } from "lucide-react";

const COMPANY_TYPES = [
  { value: "ROASTER", label: "Roaster" },
  { value: "IMPORTER", label: "Importer" },
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "MANUFACTURER", label: "Manufacturer / Brand" },
  { value: "COOPERATIVE", label: "Cooperative" },
] as const;

const PRODUCT_CATEGORIES = [
  { value: "COFFEE", label: "Coffee" },
  { value: "CACAO", label: "Cacao" },
  { value: "AVOCADO", label: "Avocado" },
  { value: "EXOTIC_FRUIT", label: "Exotic Fruit" },
  { value: "SUPERFOOD", label: "Superfood" },
  { value: "PROCESSED", label: "Processed" },
  { value: "TEXTILE", label: "Textile" },
  { value: "OTHER", label: "Other" },
] as const;

const VOLUME_BANDS = [
  { value: "<10MT", label: "<10 MT/year (1–2 lots)" },
  { value: "10-50MT", label: "10–50 MT/year (3–8 MT × 3 orders)" },
  { value: "50-200MT", label: "50–200 MT/year (full container × 3+)" },
  { value: "200+MT", label: "200+ MT/year (commercial scale)" },
] as const;

const TIME_BANDS = [
  { value: "WITHIN_30D", label: "Within 30 days" },
  { value: "1_3M", label: "1–3 months" },
  { value: "3_6M", label: "3–6 months" },
  { value: "EXPLORATORY", label: "Exploratory — no fixed timeline" },
] as const;

const COMMON_CERTS = [
  "EU Organic",
  "USDA Organic",
  "Fair Trade",
  "Rainforest Alliance",
  "UTZ",
  "GlobalGAP",
  "BRC",
  "Halal",
  "Kosher",
] as const;

const formSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8, "Min 8 characters"),
  companyName: z.string().min(2),
  companyType: z.enum(["ROASTER", "IMPORTER", "DISTRIBUTOR", "MANUFACTURER", "COOPERATIVE"]),
  country: z.string().min(2),
  productCategories: z
    .array(z.enum(["COFFEE", "CACAO", "AVOCADO", "EXOTIC_FRUIT", "SUPERFOOD", "PROCESSED", "TEXTILE", "OTHER"]))
    .min(1, "Pick at least one product"),
  volumeBand: z.enum(["<10MT", "10-50MT", "50-200MT", "200+MT"]),
  requiredCerts: z.array(z.string()).default([]),
  timeToFirstOrder: z.enum(["WITHIN_30D", "1_3M", "3_6M", "EXPLORATORY"]),
  marketingOptIn: z.boolean().default(false),
});
type FormData = z.infer<typeof formSchema>;

export default function BuyerRegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      companyName: "",
      companyType: "ROASTER",
      country: "",
      productCategories: [],
      volumeBand: "10-50MT",
      requiredCerts: [],
      timeToFirstOrder: "1_3M",
      marketingOptIn: false,
    },
  });

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/buyers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof json?.error === "string"
            ? json.error
            : "Registration failed. Please check your details and try again.";
        toast({ title: "Registration failed", description: msg, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      // Cookie is set server-side; refresh auth context.
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({
        title: "Welcome to Fincava",
        description: "Check your email to verify your account. You can start exploring now.",
      });
      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "Network error",
        description: "Could not reach the server. Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const productCategories = form.watch("productCategories");
  const requiredCerts = form.watch("requiredCerts");

  const toggleArray = (
    field: "productCategories" | "requiredCerts",
    value: string,
  ) => {
    const current = form.getValues(field) as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    form.setValue(field as any, next as any, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to home
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Register as a Buyer</CardTitle>
              <CardDescription>
                7 quick questions. We use your answers to match you with the right Colombian suppliers.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-firstName" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name (optional)</FormLabel>
                      <FormControl><Input {...field} data-testid="input-lastName" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work email</FormLabel>
                      <FormControl><Input type="email" {...field} data-testid="input-email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input type="password" {...field} data-testid="input-password" /></FormControl>
                      <FormDescription>Minimum 8 characters.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-companyName" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl><Input placeholder="e.g. Germany" {...field} data-testid="input-country" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="companyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-companyType">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMPANY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Product categories */}
              <FormField
                control={form.control}
                name="productCategories"
                render={() => (
                  <FormItem>
                    <FormLabel>What are you sourcing?</FormLabel>
                    <FormDescription>Pick all that apply.</FormDescription>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      {PRODUCT_CATEGORIES.map((p) => {
                        const selected = productCategories.includes(p.value as any);
                        return (
                          <button
                            type="button"
                            key={p.value}
                            onClick={() => toggleArray("productCategories", p.value)}
                            data-testid={`product-${p.value}`}
                            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
                              selected
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-input bg-background hover:bg-muted"
                            }`}
                          >
                            <span>{p.label}</span>
                            {selected && <Check className="h-4 w-4" />}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Volume band */}
              <FormField
                control={form.control}
                name="volumeBand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Annual sourcing volume</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-volumeBand">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VOLUME_BANDS.map((v) => (
                          <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Think in lots? 1 MT ≈ 16 bags of green coffee. A typical container = ~19 MT.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Required certs */}
              <FormField
                control={form.control}
                name="requiredCerts"
                render={() => (
                  <FormItem>
                    <FormLabel>Required certifications (optional)</FormLabel>
                    <FormDescription>Hard requirements only — preferences come later.</FormDescription>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {COMMON_CERTS.map((c) => {
                        const selected = requiredCerts.includes(c);
                        return (
                          <button
                            type="button"
                            key={c}
                            onClick={() => toggleArray("requiredCerts", c)}
                            data-testid={`cert-${c}`}
                            className={`rounded-full border px-3 py-1 text-xs transition ${
                              selected
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-input bg-background hover:bg-muted"
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </FormItem>
                )}
              />

              {/* Timeline */}
              <FormField
                control={form.control}
                name="timeToFirstOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>When do you want to place your first order?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-timeToFirstOrder">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIME_BANDS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Marketing opt-in */}
              <FormField
                control={form.control}
                name="marketingOptIn"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-marketingOptIn"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Send me product updates and occasional market news</FormLabel>
                      <FormDescription>
                        We never share your email. You can unsubscribe at any time.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>

            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">Log in</Link>
              </p>
              <Button type="submit" disabled={submitting} data-testid="button-submit" className="w-full sm:w-auto">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create my account
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
