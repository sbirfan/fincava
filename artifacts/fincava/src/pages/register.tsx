import { useState } from "react";
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
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Building2, ShoppingCart } from "lucide-react";
import { RegisterUserBodyRole } from "@workspace/api-client-react";

const baseSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  companyName: z.string().min(2, "Company name is required"),
  country: z.string().min(2, "Country is required"),
});

export default function Register() {
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<RegisterUserBodyRole>(RegisterUserBodyRole.BUYER);
  
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const registerMutation = useRegisterUser();

  const form = useForm<z.infer<typeof baseSchema>>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      companyName: "",
      country: "",
    },
  });

  function onSubmit(values: z.infer<typeof baseSchema>) {
    registerMutation.mutate({ 
      data: { ...values, role } 
    }, {
      onSuccess: (data) => {
        login(data.token, data.user);
        toast({
          title: "Account created",
          description: "Welcome to Fincava!",
        });
        if (data.user.role === "SUPPLIER") {
          setLocation("/supplier-dashboard");
        } else {
          setLocation("/dashboard");
        }
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: error.data?.error || "Could not create account. Please try again.",
        });
      }
    });
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30 py-12">
      <Card className="w-full max-w-xl border-border shadow-md">
        <CardHeader className="text-center space-y-2 pb-8 border-b">
          <CardTitle className="text-3xl font-serif font-bold text-primary">Create an Account</CardTitle>
          <CardDescription>
            Join Fincava to source or sell premium Colombian agricultural products
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 md:p-8">
          {step === 1 ? (
            <div className="space-y-8">
              <div className="text-center mb-6">
                <h3 className="text-xl font-medium mb-2">How do you want to use Fincava?</h3>
                <p className="text-sm text-muted-foreground">Select your account type to continue</p>
              </div>
              
              <RadioGroup value={role} onValueChange={(v) => setRole(v as RegisterUserBodyRole)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value={RegisterUserBodyRole.BUYER} id="buyer" className="peer sr-only" />
                  <label
                    htmlFor="buyer"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center"
                  >
                    <ShoppingCart className="mb-4 h-8 w-8 text-primary" />
                    <span className="font-bold text-lg mb-2">I am a Buyer</span>
                    <span className="text-sm text-muted-foreground">I want to source verified agricultural products from Colombia</span>
                  </label>
                </div>
                
                <div>
                  <RadioGroupItem value={RegisterUserBodyRole.SUPPLIER} id="supplier" className="peer sr-only" />
                  <label
                    htmlFor="supplier"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center"
                  >
                    <Building2 className="mb-4 h-8 w-8 text-secondary" />
                    <span className="font-bold text-lg mb-2">I am a Supplier</span>
                    <span className="text-sm text-muted-foreground">I produce or export agricultural goods from Colombia</span>
                  </label>
                </div>
              </RadioGroup>
              
              <Button className="w-full h-12 text-lg mt-8" onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center mb-6">
                <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="mr-2 h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-bold text-xl">
                  {role === RegisterUserBodyRole.BUYER ? "Buyer" : "Supplier"} Details
                </h3>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Imports" {...field} />
                          </FormControl>
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
                          <FormControl>
                            <Input placeholder={role === RegisterUserBodyRole.SUPPLIER ? "Colombia" : "United Arab Emirates"} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg mt-6"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Account
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t p-6 bg-muted/20">
          <div className="text-sm text-muted-foreground text-center">
            Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
