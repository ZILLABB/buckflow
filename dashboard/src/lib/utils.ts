import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(kobo / 100);
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    created: "bg-slate-100 text-slate-700 border-slate-200",
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    processing: "bg-amber-50 text-amber-700 border-amber-200",
    shipped: "bg-violet-50 text-violet-700 border-violet-200",
    delivered: "bg-emerald-100 text-emerald-800 border-emerald-300",
    cancel_requested: "bg-orange-50 text-orange-700 border-orange-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    refund_pending: "bg-rose-100 text-rose-800 border-rose-300",
  };
  return colors[status] || "bg-slate-100 text-slate-700 border-slate-200";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
