import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, MessageSquare, Package, MapPin, Calendar, DollarSign, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface RFQ {
  id: number;
  title: string;
  productCategory: string;
  quantityKg: number;
  destination: string;
  deadline: string;
  status: string;
  responseCount: number;
  createdAt: string;
}

export default function BuyerRFQs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", productCategory: "COFFEE",
    quantityKg: "", targetPriceUSD: "", destination: "",
    destinationPort: "", incoterm: "FOB", deadline: "",
  });

  const { data: rfqs, isLoading } = useQuery<RFQ[]>({
    queryKey: ["/api/buyer/rfqs"],
    queryFn: () => fetch("/api/buyer/rfqs", { credentials: "include" }).then(r => r.json()),
  });

  const createRFQ = useMutation({
    mutationFn: (data: any) => fetch("/api/rfqs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: (res) => {
      if (res.error) { toast({ title: "Error", description: res.error, variant: "destructive" }); return; }
      toast({ title: "RFQ posted!", description: "Suppliers can now submit bids." });
      queryClient.invalidateQueries({ queryKey: ["/api/buyer/rfqs"] });
      setOpen(false);
      setForm({ title: "", description: "", productCategory: "COFFEE", quantityKg: "", targetPriceUSD: "", destination: "", destinationPort: "", incoterm: "FOB", deadline: "" });
    },
  });

  const statusColor: Record<string, string> = {
    OPEN: "bg-green-100 text-green-700 border-green-200",
    AWARDED: "bg-blue-100 text-blue-700 border-blue-200",
    CLOSED: "bg-muted text-muted-foreground",
    CANCELLED: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">My RFQs</h1>
          <p className="text-muted-foreground">Post sourcing requests and manage supplier bids</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Post New RFQ</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-serif text-xl">New Request for Quote</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Specialty Coffee for Roastery — Dubai" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe quality requirements, certifications needed, delivery terms..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Product Category</Label>
                  <Select value={form.productCategory} onValueChange={v => setForm(f => ({ ...f, productCategory: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COFFEE">Coffee</SelectItem>
                      <SelectItem value="CACAO">Cacao</SelectItem>
                      <SelectItem value="AVOCADO">Avocado</SelectItem>
                      <SelectItem value="SUPERFOOD">Superfoods</SelectItem>
                      <SelectItem value="EXOTIC_FRUIT">Exotic Fruits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Incoterm</Label>
                  <Select value={form.incoterm} onValueChange={v => setForm(f => ({ ...f, incoterm: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOB">FOB — Free on Board</SelectItem>
                      <SelectItem value="CIF">CIF — Cost, Insurance, Freight</SelectItem>
                      <SelectItem value="EXW">EXW — Ex Works</SelectItem>
                      <SelectItem value="DDP">DDP — Delivered Duty Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity (kg)</Label>
                  <Input type="number" value={form.quantityKg} onChange={e => setForm(f => ({ ...f, quantityKg: e.target.value }))} placeholder="e.g. 5000" />
                </div>
                <div>
                  <Label>Target Price ($/kg) — optional</Label>
                  <Input type="number" step="0.01" value={form.targetPriceUSD} onChange={e => setForm(f => ({ ...f, targetPriceUSD: e.target.value }))} placeholder="e.g. 12.50" />
                </div>
                <div>
                  <Label>Destination Country</Label>
                  <Input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="e.g. UAE" />
                </div>
                <div>
                  <Label>Destination Port — optional</Label>
                  <Input value={form.destinationPort} onChange={e => setForm(f => ({ ...f, destinationPort: e.target.value }))} placeholder="e.g. Jebel Ali Port" />
                </div>
              </div>
              <div>
                <Label>Submission Deadline</Label>
                <Input type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
              <Button
                className="w-full"
                disabled={!form.title || !form.description || !form.quantityKg || !form.destination || !form.deadline || createRFQ.isPending}
                onClick={() => createRFQ.mutate({ ...form, quantityKg: parseFloat(form.quantityKg), targetPriceUSD: form.targetPriceUSD ? parseFloat(form.targetPriceUSD) : undefined })}
              >
                {createRFQ.isPending ? "Posting..." : "Post RFQ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : !rfqs?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No RFQs yet</p>
            <p className="text-muted-foreground mb-4">Post your first sourcing request to get quotes from Colombian suppliers.</p>
            <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Post First RFQ</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rfqs.map(rfq => (
            <Link key={rfq.id} href={`/rfq/${rfq.id}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{rfq.productCategory}</Badge>
                        <Badge className={`text-xs ${statusColor[rfq.status] ?? ""}`}>{rfq.status}</Badge>
                      </div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors mb-2">{rfq.title}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" />{rfq.quantityKg?.toLocaleString()} kg</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{rfq.destination}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(rfq.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold text-primary">{rfq.responseCount}</div>
                      <div className="text-xs text-muted-foreground">bids</div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
