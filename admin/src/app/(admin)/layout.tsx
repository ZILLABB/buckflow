"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, Users, CreditCard, Receipt,
  Brain, Server, Shield, Menu, X, LogOut, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Businesses", href: "/businesses", icon: Building2 },
  { label: "Users", href: "/users", icon: Users },
  { label: "Plans", href: "/plans", icon: CreditCard },
  { label: "Subscriptions", href: "/subscriptions", icon: Receipt },
  { label: "AI Costs", href: "/ai-costs", icon: Brain },
  { label: "System", href: "/system", icon: Server },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function signOut() {
    localStorage.removeItem("admin_token");
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-[240px] lg:flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-admin">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">BuckFlow Admin</span>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-sidebar-accent/20 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", active && "text-sidebar-accent")} />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="h-3.5 w-3.5 text-sidebar-accent" />}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] bg-sidebar text-sidebar-foreground lg:hidden"
            >
              <div className="flex h-16 items-center justify-between px-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-admin">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-sm">Admin</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1 p-3">
                {NAV.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        active ? "bg-sidebar-accent/20 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", active && "text-sidebar-accent")} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-admin text-xs font-bold text-white">
            SA
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
