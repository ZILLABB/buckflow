"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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

  // WhatsApp fields
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");

  // New rule fields
  const [ruleCategory, setRuleCategory] = useState("");
  const [ruleKeywords, setRuleKeywords] = useState("");
  const [ruleResponse, setRuleResponse] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<Business>("/business/me"),
      api.get<Rule[]>("/business/rules"),
    ])
      .then(([biz, r]) => {
        setBusiness(biz);
        setRules(r);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function saveWhatsApp() {
    setSaving(true);
    setMsg("");
    try {
      await api.patch("/business/me", {
        whatsapp_phone_number_id: waPhoneId,
        whatsapp_api_token: waToken,
      });
      setMsg("WhatsApp settings saved!");
      setBusiness((b) => (b ? { ...b, whatsapp_connected: true } : b));
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setSaving(false);
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
      const updated = await api.get<Rule[]>("/business/rules");
      setRules(updated);
      setRuleCategory("");
      setRuleKeywords("");
      setRuleResponse("");
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* Business info */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Business</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">{business?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Slug</p>
            <p className="font-mono text-sm">{business?.slug}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">WhatsApp</p>
            <p
              className={
                business?.whatsapp_connected
                  ? "font-medium text-green-600"
                  : "font-medium text-red-500"
              }
            >
              {business?.whatsapp_connected ? "Connected" : "Not Connected"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">AI</p>
            <p className="font-medium">
              {business?.ai_enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>
      </section>

      {/* WhatsApp setup */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">WhatsApp Connection</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Phone Number ID (from Meta)"
            value={waPhoneId}
            onChange={(e) => setWaPhoneId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            type="password"
            placeholder="WhatsApp API Token"
            value={waToken}
            onChange={(e) => setWaToken(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={saveWhatsApp}
            disabled={saving || !waPhoneId || !waToken}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save WhatsApp Settings"}
          </button>
          {msg && <p className="text-sm text-brand-600">{msg}</p>}
        </div>
      </section>

      {/* Rule engine */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">
          Auto-Response Rules (Free — No AI Cost)
        </h3>

        {rules.length > 0 && (
          <div className="mb-6 space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {rule.category}
                  </span>
                  <span className="text-xs text-gray-400">
                    Keywords: {rule.keywords.join(", ")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-700">
                  {rule.response_text}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4">
          <p className="text-sm font-medium text-gray-600">Add New Rule</p>
          <input
            type="text"
            placeholder="Category (e.g. pricing, delivery, hours)"
            value={ruleCategory}
            onChange={(e) => setRuleCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Keywords (comma-separated: price, how much, cost)"
            value={ruleKeywords}
            onChange={(e) => setRuleKeywords(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <textarea
            placeholder="Response text"
            value={ruleResponse}
            onChange={(e) => setRuleResponse(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={addRule}
            disabled={!ruleCategory || !ruleKeywords || !ruleResponse}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Add Rule
          </button>
        </div>
      </section>
    </div>
  );
}
