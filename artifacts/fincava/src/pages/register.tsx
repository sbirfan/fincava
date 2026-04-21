import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const accountSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  companyName: z.string().min(2, "Company name is required"),
  country: z.string().min(2, "Country is required"),
});

type AccountData = z.infer<typeof accountSchema>;

interface SupplierFormData {
  farm_name: string;
  owner_name: string;
  phone: string;
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
}

const SUPPLIER_INITIAL: SupplierFormData = {
  farm_name: "", owner_name: "", phone: "", department: "", municipio: "", vereda: "",
  primary_product: "", other_product: "", farm_size_hectares: "",
  annual_volume_kg: "", harvest_months: "", organic_certified: "",
  currently_exporting: "", has_rut: "", has_bank_account: "",
  working_capital_needed: "", export_blocker: "",
};

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function Register() {
  const { lang } = useLanguage();
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

  const form = useForm<AccountData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: "", password: "", firstName: "", lastName: "", companyName: "", country: "",
    },
  });

  const setField = (field: string, value: string) =>
    setSupplierForm((prev) => ({ ...prev, [field]: value }));

  const isBuyer = role === RegisterUserBodyRole.BUYER;

  const totalSteps = isBuyer ? 2 : 6;

  const stepLabels = isBuyer
    ? ["Role", "Details"]
    : ["Role", "Account", "Farm", "Production", "Readiness", "Review"];

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
          toast({ title: "Account created", description: "Welcome to Fincava!" });
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Registration failed",
            description: error.data?.error || "Could not create account. Please try again.",
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

      toast({ title: "Welcome to Fincava!", description: "Your supplier profile has been created." });
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

  const yesNo = (v: string) => (v === "yes" ? "Yes" : v === "no" ? "No" : "—");

  const reviewSections: ReviewSection[] = [
    {
      title: "Account",
      onEdit: () => setStep(2),
      rows: [
        { label: "Name", value: `${form.getValues("firstName")} ${form.getValues("lastName")}` },
        { label: "Company", value: form.getValues("companyName") },
        { label: "Country", value: form.getValues("country") },
        { label: "Email", value: form.getValues("email") },
      ],
    },
    {
      title: "Farm Information",
      onEdit: () => setStep(3),
      rows: [
        { label: "Farm Name", value: supplierForm.farm_name },
        { label: "Owner", value: supplierForm.owner_name },
        { label: "Phone", value: supplierForm.phone },
        { label: "Department", value: supplierForm.department },
        { label: "Municipality", value: supplierForm.municipio },
        { label: "Vereda", value: supplierForm.vereda },
      ],
    },
    {
      title: "Production",
      onEdit: () => setStep(4),
      rows: [
        { label: "Primary Product", value: productLabel() },
        { label: "Farm Size (ha)", value: supplierForm.farm_size_hectares },
        { label: "Annual Volume (kg)", value: supplierForm.annual_volume_kg },
        { label: "Harvest Months", value: supplierForm.harvest_months },
        { label: "Organic Certified", value: yesNo(supplierForm.organic_certified) },
      ],
    },
    {
      title: "Export Readiness",
      onEdit: () => setStep(5),
      rows: [
        { label: "Currently Exporting", value: yesNo(supplierForm.currently_exporting) },
        { label: "Has RUT", value: yesNo(supplierForm.has_rut) },
        { label: "Has Bank Account", value: yesNo(supplierForm.has_bank_account) },
        { label: "Capital Needed (USD)", value: supplierForm.working_capital_needed },
        { label: "Export Blocker", value: supplierForm.export_blocker },
      ],
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30 py-12">
      <Card className="w-full max-w-xl border-border shadow-md">
        <CardHeader className="text-center space-y-2 pb-6 border-b">
          <CardTitle className="text-3xl font-serif font-bold text-primary">Create an Account</CardTitle>
          <CardDescription>
            Join Fincava to source or sell premium Colombian agricultural products
          </CardDescription>
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
                <h3 className="text-xl font-medium mb-2">How do you want to use Fincava?</h3>
                <p className="text-sm text-muted-foreground">Select your account type to get started</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => { setRole(RegisterUserBodyRole.BUYER); setStep(2); }}
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground hover:border-primary cursor-pointer text-center transition-colors w-full"
                >
                  <ShoppingCart className="mb-4 h-8 w-8 text-primary" />
                  <span className="font-bold text-lg mb-2">I am a Buyer</span>
                  <span className="text-sm text-muted-foreground">I want to source verified agricultural products from Colombia</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setRole(RegisterUserBodyRole.SUPPLIER); setStep(2); }}
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground hover:border-primary cursor-pointer text-center transition-colors w-full"
                >
                  <Building2 className="mb-4 h-8 w-8 text-secondary" />
                  <span className="font-bold text-lg mb-2">I am a Supplier</span>
                  <span className="text-sm text-muted-foreground">I produce or export agricultural goods from Colombia</span>
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
                  {isBuyer ? "Buyer" : "Supplier"} Account Details
                </h3>
              </div>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(isBuyer ? handleBuyerSubmit : () => setStep(3))}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="companyName" render={({ field }) => (
                      <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="Acme Imports" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder={isBuyer ? "United Arab Emirates" : "Colombia"} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="name@example.com" type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg mt-6"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : null}
                    {isBuyer ? "Create Account" : "Next →"}
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
              />
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => setStep(2)} className="flex-1 px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (!canAdvanceSupplier()) { alert("Please fill in all required fields."); return; }
                    setStep(4);
                  }}
                  className="flex-1 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  Next →
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
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (!canAdvanceSupplier()) { alert("Please select a primary product."); return; }
                    setStep(5);
                  }}
                  className="flex-1 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  Next →
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
                  ← Back
                </button>
                <button
                  onClick={() => setStep(6)}
                  className="flex-1 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  Next →
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
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
