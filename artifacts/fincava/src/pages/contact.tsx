import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Mail, Phone, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  userType: z.enum(["BUYER", "SUPPLIER", "OTHER"]).optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export default function Contact() {
  const { t } = useLanguage();
  const c = t.contact;
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      userType: undefined,
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof contactSchema>) {
    console.log(values);
    toast({
      title: c.successTitle,
      description: c.successDesc,
    });
    form.reset();
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif font-bold mb-4">{c.heading}</h1>
        <p className="text-lg text-muted-foreground">{c.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
              <CardTitle className="text-2xl font-serif">{c.getInTouch}</CardTitle>
              <CardDescription className="text-base">
                {c.getInTouchDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-8 mt-4">
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-primary mr-4 mt-0.5" />
                <div>
                  <h4 className="font-medium">{c.officeLabel}</h4>
                  <p className="text-muted-foreground text-sm">{c.officeAddress}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-primary mr-4 mt-0.5" />
                <div>
                  <h4 className="font-medium">{c.emailLabel}</h4>
                  <p className="text-muted-foreground text-sm">info@fincava.com</p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="w-5 h-5 text-primary mr-4 mt-0.5" />
                <div>
                  <h4 className="font-medium">{c.phoneLabel}</h4>
                  <p className="text-muted-foreground text-sm">{c.phoneColombia}</p>
                  <p className="text-muted-foreground text-sm">{c.phoneUS}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MessageCircle className="w-5 h-5 text-[#25D366] mr-4 mt-0.5" />
                <div>
                  <h4 className="font-medium">{c.whatsappLabel}</h4>
                  <p className="text-muted-foreground text-sm">{c.whatsappUS}</p>
                  <Button variant="outline" className="mt-3 text-[#25D366] border-[#25D366] hover:bg-[#25D366] hover:text-white" onClick={() => window.open('https://wa.me/15123600118', '_blank')}>
                    {c.chatBtn}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent className="p-6 md:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{c.fullName}</FormLabel>
                        <FormControl>
                          <Input placeholder={c.fullNamePlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{c.emailField}</FormLabel>
                          <FormControl>
                            <Input placeholder={c.emailPlaceholder} type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{c.phone}</FormLabel>
                          <FormControl>
                            <Input placeholder={c.phonePlaceholder} type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{c.company}</FormLabel>
                          <FormControl>
                            <Input placeholder={c.companyPlaceholder} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="userType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{c.iAm}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={c.iAmPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="BUYER">{c.buyer}</SelectItem>
                              <SelectItem value="SUPPLIER">{c.supplier}</SelectItem>
                              <SelectItem value="OTHER">{c.other}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{c.message}</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={c.messagePlaceholder}
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">{c.sendBtn}</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
