"use client";

import { useEffect, useState } from "react";
import { Search, Users, Shield, Flag, Tag, ToggleLeft, ToggleRight } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition, FadeIn } from "@/components/ui/motion";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  ai_enabled: boolean;
  is_flagged: boolean;
  tags: string[];
  block_reason: string | null;
  created_at: string | null;
}

const statusVariants: Record<string, string> = {
  active: "success",
  blocked: "destructive",
  muted: "secondary",
  blacklisted: "destructive",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const query = params.toString() ? `?${params.toString()}` : "";

    api.get<Customer[]>(`/conversations/customers${query}`)
      .then(setCustomers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  async function toggleAI(id: string, current: boolean) {
    try {
      await api.patch(`/conversations/customers/${id}`, { ai_enabled: !current });
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ai_enabled: !current } : c))
      );
    } catch {}
  }

  async function toggleFlag(id: string, current: boolean) {
    try {
      await api.patch(`/conversations/customers/${id}`, { is_flagged: !current });
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_flagged: !current } : c))
      );
    } catch {}
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.patch(`/conversations/customers/${id}`, { status });
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage customer access, AI settings, and flags</p>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setLoading(true); }}
          />
        </div>
        <div className="flex gap-2">
          {["", "active", "blocked", "muted"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter(s); setLoading(true); }}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Customer List */}
      {customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">No customers found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {customers.map((customer, i) => (
            <FadeIn key={customer.id} delay={i * 0.02}>
              <Card className="transition-shadow hover:shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {(customer.name || "?").charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{customer.name || "Unknown"}</p>
                      {customer.is_flagged && (
                        <Flag className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      )}
                      <Badge variant={statusVariants[customer.status] as any} className="text-[10px]">
                        {customer.status}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{customer.phone}</span>
                      {customer.tags?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {customer.tags.slice(0, 3).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex shrink-0 items-center gap-2">
                    {/* AI Toggle */}
                    <button
                      onClick={() => toggleAI(customer.id, customer.ai_enabled)}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        customer.ai_enabled
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                      title={customer.ai_enabled ? "AI enabled — click to disable" : "AI disabled — click to enable"}
                    >
                      {customer.ai_enabled ? (
                        <ToggleRight className="h-3.5 w-3.5" />
                      ) : (
                        <ToggleLeft className="h-3.5 w-3.5" />
                      )}
                      AI
                    </button>

                    {/* Flag */}
                    <button
                      onClick={() => toggleFlag(customer.id, customer.is_flagged)}
                      className={`rounded-md p-1.5 transition-colors ${
                        customer.is_flagged ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"
                      }`}
                      title={customer.is_flagged ? "Unflag" : "Flag for review"}
                    >
                      <Flag className="h-4 w-4" />
                    </button>

                    {/* Block/Unblock */}
                    {customer.status === "active" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-destructive hover:text-destructive"
                        onClick={() => updateStatus(customer.id, "blocked")}
                      >
                        <Shield className="h-3.5 w-3.5" /> Block
                      </Button>
                    ) : customer.status === "blocked" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => updateStatus(customer.id, "active")}
                      >
                        Unblock
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
