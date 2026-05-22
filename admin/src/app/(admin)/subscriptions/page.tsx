"use client";

import { useEffect, useState } from "react";
import { Receipt, Search } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface Sub {
  id: string;
  business_id: string;
  business_name: string | null;
  plan_name: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string | null;
}

const STATUS_OPTIONS = ["", "active", "trial", "past_due", "cancelled"];

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { loadSubs(); }, [statusFilter]);

  async function loadSubs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get<{ items: Sub[]; total: number }>(`/admin/subscriptions?${params}`);
      setSubs(res.items);
      setTotal(res.total);
    } catch {} finally { setLoading(false); }
  }

  const statusVariant = (s: string) => {
    if (s === "active") return "success";
    if (s === "trial") return "info";
    if (s === "past_due") return "warning";
    if (s === "cancelled") return "destructive";
    return "secondary";
  };

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} subscription{total !== 1 && "s"}</p>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
        </div>
      ) : subs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16">
          <Receipt className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-medium text-muted-foreground">No subscriptions found</p>
        </div>
      ) : (
        <StaggerContainer className="space-y-3">
          {subs.map((sub) => (
            <StaggerItem key={sub.id}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{sub.business_name || "Unknown Business"}</span>
                        <Badge variant={statusVariant(sub.status)} className="capitalize">{sub.status.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Plan: <span className="font-medium text-foreground">{sub.plan_name || "—"}</span>
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">
                        Period: {sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : "—"} — {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Created {sub.created_at ? timeAgo(sub.created_at) : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </PageTransition>
  );
}
