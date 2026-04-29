import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProduct } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2, ImageIcon, CheckCircle2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListMyProductsQueryKey } from "@workspace/api-client-react";
import { ObjectUploader } from "@workspace/object-storage-web";

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

export default function SupplierProductNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  const queryClient = useQueryClient();
  const [uploadedObjectPath, setUploadedObjectPath] = useState<string | null>(null);
  const pendingObjectPath = useRef<string | null>(null);

  const form = useForm<z.infer<typeof productSchema>>({
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

  function onSubmit(values: z.infer<typeof productSchema>) {
    const images = uploadedObjectPath ? [uploadedObjectPath] : [];
    createProduct.mutate({ data: { ...values, images } }, {
      onSuccess: () => {
        toast({ title: "Product created successfully!" });
        queryClient.invalidateQueries({ queryKey: getListMyProductsQueryKey() });
        setLocation("/supplier-dashboard/products");
      },
      onError: (error) => {
        toast({
          title: "Failed to create product",
          description: (error as any).data?.error || "An error occurred",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/supplier-dashboard/products">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Add New Product</h1>
          <p className="text-muted-foreground mt-1">List a new item in your agricultural catalog.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Supremo Excelso Huila Coffee" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="COFFEE">Coffee</SelectItem>
                          <SelectItem value="CACAO">Cacao</SelectItem>
                          <SelectItem value="AVOCADO">Avocado</SelectItem>
                          <SelectItem value="EXOTIC_FRUIT">Exotic Fruits</SelectItem>
                          <SelectItem value="SUPERFOOD">Superfoods</SelectItem>
                          <SelectItem value="PROCESSED">Processed</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin Region</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Huila, Antioquia" {...field} />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the flavor profile, growing conditions, and unique qualities..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Product Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadedObjectPath ? (
                <div className="space-y-3">
                  <div className="rounded-lg overflow-hidden border border-border bg-muted aspect-video w-full max-w-sm relative group">
                    <img
                      src={`/api/storage${uploadedObjectPath}`}
                      alt="Uploaded product"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setUploadedObjectPath(null)}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm text-green-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Image uploaded successfully
                  </p>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10 * 1024 * 1024}
                    onGetUploadParameters={requestUploadParams}
                    onComplete={() => {
                      if (pendingObjectPath.current) {
                        setUploadedObjectPath(pendingObjectPath.current);
                        pendingObjectPath.current = null;
                      }
                    }}
                    buttonClassName="text-sm underline text-muted-foreground hover:text-foreground"
                  >
                    Replace image
                  </ObjectUploader>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/30">
                  <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a photo of your product (JPEG, PNG or WebP, up to 10 MB)
                  </p>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10 * 1024 * 1024}
                    onGetUploadParameters={requestUploadParams}
                    onComplete={() => {
                      if (pendingObjectPath.current) {
                        setUploadedObjectPath(pendingObjectPath.current);
                        pendingObjectPath.current = null;
                      }
                    }}
                    buttonClassName="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                  >
                    Choose Photo
                  </ObjectUploader>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="pricePerKgUSD"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per kg (USD)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minOrderKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min. Order (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="availableKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Inventory (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
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
              <CardTitle>Specifics (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="altitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altitude (m.a.s.l)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1750m" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="variety"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variety</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Caturra, Castillo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="process"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Process</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Washed, Natural" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/supplier-dashboard/products">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Product
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
