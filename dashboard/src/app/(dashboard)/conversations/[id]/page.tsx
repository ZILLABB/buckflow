"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Cpu, UserCheck, Zap, Send } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/ui/motion";

interface Message {
  id: string;
  direction: string;
  content: string;
  msg_type: string;
  response_source: string | null;
  created_at: string;
}

const sourceConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  rule_engine: { icon: <Zap className="h-3 w-3" />, label: "Rule", color: "text-emerald-400" },
  ai_mini: { icon: <Bot className="h-3 w-3" />, label: "AI", color: "text-blue-400" },
  ai_premium: { icon: <Cpu className="h-3 w-3" />, label: "AI Pro", color: "text-violet-400" },
  human: { icon: <UserCheck className="h-3 w-3" />, label: "Human", color: "text-amber-400" },
  cache: { icon: <Zap className="h-3 w-3" />, label: "Cached", color: "text-cyan-400" },
  system: { icon: <Bot className="h-3 w-3" />, label: "System", color: "text-slate-400" },
};

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<string>("ai");

  const conversationId = params.id as string;

  useEffect(() => {
    api
      .get<Message[]>(`/conversations/${conversationId}/messages`)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId]);

  async function toggleMode() {
    const newMode = mode === "ai" ? "human" : "ai";
    try {
      await api.patch(`/conversations/${conversationId}/mode`, { mode: newMode });
      setMode(newMode);
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex h-[calc(100vh-10rem)] flex-col">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/conversations")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button
            variant={mode === "ai" ? "default" : "warning"}
            size="sm"
            onClick={toggleMode}
          >
            {mode === "ai" ? (
              <><Bot className="h-4 w-4" /> AI Mode</>
            ) : (
              <><UserCheck className="h-4 w-4" /> Human Mode</>
            )}
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border bg-muted/30 p-5">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn("flex", msg.direction === "inbound" ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
                  msg.direction === "inbound"
                    ? "bg-card border rounded-bl-md"
                    : "gradient-primary text-white rounded-br-md"
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <div
                  className={cn(
                    "mt-2 flex items-center gap-2 text-[11px]",
                    msg.direction === "inbound" ? "text-muted-foreground" : "text-white/70"
                  )}
                >
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString("en-NG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.response_source && sourceConfig[msg.response_source] && (
                    <>
                      <span className="opacity-50">·</span>
                      <span className={cn("flex items-center gap-1", msg.direction === "outbound" ? "text-white/70" : sourceConfig[msg.response_source].color)}>
                        {sourceConfig[msg.response_source].icon}
                        {sourceConfig[msg.response_source].label}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">No messages in this conversation</p>
            </div>
          )}
        </div>

        {/* Input area (visual only — sends happen via WhatsApp) */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border bg-card p-3">
          <input
            placeholder="Human takeover — type a message..."
            disabled={mode === "ai"}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <Button size="icon" disabled={mode === "ai"}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
