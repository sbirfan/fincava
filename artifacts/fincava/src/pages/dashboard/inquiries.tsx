import { useListBuyerInquiries } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "RESPONDED") return "default";
  if (status === "CLOSED") return "secondary";
  return "outline";
}

function statusClassName(status: string): string {
  if (status === "PENDING") return "border-amber-400 text-amber-700 bg-amber-50";
  return "";
}

export default function BuyerInquiries() {
  const { t } = useLanguage();
  const inq = t.buyerDash.inquiries;
  const { data: inquiries, isLoading } = useListBuyerInquiries();

  function statusLabel(status: string): string {
    if (status === "RESPONDED") return inq.responded;
    if (status === "CLOSED") return inq.closed;
    return inq.pending;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">{inq.heading}</h1>
        <p className="text-muted-foreground mt-2">{inq.description}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : inquiries && inquiries.length > 0 ? (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-serif">{inquiry.productName}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(inquiry.createdAt).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}
                  </p>
                </div>
                <Badge variant={statusVariant(inquiry.status)} className={statusClassName(inquiry.status)}>
                  {statusLabel(inquiry.status)}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{inq.supplier}</p>
                    <p>{inquiry.supplierName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{inq.quantityRequested}</p>
                    <p>{inquiry.quantityKg ? `${inquiry.quantityKg} kg` : inq.notSpecified}</p>
                  </div>
                  <div className="col-span-full">
                    <p className="text-sm font-medium text-muted-foreground mb-1">{inq.message}</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-md">{inquiry.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium mb-2">{inq.noInquiries}</p>
            <p className="text-muted-foreground mb-3">{inq.browsePrompt}</p>
            <Link href="/suppliers">
              <Button variant="outline" size="sm">{inq.browseBtn}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
