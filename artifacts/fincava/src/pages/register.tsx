import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useRegisterUser } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Building2, ShoppingCart } from "lucide-react";
import { RegisterUserBodyRole } from "@workspace/api-client-react";
import { StepFarmIdentity } from "@/components/onboarding/StepFarmIdentity";
import { StepProduction } from "@/components/onboarding/StepProduction";
import { StepBusinessReadiness } from "@/components/onboarding/StepBusinessReadiness";
import { ReviewSummary, type ReviewSection } from "@/components/onboarding/ReviewSummary";
import { PRODUCT_OPTIONS } from "@/lib/onboarding-constants";

type AccountData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  country: string;
};

interface SupplierFormData {
  farm_name: string;
  owner_name: string;
  phone: string;
  email: string;
  department: string;
  municipio: string;
  vereda: string;
  primary_product: string;
  other_product: string;
  farm_size_hectares: string;
  annual_volume_kg: string;
  harvest_months: string;
  organic_certified: string;
  currently_exporting: string;
  has_rut: string;
  has_bank_account: string;
  working_capital_needed: string;
  export_blocker: string;
  business_structure: string;
  part_of_cooperative: string;
  vuce_registered: string;
  invima_required: string;
  invima_approved: string;
  ica_registered: string;
}

const SUPPLIER_INITIAL: SupplierFormData = {
  farm_name: "", owner_name: "", phone: "", email: "", department: "", municipio: "", vereda: "",
  primary_product: "", other_product: "", farm_size_hectares: "",
  annual_volume_kg: "", harvest_months: "", organic_certified: "",
  currently_exporting: "", has_rut: "", has_bank_account: "",
  working_capital_needed: "", export_blocker: "",
  business_structure: "", part_of_cooperative: "", vuce_registered: "",
  invima_required: "", invima_approved: "", ica_registered: "",
};

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function Register() {
  const { lang, t } = useLanguage();
  const tr = t.register;

  const searchString = useSearch();
  const roleParam = new URLSearchParams(searchString).get("role");
  const initialRole = roleParam === "supplier" ? RegisterUserBodyRole.SUPPLIER : RegisterUserBodyRole.BUYER;
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(roleParam ? 2 : 1);
  const [role, setRole] = useState<RegisterUserBodyRole>(initialRole);
  const [supplierForm, setSupplierForm] = useState<SupplierFormData>(SUPPLIER_INITIAL);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegisterUser();

  const accountSchema = useMemo(() => z.object({
    email: z.string().email(tr.errors.invalidEmail),
    password: z.string().min(6, tr.errors.passwordMin),
    firstName: z.string().min(2, tr.errors.firstNameRequired),
    lastName: z.string().min(2, tr.errors.lastNameRequired),
    companyName: z.string().min(2, tr.errors.companyRequired),
    country: z.string().min(2, tr.errors.countryRequired),
  }), [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const form = useForm<AccountData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: "", password: "", firstName: "", lastName: "", companyName: "", country: "",
    },
  });

  useEffect(() => {
    form.clearErrors();
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (field: string, value: string) =>
    setSupplierForm((prev) => ({ ...prev, [field]: value }));

  const isBuyer = role === RegisterUserBodyRole.BUYER;
  const totalSteps = isBuyer ? 2 : 6;

  const stepLabels = isBuyer
    ? [tr.steps.role, tr.steps.details]
    : [tr.steps.role, tr.steps.account, tr.steps.farm, tr.steps.production, tr.steps.readiness, tr.steps.review];

  function canAdvanceSupplier() {
    if (step === 3) return !!(supplierForm.farm_name && supplierForm.owner_name && supplierForm.phone && supplierForm.department && supplierForm.municipio);
    if (step === 4) return !!supplierForm.primary_product;
    return true;
  }

  async function handleBuyerSubmit(values: AccountData) {
    registerMutation.mutate(
      { data: { ...values, role } },
      {
        onSuccess: (data) => {
          login(data.token, data.user);
          toast({ title: tr.toasts.success, description: tr.toasts.welcome });
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: tr.toasts.failed,
            description: (error as any).data?.error || tr.toasts.couldNotCreate,
          });
        },
      }
    );
  }

  async function handleSupplierSubmit() {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const accountValues = form.getValues();

      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...accountValues, role }),
      });
      if (!regRes.ok) {
        const err = await regRes.json().catch(() => ({}));
        throw new Error(err.error || "Account creation failed");
      }
      const regData = await regRes.json();
      login(regData.token, regData.user);

      const product = supplierForm.primary_product === "other"
        ? supplierForm.other_product
        : supplierForm.primary_product;

      const onboardRes = await fetch("/api/suppliers/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: supplierForm.farm_name,
          contact_name: supplierForm.owner_name,
          phone: supplierForm.phone,
          email: accountValues.email,
          supplier_type: "farmer",
          department: supplierForm.department,
          municipio: supplierForm.municipio,
          vereda: supplierForm.vereda || undefined,
          farm_name: supplierForm.farm_name,
          farm_size_hectares: supplierForm.farm_size_hectares ? parseFloat(supplierForm.farm_size_hectares) : undefined,
          primary_product: product || undefined,
          annual_volume_kg: supplierForm.annual_volume_kg ? parseFloat(supplierForm.annual_volume_kg) : undefined,
          harvest_months: supplierForm.harvest_months || undefined,
          organic_certified: supplierForm.organic_certified === "yes",
          currently_exporting: supplierForm.currently_exporting === "yes",
          working_capital_needed: supplierForm.working_capital_needed ? parseFloat(supplierForm.working_capital_needed) : undefined,
          export_blocker: supplierForm.export_blocker || undefined,
          has_rut: supplierForm.has_rut === "yes",
          has_bank_account: supplierForm.has_bank_account === "yes",
        }),
      });
      if (!onboardRes.ok) {
        const err = await onboardRes.json().catch(() => ({}));
        throw new Error(err.error || "Profile submission failed");
      }

      toast({ title: tr.toasts.welcome, description: tr.toasts.supplierCreated });
      setLocation("/supplier-dashboard");
    } catch (e: any) {
      setSubmitError(e.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const productLabel = () => {
    const raw = supplierForm.primary_product === "other" ? supplierForm.other_product : supplierForm.primary_product;
    const opt = PRODUCT_OPTIONS.find((p) => p.value === raw);
    return opt ? opt.labelEn : raw;
  };

  const yesNo = (v: string) => (v === "yes" ? tr.yes : v === "no" ? tr.no : "—");

  const rl = tr.reviewLabels;
  const rs = tr.reviewSections;

  const reviewSections: ReviewSection[] = [
    {
      title: rs.account,
      onEdit: () => setStep(2),
      rows: [
        { label: rl.name, value: `${form.getValues("firstName")} ${form.getValues("lastName")}` },
        { label: rl.company, value: form.getValues("companyName") },
        { label: rl.country, value: form.getValues("country") },
        { label: rl.email, value: form.getValues("email") },
      ],
    },
    {
      title: rs.farmInfo,
      onEdit: () => setStep(3),
      rows: [
        { label: rl.farmName, value: supplierForm.farm_name },
        { label: rl.owner, value: supplierForm.owner_name },
        { label: rl.phone, value: supplierForm.phone },
        { label: rl.department, value: supplierForm.department },
        { label: rl.municipality, value: supplierForm.municipio },
        { label: rl.vereda, value: supplierForm.vereda },
      ],
    },
    {
      title: rs.production,
      onEdit: () => setStep(4),
      rows: [
        { label: rl.primaryProduct, value: productLabel() },
        { label: rl.farmSize, value: supplierForm.farm_size_hectares },
        { label: rl.annualVolume, value: supplierForm.annual_volume_kg },
        { label: rl.harvestMonths, value: supplierForm.harvest_months },
        { label: rl.organicCertified, value: yesNo(supplierForm.organic_certified) },
      ],
    },
    {
      title: rs.exportReadiness,
      onEdit: () => setStep(5),
      rows: [
        { label: rl.currentlyExporting, value: yesNo(supplierForm.currently_exporting) },
        { label: rl.hasRut, value: yesNo(supplierForm.has_rut) },
        { label: rl.hasBankAccount, value: yesNo(supplierForm.has_bank_account) },
        { label: rl.capitalNeeded, value: supplierForm.working_capital_needed },
        { label: rl.exportBlocker, value: supplierForm.export_blocker },
      ],
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30 py-12">
      <Card className="w-full max-w-xl border-border shadow-md">
        <CardHeader className="text-center space-y-2 pb-6 border-b">
          <CardTitle className="text-3xl font-serif font-bold text-primary">{tr.title}</CardTitle>
          <CardDescription>{tr.description}</CardDescription>
          {totalSteps > 2 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              {stepLabels.map((label, i) => (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                        step === i + 1
                          ? "bg-primary text-primary-foreground"
                          : step > i + 1
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step > i + 1 ? "✓" : i + 1}
                    </div>
                    <span className="text-[10px] mt-0.5 text-muted-foreground">{label}</span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className={`w-6 h-0.5 mb-3 mx-0.5 ${step > i + 1 ? "bg-primary/40" : "bg-muted"}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6 md:p-8">
          {/* ── Step 1: Role selection ── */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center mb-6">
                <h3 className="text-xl font-medium mb-2">{tr.rolePicker.heading}</h3>
                <p className="text-sm text-muted-foreground">{tr.rolePicker.sub}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => { setRole(RegisterUserBodyRole.BUYER); setStep(2); }}
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground hover:border-primary cursor-pointer text-center transition-colors w-full"
                >
                  <ShoppingCart className="mb-4 h-8 w-8 text-primary" />
                  <span className="font-bold text-lg mb-2">{tr.rolePicker.buyerTitle}</span>
                  <span className="text-sm text-muted-foreground">{tr.rolePicker.buyerSub}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setRole(RegisterUserBodyRole.SUPPLIER); setStep(2); }}
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground hover:border-primary cursor-pointer text-center transition-colors w-full"
                >
                  <Building2 className="mb-4 h-8 w-8 text-secondary" />
                  <span className="font-bold text-lg mb-2">{tr.rolePicker.supplierTitle}</span>
                  <span className="text-sm text-muted-foreground">{tr.rolePicker.supplierSub}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Account details ── */}
          {step === 2 && (
            <div>
              <div className="flex items-center mb-6">
                <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="mr-2 h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-bold text-xl">
                  {isBuyer ? tr.form.headingBuyer : tr.form.headingSupplier}
                </h3>
              </div>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(isBuyer ? handleBuyerSubmit : () => setStep(3))}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem><FormLabel>{tr.form.firstName}</FormLabel><FormControl><Input placeholder={tr.form.firstNamePlaceholder} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem><FormLabel>{tr.form.lastName}</FormLabel><FormControl><Input placeholder={tr.form.lastNamePlaceholder} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="companyName" render={({ field }) => (
                      <FormItem><FormLabel>{tr.form.companyName}</FormLabel><FormControl><Input placeholder={tr.form.companyPlaceholder} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem><FormLabel>{tr.form.country}</FormLabel><FormControl><Input placeholder={isBuyer ? tr.form.countryBuyerPlaceholder : tr.form.countrySupplierPlaceholder} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>{tr.form.email}</FormLabel><FormControl><Input placeholder={tr.form.emailPlaceholder} type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>{tr.form.password}</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg mt-6"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isBuyer ? tr.form.createAccount : tr.form.next}
                  </Button>
                </form>
              </Form>
            </div>
          )}

          {/* ── Step 3: Farm Identity (supplier only) ── */}
          {step === 3 && (
            <div className="space-y-4">
              <StepFarmIdentity
                form={supplierForm}
                set={setField}
                lang={lang}
                inputClass={inputClass}
                labelClass={labelClass}
                showEmailField={false}
              />
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => setStep(2)} className="flex-1 px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
                  {tr.form.back}
                </button>
                <button
                  onClick={() => {
                    if (!canAdvanceSupplier()) { alert(lang === "es" ? "Por favor completa todos los campos requeridos." : "Please fill in all required fields."); return; }
                    setStep(4);
                  }}
                  className="flex-1 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  {tr.form.next}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Production (supplier only) ── */}
          {step === 4 && (
            <div className="space-y-4">
              <StepProduction
                form={supplierForm}
                set={setField}
                lang={lang}
                inputClass={inputClass}
                labelClass={labelClass}
              />
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => setStep(3)} className="flex-1 px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
                  {tr.form.back}
                </button>
                <button
                  onClick={() => {
                    if (!canAdvanceSupplier()) { alert(lang === "es" ? "Por favor selecciona un producto principal." : "Please select a primary product."); return; }
                    setStep(5);
                  }}
                  className="flex-1 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  {tr.form.next}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Business Readiness (supplier only) ── */}
          {step === 5 && (
            <div className="space-y-4">
              <StepBusinessReadiness
                form={supplierForm}
                set={setField}
                lang={lang}
                inputClass={inputClass}
                labelClass={labelClass}
              />
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => setStep(4)} className="flex-1 px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
                  {tr.form.back}
                </button>
                <button
                  onClick={() => setStep(6)}
                  className="flex-1 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  {tr.form.next}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 6: Review & Confirm (supplier only) ── */}
          {step === 6 && (
            <ReviewSummary
              sections={reviewSections}
              onBack={() => setStep(5)}
              onSubmit={handleSupplierSubmit}
              submitting={isSubmitting}
              error={submitError}
              lang={lang}
            />
          )}
        </CardContent>

        {step !== 6 && (
          <CardFooter className="flex justify-center border-t p-6 bg-muted/20">
            <div className="text-sm text-muted-foreground text-center">
              {tr.footer.haveAccount}{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                {tr.footer.login}
              </Link>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
