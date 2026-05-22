"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Zap,
  Shield,
  Bot,
  ArrowRight,
  CheckCircle2,
  Users,
  BarChart3,
  Clock,
  ChevronRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("bf_token");
    if (token) {
      router.replace("/dashboard");
      return;
    }
    setIsLoggedIn(false);
  }, [router]);

  // While checking auth, show loading
  if (isLoggedIn === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">BuckFlow AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button size="sm">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="absolute top-40 right-0 h-[400px] w-[400px] rounded-full bg-teal-500/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <Zap className="h-3.5 w-3.5 text-emerald-500" />
              AI-powered WhatsApp automation for Nigerian businesses
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Turn your WhatsApp into a{" "}
              <span className="text-gradient">24/7 sales machine</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              BuckFlow AI replies to your customers instantly, takes orders, books appointments,
              and handles support — all on WhatsApp. You focus on growing your business.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8 text-sm font-semibold shadow-lg shadow-primary/20">
                  Start Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="h-12 px-8 text-sm">
                  See how it works
                </Button>
              </a>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Free to start
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Setup in 5 minutes
              </span>
            </div>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-16 mx-auto max-w-4xl"
          >
            <div className="rounded-2xl border bg-white shadow-2xl shadow-black/5 overflow-hidden">
              {/* Mock dashboard header */}
              <div className="flex items-center gap-3 border-b bg-slate-50 px-6 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="rounded-md bg-white border px-4 py-1 text-[11px] text-muted-foreground">
                    app.buckflow.ai/dashboard
                  </div>
                </div>
              </div>
              {/* Mock dashboard content */}
              <div className="p-6 bg-gradient-to-br from-slate-50 to-white">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Conversations", value: "1,248", color: "bg-blue-500" },
                    { label: "Customers", value: "892", color: "bg-emerald-500" },
                    { label: "Orders", value: "347", color: "bg-amber-500" },
                    { label: "Revenue", value: "₦2.4M", color: "bg-pink-500" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border bg-white p-3">
                      <div className={`h-1.5 w-6 rounded-full ${stat.color} mb-2 opacity-60`} />
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-white p-4">
                    <p className="text-xs font-semibold mb-3">Recent Conversations</p>
                    <div className="space-y-2.5">
                      {["Adebayo O.", "Chioma N.", "Kemi A."].map((name) => (
                        <div key={name} className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {name[0]}
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] font-medium">{name}</p>
                            <div className="h-1.5 w-20 rounded bg-muted mt-1" />
                          </div>
                          <div className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-medium text-emerald-700">AI</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-white p-4">
                    <p className="text-xs font-semibold mb-3">AI Activity</p>
                    <div className="flex items-end gap-1 h-20">
                      {[40, 65, 55, 80, 70, 90, 85, 60, 75, 95, 70, 80].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-gradient-to-t from-emerald-500 to-teal-400 opacity-70"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Features</p>
            <h2 className="text-3xl font-bold tracking-tight">Everything you need to sell on WhatsApp</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              From instant AI replies to order management, BuckFlow handles the heavy lifting so you can focus on your business.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Bot,
                color: "bg-emerald-500/10 text-emerald-600",
                title: "AI Auto-Pilot",
                description: "Smart AI replies trained on your business context. Handles FAQs, pricing, and support 24/7.",
              },
              {
                icon: Zap,
                color: "bg-amber-500/10 text-amber-600",
                title: "Free Rule Engine",
                description: "Set up keyword-based instant replies for common questions. Unlimited and always free.",
              },
              {
                icon: MessageSquare,
                color: "bg-blue-500/10 text-blue-600",
                title: "Conversation Management",
                description: "View all chats in one dashboard. Switch between AI and manual mode per conversation.",
              },
              {
                icon: Users,
                color: "bg-violet-500/10 text-violet-600",
                title: "Customer Profiles",
                description: "Automatic customer tracking. Block, flag, or manage AI permissions per customer.",
              },
              {
                icon: BarChart3,
                color: "bg-pink-500/10 text-pink-600",
                title: "Analytics & Insights",
                description: "Track conversations, orders, revenue, and AI usage. Know what's working.",
              },
              {
                icon: Clock,
                color: "bg-slate-500/10 text-slate-600",
                title: "Business Hours",
                description: "Auto-reply when you're closed. Customers always get a response, even at 3am.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group rounded-2xl border bg-white p-6 hover:shadow-lg hover:border-primary/20 transition-all"
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.color}`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">How it works</p>
            <h2 className="text-3xl font-bold tracking-tight">Up and running in minutes</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Three simple steps to automate your WhatsApp business
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {[
              {
                step: "01",
                title: "Connect your WhatsApp",
                description: "Sign up, enter your WhatsApp Business number, and our team connects it within 24 hours.",
              },
              {
                step: "02",
                title: "Set your rules & preferences",
                description: "Choose your business type, add response rules for common questions, and configure AI behavior.",
              },
              {
                step: "03",
                title: "Let AI handle the rest",
                description: "AI starts replying to customers instantly. Monitor conversations and take over any chat when needed.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative"
              >
                {i < 2 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(100%+16px)] w-[calc(100%-32px)] border-t-2 border-dashed border-primary/20" />
                )}
                <div className="rounded-2xl border bg-white p-8">
                  <span className="text-4xl font-extrabold text-primary/10">{item.step}</span>
                  <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Preview ── */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Pricing</p>
            <h2 className="text-3xl font-bold tracking-tight">Start free, scale as you grow</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Generous free tier with unlimited rule-based responses. Only pay for AI when you need it.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              {
                name: "Basic",
                price: "Free",
                suffix: "",
                features: ["500 conversations/mo", "200 AI responses", "Unlimited rules", "Basic analytics"],
                popular: false,
              },
              {
                name: "Growth",
                price: "₦15,000",
                suffix: "/mo",
                features: ["2,000 conversations/mo", "1,000 AI responses", "Full analytics", "Appointment booking"],
                popular: true,
              },
              {
                name: "Pro",
                price: "₦45,000",
                suffix: "/mo",
                features: ["Unlimited conversations", "5,000 AI responses", "Premium AI model", "RAG knowledge base"],
                popular: false,
              },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl border bg-white p-6 ${
                  plan.popular ? "border-primary shadow-lg ring-1 ring-primary/20 relative" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.suffix && <span className="text-sm text-muted-foreground">{plan.suffix}</span>}
                </div>
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="mt-6 block">
                  <Button variant={plan.popular ? "default" : "outline"} className="w-full">
                    Get Started <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl gradient-dark p-12 lg:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-transparent to-teal-600/20" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
                Ready to automate your WhatsApp business?
              </h2>
              <p className="mt-4 text-slate-300 max-w-xl mx-auto">
                Join hundreds of Nigerian businesses already using BuckFlow AI to handle customer messages,
                take orders, and grow revenue on autopilot.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/login">
                  <Button size="lg" className="h-12 px-8 bg-white text-slate-900 hover:bg-white/90 font-semibold">
                    Start Free Today <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
                <MessageSquare className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold">BuckFlow AI</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Built for Nigerian businesses on WhatsApp
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
