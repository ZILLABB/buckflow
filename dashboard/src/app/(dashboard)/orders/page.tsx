"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatAmount, statusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/motion";

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

const STATUSES = ["", "created", "confirmed", "paid", "processing", "shipped", "delivered", "cancel_requested", "cancelled"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { loadOrders(); }, [filter]);

  async function loadOrders() {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : "";
      setOrders(await api.get<Order[]>(`/orders${params}`));
    } catch {} finally { setLoading(false); }
  }

  async function updateStatus(orderId: string, status: string) {
    setActionLoading(orderId);
    try { await api.patch(`/orders/${orderId}/status`, { status }); await loadOrders(); }
    catch (err: any) { alert(err.message); }
    finally { setActionLoading(null); }
  }

  async function cancelOrder(orderId: string) {
    setActionLoading(orderId);
    try { await api.post(`/orders/${orderId}/cancel`); await loadOrders(); }
    catch (err: any) { alert(err.message); }
    finally { setActionLoading(null); }
  }

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">{orders.length} order{orders.length !== 1 && "s"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All statuses</option>
            {STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="No orders yet"
          description="Orders created through WhatsApp conversations will appear here."
        />
      ) : (
        <StaggerContainer className="space-y-3">
          {orders.map((order) => (
            <StaggerItem key={order.id}>
              <Card className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold tracking-wider">{order.order_ref}</span>
                        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", statusColor(order.status))}>
                          {order.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-2xl font-bold tracking-tight text-primary">{formatAmount(order.total_amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("en-NG", {
                          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {order.status === "created" && (
                        <Button size="xs" variant="outline" onClick={() => updateStatus(order.id, "confirmed")} disabled={actionLoading === order.id}>
                          Confirm
                        </Button>
                      )}
                      {order.status === "confirmed" && (
                        <Button size="xs" variant="success" onClick={() => updateStatus(order.id, "paid")} disabled={actionLoading === order.id}>
                          Mark Paid
                        </Button>
                      )}
                      {order.status === "paid" && (
                        <Button size="xs" variant="warning" onClick={() => updateStatus(order.id, "processing")} disabled={actionLoading === order.id}>
                          Process
                        </Button>
                      )}
                      {order.status === "processing" && (
                        <Button size="xs" variant="outline" onClick={() => updateStatus(order.id, "shipped")} disabled={actionLoading === order.id}>
                          Ship
                        </Button>
                      )}
                      {order.status === "shipped" && (
                        <Button size="xs" variant="success" onClick={() => updateStatus(order.id, "delivered")} disabled={actionLoading === order.id}>
                          Delivered
                        </Button>
                      )}
                      {order.status === "cancel_requested" && (
                        <>
                          <Button size="xs" variant="destructive" onClick={() => updateStatus(order.id, "cancelled")} disabled={actionLoading === order.id}>
                            Approve
                          </Button>
                          <Button size="xs" variant="outline" onClick={() => updateStatus(order.id, "processing")} disabled={actionLoading === order.id}>
                            Reject
                          </Button>
                        </>
                      )}
                      {["created", "confirmed", "paid"].includes(order.status) && (
                        <Button size="xs" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => cancelOrder(order.id)} disabled={actionLoading === order.id}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {order.items.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <div className="space-y-1.5">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{item.quantity}x {item.product_name}</span>
                            <span className="font-medium">{formatAmount(item.total_price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </PageTransition>
  );
}
