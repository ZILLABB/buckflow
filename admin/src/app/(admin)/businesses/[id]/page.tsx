"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, Users, MessageSquare, Package, TrendingUp, Bot, Wifi } from "lucide-react";
import { api } from "@/lib/api";
import { formatAmount, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface BusinessDetail {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  description: string | null;
  is_active: boolean;
  ai_enabled: boolean;
  whatsapp_connected: boolean;
  monthly_ai_limit: number;
  monthly_conversation_limit: number;
  created_at: string | null;
  users: { id: string; email: string; full_name: string; role: string; is_active: boolean }[];
  stats: {
    customers: number;
    orders: number;
    conversations: number;
    revenue: number;
    monthly_messages: number;
    monthly_ai_calls: number;
  };
}

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [biz, setBiz] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLimit, setAiLimit] = useState("");
  const [convLimit, setConvLimit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<BusinessDetail>(`/admin/businesses/${params.id}`)
      .then((data) => {
        setBiz(data);
        setAiLimit(String(data.monthly_ai_limit));
        setConvLimit(String(data.monthly_conversation_limit));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  async function saveLimits() {
    setSaving(true);
    try {
      await api.patch(`/admin/businesses/${params.id}`, {
        monthly_ai_limit: parseInt(aiLimit),
        monthly_conversation_limit: parseInt(convLimit),
      });
      setBiz((b) => b ? { ...b, monthly_ai_limit: parseInt(aiLimit), monthly_conversation_limit: parseInt(convLimit) } : b);
    } catch {} finally { setSaving(false); }
  }

  async function toggleActive() {
    if (!biz) return;
    try {
      await api.patch(`/admin/businesses/${params.id}`, { is_active: !biz.is_active });
      setBiz((b) => b ? { ...b, is_active: !b.is_active } : b);
    } catch {}
  }

  async function toggleAI() {
    if (!biz) return;
    try {
      await api.patch(`/admin/businesses/${params.id}`, { ai_enabled: !biz.ai_enabled });
      setBiz((b) => b ? { ...b, ai_enabled: !b.ai_enabled } : b);
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  if (!biz) {
    return <div className="text-center text-muted-foreground">Business not found</div>;
  }

  return (
    <PageTransition>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/businesses")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{biz.name}</h1>
            <Badge variant={biz.is_active ? "success" : "destructive"}>{biz.is_active ? "Active" : "Inactive"}</Badge>
            {biz.whatsapp_connected && <Badge variant="info"><Wifi className="mr-1 h-3 w-3" /> WhatsApp</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {biz.slug} · {biz.email || "No email"} · Created {biz.created_at ? new Date(biz.created_at).toLocaleDateString() : "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={biz.ai_enabled ? "outline" : "ghost"} onClick={toggleAI}>
            <Bot className="h-4 w-4" /> {biz.ai_enabled ? "AI Enabled" : "AI Disabled"}
          </Button>
          <Button size="sm" variant={biz.is_active ? "destructive" : "success"} onClick={toggleActive}>
            {biz.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StaggerItem><StatCard icon={<Users className="h-5 w-5" />} label="Customers" value={biz.stats.customers} iconBg="bg-blue-500/10 text-blue-600" /></StaggerItem>
        <StaggerItem><StatCard icon={<MessageSquare className="h-5 w-5" />} label="Conversations" value={biz.stats.conversations} subtitle={`${formatNumber(biz.stats.monthly_messages)} msgs this month`} iconBg="bg-emerald-500/10 text-emerald-600" /></StaggerItem>
        <StaggerItem><StatCard icon={<Package className="h-5 w-5" />} label="Orders" value={biz.stats.orders} iconBg="bg-amber-500/10 text-amber-600" /></StaggerItem>
        <StaggerItem><StatCard icon={<TrendingUp className="h-5 w-5" />} label="Revenue" value={formatAmount(biz.stats.revenue)} iconBg="bg-pink-500/10 text-pink-600" /></StaggerItem>
      </StaggerContainer>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Usage limits */}
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader><CardTitle>Usage Limits</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Monthly AI Limit</label>
                <div className="flex gap-2">
                  <Input type="number" value={aiLimit} onChange={(e) => setAiLimit(e.target.value)} />
                  <span className="flex items-center text-xs text-muted-foreground whitespace-nowrap">used: {biz.stats.monthly_ai_calls}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Monthly Conversation Limit</label>
                <Input type="number" value={convLimit} onChange={(e) => setConvLimit(e.target.value)} />
              </div>
              <Button onClick={saveLimits} disabled={saving} size="sm">{saving ? "Saving..." : "Update Limits"}</Button>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Users */}
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader><CardTitle>Team Members ({biz.users.length})</CardTitle></CardHeader>
            <CardContent>
              {biz.users.length > 0 ? (
                <div className="space-y-3">
                  {biz.users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{u.role}</Badge>
                        <Badge variant={u.is_active ? "success" : "destructive"}>{u.is_active ? "Active" : "Inactive"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No users</p>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
