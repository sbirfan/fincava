import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Conversation {
  userId: number;
  userName: string;
  userRole: string;
  userAvatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  receiverId: number;
  content: string;
  read: boolean;
  createdAt: string;
}

export default function BuyerMessages() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: loadingConvs } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    queryFn: () =>
      fetch("/api/messages/conversations", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 5000,
  });

  const { data: messages, isLoading: loadingMsgs } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedUserId],
    queryFn: () =>
      fetch(`/api/messages/${selectedUserId}`, { credentials: "include" }).then(r => {
        if (!r.ok) throw new Error(`Failed to load messages (HTTP ${r.status})`);
        return r.json();
      }),
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  const send = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/messages/${selectedUserId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const content = draft.trim();
    if (!content || !selectedUserId) return;
    send.mutate(content);
  }

  const selectedConv = conversations?.find(c => c.userId === selectedUserId);
  const currentUserId = (user as any)?.id;

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground mt-1">Live conversations with your suppliers.</p>
      </div>

      <Card className="flex-1 overflow-hidden flex border-border min-h-0">
        {/* Conversation list */}
        <div className="w-[280px] shrink-0 border-r flex flex-col bg-muted/10">
          <div className="p-4 border-b font-semibold font-serif bg-card flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Conversations
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingConvs ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full mb-2 rounded-lg" />
              ))
            ) : conversations && conversations.length > 0 ? (
              conversations.map(conv => (
                <button
                  key={conv.userId}
                  onClick={() => setSelectedUserId(conv.userId)}
                  className={cn(
                    "w-full text-left p-3 mb-1 rounded-lg transition-colors border",
                    selectedUserId === conv.userId
                      ? "bg-primary/10 border-primary/20 text-foreground"
                      : "border-transparent hover:bg-muted"
                  )}
                >
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium text-sm truncate pr-2">{conv.userName}</span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(conv.lastMessageAt), "MMM d")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-muted-foreground truncate">{conv.lastMessage}</span>
                    {conv.unreadCount > 0 && (
                      <Badge className="ml-1 h-4 min-w-[16px] px-1 text-[10px] bg-primary shrink-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center p-6 text-muted-foreground text-sm mt-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No active conversations yet.
              </div>
            )}
          </div>
        </div>

        {/* Message thread */}
        <div className="flex-1 flex flex-col min-w-0 bg-card">
          {selectedUserId ? (
            <>
              <div className="p-4 border-b bg-muted/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {selectedConv?.userName?.charAt(0) ?? "?"}
                </div>
                <div>
                  <p className="font-semibold text-sm">{selectedConv?.userName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{selectedConv?.userRole?.toLowerCase()}</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                      <Skeleton className="h-10 w-48 rounded-2xl" />
                    </div>
                  ))
                ) : messages && messages.length > 0 ? (
                  messages.map(msg => {
                    const isMe = msg.senderId === currentUserId;
                    return (
                      <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                          )}
                        >
                          <p className="leading-relaxed">{msg.content}</p>
                          <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                            {format(new Date(msg.createdAt), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-12">
                    No messages yet — send the first one.
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="p-4 border-t bg-card">
                <form
                  className="flex gap-2"
                  onSubmit={e => { e.preventDefault(); handleSend(); }}
                >
                  <Input
                    placeholder="Type a message…"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button type="submit" size="icon" disabled={!draft.trim() || send.isPending} className="shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm">Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
