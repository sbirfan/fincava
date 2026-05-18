import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Send, MessageSquare, Languages, Eye, EyeOff,
  LifeBuoy, X, AlertTriangle, Loader2, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

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
  translatedContent: string | null;
  detectedLang: string | null;
  read: boolean;
  createdAt: string;
}

function TranslationBanner({ onDismiss, msgs }: { onDismiss: () => void; msgs: ReturnType<typeof useLanguage>["t"]["buyerDash"]["messages"] }) {
  return (
    <div className="mx-4 mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 flex items-start gap-3">
      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 text-xs text-amber-300/90 leading-relaxed">
        <span className="font-semibold">{msgs.translationBannerTitle}</span> — {msgs.translationBannerDesc}{" "}
        <span className="text-amber-400/70">{msgs.translationOriginalNote}</span>
      </div>
      <button onClick={onDismiss} className="text-amber-400/60 hover:text-amber-300 shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function MessageBubble({
  msg,
  isMe,
  showTranslated,
  msgs,
}: {
  msg: Message;
  isMe: boolean;
  showTranslated: boolean;
  msgs: ReturnType<typeof useLanguage>["t"]["buyerDash"]["messages"];
}) {
  const [seeOriginal, setSeeOriginal] = useState(false);

  const displayText =
    showTranslated && msg.translatedContent && !seeOriginal
      ? msg.translatedContent
      : msg.content;

  const canToggle = showTranslated && !!msg.translatedContent;

  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[70%] space-y-1", isMe ? "items-end flex flex-col" : "items-start flex flex-col")}>
        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl text-sm",
            isMe
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          )}
        >
          <p className="leading-relaxed">{displayText}</p>
          <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
            {format(new Date(msg.createdAt), "h:mm a")}
            {showTranslated && msg.detectedLang && (
              <span className="ml-1.5 opacity-60">· orig: {msg.detectedLang?.toUpperCase()}</span>
            )}
          </p>
        </div>

        {canToggle && (
          <button
            onClick={() => setSeeOriginal(v => !v)}
            className={cn(
              "flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors",
              isMe ? "pr-1" : "pl-1"
            )}
          >
            {seeOriginal ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
            {seeOriginal ? msgs.showTranslation : msgs.readOriginal}
          </button>
        )}
      </div>
    </div>
  );
}

function EscalateModal({
  otherId,
  otherName,
  onClose,
  msgs,
}: {
  otherId: number;
  otherName: string;
  onClose: () => void;
  msgs: ReturnType<typeof useLanguage>["t"]["buyerDash"]["messages"];
}) {
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const escalate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/messages/${otherId}/escalate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => setDone(true),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        {done ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="font-semibold text-foreground">{msgs.escalateSuccess}</p>
            <p className="text-sm text-muted-foreground">{msgs.escalateSuccessDesc}</p>
            <Button onClick={onClose} className="mt-2">{msgs.escalateClose}</Button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4 text-primary" />
                  {msgs.escalateHeading}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {msgs.escalateSubheading.replace("{name}", otherName)}
                </p>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-300/80">
              {msgs.escalateAlert}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{msgs.escalateLabel}</label>
              <textarea
                className="w-full h-28 bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                placeholder={msgs.escalatePlaceholder}
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={1000}
              />
              <p className="text-[10px] text-muted-foreground text-right">{note.length}/1000</p>
            </div>

            {escalate.isError && (
              <p className="text-xs text-red-400">{msgs.escalateError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1">{msgs.escalateCancel}</Button>
              <Button
                onClick={() => escalate.mutate()}
                disabled={!note.trim() || escalate.isPending}
                className="flex-1"
              >
                {escalate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : msgs.escalateSend}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BuyerMessages() {
  const { t } = useLanguage();
  const msgs = t.buyerDash.messages;
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [showTranslated, setShowTranslated] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowTranslated(false);
    setBannerDismissed(false);
  }, [selectedUserId]);

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

  const translate = useMutation({
    mutationFn: async (targetLang: "en" | "es") => {
      const res = await fetch(`/api/messages/${selectedUserId}/translate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLang }),
      });
      if (!res.ok) throw new Error("Translation failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
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

  function handleToggleTranslation() {
    const next = !showTranslated;
    setShowTranslated(next);
    setBannerDismissed(false);

    if (next && messages) {
      const needsTranslation = messages.some(m => !m.translatedContent);
      if (needsTranslation) {
        const browserLang = navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
        translate.mutate(browserLang);
      }
    }
  }

  const selectedConv = conversations?.find(c => c.userId === selectedUserId);
  const currentUserId = (user as any)?.id;

  const hasAnyTranslation = messages?.some(m => m.translatedContent);
  const translationPending = translate.isPending;

  return (
    <>
      {escalateOpen && selectedConv && (
        <EscalateModal
          otherId={selectedConv.userId}
          otherName={selectedConv.userName}
          onClose={() => setEscalateOpen(false)}
          msgs={msgs}
        />
      )}

      <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">{msgs.heading}</h1>
          <p className="text-muted-foreground mt-1">{msgs.description}</p>
        </div>

        <Card className="flex-1 overflow-hidden flex border-border min-h-0">
          {/* Conversation list */}
          <div className="w-[280px] shrink-0 border-r flex flex-col bg-muted/10">
            <div className="p-4 border-b font-semibold font-serif bg-card flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              {msgs.conversations}
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
                  {msgs.noConversations}
                </div>
              )}
            </div>
          </div>

          {/* Message thread */}
          <div className="flex-1 flex flex-col min-w-0 bg-card">
            {selectedUserId ? (
              <>
                {/* Thread header */}
                <div className="p-4 border-b bg-muted/5 flex items-center gap-3 flex-wrap">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {selectedConv?.userName?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{selectedConv?.userName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{selectedConv?.userRole?.toLowerCase()}</p>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">{msgs.live}</span>
                    </div>

                    <button
                      onClick={handleToggleTranslation}
                      disabled={translationPending}
                      title={showTranslated ? msgs.showOriginals : msgs.autoTranslate}
                      className={cn(
                        "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                        showTranslated
                          ? "bg-blue-500/20 border-blue-500/30 text-blue-300"
                          : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      {translationPending
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Languages className="h-3 w-3" />
                      }
                      {showTranslated ? msgs.translated : msgs.translate}
                    </button>

                    <button
                      onClick={() => setEscalateOpen(true)}
                      title={msgs.contactFincava}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <LifeBuoy className="h-3 w-3" />
                      {msgs.needHelp}
                    </button>
                  </div>
                </div>

                {/* Translation disclaimer banner */}
                {showTranslated && !bannerDismissed && (
                  <TranslationBanner onDismiss={() => setBannerDismissed(true)} msgs={msgs} />
                )}

                {/* Message list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMsgs ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                        <Skeleton className="h-10 w-48 rounded-2xl" />
                      </div>
                    ))
                  ) : messages && messages.length > 0 ? (
                    <>
                      {showTranslated && translationPending && (
                        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {msgs.translating}
                        </div>
                      )}
                      {messages.map(msg => (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          isMe={msg.senderId === currentUserId}
                          showTranslated={showTranslated && hasAnyTranslation === true}
                          msgs={msgs}
                        />
                      ))}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-12">
                      {msgs.noMessages}
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Compose box */}
                <div className="p-4 border-t bg-card">
                  <form
                    className="flex gap-2"
                    onSubmit={e => { e.preventDefault(); handleSend(); }}
                  >
                    <Input
                      placeholder={msgs.composePlaceholder}
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
                <p className="text-sm">{msgs.selectConversation}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
