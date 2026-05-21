"use client";

import { useEffect, useState } from "react";
import { Users, MessageSquare, Package, TrendingUp, Bot, Zap, UserCheck, Database } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api } from "@/lib/api";
import { cn, formatAmount } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface Overview {
  total_customers: number;
  total_conversations: number;
  total_orders: number;
  total_revenue: number;
}

interface UsageLimits {
  conversations_used: number;
  conversations_limit: number;
  ai_used: number;
  ai_limit: number;
  ai_allowed: boolean;
}

interface DailyUsage {
  date: string;
  total_messages: number;
  rule_responses: number;
  ai_mini_responses: number;
  cache_hits: number;
  human_responses: number;
}

interface Breakdown {
  rule_engine: number;
  ai_mini: number;
  ai_premium: number;
  cache: number;
  human: number;
}

const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#f97316"];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [daily, setDaily] = useState<DailyUsage[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Overview>("/analytics/overview"),
      api.get<{ limits: UsageLimits; daily: DailyUsage[] }>("/analytics/usage"),
      api.get<Breakdown>("/analytics/response-breakdown"),
    ])
      .then(([ov, usage, br]) => {
        setOverview(ov);
        setLimits(usage.limits);
        setDaily(usage.daily);
        setBreakdown(br);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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
        { name: "Rules", value: breakdown.rule_engine, icon: Zap },
        { name: "AI", value: breakdown.ai_mini, icon: Bot },
        { name: "AI Pro", value: breakdown.ai_premium, icon: Bot },
        { name: "Cached", value: breakdown.cache, icon: Database },
        { name: "Human", value: breakdown.human, icon: UserCheck },
      ].filter((d) => d.value > 0)
    : [];

  const totalResponses = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor performance, usage, and costs</p>
      </div>

      {/* Stat cards */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StaggerItem>
          <StatCard icon={<Users className="h-5 w-5" />} label="Customers" value={overview?.total_customers || 0} change="+12%" trend="up" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Conversations" value={overview?.total_conversations || 0} change="+8%" trend="up" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={<Package className="h-5 w-5" />} label="Orders" value={overview?.total_orders || 0} change="+23%" trend="up" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Revenue" value={formatAmount(overview?.total_revenue || 0)} change="+18%" trend="up" />
        </StaggerItem>
      </StaggerContainer>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Usage limits */}
        {limits && (
          <FadeIn delay={0.2} className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Usage This Month</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <UsageBar label="Conversations" used={limits.conversations_used} limit={limits.conversations_limit} color="bg-primary" />
                <UsageBar label="AI Calls" used={limits.ai_used} limit={limits.ai_limit} color={limits.ai_allowed ? "bg-blue-500" : "bg-destructive"} />
                {!limits.ai_allowed && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    AI limit reached — responses are using rule engine only. Upgrade for more AI usage.
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* Pie chart */}
        {pieData.length > 0 && (
          <FadeIn delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle>Response Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          fontSize: "12px",
                        }}
                      />
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
                      <span className="font-medium">
                        {totalResponses > 0 ? Math.round((d.value / totalResponses) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>

      {/* Area chart */}
      {daily.length > 0 && (
        <FadeIn delay={0.4}>
          <Card>
            <CardHeader>
              <CardTitle>Daily Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily.slice(-30)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        fontSize: "12px",
                        background: "hsl(var(--card))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total_messages"
                      stroke="hsl(160 84% 39%)"
                      strokeWidth={2}
                      fill="url(#msgGrad)"
                      name="Messages"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </PageTransition>
  );
}

function UsageBar({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold">{used.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">/ {limit.toLocaleString()}</span>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground text-right">{pct}% used</p>
    </div>
  );
}
