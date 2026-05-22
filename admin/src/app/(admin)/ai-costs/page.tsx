"use client";

import { useEffect, useState } from "react";
import { Brain, DollarSign, Cpu, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatUSD, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface CostData {
  total_cost_usd_cents: number;
  total_tokens: number;
  daily: {
    date: string;
    tokens: number;
    cost_cents: number;
    ai_mini: number;
    ai_premium: number;
  }[];
}

export default function AICostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [days]);

  async function loadData() {
    setLoading(true);
    try {
      setData(await api.get<CostData>(`/admin/ai-costs?days=${days}`));
    } catch (err: any) { showToast(err.message || "Failed to load AI costs", "error"); } finally { setLoading(false); }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  const totalMini = data?.daily.reduce((s, d) => s + d.ai_mini, 0) || 0;
  const totalPremium = data?.daily.reduce((s, d) => s + d.ai_premium, 0) || 0;
  const avgDailyCost = data && data.daily.length > 0 ? Math.round((data.total_cost_usd_cents) / data.daily.length) : 0;

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Costs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor OpenAI API spending and token usage</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StaggerItem>
          <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total Cost" value={formatUSD(data?.total_cost_usd_cents || 0)} subtitle={`${days} day period`} iconBg="bg-red-500/10 text-red-600" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={<Cpu className="h-5 w-5" />} label="Total Tokens" value={formatNumber(data?.total_tokens || 0)} iconBg="bg-blue-500/10 text-blue-600" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={<Brain className="h-5 w-5" />} label="AI Mini Calls" value={formatNumber(totalMini)} subtitle={`${formatNumber(totalPremium)} premium`} iconBg="bg-violet-500/10 text-violet-600" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={<Zap className="h-5 w-5" />} label="Avg Daily Cost" value={formatUSD(avgDailyCost)} iconBg="bg-amber-500/10 text-amber-600" />
        </StaggerItem>
      </StaggerContainer>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader><CardTitle>Daily Cost (USD)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {data && data.daily.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => `$${(v / 100).toFixed(2)}`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px", background: "hsl(var(--card))" }} formatter={(v: number) => formatUSD(v)} />
                      <Area type="monotone" dataKey="cost_cents" stroke="#ef4444" strokeWidth={2} fill="url(#costGrad)" name="Cost" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No cost data yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.3}>
          <Card>
            <CardHeader><CardTitle>Daily Token Usage</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {data && data.daily.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px", background: "hsl(var(--card))" }} formatter={(v: number) => formatNumber(v)} />
                      <Bar dataKey="tokens" fill="hsl(262 83% 58%)" radius={[4, 4, 0, 0]} name="Tokens" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No token data yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* AI calls breakdown */}
      <FadeIn delay={0.4}>
        <Card>
          <CardHeader><CardTitle>AI Model Usage Breakdown</CardTitle></CardHeader>
          <CardContent>
            {data && data.daily.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px", background: "hsl(var(--card))" }} />
                    <Bar dataKey="ai_mini" fill="#3b82f6" radius={[4, 4, 0, 0]} name="GPT-4o-mini" stackId="a" />
                    <Bar dataKey="ai_premium" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="GPT-4o" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No AI usage data yet</div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}
