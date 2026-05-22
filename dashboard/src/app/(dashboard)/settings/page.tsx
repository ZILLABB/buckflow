"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Plus,
  Zap,
  Clock,
  Store,
  Bot,
  Phone,
  Wifi,
  WifiOff,
  Shield,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
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
  ai_system_prompt: string | null;
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
  const [aiPrompt, setAiPrompt] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([api.get<Business>("/business/me"), api.get<Rule[]>("/business/rules")])
      .then(([biz, r]) => { setBusiness(biz); setRules(r); setAiPrompt(biz.ai_system_prompt || ""); })
      .catch((err) => showToast(err.message || "Failed to load settings", "error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connectWhatsApp() {
    if (!phoneNumber) return;
    setConnectingWa(true);
    setWaMsg("");
    try {
      await api.post("/business/connect-whatsapp", { phone_number: phoneNumber });
      setWaMsg("Request sent! We'll connect your number within 24 hours.");
      showToast("Connection request sent!");
    } catch (err: any) {
      setWaMsg(err.message || "Something went wrong");
      showToast(err.message || "Failed to send connection request", "error");
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
      showToast("Rule added successfully");
    } catch (err: any) {
      showToast(err.message || "Failed to add rule", "error");
    }
  }

  async function deleteRule(ruleId: string) {
    try {
      await api.delete(`/business/rules/${ruleId}`);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err: any) {
      showToast(err.message || "Failed to delete rule", "error");
    }
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
        <p className="mt-1 text-sm text-muted-foreground">Manage your business configuration</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Left Column ── */}
        <div className="space-y-6">

          {/* ── WhatsApp Connection ── */}
          <FadeIn>
            <Card className="overflow-hidden">
              <div className={`h-1 w-full ${business?.whatsapp_connected ? "bg-emerald-500" : "bg-slate-200"}`} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      business?.whatsapp_connected
                        ? "bg-emerald-500 shadow-lg shadow-emerald-500/20"
                        : "bg-slate-100"
                    }`}>
                      {business?.whatsapp_connected ? (
                        <Wifi className="h-5 w-5 text-white" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-base font-semibold">WhatsApp Business</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {business?.whatsapp_connected
                          ? "Connected and receiving messages"
                          : "Connect your number to start receiving messages"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={business?.whatsapp_connected ? "success" : "secondary"} className="shrink-0">
                    {business?.whatsapp_connected ? "Live" : "Not connected"}
                  </Badge>
                </div>

                {!business?.whatsapp_connected && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5"
                  >
                    <p className="mb-3 text-xs font-medium text-slate-600">
                      Enter your WhatsApp Business phone number
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          className="pl-10 h-10 bg-white"
                          placeholder="+234 801 234 5678"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                      </div>
                      <Button onClick={connectWhatsApp} disabled={connectingWa || !phoneNumber}>
                        {connectingWa ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      Our team will verify and set up the connection within 24 hours
                    </p>
                  </motion.div>
                )}

                {waMsg && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-sm text-emerald-700">{waMsg}</p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          {/* ── Business Configuration ── */}
          <FadeIn delay={0.05}>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <Store className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Business Profile</CardTitle>
                    <CardDescription className="text-xs">Type and category for tailored AI responses</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Business Type</label>
                    <select
                      className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                      value={business?.business_type || "product"}
                      onChange={async (e) => {
                        const val = e.target.value;
                        try {
                          await api.patch("/business/me", {
                            business_type: val,
                            booking_enabled: val === "service" || val === "hybrid",
                          });
                          setBusiness((b) => b ? { ...b, business_type: val } : b);
                          showToast("Business type updated");
                        } catch (err: any) {
                          showToast(err.message || "Failed to update", "error");
                        }
                      }}
                    >
                      <option value="product">Product / Sales</option>
                      <option value="service">Service / Bookings</option>
                      <option value="hybrid">Both (Hybrid)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <select
                      className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                      value={business?.category || "other"}
                      onChange={async (e) => {
                        try {
                          await api.patch("/business/me", { category: e.target.value });
                          setBusiness((b) => b ? { ...b, category: e.target.value } : b);
                          showToast("Category updated");
                        } catch (err: any) {
                          showToast(err.message || "Failed to update", "error");
                        }
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
              </CardContent>
            </Card>
          </FadeIn>

          {/* ── AI Personality ── */}
          <FadeIn delay={0.08}>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                    <Bot className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">AI Personality</CardTitle>
                    <CardDescription className="text-xs">Customize how AI responds to your customers</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  className="text-sm font-mono"
                  placeholder="You are a helpful assistant for [Business Name]. You sell [products/services]. Be friendly, concise, and use simple English. Always quote prices in Naira (₦). Never invent prices or product details."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={5}
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    This prompt shapes every AI response. Leave blank for the default assistant.
                  </p>
                  <Button
                    size="sm"
                    disabled={savingPrompt || aiPrompt === (business?.ai_system_prompt || "")}
                    onClick={async () => {
                      setSavingPrompt(true);
                      try {
                        await api.patch("/business/me", { ai_system_prompt: aiPrompt || null });
                        setBusiness((b) => b ? { ...b, ai_system_prompt: aiPrompt || null } : b);
                        showToast("AI prompt saved");
                      } catch (err: any) {
                        showToast(err.message || "Failed to save prompt", "error");
                      } finally {
                        setSavingPrompt(false);
                      }
                    }}
                  >
                    {savingPrompt ? "Saving..." : "Save Prompt"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* ── Response Rules ── */}
          <FadeIn delay={0.1}>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <Zap className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Response Rules</CardTitle>
                    <CardDescription className="text-xs">Instant replies for common questions — free, checked before AI</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {rules.length > 0 && (
                  <div className="space-y-2">
                    {rules.map((rule) => (
                      <div key={rule.id} className="group rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] capitalize">{rule.category}</Badge>
                              {rule.keywords.map((k) => (
                                <span key={k} className="text-[10px] rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">{k}</span>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{rule.response_text}</p>
                          </div>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="ml-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border-2 border-dashed p-4 space-y-3">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add Rule
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input className="h-9 text-sm" placeholder="Category (pricing, delivery)" value={ruleCategory} onChange={(e) => setRuleCategory(e.target.value)} />
                    <Input className="h-9 text-sm" placeholder="Keywords (comma-separated)" value={ruleKeywords} onChange={(e) => setRuleKeywords(e.target.value)} />
                  </div>
                  <Textarea className="text-sm" placeholder="Reply text..." value={ruleResponse} onChange={(e) => setRuleResponse(e.target.value)} rows={2} />
                  <Button size="sm" onClick={addRule} disabled={!ruleCategory || !ruleKeywords || !ruleResponse}>
                    <Plus className="h-3.5 w-3.5" /> Add Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* ── Right Column — Quick Toggles ── */}
        <div className="space-y-4">
          {/* Auto-Pilot Toggle */}
          <FadeIn delay={0.05}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                      isAutoPilot ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-muted"
                    }`}>
                      <Bot className={`h-5 w-5 ${isAutoPilot ? "text-white" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Auto-Pilot</p>
                      <p className="text-[11px] text-muted-foreground">
                        {isAutoPilot ? "AI is replying" : "Manual mode"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const newVal = !business?.human_only_mode;
                      try {
                        await api.patch("/business/me", { human_only_mode: newVal });
                        setBusiness((b) => b ? { ...b, human_only_mode: newVal } : b);
                        showToast(newVal ? "Switched to manual mode" : "Auto-pilot enabled");
                      } catch (err: any) {
                        showToast(err.message || "Failed to update", "error");
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isAutoPilot ? "bg-emerald-500" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      isAutoPilot ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Business Hours */}
          <FadeIn delay={0.1}>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                      <Clock className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">After Hours Reply</p>
                      <p className="text-[11px] text-muted-foreground">Auto-message when closed</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const newVal = !business?.auto_reply_outside_hours;
                      try {
                        await api.patch("/business/me", { auto_reply_outside_hours: newVal });
                        setBusiness((b) => b ? { ...b, auto_reply_outside_hours: newVal } : b);
                        showToast(newVal ? "After-hours reply enabled" : "After-hours reply disabled");
                      } catch (err: any) {
                        showToast(err.message || "Failed to update", "error");
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      business?.auto_reply_outside_hours ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      business?.auto_reply_outside_hours ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                </div>

                <AnimatePresence>
                  {business?.auto_reply_outside_hours && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Textarea
                        className="text-sm"
                        placeholder="We're currently closed. We'll get back to you soon!"
                        value={business?.outside_hours_message || ""}
                        rows={2}
                        onChange={(e) => setBusiness((b) => b ? { ...b, outside_hours_message: e.target.value } : b)}
                        onBlur={async (e) => {
                          await api.patch("/business/me", { outside_hours_message: e.target.value });
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </FadeIn>

          {/* How It Works */}
          <FadeIn delay={0.15}>
            <Card className="border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-primary mb-3">How replies work</p>
                <div className="space-y-3">
                  {[
                    { step: "1", label: "Customer messages you on WhatsApp" },
                    { step: "2", label: "Response rules checked first (free)" },
                    { step: "3", label: "No match → AI generates a reply" },
                    { step: "4", label: "You can take over any chat anytime" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {item.step}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
