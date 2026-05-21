import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

export function formatAmount(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    created: "bg-gray-100 text-gray-800",
    confirmed: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    processing: "bg-yellow-100 text-yellow-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-200 text-green-900",
    cancel_requested: "bg-orange-100 text-orange-800",
    cancelled: "bg-red-100 text-red-800",
    refund_pending: "bg-red-200 text-red-900",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}
