"use client";

import { useEffect, useState } from "react";
import { Building2, Users, MessageSquare, Package, TrendingUp, Bot, Zap, Database, UserCheck, CreditCard } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { cn, formatAmount, formatUSD, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface Overview {
  total_businesses: number;
  active_businesses: number;
  new_businesses_30d: number;
  total_users: number;
  total_customers: number;
  total_conversations: number;
  total_orders: number;
  total_revenue: number;
  monthly_messages: number;
  monthly_ai_cost_usd_cents: number;
  active_subscriptions: number;
}

interface DailyUsage {
  date: string;
  messages: number;
  rule: number;
  ai_mini: number;
  ai_premium: number;
  cache: number;
  human: number;
  tokens: number;
  cost_cents: number;
  active_businesses: number;
}

interface Breakdown {
  rule_engine: number;
  ai_mini: number;
  ai_premium: number;
  cache: number;
  human: number;
}

interface TopBiz {
  id: string;
  name: string;
  slug: string;
  value: number;
}

const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#f97316"];

export default function AdminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [daily, setDaily] = useState<DailyUsage[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [topBiz, setTopBiz] = useState<TopBiz[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([
      api.get<Overview>("/admin/overview"),
      api.get<DailyUsage[]>("/admin/usage-chart?days=30"),
      api.get<Breakdown>("/admin/response-breakdown"),
      api.get<TopBiz[]>("/admin/top-businesses?metric=messages&limit=5"),
    ])
      .then(([ov, d, br, top]) => {
        setOverview(ov);
        setDaily(d);
        setBreakdown(br);
        setTopBiz(top);
      })
      .catch((err) => showToast(err.message || "Failed to load dashboard", "error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  const pieData = breakdown
    ? [
        { name: "Rules", value: breakdown.rule_engine },
        { name: "AI Mini", value: breakdown.ai_mini },
        { name: "AI Pro", value: breakdown.ai_premium },
        { name: "Cached", value: breakdown.cache },
        { name: "Human", value: breakdown.human },
      ].filter((d) => d.value > 0)
    : [];

  const totalResponses = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor BuckFlow AI platform health and metrics</p>
      </div>

      {/* Top stat cards */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StaggerItem>
          <StatCard icon={<Building2 className="h-5 w-5" />} label="Total Businesses" value={overview?.total_businesses || 0} subtitle={`${overview?.new_businesses_30d || 0} new this month`} iconBg="bg-primary/10 text-primary" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={<Users className="h-5 w-5" />} label="Total Users" value={overview?.total_users || 0} subtitle={`${overview?.total_customers || 0} customers`} iconBg="bg-blue-500/10 text-blue-600" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Monthly Messages" value={formatNumber(overview?.monthly_messages || 0)} subtitle={`${overview?.total_conversations || 0} total conversations`} iconBg="bg-emerald-500/10 text-emerald-600" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total Revenue" value={formatAmount(overview?.total_revenue || 0)} subtitle={`${overview?.total_orders || 0} orders`} iconBg="bg-amber-500/10 text-amber-600" />
        </StaggerItem>
      </StaggerContainer>

      {/* Secondary stats */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-3 mb-8">
        <StaggerItem>
          <StatCard icon={<Bot className="h-5 w-5" />} label="AI Cost (MTD)" value={formatUSD(overview?.monthly_ai_cost_usd_cents || 0)} iconBg="bg-violet-500/10 text-violet-600" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={<CreditCard className="h-5 w-5" />} label="Active Subscriptions" value={overview?.active_subscriptions || 0} iconBg="bg-pink-500/10 text-pink-600" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={<Building2 className="h-5 w-5" />} label="Active Businesses" value={overview?.active_businesses || 0} iconBg="bg-cyan-500/10 text-cyan-600" />
        </StaggerItem>
      </StaggerContainer>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Usage chart */}
        <FadeIn delay={0.2} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Platform Messages (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {daily.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-NG", { month: "short", day: "numeric" })} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px", background: "hsl(var(--card))" }} />
                      <Area type="monotone" dataKey="messages" stroke="hsl(262 83% 58%)" strokeWidth={2} fill="url(#msgGrad)" name="Messages" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No usage data yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Pie chart */}
        <FadeIn delay={0.3}>
          <Card>
            <CardHeader>
              <CardTitle>Response Sources (MTD)</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 space-y-2">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-medium">{totalResponses > 0 ? Math.round((d.value / totalResponses) * 100) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">No response data yet</div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Top businesses */}
      <FadeIn delay={0.4}>
        <Card>
          <CardHeader>
            <CardTitle>Top Businesses by Messages (MTD)</CardTitle>
          </CardHeader>
          <CardContent>
            {topBiz.length > 0 ? (
              <div className="space-y-3">
                {topBiz.map((b, i) => {
                  const maxVal = topBiz[0]?.value || 1;
                  const pct = Math.round((b.value / maxVal) * 100);
                  return (
                    <div key={b.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground w-5">#{i + 1}</span>
                          <span className="font-medium">{b.name}</span>
                          <span className="text-xs text-muted-foreground">({b.slug})</span>
                        </div>
                        <span className="font-bold">{formatNumber(b.value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full gradient-admin transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No business data yet</div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}
