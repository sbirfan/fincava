import { useListConversations } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export default function BuyerMessages() {
  const { data: conversations, isLoading } = useListConversations();

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground mt-2">Communicate directly with your suppliers.</p>
      </div>

      <Card className="flex-1 overflow-hidden flex border-border">
        <div className="w-1/3 border-r flex flex-col bg-muted/10">
          <div className="p-4 border-b font-medium font-serif bg-card">Conversations</div>
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full mb-2 rounded-lg" />
              ))
            ) : conversations && conversations.length > 0 ? (
              conversations.map((conv) => (
                <div key={conv.userId} className="p-3 mb-1 rounded-lg hover:bg-muted cursor-pointer transition-colors border border-transparent">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium truncate pr-2">{conv.userName}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(conv.lastMessageAt), 'MMM dd')}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{conv.lastMessage}</div>
                </div>
              ))
            ) : (
              <div className="text-center p-4 text-muted-foreground text-sm mt-10">
                No active conversations.
              </div>
            )}
          </div>
        </div>
        <div className="w-2/3 flex flex-col bg-card items-center justify-center text-muted-foreground">
          <p>Select a conversation to start messaging</p>
        </div>
      </Card>
    </div>
  );
}
