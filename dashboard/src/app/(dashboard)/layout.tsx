"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Headphones,
  ChevronRight,
  CalendarDays,
  Users,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface BusinessInfo {
  business_type: string;
  booking_enabled: boolean;
}

// Base nav items shown for all business types
const baseNavItems = [
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
];

// Product-only items
const productNavItems = [
  { href: "/orders", label: "Orders", icon: Package },
];

// Service-only items
const serviceNavItems = [
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
];

// Common items for all
const commonNavItems = [
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

function getNavItems(businessType: string): typeof baseNavItems {
  const items = [...baseNavItems];

  if (businessType === "product" || businessType === "hybrid") {
    items.push(...productNavItems);
  }
  if (businessType === "service" || businessType === "hybrid") {
    items.push(...serviceNavItems);
  }

  items.push(...commonNavItems);
  return items;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businessType, setBusinessType] = useState("hybrid"); // default: show all

  useEffect(() => {
    const token = localStorage.getItem("bf_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    // Fetch business type to customize nav
    api.get<BusinessInfo>("/business/me")
      .then((biz) => setBusinessType(biz.business_type || "hybrid"))
      .catch(() => {});
  }, [router]);

  const navItems = getNavItems(businessType);

  function handleLogout() {
    localStorage.removeItem("bf_token");
    router.push("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col gradient-dark text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/20">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">BuckFlow AI</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-emerald-400")} />
                {item.label}
                {isActive && (
                  <ChevronRight className="ml-auto h-4 w-4 text-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Support card */}
        <div className="mx-3 mb-3 rounded-lg bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
              <Headphones className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium">Need help?</p>
              <p className="text-xs text-slate-400">Contact support</p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/5 hover:text-rose-400"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            B
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
