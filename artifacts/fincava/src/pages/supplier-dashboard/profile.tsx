import { useGetMySupplierProfile, useUpdateSupplierProfile } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChangePasswordCard } from "@/components/change-password-card";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Ship } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMySupplierProfileQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";

function ExportModeCard() {
  const { t } = useLanguage();
  const pr = t.supplierDash.profile;
  const { toast } = useToast();
  const [mode, setMode] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerRole, setPartnerRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/supplier/export-mode", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { found: false }))
      .then((data) => {
        if (data.found && data.exportMode) {
          setMode(data.exportMode.mode ?? "");
          setPartnerName(data.exportMode.partnerName ?? "");
          setPartnerRole(data.exportMode.partnerRole ?? "");
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    if (!mode) return;
    setSaving(true);
    try {
      const r = await fetch("/api/supplier/export-mode", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          partnerName: mode === "intermediary" ? partnerName || undefined : undefined,
          partnerRole: mode === "intermediary" ? partnerRole || undefined : undefined,
        }),
      });
      if (!r.ok) throw new Error("Failed");
      toast({ title: pr.exportSaved });
    } catch {
      toast({ title: "Error", description: pr.exportError, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ship className="h-4 w-4 text-muted-foreground" />
          {pr.exportMode}
        </CardTitle>
        <CardDescription>{pr.exportModeDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{pr.exportLabel}</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{pr.exportPlaceholder}</option>
            <option value="direct">{pr.direct}</option>
            <option value="intermediary">{pr.intermediary}</option>
            <option value="not_sure">{pr.notSure}</option>
          </select>
        </div>

        {mode === "intermediary" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{pr.partnerName}</label>
              <Input
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder={pr.partnerNamePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{pr.partnerRole}</label>
              <Input
                value={partnerRole}
                onChange={(e) => setPartnerRole(e.target.value)}
                placeholder={pr.partnerRolePlaceholder}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button onClick={save} disabled={!mode || saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {pr.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const profileSchema = z.object({
  name: z.string().min(2, "Company name is required"),
  type: z.string().min(2, "Company type is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  country: z.string().min(2, "Country is required"),
  region: z.string().optional(),
  website: z.string().optional(),
  farmerName: z.string().optional(),
  originStory: z.string().optional(),
});

export default function SupplierProfile() {
  const { t } = useLanguage();
  const pr = t.supplierDash.profile;
  const { data: profile, isLoading } = useGetMySupplierProfile();
  const updateProfile = useUpdateSupplierProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      type: "",
      description: "",
      country: "",
      region: "",
      website: "",
      farmerName: "",
      originStory: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || "",
        type: profile.type || "",
        description: profile.description || "",
        country: profile.country || "",
        region: profile.region || "",
        website: profile.website || "",
        farmerName: profile.farmerName || "",
        originStory: profile.originStory || "",
      });
    }
  }, [profile, form]);

  function onSubmit(values: z.infer<typeof profileSchema>) {
    updateProfile.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: pr.profileUpdated });
        queryClient.invalidateQueries({ queryKey: getGetMySupplierProfileQueryKey() });
      },
      onError: (error: any) => {
        toast({ 
          title: pr.updateFailed, 
          description: error?.data?.error ?? error?.message,
          variant: "destructive" 
        });
      }
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-64 w-full max-w-3xl rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">{pr.heading}</h1>
        <p className="text-muted-foreground mt-2">{pr.description}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{pr.businessIdentity}</CardTitle>
              <CardDescription>{pr.businessIdentityDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{pr.companyName}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{pr.businessType}</FormLabel>
                      <FormControl>
                        <Input placeholder={pr.businessTypePlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{pr.companyDescription}</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[120px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{pr.country}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{pr.region}</FormLabel>
                      <FormControl>
                        <Input placeholder={pr.regionPlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{pr.website}</FormLabel>
                      <FormControl>
                        <Input placeholder={pr.websitePlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{pr.originStory}</CardTitle>
              <CardDescription>{pr.originStoryDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="farmerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{pr.farmerName}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="originStory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{pr.storyLabel}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={pr.storyPlaceholder} className="min-h-[160px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {pr.saveChanges}
            </Button>
          </div>
        </form>
      </Form>

      <ExportModeCard />

      <ChangePasswordCard />
    </div>
  );
}
