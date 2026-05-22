"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Lock, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ access_token: string; user: { role: string } }>("/auth/login", { email, password });
      if (res.user.role !== "super_admin") {
        setError("Access denied — super admin only");
        return;
      }
      localStorage.setItem("admin_token", res.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 gradient-admin flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">BuckFlow Admin</span>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-4xl font-bold leading-tight">
            Platform<br />Control Center
          </h1>
          <p className="mt-4 text-lg text-white/70 max-w-md">
            Manage businesses, monitor usage, control subscriptions, and oversee the entire BuckFlow AI platform.
          </p>
          <div className="mt-8 space-y-4">
            {["Business management & oversight", "Real-time platform analytics", "AI cost monitoring & control", "Subscription & billing management"].map((item, i) => (
              <motion.div key={item} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="flex items-center gap-3 text-white/80">
                <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
                <span className="text-sm">{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <p className="text-sm text-white/40">BuckFlow AI — Platform Administration</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-admin">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">BuckFlow Admin</span>
            </div>
            <h2 className="text-2xl font-bold">Admin Access</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in with your super admin credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="admin@buckflow.ai" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required icon={<Lock className="h-4 w-4" />} />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </motion.div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : <>Sign In <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
