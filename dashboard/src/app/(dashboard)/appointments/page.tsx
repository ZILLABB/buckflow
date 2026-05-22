"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock, Plus, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition, FadeIn } from "@/components/ui/motion";

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

const statusConfig: Record<string, { label: string; variant: string; icon: any }> = {
  requested: { label: "Requested", variant: "outline", icon: AlertCircle },
  confirmed: { label: "Confirmed", variant: "success", icon: CheckCircle2 },
  reminder_sent: { label: "Reminder Sent", variant: "secondary", icon: Clock },
  completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
  no_show: { label: "No Show", variant: "destructive", icon: XCircle },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const params = filter ? `?status=${filter}` : "";
    api.get<Appointment[]>(`/appointments${params}`)
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  async function updateStatus(id: string, status: string) {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } catch {}
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage bookings and service appointments</p>
        </div>
      </div>

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

      {/* List */}
      {appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">No appointments yet</p>
            <p className="text-xs text-muted-foreground">Appointments booked via WhatsApp will appear here</p>
          </CardContent>
        </Card>
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
    </PageTransition>
  );
}
