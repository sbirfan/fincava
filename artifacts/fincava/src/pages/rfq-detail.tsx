import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TrustBadge } from "@/components/trust-badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Calendar, Package, DollarSign, Clock, ArrowLeft, Send, Award } from "lucide-react";
import { Link } from "wouter";

export default function RFQDetail() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [showBidForm, setShowBidForm] = useState(false);
  const [bid, setBid] = useState({ pricePerKgUSD: "", leadTimeDays: "", message: "" });

  const { data: rfq, isLoading } = useQuery({
    queryKey: [`/api/rfqs/${params.id}`],
    queryFn: () => fetch(`/api/rfqs/${params.id}`).then(r => r.json()),
    enabled: !!params.id,
  });

  const submitBid = useMutation({
    mutationFn: (data: any) => fetch(`/api/rfqs/${params.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("fincava_token")}` },
      body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Bid submitted!", description: "The buyer will review your proposal." });
      queryClient.invalidateQueries({ queryKey: [`/api/rfqs/${params.id}`] });
      setShowBidForm(false);
    },
  });

  const awardBid = useMutation({
    mutationFn: (responseId: number) => fetch(`/api/rfqs/${params.id}/award/${responseId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("fincava_token")}` },
    }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Bid awarded!", description: "The supplier has been notified." });
      queryClient.invalidateQueries({ queryKey: [`/api/rfqs/${params.id}`] });
    },
  });

  if (isLoading) return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Skeleton className="h-8 w-48 mb-6" />
      <Skeleton className="h-64 rounded-xl mb-4" />
    </div>
  );

  if (!rfq || rfq.error) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <p className="text-xl">RFQ not found</p>
      <Link href="/rfqs"><Button variant="outline" className="mt-4">Back to RFQs</Button></Link>
    </div>
  );

  const days = Math.max(0, Math.ceil((new Date(rfq.deadline).getTime() - Date.now()) / 86400000));

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <Link href="/rfqs">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to RFQs
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main RFQ details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">{rfq.productCategory}</Badge>
                <Badge className={rfq.status === "OPEN" ? "bg-green-100 text-green-700 border-green-200" : "bg-muted text-muted-foreground"}>
                  {rfq.status}
                </Badge>
              </div>
              <h1 className="text-2xl font-serif font-bold mb-4">{rfq.title}</h1>
              <p className="text-muted-foreground leading-relaxed mb-6">{rfq.description}</p>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                {[
                  { icon: Package, label: "Volume", value: `${rfq.quantityKg?.toLocaleString()} kg` },
                  { icon: MapPin, label: "Destination", value: rfq.destination },
                  { icon: DollarSign, label: "Target Price", value: rfq.targetPriceUSD ? `$${rfq.targetPriceUSD}/kg` : "Open" },
                  { icon: Calendar, label: "Deadline", value: `${days} days left` },
                  { icon: Clock, label: "Incoterm", value: rfq.incoterm },
                  { icon: MapPin, label: "Port", value: rfq.destinationPort ?? "TBD" },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <item.icon className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-medium text-sm">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bids comparison table */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Bids Received ({rfq.responses?.length ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {rfq.responses?.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No bids yet. Be the first to respond!</p>
              ) : (
                <div className="space-y-3">
                  {rfq.responses?.map((r: any) => (
                    <div key={r.id} className={`border rounded-lg p-4 ${r.awarded ? "border-primary bg-primary/5" : ""}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{r.supplierName}</span>
                            {r.supplierVerified && <Badge variant="outline" className="text-xs text-primary border-primary/30">Verified</Badge>}
                            <TrustBadge score={r.trustScore ?? 0} size="sm" />
                          </div>
                          <p className="text-xs text-muted-foreground">{r.supplierRegion}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">${r.pricePerKgUSD}</div>
                          <div className="text-xs text-muted-foreground">per kg</div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{r.message}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-sm">
                          <span className="text-muted-foreground">Lead time: <strong>{r.leadTimeDays}d</strong></span>
                          {rfq.quantityKg && <span className="text-muted-foreground">Total: <strong>${(r.pricePerKgUSD * rfq.quantityKg).toLocaleString()}</strong></span>}
                        </div>
                        {user?.role === "BUYER" && rfq.status === "OPEN" && !r.awarded && (
                          <Button size="sm" onClick={() => awardBid.mutate(r.id)} disabled={awardBid.isPending}>
                            <Award className="w-3 h-3 mr-1" /> Award Bid
                          </Button>
                        )}
                        {r.awarded && <Badge className="bg-primary text-white">Awarded</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bid form for suppliers */}
          {user?.role === "SUPPLIER" && rfq.status === "OPEN" && (
            <Card>
              <CardContent className="p-6">
                {!showBidForm ? (
                  <Button className="w-full" onClick={() => setShowBidForm(true)}>
                    <Send className="w-4 h-4 mr-2" /> Submit Your Bid
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Submit Bid</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Price per kg (USD)</Label>
                        <Input type="number" step="0.01" value={bid.pricePerKgUSD} onChange={e => setBid(b => ({ ...b, pricePerKgUSD: e.target.value }))} placeholder="e.g. 12.50" />
                      </div>
                      <div>
                        <Label>Lead Time (days)</Label>
                        <Input type="number" value={bid.leadTimeDays} onChange={e => setBid(b => ({ ...b, leadTimeDays: e.target.value }))} placeholder="e.g. 21" />
                      </div>
                    </div>
                    <div>
                      <Label>Message to Buyer</Label>
                      <Textarea rows={4} value={bid.message} onChange={e => setBid(b => ({ ...b, message: e.target.value }))} placeholder="Describe your product, certifications, available quantity, and any relevant details..." />
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => submitBid.mutate(bid)} disabled={submitBid.isPending || !bid.pricePerKgUSD || !bid.leadTimeDays || !bid.message}>
                        {submitBid.isPending ? "Submitting..." : "Submit Bid"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowBidForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3 text-sm">Buyer</h3>
              <p className="font-medium">{rfq.buyerName}</p>
              {rfq.buyerCountry && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{rfq.buyerCountry}</p>}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-5">
              <h3 className="font-semibold text-sm mb-2 text-primary">Why respond?</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>✓ Direct contact with verified buyer</li>
                <li>✓ Competitive pricing visibility</li>
                <li>✓ Build your trade history</li>
                <li>✓ Improve your trust score</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
