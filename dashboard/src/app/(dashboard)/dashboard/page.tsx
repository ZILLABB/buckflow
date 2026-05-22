"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Package,
  Users,
  TrendingUp,
  CalendarDays,
  Clock,
  ShoppingBag,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface Overview {
  total_customers: number;
  total_conversations: number;
  total_orders: number;
  total_revenue: number;
}

interface BusinessInfo {
  name: string;
  business_type: string;
  whatsapp_connected: boolean;
  human_only_mode: boolean;
}

interface Appointment {
  id: string;
  service_name: string;
  status: string;
  scheduled_at: string;
  appointment_ref: string;
}

interface RecentConversation {
  id: string;
  customer_name: string;
  last_message: string | null;
  last_message_at: string | null;
  mode: string;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches: Promise<any>[] = [
      api.get<Overview>("/analytics/overview"),
      api.get<BusinessInfo>("/business/me"),
      api.get<RecentConversation[]>("/conversations?limit=5"),
    ];

    Promise.all(fetches)
      .then(([ov, biz, convos]) => {
        setOverview(ov);
        setBusiness(biz);
        setConversations(convos);

        // Fetch appointments only if service/hybrid
        if (biz.business_type === "service" || biz.business_type === "hybrid") {
          api.get<Appointment[]>("/appointments?status=confirmed&limit=5")
            .then(setAppointments)
            .catch(() => {});
        }
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

  const isProduct = business?.business_type === "product" || business?.business_type === "hybrid";
  const isService = business?.business_type === "service" || business?.business_type === "hybrid";

  return (
    <PageTransition>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{business?.name ? `, ${business.name}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {business?.human_only_mode
            ? "Auto-pilot is OFF — you're handling messages manually"
            : "Auto-pilot is ON — AI is handling your customers"}
        </p>
      </div>

      {/* Quick Status */}
      {!business?.whatsapp_connected && (
        <FadeIn>
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">WhatsApp not connected yet</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Go to Settings to connect your number and start receiving customer messages</p>
            </div>
            <Link href="/settings" className="text-xs font-medium text-amber-700 hover:text-amber-900 underline">
              Connect now →
            </Link>
          </div>
        </FadeIn>
      )}

      {/* Stats Grid */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StaggerItem>
          <StatCard
            icon={<MessageSquare className="h-5 w-5" />}
            label="Conversations"
            value={overview?.total_conversations || 0}
            iconBg="bg-blue-500/10 text-blue-600"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Customers"
            value={overview?.total_customers || 0}
            iconBg="bg-emerald-500/10 text-emerald-600"
          />
        </StaggerItem>

        {/* Product-specific stat */}
        {isProduct && (
          <StaggerItem>
            <StatCard
              icon={<Package className="h-5 w-5" />}
              label="Orders"
              value={overview?.total_orders || 0}
              iconBg="bg-amber-500/10 text-amber-600"
            />
          </StaggerItem>
        )}

        {/* Service-specific stat */}
        {isService && !isProduct && (
          <StaggerItem>
            <StatCard
              icon={<CalendarDays className="h-5 w-5" />}
              label="Appointments"
              value={appointments.length}
              subtitle="Upcoming"
              iconBg="bg-violet-500/10 text-violet-600"
            />
          </StaggerItem>
        )}

        {/* Hybrid shows both orders + appointments in the 3rd and 4th slot */}
        {isService && isProduct && (
          <StaggerItem>
            <StatCard
              icon={<CalendarDays className="h-5 w-5" />}
              label="Appointments"
              value={appointments.length}
              subtitle="Upcoming"
              iconBg="bg-violet-500/10 text-violet-600"
            />
          </StaggerItem>
        )}

        <StaggerItem>
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Revenue"
            value={`₦${(overview?.total_revenue || 0).toLocaleString()}`}
            iconBg="bg-pink-500/10 text-pink-600"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Conversations */}
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Conversations</CardTitle>
              <Link href="/conversations" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {conversations.length > 0 ? (
                <div className="space-y-3">
                  {conversations.map((c) => (
                    <Link
                      key={c.id}
                      href={`/conversations/${c.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {(c.customer_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{c.customer_name}</p>
                          {c.mode === "human" && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">Manual</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.last_message || "No messages"}</p>
                      </div>
                      {c.last_message_at && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {timeAgo(c.last_message_at)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Service: Upcoming Appointments */}
        {isService && (
          <FadeIn delay={0.2}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Upcoming Appointments</CardTitle>
                <Link href="/appointments" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.map((apt) => {
                      const date = new Date(apt.scheduled_at);
                      return (
                        <div key={apt.id} className="flex items-center gap-3 rounded-lg p-2 -mx-2">
                          <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                            <span className="text-[9px] font-medium uppercase leading-none">{date.toLocaleDateString("en", { month: "short" })}</span>
                            <span className="text-sm font-bold leading-none">{date.getDate()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{apt.service_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {date.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })} · {apt.appointment_ref}
                            </p>
                          </div>
                          <Badge variant="success" className="text-[9px]">Confirmed</Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No upcoming appointments</p>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* Product: Quick Actions or Order Summary */}
        {isProduct && !isService && (
          <FadeIn delay={0.2}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href="/orders"
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <ShoppingBag className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">View Orders</p>
                    <p className="text-xs text-muted-foreground">Manage pending and active orders</p>
                  </div>
                </Link>
                <Link
                  href="/customers"
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Manage Customers</p>
                    <p className="text-xs text-muted-foreground">Block, flag, or toggle AI for specific customers</p>
                  </div>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Configure Auto-Responses</p>
                    <p className="text-xs text-muted-foreground">Set up rules for common questions (free, instant)</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    </PageTransition>
  );
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
