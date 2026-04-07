import { useListSupplierInquiries, useUpdateInquiryStatus } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { getListSupplierInquiriesQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function SupplierInquiries() {
  const { data: inquiries, isLoading } = useListSupplierInquiries();
  const updateStatus = useUpdateInquiryStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleUpdateStatus = (id: number, status: 'RESPONDED' | 'CLOSED') => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: `Inquiry marked as ${status.toLowerCase()}` });
        queryClient.invalidateQueries({ queryKey: getListSupplierInquiriesQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Received Inquiries</h1>
        <p className="text-muted-foreground mt-2">Manage requests from potential buyers.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : inquiries && inquiries.length > 0 ? (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2 border-b mb-4">
                <div>
                  <CardTitle className="text-lg font-serif mb-1">
                    Interest in {inquiry.productName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    From: {inquiry.buyerName} ({inquiry.company}) • {inquiry.country}
                    <span className="text-xs">{format(new Date(inquiry.createdAt), 'MMM dd, yyyy')}</span>
                  </p>
                </div>
                <Badge variant={inquiry.status === 'PENDING' ? 'default' : 'secondary'}>
                  {inquiry.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg text-sm border">
                    <p className="font-medium mb-2">Message:</p>
                    <p className="whitespace-pre-wrap">{inquiry.message}</p>
                    {inquiry.quantityKg && (
                      <p className="mt-3 font-medium text-primary">Requested Quantity: {inquiry.quantityKg} kg</p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="text-sm text-muted-foreground">
                      Contact Email: <a href={`mailto:${inquiry.buyerEmail}`} className="text-primary hover:underline">{inquiry.buyerEmail}</a>
                    </div>
                    
                    {inquiry.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateStatus(inquiry.id, 'CLOSED')}
                        >
                          Close Request
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleUpdateStatus(inquiry.id, 'RESPONDED')}
                        >
                          Mark as Responded
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-xl font-serif font-bold mb-2">No inquiries yet</p>
            <p className="text-muted-foreground">You haven't received any inquiries for your products yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
