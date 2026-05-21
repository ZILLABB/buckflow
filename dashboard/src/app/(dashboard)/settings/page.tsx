"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Link2, Plus, Trash2, Zap } from "lucide-react";
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
                  <CardDescription>Connect your Meta WhatsApp Business API</CardDescription>
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
