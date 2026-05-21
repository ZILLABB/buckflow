"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, User, Bot, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";

interface Conversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  mode: string;
  last_message: string | null;
  last_message_at: string | null;
  message_count: number;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Conversation[]>("/conversations")
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Conversations</h2>
        <span className="text-sm text-gray-500">
          {conversations.length} active
        </span>
      </div>

      {conversations.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200">
          <MessageSquare className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No conversations yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Messages from WhatsApp will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/conversations/${conv.id}`}
              className="flex items-center gap-4 rounded-xl border bg-white p-4 transition hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
                <User className="h-6 w-6 text-brand-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">
                    {conv.customer_name || conv.customer_phone}
                  </p>
                  {conv.mode === "ai" ? (
                    <Bot className="h-4 w-4 text-brand-500" />
                  ) : (
                    <UserCheck className="h-4 w-4 text-orange-500" />
                  )}
                </div>
                <p className="truncate text-sm text-gray-500">
                  {conv.last_message || "No messages"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  {conv.last_message_at ? timeAgo(conv.last_message_at) : "—"}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {conv.message_count} msgs
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
