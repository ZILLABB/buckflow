"use client";

import { useEffect, useState } from "react";
import { CreditCard, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatAmount } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface Plan {
  id: string;
  name: string;
  tier: string;
  price_naira: number;
  conversation_limit: number;
  ai_messages_limit: number;
  ai_model: string;
  rag_enabled: boolean;
  is_active: boolean;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Plan>>({});

  const { showToast } = useToast();

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      setPlans(await api.get<Plan[]>("/admin/plans"));
    } catch (err: any) { showToast(err.message || "Failed to load plans", "error"); } finally { setLoading(false); }
  }

  function startEdit(plan: Plan) {
    setEditing(plan.id);
    setEditData({
      name: plan.name,
      price_naira: plan.price_naira,
      conversation_limit: plan.conversation_limit,
      ai_messages_limit: plan.ai_messages_limit,
      ai_model: plan.ai_model,
    });
  }

  async function saveEdit(planId: string) {
    try {
      await api.patch(`/admin/plans/${planId}`, editData);
      setEditing(null);
      showToast("Plan updated");
      await loadPlans();
    } catch (err: any) { showToast(err.message || "Failed to update plan", "error"); }
  }

  async function togglePlan(planId: string, currentActive: boolean) {
    try {
      await api.patch(`/admin/plans/${planId}`, { is_active: !currentActive });
      showToast(currentActive ? "Plan disabled" : "Plan enabled");
      await loadPlans();
    } catch (err: any) { showToast(err.message || "Failed to toggle plan", "error"); }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  const tierColors: Record<string, string> = {
    basic: "bg-slate-500/10 text-slate-600",
    growth: "bg-blue-500/10 text-blue-600",
    pro: "bg-violet-500/10 text-violet-600",
  };

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage pricing tiers and limits</p>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16">
          <CreditCard className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-medium text-muted-foreground">No plans configured yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Plans are created via database seeding</p>
        </div>
      ) : (
        <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <StaggerItem key={plan.id}>
              <Card className={`relative overflow-hidden ${!plan.is_active ? "opacity-60" : ""}`}>
                <div className={`absolute top-0 left-0 right-0 h-1 ${plan.tier === "pro" ? "gradient-admin" : plan.tier === "growth" ? "bg-blue-500" : "bg-slate-400"}`} />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle>{plan.name}</CardTitle>
                      <Badge className={tierColors[plan.tier] || ""} variant="outline">{plan.tier}</Badge>
                    </div>
                    <Badge variant={plan.is_active ? "success" : "destructive"}>{plan.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editing === plan.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Price (Naira)</label>
                        <Input type="number" value={editData.price_naira} onChange={(e) => setEditData({ ...editData, price_naira: parseInt(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Conversation Limit</label>
                        <Input type="number" value={editData.conversation_limit} onChange={(e) => setEditData({ ...editData, conversation_limit: parseInt(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">AI Messages Limit</label>
                        <Input type="number" value={editData.ai_messages_limit} onChange={(e) => setEditData({ ...editData, ai_messages_limit: parseInt(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">AI Model</label>
                        <Input value={editData.ai_model} onChange={(e) => setEditData({ ...editData, ai_model: e.target.value })} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(plan.id)}><Check className="h-3 w-3" /> Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-3 w-3" /> Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{formatAmount(plan.price_naira)}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Conversations</span>
                          <span className="font-medium">{plan.conversation_limit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">AI Messages</span>
                          <span className="font-medium">{plan.ai_messages_limit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">AI Model</span>
                          <span className="font-mono text-xs">{plan.ai_model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">RAG</span>
                          <Badge variant={plan.rag_enabled ? "success" : "secondary"}>{plan.rag_enabled ? "Yes" : "No"}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(plan)}>Edit</Button>
                        <Button size="sm" variant={plan.is_active ? "destructive" : "success"} onClick={() => togglePlan(plan.id, plan.is_active)}>
                          {plan.is_active ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </PageTransition>
  );
}
