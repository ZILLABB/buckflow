"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ icon, label, value, change, trend, className }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          {change && (
            <span
              className={cn(
                "text-xs font-medium rounded-full px-2 py-0.5",
                trend === "up" && "bg-emerald-50 text-emerald-600",
                trend === "down" && "bg-rose-50 text-rose-600",
                trend === "neutral" && "bg-slate-50 text-slate-600"
              )}
            >
              {change}
            </span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}
