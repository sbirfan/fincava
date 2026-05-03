import { useState, useEffect, useMemo } from "react";
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
import { useLanguage } from "@/contexts/LanguageContext";

const COMPANY_TYPE_VALUES = ["ROASTER", "IMPORTER", "DISTRIBUTOR", "MANUFACTURER", "COOPERATIVE"] as const;
const PRODUCT_CATEGORY_VALUES = ["COFFEE", "CACAO", "AVOCADO", "EXOTIC_FRUIT", "SUPERFOOD", "PROCESSED", "TEXTILE", "OTHER"] as const;
const VOLUME_BAND_VALUES = ["<10MT", "10-50MT", "50-200MT", "200+MT"] as const;
const TIME_BAND_VALUES = ["WITHIN_30D", "1_3M", "3_6M", "EXPLORATORY"] as const;

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

type FormData = {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  companyName: string;
  companyType: (typeof COMPANY_TYPE_VALUES)[number];
  country: string;
  productCategories: (typeof PRODUCT_CATEGORY_VALUES)[number][];
  volumeBand: (typeof VOLUME_BAND_VALUES)[number];
  requiredCerts: string[];
  timeToFirstOrder: (typeof TIME_BAND_VALUES)[number];
  marketingOptIn: boolean;
};

export default function BuyerRegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const { lang, t } = useLanguage();
  const tr = t.buyerRegister;

  const formSchema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(1, tr.errors.firstNameRequired),
        lastName: z.string().optional(),
        email: z.string().email(),
        password: z.string().min(8, tr.errors.passwordMin),
        companyName: z.string().min(2),
        companyType: z.enum(["ROASTER", "IMPORTER", "DISTRIBUTOR", "MANUFACTURER", "COOPERATIVE"]),
        country: z.string().min(2),
        productCategories: z
          .array(z.enum(["COFFEE", "CACAO", "AVOCADO", "EXOTIC_FRUIT", "SUPERFOOD", "PROCESSED", "TEXTILE", "OTHER"]))
          .min(1, tr.errors.productRequired),
        volumeBand: z.enum(["<10MT", "10-50MT", "50-200MT", "200+MT"]),
        requiredCerts: z.array(z.string()).default([]),
        timeToFirstOrder: z.enum(["WITHIN_30D", "1_3M", "3_6M", "EXPLORATORY"]),
        marketingOptIn: z.boolean().default(false),
      }),
    [lang], // eslint-disable-line react-hooks/exhaustive-deps
  );

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

  useEffect(() => {
    form.clearErrors();
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const companyTypes = COMPANY_TYPE_VALUES.map((v) => ({ value: v, label: tr.companyTypes[v] }));
  const productCategoryItems = PRODUCT_CATEGORY_VALUES.map((v) => ({ value: v, label: tr.productCategories[v] }));
  const volumeBands = [
    { value: "<10MT" as const, label: tr.volumeBands.lt10MT },
    { value: "10-50MT" as const, label: tr.volumeBands.mt10_50 },
    { value: "50-200MT" as const, label: tr.volumeBands.mt50_200 },
    { value: "200+MT" as const, label: tr.volumeBands.mt200plus },
  ];
  const timeBands = [
    { value: "WITHIN_30D" as const, label: tr.timeBands.within30d },
    { value: "1_3M" as const, label: tr.timeBands.m1_3 },
    { value: "3_6M" as const, label: tr.timeBands.m3_6 },
    { value: "EXPLORATORY" as const, label: tr.timeBands.exploratory },
  ];

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
          typeof json?.error === "string" ? json.error : tr.toasts.failedDefault;
        toast({ title: tr.toasts.failed, description: msg, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: tr.toasts.welcome, description: tr.toasts.welcomeDesc });
      navigate("/dashboard");
    } catch {
      toast({
        title: tr.toasts.networkError,
        description: tr.toasts.networkErrorDesc,
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const productCategories = form.watch("productCategories");
  const requiredCerts = form.watch("requiredCerts");

  const toggleArray = (field: "productCategories" | "requiredCerts", value: string) => {
    const current = form.getValues(field) as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    form.setValue(field as any, next as any, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-1 h-4 w-4" /> {tr.backToHome}
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>{tr.title}</CardTitle>
              <CardDescription>{tr.description}</CardDescription>
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
                      <FormLabel>{tr.firstName}</FormLabel>
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
                      <FormLabel>{tr.lastName}</FormLabel>
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
                      <FormLabel>{tr.workEmail}</FormLabel>
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
                      <FormLabel>{tr.password}</FormLabel>
                      <FormControl><Input type="password" {...field} data-testid="input-password" /></FormControl>
                      <FormDescription>{tr.passwordHint}</FormDescription>
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
                      <FormLabel>{tr.companyName}</FormLabel>
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
                      <FormLabel>{tr.country}</FormLabel>
                      <FormControl>
                        <Input placeholder={tr.countryPlaceholder} {...field} data-testid="input-country" />
                      </FormControl>
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
                    <FormLabel>{tr.companyType}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-companyType">
                          <SelectValue placeholder={tr.companyTypePlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companyTypes.map((item) => (
                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
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
                    <FormLabel>{tr.sourcing}</FormLabel>
                    <FormDescription>{tr.sourcingHint}</FormDescription>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      {productCategoryItems.map((p) => {
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
                    <FormLabel>{tr.volume}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-volumeBand">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {volumeBands.map((v) => (
                          <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{tr.volumeHint}</FormDescription>
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
                    <FormLabel>{tr.certs}</FormLabel>
                    <FormDescription>{tr.certsHint}</FormDescription>
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
                    <FormLabel>{tr.timeline}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-timeToFirstOrder">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeBands.map((item) => (
                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
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
                      <FormLabel>{tr.marketingLabel}</FormLabel>
                      <FormDescription>{tr.marketingHint}</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>

            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {tr.alreadyHaveAccount}{" "}
                <Link href="/login" className="text-primary hover:underline">{tr.login}</Link>
              </p>
              <Button type="submit" disabled={submitting} data-testid="button-submit" className="w-full sm:w-auto">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tr.submit}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
