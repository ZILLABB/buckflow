"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bot, Cpu, User, UserCheck, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  direction: string;
  content: string;
  msg_type: string;
  response_source: string | null;
  created_at: string;
}

const sourceIcons: Record<string, React.ReactNode> = {
  rule_engine: <Zap className="h-3 w-3" />,
  ai_mini: <Bot className="h-3 w-3" />,
  ai_premium: <Cpu className="h-3 w-3" />,
  human: <UserCheck className="h-3 w-3" />,
  cache: <Zap className="h-3 w-3" />,
};

const sourceLabels: Record<string, string> = {
  rule_engine: "Rule",
  ai_mini: "AI",
  ai_premium: "AI Pro",
  human: "Human",
  cache: "Cached",
  system: "System",
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
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [conversationId]);

  async function toggleMode() {
    const newMode = mode === "ai" ? "human" : "ai";
    try {
      await api.patch(`/conversations/${conversationId}/mode`, {
        mode: newMode,
      });
      setMode(newMode);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/conversations")}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={toggleMode}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition",
            mode === "ai"
              ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
              : "bg-orange-100 text-orange-700 hover:bg-orange-200"
          )}
        >
          {mode === "ai" ? "AI Mode" : "Human Mode"} — Click to switch
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border bg-gray-50 p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.direction === "inbound" ? "justify-start" : "justify-end"
            )}
          >
            <div
              className={cn(
                "max-w-[70%] rounded-2xl px-4 py-2.5",
                msg.direction === "inbound"
                  ? "bg-white shadow-sm"
                  : "bg-brand-600 text-white"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <div
                className={cn(
                  "mt-1 flex items-center gap-1.5 text-xs",
                  msg.direction === "inbound"
                    ? "text-gray-400"
                    : "text-brand-200"
                )}
              >
                <span>
                  {new Date(msg.created_at).toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {msg.response_source && (
                  <>
                    <span>·</span>
                    {sourceIcons[msg.response_source]}
                    <span>{sourceLabels[msg.response_source] || msg.response_source}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400">No messages yet</p>
        )}
      </div>
    </div>
  );
}
