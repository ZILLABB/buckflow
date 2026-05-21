"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Bot, UserCheck, Search } from "lucide-react";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/motion";

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
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get<Conversation[]>("/conversations")
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = conversations.filter(
    (c) =>
      c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_phone?.includes(search)
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {conversations.length} active conversation{conversations.length !== 1 && "s"}
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-7 w-7" />}
          title="No conversations yet"
          description="When customers message your WhatsApp, conversations will appear here automatically."
        />
      ) : (
        <StaggerContainer className="space-y-2">
          {filtered.map((conv) => (
            <StaggerItem key={conv.id}>
              <Link
                href={`/conversations/${conv.id}`}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20"
              >
                <Avatar name={conv.customer_name || conv.customer_phone} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">
                      {conv.customer_name || conv.customer_phone}
                    </p>
                    <Badge variant={conv.mode === "ai" ? "success" : "warning"}>
                      {conv.mode === "ai" ? (
                        <><Bot className="mr-1 h-3 w-3" /> AI</>
                      ) : (
                        <><UserCheck className="mr-1 h-3 w-3" /> Human</>
                      )}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {conv.last_message || "No messages yet"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {conv.last_message_at ? timeAgo(conv.last_message_at) : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {conv.message_count} msg{conv.message_count !== 1 && "s"}
                  </p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </PageTransition>
  );
}
