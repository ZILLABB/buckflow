"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatAmount, statusColor } from "@/lib/utils";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_ref: string;
  status: string;
  total_amount: number;
  currency: string;
  delivery_address: string | null;
  created_at: string;
  items: OrderItem[];
}

const STATUS_OPTIONS = [
  "",
  "created",
  "confirmed",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancel_requested",
  "cancelled",
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [filter]);

  async function loadOrders() {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : "";
      const data = await api.get<Order[]>(`/orders${params}`);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId: string, status: string) {
    setActionLoading(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      await loadOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelOrder(orderId: string) {
    setActionLoading(orderId);
    try {
      await api.post(`/orders/${orderId}/cancel`);
      await loadOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Orders</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200">
          <Package className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-sm font-bold">
                      {order.order_ref}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        statusColor(order.status)
                      )}
                    >
                      {order.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-brand-700">
                    {formatAmount(order.total_amount)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex gap-2">
                  {order.status === "created" && (
                    <button
                      onClick={() => updateStatus(order.id, "confirmed")}
                      disabled={actionLoading === order.id}
                      className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  )}
                  {order.status === "confirmed" && (
                    <button
                      onClick={() => updateStatus(order.id, "paid")}
                      disabled={actionLoading === order.id}
                      className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                    >
                      Mark Paid
                    </button>
                  )}
                  {order.status === "paid" && (
                    <button
                      onClick={() => updateStatus(order.id, "processing")}
                      disabled={actionLoading === order.id}
                      className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-200 disabled:opacity-50"
                    >
                      Process
                    </button>
                  )}
                  {order.status === "processing" && (
                    <button
                      onClick={() => updateStatus(order.id, "shipped")}
                      disabled={actionLoading === order.id}
                      className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200 disabled:opacity-50"
                    >
                      Ship
                    </button>
                  )}
                  {order.status === "shipped" && (
                    <button
                      onClick={() => updateStatus(order.id, "delivered")}
                      disabled={actionLoading === order.id}
                      className="rounded-lg bg-green-200 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-300 disabled:opacity-50"
                    >
                      Delivered
                    </button>
                  )}
                  {order.status === "cancel_requested" && (
                    <>
                      <button
                        onClick={() => updateStatus(order.id, "cancelled")}
                        disabled={actionLoading === order.id}
                        className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                      >
                        Approve Cancel
                      </button>
                      <button
                        onClick={() => updateStatus(order.id, "processing")}
                        disabled={actionLoading === order.id}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      >
                        Reject Cancel
                      </button>
                    </>
                  )}
                  {["created", "confirmed", "paid"].includes(order.status) && (
                    <button
                      onClick={() => cancelOrder(order.id)}
                      disabled={actionLoading === order.id}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {order.items.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-600">
                          {item.quantity}x {item.product_name}
                        </span>
                        <span className="font-medium">
                          {formatAmount(item.total_price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
