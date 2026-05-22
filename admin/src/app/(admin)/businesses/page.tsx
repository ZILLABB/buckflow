"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Search, Filter, Users, ShoppingCart, Wifi, WifiOff, Bot, BotOff } from "lucide-react";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface BusinessItem {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  ai_enabled: boolean;
  whatsapp_connected: boolean;
  monthly_ai_limit: number;
  monthly_conversation_limit: number;
  user_count: number;
  customer_count: number;
  order_count: number;
  created_at: string | null;
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadBusinesses();
  }, [search, statusFilter]);

  async function loadBusinesses() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get<{ items: BusinessItem[]; total: number }>(`/admin/businesses?${params}`);
      setBusinesses(res.items);
      setTotal(res.total);
    } catch {} finally { setLoading(false); }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      await api.patch(`/admin/businesses/${id}`, { is_active: !currentActive });
      await loadBusinesses();
    } catch {}
  }

  async function toggleAI(id: string, currentAI: boolean) {
    try {
      await api.patch(`/admin/businesses/${id}`, { ai_enabled: !currentAI });
      await loadBusinesses();
    } catch {}
  }

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Businesses</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} registered business{total !== 1 && "es"}</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Search businesses..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} className="w-64" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
        </div>
      ) : businesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16">
          <Building2 className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-medium text-muted-foreground">No businesses found</p>
        </div>
      ) : (
        <StaggerContainer className="space-y-3">
          {businesses.map((biz) => (
            <StaggerItem key={biz.id}>
              <Card className="overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Link href={`/businesses/${biz.id}`} className="font-semibold hover:text-primary transition-colors">
                          {biz.name}
                        </Link>
                        <Badge variant={biz.is_active ? "success" : "destructive"}>
                          {biz.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {biz.whatsapp_connected && (
                          <Badge variant="info">
                            <Wifi className="mr-1 h-3 w-3" /> WhatsApp
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-mono text-xs">{biz.slug}</span>
                        {biz.email && <span>{biz.email}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {biz.user_count} users</span>
                        <span>{biz.customer_count} customers</span>
                        <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {biz.order_count} orders</span>
                        <span>AI: {biz.monthly_ai_limit} / Conv: {biz.monthly_conversation_limit}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="xs" variant={biz.ai_enabled ? "outline" : "ghost"} onClick={() => toggleAI(biz.id, biz.ai_enabled)} title={biz.ai_enabled ? "Disable AI" : "Enable AI"}>
                        {biz.ai_enabled ? <Bot className="h-3.5 w-3.5" /> : <BotOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                      <Button size="xs" variant={biz.is_active ? "destructive" : "success"} onClick={() => toggleActive(biz.id, biz.is_active)}>
                        {biz.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Link href={`/businesses/${biz.id}`}>
                        <Button size="xs" variant="outline">View</Button>
                      </Link>
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
