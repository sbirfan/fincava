import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateProduct } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2, ImageIcon, CheckCircle2, X, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListMyProductsQueryKey } from "@workspace/api-client-react";
import { ObjectUploader } from "@workspace/object-storage-web";
import { ProductTypeSelector, type ProductTypeSchema } from "@/components/product-type-selector";
import { DynamicTypeForm } from "@/components/dynamic-type-form";
import { AiEnrichmentPreview, type EnrichmentApplied, type AiEnrichmentResult } from "@/components/ai-enrichment-preview";

const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  category: z.string().min(2, "Category is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  origin: z.string().min(2, "Origin region is required"),
  minOrderKg: z.coerce.number().min(1, "Must be greater than 0"),
  pricePerKgUSD: z.coerce.number().min(0.01, "Must be greater than 0"),
  availableKg: z.coerce.number().min(0, "Must be positive"),
  altitude: z.string().optional(),
  variety: z.string().optional(),
  process: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function SupplierProductNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  const queryClient = useQueryClient();
  const MAX_PHOTOS = 4;
  const [uploadedPaths, setUploadedPaths] = useState<(string | null)[]>(Array(MAX_PHOTOS).fill(null));
  const pendingPaths = useRef<(string | null)[]>(Array(MAX_PHOTOS).fill(null));

  // V2 state
  const [productTypeKey, setProductTypeKey] = useState<string | undefined>(undefined);
  const [typeAttributes, setTypeAttributes] = useState<Record<string, unknown>>({});
  const [typeSchema, setTypeSchema] = useState<ProductTypeSchema | null>(null);
  const [savedProductId, setSavedProductId] = useState<number | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichResult, setEnrichResult] = useState<AiEnrichmentResult | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      origin: "",
      minOrderKg: 100,
      pricePerKgUSD: 0,
      availableKg: 0,
      altitude: "",
      variety: "",
      process: "",
    },
  });

  function makeRequestUploadParams(slotIndex: number) {
    return async function requestUploadParams(file: { name: string; size: number | null; type: string }) {
      const res = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const data = await res.json() as { uploadURL: string; objectPath: string };
      pendingPaths.current[slotIndex] = data.objectPath;
      return { method: "PUT" as const, url: data.uploadURL, headers: { "Content-Type": file.type } };
    };
  }

  function removePhoto(slotIndex: number) {
    setUploadedPaths(prev => { const next = [...prev]; next[slotIndex] = null; return next; });
  }

  function onSlotComplete(slotIndex: number) {
    if (pendingPaths.current[slotIndex]) {
      setUploadedPaths(prev => { const next = [...prev]; next[slotIndex] = pendingPaths.current[slotIndex]; return next; });
      pendingPaths.current[slotIndex] = null;
    }
  }

  async function saveAsDraft(values: ProductFormValues): Promise<number | null> {
    const images = uploadedPaths.filter((p): p is string => p !== null);
    return new Promise(resolve => {
      createProduct.mutate(
        { data: { ...values, images, productTypeKey, typeAttributes } as any },
        {
          onSuccess: (data: any) => resolve(data?.id ?? null),
          onError: () => resolve(null),
        },
      );
    });
  }

  async function onSaveDraft(values: ProductFormValues) {
    setSavingDraft(true);
    const images = uploadedPaths.filter((p): p is string => p !== null);
    createProduct.mutate(
      { data: { ...values, images, productTypeKey, typeAttributes } as any },
      {
        onSuccess: () => {
          toast({ title: "Draft saved!" });
          queryClient.invalidateQueries({ queryKey: getListMyProductsQueryKey() });
          setLocation("/supplier-dashboard/products");
        },
        onError: (error) => {
          toast({ title: "Failed to save", description: (error as any).data?.error || "An error occurred", variant: "destructive" });
        },
        onSettled: () => setSavingDraft(false),
      },
    );
  }

  async function onSubmitForReview(values: ProductFormValues) {
    if (!form.formState.isValid) { form.trigger(); return; }
    setSubmittingReview(true);
    try {
      let productId = savedProductId;
      if (!productId) {
        productId = await saveAsDraft(values);
        if (!productId) {
          toast({ title: "Failed to save product", variant: "destructive" });
          return;
        }
        setSavedProductId(productId);
      }
      const res = await fetch(`/api/supplier/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productStatus: "pending_review" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any;
        toast({ title: "Submission failed", description: err.error || "An error occurred", variant: "destructive" });
        return;
      }
      toast({ title: "Submitted for review!" });
      queryClient.invalidateQueries({ queryKey: getListMyProductsQueryKey() });
      setLocation("/supplier-dashboard/products");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleEnhance() {
    const values = form.getValues();
    if (!productTypeKey) {
      toast({ title: "Select a product type first", variant: "destructive" });
      return;
    }
    setEnrichOpen(true);
    setEnrichLoading(true);
    setEnrichResult(null);
    setEnrichError(null);

    try {
      let productId = savedProductId;
      if (!productId) {
        toast({ title: "Saving draft before enhancement…" });
        productId = await saveAsDraft(values);
        if (!productId) {
          setEnrichError("save_failed");
          return;
        }
        setSavedProductId(productId);
        window.history.replaceState(null, "", `/supplier-dashboard/product-edit/${productId}`);
      }

      const res = await fetch(`/api/supplier/products/${productId}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json() as any;
      if (!res.ok || !data.success) {
        setEnrichError(data.error || "enrichment_failed");
      } else {
        setEnrichResult(data.enrichment);
      }
    } catch {
      setEnrichError("enrichment_failed");
    } finally {
      setEnrichLoading(false);
    }
  }

  function applyEnrichment(fields: EnrichmentApplied) {
    form.setValue("description", fields.longEn);
    setEnrichOpen(false);
    toast({ title: "AI descriptions applied" });
  }

  const canEnhance = !!productTypeKey && form.getValues("name").length >= 2;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/supplier-dashboard/products">
          <Button variant="ghost" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Add New Product</h1>
          <p className="text-muted-foreground mt-1">List a new item in your agricultural catalog.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSaveDraft)} className="space-y-8">

          {/* Product Type */}
          <Card>
            <CardHeader><CardTitle>Product Type</CardTitle></CardHeader>
            <CardContent>
              <ProductTypeSelector
                selectedCategory={form.watch("category")}
                selectedTypeKey={productTypeKey}
                existingTypeAttributes={typeAttributes}
                onCategoryChange={cat => form.setValue("category", cat, { shouldValidate: true })}
                onTypeChange={(key, schema) => { setProductTypeKey(key); setTypeSchema(schema); }}
                onTypeAttributesClear={() => setTypeAttributes({})}
              />
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Supremo Excelso Huila Coffee" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="origin" render={({ field }) => (
                <FormItem>
                  <FormLabel>Origin Region</FormLabel>
                  <FormControl><Input placeholder="e.g. Huila, Antioquia" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the flavor profile, growing conditions, and unique qualities..." className="min-h-[120px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Product Photos
                <span className="text-sm font-normal text-muted-foreground ml-1">(up to 4)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
                  const path = uploadedPaths[i];
                  const label = i === 0 ? "Cover Photo" : `Photo ${i + 1}`;
                  return (
                    <div key={i} className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      {path ? (
                        <div className="rounded-lg overflow-hidden border border-border bg-muted aspect-video relative group">
                          <img src={`/api/storage${path}`} alt={label} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removePhoto(i)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove photo">
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ObjectUploader maxNumberOfFiles={1} maxFileSize={10 * 1024 * 1024} onGetUploadParameters={makeRequestUploadParams(i)} onComplete={() => onSlotComplete(i)} buttonClassName="text-xs bg-black/60 text-white px-2 py-1 rounded hover:bg-black/80">Replace</ObjectUploader>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-border rounded-lg aspect-video flex flex-col items-center justify-center bg-muted/30 gap-2">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          <ObjectUploader maxNumberOfFiles={1} maxFileSize={10 * 1024 * 1024} onGetUploadParameters={makeRequestUploadParams(i)} onComplete={() => onSlotComplete(i)} buttonClassName="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-3">
                            {i === 0 ? "Choose Cover" : "Add Photo"}
                          </ObjectUploader>
                        </div>
                      )}
                      {path && <p className="text-xs text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Uploaded</p>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader><CardTitle>Pricing & Inventory</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="pricePerKgUSD" render={({ field }) => (
                  <FormItem><FormLabel>Price per kg (USD)</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="minOrderKg" render={({ field }) => (
                  <FormItem><FormLabel>Min. Order (kg)</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="availableKg" render={({ field }) => (
                  <FormItem><FormLabel>Available Inventory (kg)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Specifics */}
          <Card>
            <CardHeader><CardTitle>Specifics (Optional)</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="altitude" render={({ field }) => (
                  <FormItem><FormLabel>Altitude (m.a.s.l)</FormLabel><FormControl><Input placeholder="e.g. 1750m" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="variety" render={({ field }) => (
                  <FormItem><FormLabel>Variety</FormLabel><FormControl><Input placeholder="e.g. Caturra, Castillo" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="process" render={({ field }) => (
                  <FormItem><FormLabel>Process</FormLabel><FormControl><Input placeholder="e.g. Washed, Natural" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Type-specific attributes */}
          {typeSchema && (
            <Card>
              <CardHeader><CardTitle>Type Details</CardTitle></CardHeader>
              <CardContent>
                <DynamicTypeForm
                  schema={typeSchema}
                  values={typeAttributes}
                  onChange={(key, val) => setTypeAttributes(prev => ({ ...prev, [key]: val }))}
                  mode="save"
                />
                <div className="mt-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canEnhance}
                    onClick={handleEnhance}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Enhance with AI
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    {canEnhance ? "Generate bilingual descriptions from your product data." : "Add a product name and type first."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Link href="/supplier-dashboard/products">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" variant="outline" disabled={createProduct.isPending || savingDraft}>
              {savingDraft ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Draft
            </Button>
            <Button
              type="button"
              disabled={submittingReview || !form.formState.isValid}
              onClick={form.handleSubmit(onSubmitForReview)}
            >
              {submittingReview ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit for Review
            </Button>
          </div>
        </form>
      </Form>

      <AiEnrichmentPreview
        open={enrichOpen}
        loading={enrichLoading}
        enrichment={enrichResult}
        error={enrichError}
        onApply={applyEnrichment}
        onDismiss={() => setEnrichOpen(false)}
      />
    </div>
  );
}
