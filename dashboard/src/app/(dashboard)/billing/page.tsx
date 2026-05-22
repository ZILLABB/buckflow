"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Check,
  Zap,
  ArrowRight,
  Shield,
  MessageCircle,
  Bot,
  User,
  BookOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageTransition, FadeIn } from "@/components/ui/motion";

interface Plan {
  id: string;
  name: string;
  tier: string;
  price_naira: number;
  conversation_limit: number;
  ai_messages_limit: number;
  ai_model: string;
  rag_enabled: boolean;
}

interface SubscriptionStatus {
  has_subscription: boolean;
  status: string;
  plan: { id: string; name: string; tier: string; price_naira: number } | null;
  current_period_end: string | null;
}

const tierFeatures: Record<string, string[]> = {
  basic: [
    "Up to 500 conversations/mo",
    "200 AI responses/mo",
    "GPT-4o-mini model",
    "Rule engine (unlimited)",
    "Basic analytics",
  ],
  growth: [
    "Up to 2,000 conversations/mo",
    "1,000 AI responses/mo",
    "GPT-4o-mini model",
    "Rule engine (unlimited)",
    "Full analytics + conversion tracking",
    "Appointment booking",
    "WhatsApp templates",
  ],
  pro: [
    "Unlimited conversations",
    "5,000 AI responses/mo",
    "GPT-4o premium model",
    "RAG knowledge base",
    "Everything in Growth",
    "Priority support",
    "Custom AI prompts",
  ],
};

const howItWorks = [
  {
    icon: MessageCircle,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    title: "Customer sends a message",
    description: "A customer messages your WhatsApp Business number",
  },
  {
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    title: "Rules are checked first",
    description: "Your response rules are matched instantly — this is always free",
  },
  {
    icon: Bot,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    title: "AI generates a smart reply",
    description: "If no rule matches, AI crafts a context-aware response",
  },
  {
    icon: User,
    color: "text-violet-600",
    bg: "bg-violet-500/10",
    title: "You can take over anytime",
    description: "Switch any conversation to manual mode with one click",
  },
];

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([
      api.get<Plan[]>("/billing/plans"),
      api.get<SubscriptionStatus>("/billing/subscription"),
    ])
      .then(([p, s]) => { setPlans(p); setSubscription(s); })
      .catch((err) => showToast(err.message || "Failed to load billing info", "error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubscribe(planId: string) {
    setSubscribing(planId);
    try {
      const result = await api.post<{ authorization_url: string }>("/billing/subscribe", {
        plan_id: planId,
        callback_url: window.location.origin + "/billing?verify=true",
      });
      window.location.href = result.authorization_url;
    } catch (err: any) {
      showToast(err.message || "Failed to start subscription", "error");
      setSubscribing("");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Billing & Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription and choose the plan that fits your business
        </p>
      </div>

      {/* How It Works */}
      <FadeIn>
        <Card className="mb-8 border-primary/10 bg-gradient-to-r from-primary/[0.03] via-transparent to-primary/[0.02]">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">How it works</CardTitle>
                <CardDescription className="text-xs">Understand what you're paying for</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {howItWorks.map((step, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  {i < howItWorks.length - 1 && (
                    <div className="absolute left-[18px] top-10 hidden h-[calc(100%-16px)] w-px bg-border lg:hidden sm:block" />
                  )}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${step.bg}`}>
                    <step.icon className={`h-4 w-4 ${step.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground/60">STEP {i + 1}</span>
                    </div>
                    <p className="text-sm font-medium mt-0.5">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Current Subscription */}
      {subscription?.has_subscription && (
        <FadeIn>
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">
                    Current Plan: <span className="text-primary">{subscription.plan?.name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {subscription.status === "active" ? "Active" : subscription.status}
                    {subscription.current_period_end && (
                      <> &middot; Renews {new Date(subscription.current_period_end).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Plans */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, i) => {
          const isCurrentPlan = subscription?.plan?.id === plan.id;
          const features = tierFeatures[plan.tier] || [];
          const isPopular = plan.tier === "growth";

          return (
            <FadeIn key={plan.id} delay={i * 0.1}>
              <Card className={`relative overflow-hidden ${isPopular ? "border-primary shadow-lg ring-1 ring-primary/20" : ""}`}>
                {isPopular && (
                  <div className="absolute right-4 top-4">
                    <Badge className="bg-primary text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {plan.tier === "pro" && <Zap className="h-4 w-4 text-amber-500" />}
                    {plan.name}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {plan.price_naira === 0 ? "Free" : `₦${plan.price_naira.toLocaleString()}`}
                    </span>
                    {plan.price_naira > 0 && <span className="text-sm text-muted-foreground">/month</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2.5">
                    {features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={subscribing === plan.id}
                    >
                      {subscribing === plan.id ? "Redirecting..." : plan.price_naira === 0 ? "Get Started" : "Upgrade"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          );
        })}
      </div>

      {/* Security note */}
      <FadeIn delay={0.4}>
        <div className="mt-8 flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
          <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Payments are processed securely by Paystack. We never store your card details.
            You can cancel your subscription at any time.
          </p>
        </div>
      </FadeIn>
    </PageTransition>
  );
}
