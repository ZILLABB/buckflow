"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Plus,
  Zap,
  Clock,
  Store,
  MessageCircle,
  Bot,
  Phone,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition, FadeIn } from "@/components/ui/motion";

interface Business {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  whatsapp_connected: boolean;
  ai_enabled: boolean;
  business_type: string;
  category: string;
  operating_hours: Record<string, { open: string; close: string }> | null;
  timezone: string;
  auto_reply_outside_hours: boolean;
  outside_hours_message: string | null;
  booking_enabled: boolean;
  human_only_mode: boolean;
}

interface Rule {
  id: string;
  category: string;
  keywords: string[];
  response_text: string;
  priority: number;
  is_active: boolean;
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [ruleCategory, setRuleCategory] = useState("");
  const [ruleKeywords, setRuleKeywords] = useState("");
  const [ruleResponse, setRuleResponse] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [connectingWa, setConnectingWa] = useState(false);
  const [waMsg, setWaMsg] = useState("");

  useEffect(() => {
    Promise.all([api.get<Business>("/business/me"), api.get<Rule[]>("/business/rules")])
      .then(([biz, r]) => { setBusiness(biz); setRules(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function connectWhatsApp() {
    if (!phoneNumber) return;
    setConnectingWa(true);
    setWaMsg("");
    try {
      await api.post("/business/connect-whatsapp", { phone_number: phoneNumber });
      setWaMsg("Request sent! Our team will connect your number within 24 hours.");
      setBusiness((b) => b ? { ...b, whatsapp_connected: false } : b);
    } catch (err: any) {
      setWaMsg(err.message || "Something went wrong");
    } finally {
      setConnectingWa(false);
    }
  }

  async function addRule() {
    if (!ruleCategory || !ruleKeywords || !ruleResponse) return;
    try {
      await api.post("/business/rules", {
        category: ruleCategory,
        keywords: ruleKeywords.split(",").map((k: string) => k.trim()),
        response_text: ruleResponse,
      });
      setRules(await api.get<Rule[]>("/business/rules"));
      setRuleCategory(""); setRuleKeywords(""); setRuleResponse("");
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  const isAutoPilot = !business?.human_only_mode;

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure your business and how AI handles your customers</p>
      </div>

      <div className="space-y-6">

        {/* ── WhatsApp Connection Status ── */}
        <FadeIn>
          <Card className={business?.whatsapp_connected ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  business?.whatsapp_connected ? "bg-emerald-500/10" : "bg-amber-500/10"
                }`}>
                  <MessageCircle className={`h-4 w-4 ${
                    business?.whatsapp_connected ? "text-emerald-600" : "text-amber-600"
                  }`} />
                </div>
                <div className="flex-1">
                  <CardTitle>WhatsApp</CardTitle>
                  <CardDescription>
                    {business?.whatsapp_connected
                      ? "Your WhatsApp number is connected and receiving messages"
                      : "Connect your WhatsApp number to start receiving customer messages"
                    }
                  </CardDescription>
                </div>
                <Badge variant={business?.whatsapp_connected ? "success" : "outline"}>
                  {business?.whatsapp_connected ? "Connected" : "Pending"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {business?.whatsapp_connected ? (
                <div className="flex items-center gap-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/20 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">WhatsApp is active</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Customer messages are being received and processed</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Not yet connected</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Enter your WhatsApp Business phone number below. Our team will set up the connection for you.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="+234 801 234 5678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                    <Button onClick={connectWhatsApp} disabled={connectingWa || !phoneNumber}>
                      {connectingWa ? "Sending..." : "Connect Number"}
                    </Button>
                  </div>
                  {waMsg && (
                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-sm text-emerald-600 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {waMsg}
                    </motion.p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* ── Auto-Pilot Toggle ── */}
        <FadeIn delay={0.05}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  isAutoPilot ? "bg-emerald-500/10" : "bg-slate-200 dark:bg-slate-800"
                }`}>
                  <Bot className={`h-4 w-4 ${isAutoPilot ? "text-emerald-600" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <CardTitle>Auto-Pilot</CardTitle>
                  <CardDescription>
                    {isAutoPilot
                      ? "AI is handling customer messages automatically"
                      : "Only human agents are replying to customers"
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Main toggle */}
              <div className="flex items-center justify-between rounded-xl border-2 p-5">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    isAutoPilot ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-muted"
                  }`}>
                    {isAutoPilot ? (
                      <Sparkles className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <Bot className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {isAutoPilot ? "Auto-Pilot is ON" : "Auto-Pilot is OFF"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isAutoPilot
                        ? "AI + rules handle messages. You can take over any chat manually."
                        : "Only you and your team are responding. Turn on to let AI help."
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newVal = !business?.human_only_mode;
                    await api.patch("/business/me", { human_only_mode: newVal });
                    setBusiness((b) => b ? { ...b, human_only_mode: newVal } : b);
                  }}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    isAutoPilot ? "bg-emerald-500" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      isAutoPilot ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* What auto-pilot does */}
              {isAutoPilot && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="rounded-lg bg-muted/50 p-4 space-y-2"
                >
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">How it works</p>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <p>1. Customer sends a message on WhatsApp</p>
                    <p>2. Your <span className="font-medium text-foreground">response rules</span> are checked first (free, instant)</p>
                    <p>3. If no rule matches, <span className="font-medium text-foreground">AI generates</span> a smart reply</p>
                    <p>4. You can take over any chat anytime by switching it to manual</p>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* ── Business Type & Category ── */}
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <Store className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Business Type</CardTitle>
                  <CardDescription>This controls which features are shown in your dashboard</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={business?.business_type || "product"}
                    onChange={async (e) => {
                      const val = e.target.value;
                      await api.patch("/business/me", {
                        business_type: val,
                        booking_enabled: val === "service" || val === "hybrid",
                      });
                      setBusiness((b) => b ? { ...b, business_type: val } : b);
                    }}
                  >
                    <option value="product">Product / Sales</option>
                    <option value="service">Service / Bookings</option>
                    <option value="hybrid">Both (Hybrid)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={business?.category || "other"}
                    onChange={async (e) => {
                      await api.patch("/business/me", { category: e.target.value });
                      setBusiness((b) => b ? { ...b, category: e.target.value } : b);
                    }}
                  >
                    <option value="retail">Retail / General Store</option>
                    <option value="restaurant">Restaurant / Food</option>
                    <option value="salon">Salon / Beauty</option>
                    <option value="spa">Spa / Wellness</option>
                    <option value="clinic">Clinic / Healthcare</option>
                    <option value="logistics">Logistics / Delivery</option>
                    <option value="consulting">Consulting / Professional</option>
                    <option value="fashion">Fashion / Clothing</option>
                    <option value="electronics">Electronics / Tech</option>
                    <option value="grocery">Grocery / Supermarket</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Product businesses see Orders. Service businesses see Appointments. Hybrid sees both.
              </p>
            </CardContent>
          </Card>
        </FadeIn>

        {/* ── Business Hours ── */}
        <FadeIn delay={0.15}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                  <Clock className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <CardTitle>Business Hours</CardTitle>
                  <CardDescription>Control what happens when you're closed</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Outside hours auto-reply toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Auto-Reply When Closed</p>
                  <p className="text-xs text-muted-foreground">Send a message when customers text outside business hours</p>
                </div>
                <button
                  onClick={async () => {
                    const newVal = !business?.auto_reply_outside_hours;
                    await api.patch("/business/me", { auto_reply_outside_hours: newVal });
                    setBusiness((b) => b ? { ...b, auto_reply_outside_hours: newVal } : b);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    business?.auto_reply_outside_hours ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      business?.auto_reply_outside_hours ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Outside hours message */}
              {business?.auto_reply_outside_hours && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-1.5"
                >
                  <label className="text-sm font-medium">Closed Hours Message</label>
                  <Textarea
                    placeholder="Thanks for reaching out! We're currently closed. We'll get back to you when we open."
                    value={business?.outside_hours_message || ""}
                    rows={2}
                    onChange={(e) => setBusiness((b) => b ? { ...b, outside_hours_message: e.target.value } : b)}
                    onBlur={async (e) => {
                      await api.patch("/business/me", { outside_hours_message: e.target.value });
                    }}
                  />
                </motion.div>
              )}

              <p className="text-xs text-muted-foreground">
                Timezone: {business?.timezone || "Africa/Lagos"}. Contact support to update your business hours schedule.
              </p>
            </CardContent>
          </Card>
        </FadeIn>

        {/* ── Auto-Response Rules ── */}
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle>Response Rules</CardTitle>
                  <CardDescription>Instant replies for common questions — free, no AI cost. These are checked before AI.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {rules.length > 0 && (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div key={rule.id} className="group rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{rule.category}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {rule.keywords.map((k) => (
                                <span key={k} className="mr-1.5 inline-block rounded bg-muted px-1.5 py-0.5">{k}</span>
                              ))}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{rule.response_text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border-2 border-dashed border-border/60 p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Plus className="h-4 w-4 text-primary" />
                  Add New Rule
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Category (pricing, delivery, hours)" value={ruleCategory} onChange={(e) => setRuleCategory(e.target.value)} />
                  <Input placeholder="Keywords (comma-separated)" value={ruleKeywords} onChange={(e) => setRuleKeywords(e.target.value)} />
                </div>
                <Textarea placeholder="Response text — this will be sent when keywords match" value={ruleResponse} onChange={(e) => setRuleResponse(e.target.value)} rows={3} />
                <Button onClick={addRule} disabled={!ruleCategory || !ruleKeywords || !ruleResponse}>
                  <Plus className="h-4 w-4" /> Add Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
