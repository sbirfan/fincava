import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProduct, useUpdateProduct, getListMyProductsQueryKey, getGetProductQueryKey } from "@workspace/api-client-react";
import { useLocation, Link, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2, ImageIcon, CheckCircle2, X, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ObjectUploader } from "@workspace/object-storage-web";
import { ProductTypeSelector, type ProductTypeSchema } from "@/components/product-type-selector";
import { DynamicTypeForm } from "@/components/dynamic-type-form";
import { AiEnrichmentPreview, type EnrichmentApplied, type AiEnrichmentResult } from "@/components/ai-enrichment-preview";

const editSchema = z.object({
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

type EditFormValues = z.infer<typeof editSchema>;

function imageDisplayUrl(path: string): string {
  if (path.startsWith("/objects/")) return `/api/storage${path}`;
  return path;
}

export default function SupplierProductEdit() {
  const params = useParams<{ id: string }>();
  const productId = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const updateProduct = useUpdateProduct();
  const queryClient = useQueryClient();
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const pendingObjectPath = useRef<string | null>(null);

  // V2 state
  const [productTypeKey, setProductTypeKey] = useState<string | undefined>(undefined);
  const [typeAttributes, setTypeAttributes] = useState<Record<string, unknown>>({});
  const [typeSchema, setTypeSchema] = useState<ProductTypeSchema | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichResult, setEnrichResult] = useState<AiEnrichmentResult | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [enrichedAt, setEnrichedAt] = useState<string | null>(null);

  const { data: product, isLoading } = useGetProduct(productId, {
    query: { queryKey: getGetProductQueryKey(productId), enabled: !!productId },
  });

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", category: "", description: "", origin: "", minOrderKg: 100, pricePerKgUSD: 0, availableKg: 0, altitude: "", variety: "", process: "" },
  });

  useEffect(() => {
    if (product) {
      const p = product as any;
      form.reset({
        name: p.name ?? "",
        category: p.category ?? "",
        description: p.description ?? "",
        origin: p.origin ?? "",
        minOrderKg: p.minOrderKg ?? 100,
        pricePerKgUSD: p.pricePerKgUSD ?? 0,
        availableKg: p.availableKg ?? 0,
        altitude: p.altitude ?? "",
        variety: p.variety ?? "",
        process: p.process ?? "",
      });
      setCurrentImage(p.images?.[0] ?? null);
      if (p.productTypeKey) setProductTypeKey(p.productTypeKey);
      if (p.typeAttributes && typeof p.typeAttributes === "object") setTypeAttributes(p.typeAttributes);
      if (p.aiContent?.enrichedAt) setEnrichedAt(p.aiContent.enrichedAt);
    }
  }, [product, form]);

  // Auto-save draft every 60 seconds
  useEffect(() => {
    if (!productId) return;
    const interval = setInterval(() => {
      const values = form.getValues();
      const images = currentImage ? [currentImage] : [];
      updateProduct.mutate(
        { id: productId, data: { ...values, images, productTypeKey, typeAttributes } as any },
        {
          onSuccess: () => setDraftSavedAt(new Date()),
          onError: () => {},
        },
      );
    }, 60_000);
    return () => clearInterval(interval);
  }, [productId, currentImage, productTypeKey, typeAttributes]);

  async function requestUploadParams(file: { name: string; size: number | null; type: string }) {
    const res = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });
    const data = await res.json() as { uploadURL: string; objectPath: string };
    pendingObjectPath.current = data.objectPath;
    return { method: "PUT" as const, url: data.uploadURL, headers: { "Content-Type": file.type } };
  }

  function onSaveDraft(values: EditFormValues) {
    const images = currentImage ? [currentImage] : [];
    updateProduct.mutate(
      { id: productId, data: { ...values, images, productTypeKey, typeAttributes } as any },
      {
        onSuccess: () => {
          toast({ title: "Product updated successfully!" });
          queryClient.invalidateQueries({ queryKey: getListMyProductsQueryKey() });
          setLocation("/supplier-dashboard/products");
        },
        onError: (error) => {
          toast({ title: "Failed to update product", description: (error as any).data?.error || "An error occurred", variant: "destructive" });
        },
      },
    );
  }

  async function onSubmitForReview() {
    if (!form.formState.isValid) { form.trigger(); return; }
    setSubmittingReview(true);
    try {
      const values = form.getValues();
      const images = currentImage ? [currentImage] : [];
      // Save current state first
      await new Promise<void>(resolve => {
        updateProduct.mutate(
          { id: productId, data: { ...values, images, productTypeKey, typeAttributes } as any },
          { onSuccess: () => resolve(), onError: () => resolve() },
        );
      });
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
    if (!productTypeKey) {
      toast({ title: "Select a product type first", variant: "destructive" });
      return;
    }
    setEnrichOpen(true);
    setEnrichLoading(true);
    setEnrichResult(null);
    setEnrichError(null);
    try {
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
        setEnrichedAt(data.enrichment.enrichedAt);
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

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!product && !isLoading) {
    return (
      <div className="max-w-3xl text-center py-16">
        <p className="text-muted-foreground">Product not found.</p>
        <Link href="/supplier-dashboard/products"><Button variant="outline" className="mt-4">Back to Products</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/supplier-dashboard/products">
          <Button variant="ghost" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Edit Product</h1>
          <p className="text-muted-foreground mt-1">
            Update your product details.
            {draftSavedAt && <span className="ml-2 text-xs text-muted-foreground">Draft saved {draftSavedAt.toLocaleTimeString()}</span>}
          </p>
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
                <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="e.g. Supremo Excelso Huila Coffee" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="origin" render={({ field }) => (
                <FormItem><FormLabel>Origin Region</FormLabel><FormControl><Input placeholder="e.g. Huila, Antioquia" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Describe the flavor profile, growing conditions, and unique qualities..." className="min-h-[120px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ImageIcon className="w-4 h-4" />Product Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentImage ? (
                <div className="space-y-3">
                  <div className="rounded-lg overflow-hidden border border-border bg-muted aspect-video w-full max-w-sm relative group">
                    <img src={imageDisplayUrl(currentImage)} alt="Product" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <button type="button" onClick={() => setCurrentImage(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove image">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm text-green-700 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />Image ready</p>
                  <ObjectUploader maxNumberOfFiles={1} maxFileSize={10 * 1024 * 1024} onGetUploadParameters={requestUploadParams} onComplete={() => { if (pendingObjectPath.current) { setCurrentImage(pendingObjectPath.current); pendingObjectPath.current = null; } }} buttonClassName="text-sm underline text-muted-foreground hover:text-foreground">Replace image</ObjectUploader>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/30">
                  <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Upload a photo of your product (JPEG, PNG or WebP, up to 10 MB)</p>
                  <ObjectUploader maxNumberOfFiles={1} maxFileSize={10 * 1024 * 1024} onGetUploadParameters={requestUploadParams} onComplete={() => { if (pendingObjectPath.current) { setCurrentImage(pendingObjectPath.current); pendingObjectPath.current = null; } }} buttonClassName="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">Choose Photo</ObjectUploader>
                </div>
              )}
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

          {/* Type-specific attributes + AI enhance */}
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
                <div className="mt-4 pt-4 border-t space-y-1">
                  <Button type="button" variant="outline" disabled={!canEnhance} onClick={handleEnhance} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Enhance with AI
                  </Button>
                  {enrichedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last enriched {new Date(enrichedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Link href="/supplier-dashboard/products">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" variant="outline" disabled={updateProduct.isPending}>
              {updateProduct.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Draft
            </Button>
            <Button type="button" disabled={submittingReview || !form.formState.isValid} onClick={onSubmitForReview}>
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
