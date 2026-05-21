"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  MessageSquare,
  Package,
  Users,
  DollarSign,
  Bot,
  Zap,
  UserCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatAmount } from "@/lib/utils";

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

  const totalBreakdown = breakdown
    ? breakdown.rule_engine +
      breakdown.ai_mini +
      breakdown.ai_premium +
      breakdown.cache +
      breakdown.human
    : 0;

  function pct(val: number) {
    return totalBreakdown > 0 ? Math.round((val / totalBreakdown) * 100) : 0;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics</h2>

      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-600" />}
          label="Customers"
          value={overview?.total_customers || 0}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5 text-brand-600" />}
          label="Conversations"
          value={overview?.total_conversations || 0}
          bg="bg-brand-50"
        />
        <StatCard
          icon={<Package className="h-5 w-5 text-purple-600" />}
          label="Orders"
          value={overview?.total_orders || 0}
          bg="bg-purple-50"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          label="Revenue"
          value={formatAmount(overview?.total_revenue || 0)}
          bg="bg-green-50"
        />
      </div>

      {/* Usage limits */}
      {limits && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Usage This Month</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <UsageBar
              label="Conversations"
              used={limits.conversations_used}
              limit={limits.conversations_limit}
            />
            <UsageBar
              label="AI Calls"
              used={limits.ai_used}
              limit={limits.ai_limit}
              warning={!limits.ai_allowed}
            />
          </div>
          {!limits.ai_allowed && (
            <p className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
              AI limit reached. Responses are using rule engine only. Upgrade
              your plan for more AI usage.
            </p>
          )}
        </div>
      )}

      {/* Response breakdown */}
      {breakdown && totalBreakdown > 0 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Response Sources</h3>
          <div className="mb-3 flex h-4 overflow-hidden rounded-full">
            <div
              className="bg-brand-400"
              style={{ width: `${pct(breakdown.rule_engine)}%` }}
            />
            <div
              className="bg-blue-400"
              style={{ width: `${pct(breakdown.ai_mini)}%` }}
            />
            <div
              className="bg-purple-400"
              style={{ width: `${pct(breakdown.ai_premium)}%` }}
            />
            <div
              className="bg-yellow-400"
              style={{ width: `${pct(breakdown.cache)}%` }}
            />
            <div
              className="bg-orange-400"
              style={{ width: `${pct(breakdown.human)}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Legend color="bg-brand-400" label="Rules" value={breakdown.rule_engine} pct={pct(breakdown.rule_engine)} />
            <Legend color="bg-blue-400" label="AI" value={breakdown.ai_mini} pct={pct(breakdown.ai_mini)} />
            <Legend color="bg-purple-400" label="AI Pro" value={breakdown.ai_premium} pct={pct(breakdown.ai_premium)} />
            <Legend color="bg-yellow-400" label="Cached" value={breakdown.cache} pct={pct(breakdown.cache)} />
            <Legend color="bg-orange-400" label="Human" value={breakdown.human} pct={pct(breakdown.human)} />
          </div>
        </div>
      )}

      {/* Daily chart (simple table) */}
      {daily.length > 0 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Daily Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Messages</th>
                  <th className="pb-2 pr-4">Rules</th>
                  <th className="pb-2 pr-4">AI</th>
                  <th className="pb-2 pr-4">Cached</th>
                  <th className="pb-2">Human</th>
                </tr>
              </thead>
              <tbody>
                {daily.slice(-14).map((d) => (
                  <tr key={d.date} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{d.date}</td>
                    <td className="py-2 pr-4">{d.total_messages}</td>
                    <td className="py-2 pr-4">{d.rule_responses}</td>
                    <td className="py-2 pr-4">{d.ai_mini_responses}</td>
                    <td className="py-2 pr-4">{d.cache_hits}</td>
                    <td className="py-2">{d.human_responses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bg)}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
  warning,
}: {
  label: string;
  used: number;
  limit: number;
  warning?: boolean;
}) {
  const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-gray-500">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            warning
              ? "bg-red-500"
              : pct > 80
                ? "bg-orange-500"
                : "bg-brand-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
  value,
  pct,
}: {
  color: string;
  label: string;
  value: number;
  pct: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("h-3 w-3 rounded-full", color)} />
      <span className="text-gray-600">
        {label}: {value} ({pct}%)
      </span>
    </div>
  );
}
