"use client";

import { useEffect, useState } from "react";
import { Server, Database, Wifi, RefreshCw, CheckCircle2, XCircle, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface Health {
  database: string;
  redis: string;
  status: string;
}

export default function SystemPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { checkHealth(); }, []);

  async function checkHealth() {
    setRefreshing(true);
    try {
      setHealth(await api.get<Health>("/admin/health"));
    } catch {
      setHealth({ database: "unknown", redis: "unknown", status: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const statusIcon = (s: string) =>
    s === "healthy" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-destructive" />;

  const statusBadge = (s: string) =>
    s === "healthy" ? "success" : s === "degraded" ? "warning" : "destructive";

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
          <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor infrastructure and service status</p>
        </div>
        <Button variant="outline" size="sm" onClick={checkHealth} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Overall status */}
      <FadeIn>
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${health?.status === "healthy" ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                <Activity className={`h-8 w-8 ${health?.status === "healthy" ? "text-emerald-500" : "text-destructive"}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {health?.status === "healthy" ? "All Systems Operational" : "System Degraded"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {health?.status === "healthy"
                    ? "All services are running normally"
                    : "One or more services are experiencing issues"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Service cards */}
      <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StaggerItem>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Database className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">PostgreSQL</CardTitle>
                    <CardDescription>Primary database</CardDescription>
                  </div>
                </div>
                {statusIcon(health?.database || "unknown")}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={statusBadge(health?.database || "unknown")} className="capitalize">{health?.database || "unknown"}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm font-medium">PostgreSQL 16</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pool</span>
                <span className="text-sm font-medium">20 connections</span>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                    <Server className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Redis</CardTitle>
                    <CardDescription>Cache & rate limiting</CardDescription>
                  </div>
                </div>
                {statusIcon(health?.redis || "unknown")}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={statusBadge(health?.redis || "unknown")} className="capitalize">{health?.redis || "unknown"}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm font-medium">Redis 7</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Purpose</span>
                <span className="text-sm font-medium">Response cache, rate limit</span>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Wifi className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">WhatsApp API</CardTitle>
                    <CardDescription>Meta Cloud API</CardDescription>
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm font-medium">v18.0</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Webhook</span>
                <span className="text-sm font-medium">/api/v1/webhook/whatsapp</span>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Platform info */}
      <FadeIn delay={0.3}>
        <Card className="mt-8">
          <CardHeader><CardTitle>Platform Configuration</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "API Framework", value: "FastAPI (Python 3.12)" },
                { label: "Dashboard", value: "Next.js 15 (React 19)" },
                { label: "AI Provider", value: "OpenAI (GPT-4o-mini / GPT-4o)" },
                { label: "Message Pipeline", value: "Rule Engine → Cache → AI" },
                { label: "Authentication", value: "JWT + bcrypt" },
                { label: "Payments", value: "Paystack (NGN)" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="mt-1 text-sm font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}
