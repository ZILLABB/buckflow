"use client";

import { useEffect, useState } from "react";
import { Users, Search, Shield, UserCheck, UserX } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  business_id: string | null;
  business_name: string | null;
  created_at: string | null;
}

const ROLES = ["", "super_admin", "owner", "admin", "agent", "viewer"];

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const { showToast } = useToast();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadUsers(); }, [search, roleFilter]);

  async function loadUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const res = await api.get<{ items: UserItem[]; total: number }>(`/admin/users?${params}`);
      setUsers(res.items);
      setTotal(res.total);
    } catch (err: any) { showToast(err.message || "Failed to load users", "error"); } finally { setLoading(false); }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      await api.patch(`/admin/users/${id}`, { is_active: !currentActive });
      showToast(currentActive ? "User deactivated" : "User activated");
      await loadUsers();
    } catch (err: any) { showToast(err.message || "Failed to update user", "error"); }
  }

  async function changeRole(id: string, newRole: string) {
    try {
      await api.patch(`/admin/users/${id}`, { role: newRole });
      showToast("Role updated");
      await loadUsers();
    } catch (err: any) { showToast(err.message || "Failed to change role", "error"); }
  }

  const roleBadgeVariant = (role: string) => {
    if (role === "super_admin") return "default";
    if (role === "owner") return "info";
    if (role === "admin") return "warning";
    return "secondary";
  };

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} total user{total !== 1 && "s"}</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} className="w-64" />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">All roles</option>
            {ROLES.filter(Boolean).map((r) => (
              <option key={r} value={r}>{r.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16">
          <Users className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-medium text-muted-foreground">No users found</p>
        </div>
      ) : (
        <StaggerContainer className="space-y-2">
          {users.map((user) => (
            <StaggerItem key={user.id}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {user.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{user.full_name}</p>
                          <Badge variant={roleBadgeVariant(user.role)} className="capitalize">{user.role.replace("_", " ")}</Badge>
                          <Badge variant={user.is_active ? "success" : "destructive"}>{user.is_active ? "Active" : "Inactive"}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{user.email} · {user.business_name || "No business"} · {user.created_at ? timeAgo(user.created_at) : "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user.id, e.target.value)}
                        className="h-7 rounded border border-input bg-background px-2 text-xs shadow-sm"
                      >
                        {ROLES.filter(Boolean).map((r) => (
                          <option key={r} value={r}>{r.replace("_", " ")}</option>
                        ))}
                      </select>
                      <Button size="xs" variant={user.is_active ? "destructive" : "success"} onClick={() => toggleActive(user.id, user.is_active)}>
                        {user.is_active ? <><UserX className="h-3 w-3" /> Deactivate</> : <><UserCheck className="h-3 w-3" /> Activate</>}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </PageTransition>
  );
}
