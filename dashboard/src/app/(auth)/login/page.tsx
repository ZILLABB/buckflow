"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, MessageSquare, Shield, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    try {
      if (isRegister) {
        const fullName = form.get("full_name") as string;
        const businessName = form.get("business_name") as string;
        const res = await api.post<{ access_token: string }>("/auth/register", {
          email, password, full_name: fullName, business_name: businessName,
        });
        localStorage.setItem("bf_token", res.access_token);
        // New users go to onboarding to pick business type
        router.push("/onboarding");
      } else {
        const res = await api.post<{ access_token: string }>("/auth/login", { email, password });
        localStorage.setItem("bf_token", res.access_token);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] gradient-dark flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
              <MessageSquare className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">BuckFlow AI</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="space-y-8"
        >
          <h2 className="text-3xl font-bold leading-tight">
            Automate your WhatsApp sales with AI intelligence
          </h2>
          <div className="space-y-5">
            <Feature
              icon={<Zap className="h-4 w-4" />}
              title="Instant Replies"
              desc="AI responds to customers in seconds, 24/7"
            />
            <Feature
              icon={<MessageSquare className="h-4 w-4" />}
              title="Smart Conversations"
              desc="Handles orders, support, and sales automatically"
            />
            <Feature
              icon={<Shield className="h-4 w-4" />}
              title="Cost Controlled"
              desc="Rule engine handles most queries for free"
            />
          </div>
        </motion.div>

        <p className="text-sm text-slate-400">
          Trusted by Nigerian businesses on WhatsApp
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          <div className="mb-8">
            <div className="flex items-center gap-3 lg:hidden mb-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold">BuckFlow AI</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isRegister ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isRegister
                ? "Start automating your WhatsApp business in minutes"
                : "Sign in to your BuckFlow dashboard"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input name="full_name" placeholder="Chidi Okonkwo" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Business Name</label>
                  <Input name="business_name" placeholder="Chidi Fashion House" required />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" placeholder="you@business.com" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password</label>
              <Input name="password" type="password" placeholder="••••••••" required minLength={6} />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-semibold">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isRegister ? "Create Account" : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {isRegister ? "Sign In" : "Register"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-emerald-400">
        {icon}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-slate-400">{desc}</p>
      </div>
    </div>
  );
}
