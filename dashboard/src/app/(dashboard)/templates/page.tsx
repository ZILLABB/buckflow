"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  X,
  FileText,
  Send,
  Filter,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface Template {
  id: string;
  name: string;
  category: string;
  language_code: string;
  body_text: string;
  header_text: string | null;
  footer_text: string | null;
  parameter_map: Record<string, string> | null;
  is_active: boolean;
  is_approved: boolean;
  created_at: string | null;
}

interface Category {
  value: string;
  label: string;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  order_confirmation: { bg: "bg-blue-500/10", text: "text-blue-600" },
  order_update: { bg: "bg-indigo-500/10", text: "text-indigo-600" },
  appointment_reminder: { bg: "bg-violet-500/10", text: "text-violet-600" },
  appointment_confirmation: { bg: "bg-purple-500/10", text: "text-purple-600" },
  payment_reminder: { bg: "bg-amber-500/10", text: "text-amber-600" },
  welcome: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  follow_up: { bg: "bg-rose-500/10", text: "text-rose-600" },
  custom: { bg: "bg-slate-500/10", text: "text-slate-600" },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const { showToast } = useToast();

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("custom");
  const [bodyText, setBodyText] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    try {
      const [temps, cats] = await Promise.all([
        api.get<Template[]>("/templates"),
        api.get<Category[]>("/templates/categories"),
      ]);
      setTemplates(temps);
      setCategories(cats);
    } catch (err: any) {
      showToast(err.message || "Failed to load templates", "error");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setName("");
    setCategory("custom");
    setBodyText("");
    setHeaderText("");
    setFooterText("");
    setShowModal(true);
  }

  function openEdit(template: Template) {
    setEditingId(template.id);
    setName(template.name);
    setCategory(template.category);
    setBodyText(template.body_text);
    setHeaderText(template.header_text || "");
    setFooterText(template.footer_text || "");
    setShowModal(true);
  }

  async function handleSave() {
    if (!name || !bodyText) {
      showToast("Name and body text are required", "warning");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/templates/${editingId}`, {
          name,
          body_text: bodyText,
          header_text: headerText || null,
          footer_text: footerText || null,
        });
        showToast("Template updated");
      } else {
        await api.post("/templates", {
          name,
          category,
          body_text: bodyText,
          header_text: headerText || null,
          footer_text: footerText || null,
        });
        showToast("Template created");
      }
      setShowModal(false);
      const updated = await api.get<Template[]>("/templates");
      setTemplates(updated);
    } catch (err: any) {
      showToast(err.message || "Failed to save template", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      showToast("Template deleted");
    } catch (err: any) {
      showToast(err.message || "Failed to delete template", "error");
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await api.patch(`/templates/${id}`, { is_active: !isActive });
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: !isActive } : t))
      );
      showToast(isActive ? "Template deactivated" : "Template activated");
    } catch (err: any) {
      showToast(err.message || "Failed to update template", "error");
    }
  }

  const filteredTemplates = filterCategory
    ? templates.filter((t) => t.category === filterCategory)
    : templates;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            WhatsApp message templates for notifications and reminders
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Category Filter */}
      <FadeIn>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => setFilterCategory("")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !filterCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({templates.length})
          </button>
          {categories.map((cat) => {
            const count = templates.filter((t) => t.category === cat.value).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(filterCategory === cat.value ? "" : cat.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterCategory === cat.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </FadeIn>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const color = categoryColors[template.category] || categoryColors.custom;
            return (
              <StaggerItem key={template.id}>
                <Card className={`group ${!template.is_active ? "opacity-60" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color.bg}`}>
                        <MessageCircle className={`h-4 w-4 ${color.text}`} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {template.is_approved ? (
                          <Badge variant="success" className="text-[10px]">
                            <CheckCircle2 className="h-3 w-3" /> Approved
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold mb-1 truncate">{template.name}</h3>
                    <Badge variant="outline" className="text-[10px] capitalize mb-3">
                      {template.category.replace(/_/g, " ")}
                    </Badge>

                    {template.header_text && (
                      <p className="text-[11px] font-medium text-foreground/80 mb-1">{template.header_text}</p>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {template.body_text}
                    </p>
                    {template.footer_text && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1 italic">{template.footer_text}</p>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(template)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => toggleActive(template.id, template.is_active)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        title={template.is_active ? "Deactivate" : "Activate"}
                      >
                        <Send className={`h-3.5 w-3.5 ${template.is_active ? "text-emerald-500" : "text-muted-foreground"}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      ) : (
        <div className="py-16 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No templates yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Create message templates for order confirmations, appointment reminders, and more
          </p>
          <Button variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Create Template
          </Button>
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg rounded-2xl border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 pb-0">
                <div>
                  <h2 className="text-lg font-semibold">
                    {editingId ? "Edit Template" : "New Template"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Templates use {"{{1}}, {{2}}"} placeholders for dynamic content
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-md hover:bg-muted">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Template Name</label>
                    <Input
                      placeholder="e.g. order_confirmed"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <select
                      className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={!!editingId}
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Header (optional)</label>
                  <Input
                    placeholder="e.g. Order Confirmed!"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Body Text</label>
                  <Textarea
                    placeholder={"Hi {{1}}, your order #{{2}} has been confirmed! Total: {{3}}"}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Footer (optional)</label>
                  <Input
                    placeholder="e.g. Thank you for shopping with us!"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                  />
                </div>

                {/* Preview */}
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4">
                  <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Preview</p>
                  <div className="rounded-lg bg-white dark:bg-card p-3 shadow-sm">
                    {headerText && (
                      <p className="text-xs font-semibold mb-1">{headerText}</p>
                    )}
                    <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {bodyText || "Your message body will appear here..."}
                    </p>
                    {footerText && (
                      <p className="text-[10px] text-muted-foreground mt-2 italic">{footerText}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSave}
                    disabled={saving || !name || !bodyText}
                  >
                    {saving ? "Saving..." : editingId ? "Update Template" : "Create Template"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
