import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
  ts: number;
}

const STARTER_PROMPTS_BUYER_EN = [
  "How do I post my first RFQ?",
  "What does a verified supplier badge mean?",
  "Which incoterm should I choose for green coffee?",
  "How do escrow payments work on Fincava?",
];

const STARTER_PROMPTS_BUYER_ES = [
  "¿Cómo publico mi primera RFQ?",
  "¿Qué significa la insignia de proveedor verificado?",
  "¿Qué incoterm debo elegir para café verde?",
  "¿Cómo funcionan los pagos en custodia (escrow)?",
];

const STARTER_PROMPTS_SUPPLIER_EN = [
  "How do I add a new product listing?",
  "What documents do I need to export coffee?",
  "How do I improve my supplier score?",
  "What trade finance options are available?",
];

const STARTER_PROMPTS_SUPPLIER_ES = [
  "¿Cómo agrego un nuevo producto?",
  "¿Qué documentos necesito para exportar café?",
  "¿Cómo mejoro mi puntaje de proveedor?",
  "¿Qué opciones de financiamiento comercial hay?",
];

export default function AiAssistant() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isSupplier = user?.role === "SUPPLIER";

  const starters = isSupplier
    ? lang === "es" ? STARTER_PROMPTS_SUPPLIER_ES : STARTER_PROMPTS_SUPPLIER_EN
    : lang === "es" ? STARTER_PROMPTS_BUYER_ES : STARTER_PROMPTS_BUYER_EN;

  const t = lang === "es"
    ? {
        title: "Asistente IA",
        subtitle: "Pregúntale a Fina sobre la plataforma, RFQs, exportación o financiamiento.",
        greeting: `Hola${user?.firstName ? ", " + user.firstName : ""} 👋 Soy Fina, tu asistente de Fincava. ¿En qué puedo ayudarte hoy?`,
        placeholder: "Escribe tu pregunta…",
        thinking: "Fina está pensando…",
        error: "No pude obtener una respuesta. Inténtalo de nuevo.",
        suggestionsLabel: "Prueba con una de estas preguntas:",
        clear: "Nueva conversación",
        you: "Tú",
        assistantName: "Fina",
        assistantRole: "Asistente IA de Fincava",
      }
    : {
        title: "AI Assistant",
        subtitle: "Ask Fina about the platform, RFQs, exporting, or trade finance.",
        greeting: `Hi${user?.firstName ? " " + user.firstName : ""} 👋 I'm Fina, your Fincava assistant. How can I help you today?`,
        placeholder: "Type your question…",
        thinking: "Fina is thinking…",
        error: "I couldn't get a response. Please try again.",
        suggestionsLabel: "Try one of these:",
        clear: "New chat",
        you: "You",
        assistantName: "Fina",
        assistantRole: "Fincava AI Assistant",
      };

  const send = useMutation({
    mutationFn: async (content: string) => {
      const next: ChatMessage[] = [
        ...messages,
        { role: "user", content, ts: Date.now() },
      ];
      setMessages(next);

      const res = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          language: lang,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Request failed");
      }

      const data = (await res.json()) as { reply: string };
      return data.reply;
    },
    onSuccess: (reply) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, ts: Date.now() },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t.error,
          ts: Date.now(),
        },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, send.isPending]);

  function handleSend(text?: string) {
    const content = (text ?? draft).trim();
    if (!content || send.isPending) return;
    setDraft("");
    send.mutate(content);
  }

  function handleClear() {
    setMessages([]);
    setDraft("");
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" />
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear} className="shrink-0">
            <RefreshCw className="w-4 h-4 mr-1.5" />
            {t.clear}
          </Button>
        )}
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col border-border min-h-0 bg-card">
        {/* Header */}
        <div className="p-4 border-b bg-muted/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t.assistantName}</p>
            <p className="text-xs text-muted-foreground">{t.assistantRole}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Greeting bubble */}
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm bg-muted text-foreground">
              <p className="leading-relaxed whitespace-pre-wrap">{t.greeting}</p>
            </div>
          </div>

          {messages.length === 0 && (
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">
                {t.suggestionsLabel}
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-left text-sm px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted hover:border-primary/40 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMe = msg.role === "user";
            return (
              <div
                key={i}
                className={cn("flex", isMe ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {send.isPending && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm bg-muted text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t.thinking}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="p-4 border-t bg-card">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <Input
              placeholder={t.placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1"
              disabled={send.isPending}
              autoFocus
            />
            <Button
              type="submit"
              size="icon"
              disabled={!draft.trim() || send.isPending}
              className="shrink-0"
            >
              {send.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
