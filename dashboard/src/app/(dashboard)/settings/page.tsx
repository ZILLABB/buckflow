"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Link2, Plus, Trash2, Zap, Clock, Store } from "lucide-react";
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
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");
  const [ruleKeywords, setRuleKeywords] = useState("");
  const [ruleResponse, setRuleResponse] = useState("");

  useEffect(() => {
    Promise.all([api.get<Business>("/business/me"), api.get<Rule[]>("/business/rules")])
      .then(([biz, r]) => { setBusiness(biz); setRules(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveWhatsApp() {
    setSaving(true); setMsg("");
    try {
      await api.patch("/business/me", { whatsapp_phone_number_id: waPhoneId, whatsapp_api_token: waToken });
      setMsg("WhatsApp settings saved!");
      setBusiness((b) => (b ? { ...b, whatsapp_connected: true } : b));
    } catch (err: any) { setMsg(err.message); }
    finally { setSaving(false); }
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

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure your business, WhatsApp, and automation rules</p>
      </div>

      <div className="space-y-6">
        {/* Business info */}
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>Your business details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</p>
                  <p className="mt-1 font-semibold">{business?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Slug</p>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">{business?.slug || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">WhatsApp</p>
                  <Badge variant={business?.whatsapp_connected ? "success" : "destructive"} className="mt-1">
                    {business?.whatsapp_connected ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Engine</p>
                  <Badge variant={business?.ai_enabled ? "success" : "secondary"} className="mt-1">
                    {business?.ai_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Business Type & Category */}
        <FadeIn delay={0.05}>
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

        {/* WhatsApp */}
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Link2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>WhatsApp Connection</CardTitle>
                  <CardDescription>Connect your Meta WhatsApp Business API — this is optional and can be done later</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone Number ID</label>
                <Input placeholder="From Meta Business Dashboard" value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">API Token</label>
                <Input type="password" placeholder="Your WhatsApp API token" value={waToken} onChange={(e) => setWaToken(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={saveWhatsApp} disabled={saving || !waPhoneId || !waToken}>
                  {saving ? "Saving..." : "Save Connection"}
                </Button>
                {msg && (
                  <motion.span
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5 text-sm text-emerald-600"
                  >
                    <CheckCircle2 className="h-4 w-4" /> {msg}
                  </motion.span>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Automation Controls */}
        <FadeIn delay={0.15}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                  <Clock className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <CardTitle>Automation & Hours</CardTitle>
                  <CardDescription>Control when AI responds and set business hours</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Human-only toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Human-Only Mode</p>
                  <p className="text-xs text-muted-foreground">Turn off all AI responses — only human agents reply</p>
                </div>
                <button
                  onClick={async () => {
                    const newVal = !business?.human_only_mode;
                    await api.patch("/business/me", { human_only_mode: newVal });
                    setBusiness((b) => b ? { ...b, human_only_mode: newVal } : b);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    business?.human_only_mode ? "bg-amber-500" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      business?.human_only_mode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Outside hours auto-reply toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Auto-Reply Outside Hours</p>
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
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Outside Hours Message</label>
                  <Textarea
                    placeholder="Thanks for reaching out! We're currently closed..."
                    value={business?.outside_hours_message || ""}
                    rows={2}
                    onChange={(e) => setBusiness((b) => b ? { ...b, outside_hours_message: e.target.value } : b)}
                    onBlur={async (e) => {
                      await api.patch("/business/me", { outside_hours_message: e.target.value });
                    }}
                  />
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Business hours can be set per day. The system uses your timezone ({business?.timezone || "Africa/Lagos"}) to determine open/closed status.
              </p>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Rules */}
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle>Auto-Response Rules</CardTitle>
                  <CardDescription>Free responses — no AI cost. Rules are checked before AI.</CardDescription>
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
