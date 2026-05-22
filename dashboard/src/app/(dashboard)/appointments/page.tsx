"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Briefcase,
  Trash2,
  Tag,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatAmount } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface Appointment {
  id: string;
  appointment_ref: string;
  service_name: string;
  status: string;
  scheduled_at: string;
  duration_mins: number;
  notes: string | null;
  customer_id: string;
  created_at: string | null;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_mins: number | null;
  is_active: boolean;
  category: string | null;
}

const statusConfig: Record<string, { label: string; variant: string; icon: any }> = {
  requested: { label: "Requested", variant: "outline", icon: AlertCircle },
  confirmed: { label: "Confirmed", variant: "success", icon: CheckCircle2 },
  reminder_sent: { label: "Reminder Sent", variant: "secondary", icon: Clock },
  completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
  no_show: { label: "No Show", variant: "destructive", icon: XCircle },
};

type Tab = "appointments" | "services";

export default function AppointmentsPage() {
  const [tab, setTab] = useState<Tab>("appointments");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const { showToast } = useToast();

  // Service form state
  const [showForm, setShowForm] = useState(false);
  const [svcName, setSvcName] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcPrice, setSvcPrice] = useState("");
  const [svcDuration, setSvcDuration] = useState("");
  const [svcCategory, setSvcCategory] = useState("");
  const [addingService, setAddingService] = useState(false);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function loadData() {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : "";
      const [apts, svcs] = await Promise.all([
        api.get<Appointment[]>(`/appointments${params}`),
        api.get<ServiceItem[]>("/appointments/services"),
      ]);
      setAppointments(apts);
      setServices(svcs);
    } catch (err: any) {
      showToast(err.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
      showToast("Status updated");
    } catch (err: any) {
      showToast(err.message || "Failed to update status", "error");
    }
  }

  async function addService() {
    if (!svcName.trim()) return;
    setAddingService(true);
    try {
      await api.post("/appointments/services", {
        name: svcName.trim(),
        description: svcDesc.trim() || null,
        price: svcPrice ? Math.round(parseFloat(svcPrice) * 100) : 0,
        duration_mins: svcDuration ? parseInt(svcDuration) : null,
        category: svcCategory.trim() || null,
      });
      // Reload services
      const svcs = await api.get<ServiceItem[]>("/appointments/services");
      setServices(svcs);
      setSvcName("");
      setSvcDesc("");
      setSvcPrice("");
      setSvcDuration("");
      setSvcCategory("");
      setShowForm(false);
      showToast("Service added successfully");
    } catch (err: any) {
      showToast(err.message || "Failed to add service", "error");
    } finally {
      setAddingService(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage bookings and service catalog</p>
        </div>
        {tab === "services" && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> Add Service
          </Button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        <button
          onClick={() => setTab("appointments")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            tab === "appointments"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Appointments
          {appointments.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {appointments.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setTab("services")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            tab === "services"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Services
          {services.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {services.length}
            </Badge>
          )}
        </button>
      </div>

      {/* ─── Appointments Tab ─── */}
      {tab === "appointments" && (
        <>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-2">
            {["", "requested", "confirmed", "completed", "cancelled"].map((s) => (
              <Button
                key={s}
                variant={filter === s ? "default" : "outline"}
                size="sm"
                onClick={() => { setFilter(s); setLoading(true); }}
              >
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>

          {appointments.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-7 w-7" />}
              title="No appointments yet"
              description="Appointments booked via WhatsApp will appear here."
            />
          ) : (
            <div className="space-y-3">
              {appointments.map((apt, i) => {
                const config = statusConfig[apt.status] || statusConfig.requested;
                const date = new Date(apt.scheduled_at);
                return (
                  <FadeIn key={apt.id} delay={i * 0.03}>
                    <Card className="transition-shadow hover:shadow-md">
                      <CardContent className="flex items-center gap-4 p-4">
                        {/* Date block */}
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <span className="text-xs font-medium uppercase">{date.toLocaleDateString("en", { month: "short" })}</span>
                          <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{apt.service_name}</p>
                            <Badge variant={config.variant as any} className="shrink-0 text-[10px]">
                              {config.label}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {date.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span>{apt.duration_mins} min</span>
                            <span className="font-mono">{apt.appointment_ref}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 gap-1.5">
                          {apt.status === "requested" && (
                            <>
                              <Button size="sm" variant="default" onClick={() => updateStatus(apt.id, "confirmed")}>
                                Confirm
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => updateStatus(apt.id, "cancelled")}>
                                Decline
                              </Button>
                            </>
                          )}
                          {apt.status === "confirmed" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(apt.id, "completed")}>
                              Mark Done
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </FadeIn>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Services Tab ─── */}
      {tab === "services" && (
        <>
          {/* Add Service Form */}
          {showForm && (
            <FadeIn>
              <Card className="mb-6 border-primary/20">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm">New Service</CardTitle>
                  <CardDescription className="text-xs">
                    Add a service your customers can book via WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Service name *"
                      value={svcName}
                      onChange={(e) => setSvcName(e.target.value)}
                    />
                    <Input
                      placeholder="Category (e.g. Hair, Nails)"
                      value={svcCategory}
                      onChange={(e) => setSvcCategory(e.target.value)}
                    />
                  </div>
                  <Textarea
                    placeholder="Description (optional)"
                    value={svcDesc}
                    onChange={(e) => setSvcDesc(e.target.value)}
                    rows={2}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Price (₦)</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={svcPrice}
                        onChange={(e) => setSvcPrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Duration (minutes)</label>
                      <Input
                        type="number"
                        placeholder="60"
                        min="5"
                        step="5"
                        value={svcDuration}
                        onChange={(e) => setSvcDuration(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={addService} disabled={!svcName.trim() || addingService}>
                      {addingService ? "Adding..." : "Add Service"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {services.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="h-7 w-7" />}
              title="No services yet"
              description="Add your services so customers can book them through WhatsApp."
            />
          ) : (
            <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((svc) => (
                <StaggerItem key={svc.id}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <Briefcase className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{svc.name}</p>
                            {svc.category && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Tag className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground">{svc.category}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={svc.is_active ? "success" : "secondary"} className="shrink-0 text-[10px]">
                          {svc.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      {svc.description && (
                        <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {svc.description}
                        </p>
                      )}

                      <div className="mt-4 flex items-center justify-between border-t pt-3">
                        <div className="space-y-0.5">
                          <p className="text-lg font-bold text-primary">
                            {svc.price > 0 ? formatAmount(svc.price) : "Free"}
                          </p>
                        </div>
                        {svc.duration_mins && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {svc.duration_mins} min
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </>
      )}
    </PageTransition>
  );
}
