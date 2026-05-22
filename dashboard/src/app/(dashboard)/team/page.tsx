"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCog,
  Plus,
  Shield,
  Eye,
  Headphones,
  Crown,
  MoreHorizontal,
  UserMinus,
  ArrowUpDown,
  MessageSquare,
  CheckCircle2,
  XCircle,
  X,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  assigned_conversations: number;
  created_at: string | null;
  is_current_user: boolean;
}

interface ActivityLog {
  id: string;
  conversation_id: string;
  changed_by: string | null;
  changed_by_name: string | null;
  from_mode: string;
  to_mode: string;
  reason: string | null;
  created_at: string | null;
}

const roleConfig: Record<string, { label: string; icon: typeof Crown; color: string; badgeVariant: "default" | "info" | "success" | "secondary" }> = {
  owner: { label: "Owner", icon: Crown, color: "text-amber-600", badgeVariant: "default" },
  admin: { label: "Admin", icon: Shield, color: "text-blue-600", badgeVariant: "info" },
  agent: { label: "Agent", icon: Headphones, color: "text-emerald-600", badgeVariant: "success" },
  viewer: { label: "Viewer", icon: Eye, color: "text-slate-500", badgeVariant: "secondary" },
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Invite form
  const [invName, setInvName] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState("agent");
  const [invPassword, setInvPassword] = useState("");

  // Action menu
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([
      api.get<TeamMember[]>("/team/members"),
      api.get<ActivityLog[]>("/team/activity"),
    ])
      .then(([m, a]) => { setMembers(m); setActivity(a); })
      .catch((err) => showToast(err.message || "Failed to load team data", "error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInvite() {
    if (!invName || !invEmail || !invPassword) return;
    setInviting(true);
    setInviteError("");
    try {
      await api.post("/team/members", {
        full_name: invName,
        email: invEmail,
        role: invRole,
        password: invPassword,
      });
      // Refresh list
      const updated = await api.get<TeamMember[]>("/team/members");
      setMembers(updated);
      setShowInvite(false);
      setInvName(""); setInvEmail(""); setInvRole("agent"); setInvPassword("");
      showToast("Team member added successfully");
    } catch (err: any) {
      setInviteError(err.message || "Failed to invite member");
      showToast(err.message || "Failed to add member", "error");
    } finally {
      setInviting(false);
    }
  }

  async function updateRole(memberId: string, newRole: string) {
    try {
      await api.patch(`/team/members/${memberId}`, { role: newRole });
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
      showToast(`Role updated to ${newRole}`);
    } catch (err: any) {
      showToast(err.message || "Failed to update role", "error");
    }
    setActiveMenu(null);
  }

  async function toggleActive(memberId: string, isActive: boolean) {
    try {
      await api.patch(`/team/members/${memberId}`, { is_active: !isActive });
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, is_active: !isActive } : m));
      showToast(isActive ? "Member deactivated" : "Member reactivated");
    } catch (err: any) {
      showToast(err.message || "Failed to update member", "error");
    }
    setActiveMenu(null);
  }

  async function removeMember(memberId: string) {
    try {
      await api.delete(`/team/members/${memberId}`);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      showToast("Team member removed");
    } catch (err: any) {
      showToast(err.message || "Failed to remove member", "error");
    }
    setActiveMenu(null);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  const currentUser = members.find((m) => m.is_current_user);
  const canManage = currentUser?.role === "owner" || currentUser?.role === "admin";

  return (
    <PageTransition>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? "s" : ""} on your team
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Left: Team Members ── */}
        <div className="space-y-6">
          {/* Role Legend */}
          <FadeIn>
            <div className="flex flex-wrap gap-4 mb-2">
              {Object.entries(roleConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
                  <span className="font-medium">{config.label}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Members List */}
          <StaggerContainer className="space-y-3">
            {members.map((member) => {
              const config = roleConfig[member.role] || roleConfig.viewer;
              const RoleIcon = config.icon;

              return (
                <StaggerItem key={member.id}>
                  <Card className={!member.is_active ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {member.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">{member.full_name}</p>
                            {member.is_current_user && (
                              <span className="text-[10px] rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">You</span>
                            )}
                            {!member.is_active && (
                              <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>

                        {/* Role Badge */}
                        <Badge variant={config.badgeVariant} className="text-[10px] gap-1 shrink-0">
                          <RoleIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>

                        {/* Stats */}
                        {member.assigned_conversations > 0 && (
                          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0" title="Assigned conversations">
                            <MessageSquare className="h-3 w-3" />
                            {member.assigned_conversations}
                          </div>
                        )}

                        {/* Actions */}
                        {canManage && member.role !== "owner" && !member.is_current_user && (
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                              className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </button>

                            <AnimatePresence>
                              {activeMenu === member.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 top-9 z-20 w-48 rounded-xl border bg-card shadow-lg p-1.5"
                                >
                                  <p className="px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Change Role</p>
                                  {["admin", "agent", "viewer"].filter(r => r !== member.role).map((role) => {
                                    const rc = roleConfig[role];
                                    return (
                                      <button
                                        key={role}
                                        onClick={() => updateRole(member.id, role)}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-muted transition-colors"
                                      >
                                        <rc.icon className={`h-3.5 w-3.5 ${rc.color}`} />
                                        Make {rc.label}
                                      </button>
                                    );
                                  })}
                                  <div className="my-1 h-px bg-border" />
                                  <button
                                    onClick={() => toggleActive(member.id, member.is_active)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-muted transition-colors"
                                  >
                                    {member.is_active ? (
                                      <><XCircle className="h-3.5 w-3.5 text-amber-500" /> Deactivate</>
                                    ) : (
                                      <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Reactivate</>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => removeMember(member.id)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <UserMinus className="h-3.5 w-3.5" /> Remove
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          {members.length === 0 && (
            <div className="py-16 text-center">
              <UserCog className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No team members yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add agents to help handle customer conversations</p>
            </div>
          )}
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="space-y-4">
          {/* Role Permissions */}
          <FadeIn delay={0.05}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  Role Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { role: "Owner", perms: "Full access, manage team, billing" },
                  { role: "Admin", perms: "Manage team, settings, conversations" },
                  { role: "Agent", perms: "Handle conversations, view customers" },
                  { role: "Viewer", perms: "Read-only access to dashboard" },
                ].map((item) => (
                  <div key={item.role}>
                    <p className="text-xs font-semibold">{item.role}</p>
                    <p className="text-[11px] text-muted-foreground">{item.perms}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </FadeIn>

          {/* Activity Log */}
          <FadeIn delay={0.1}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-violet-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activity.length > 0 ? (
                  <div className="space-y-3">
                    {activity.slice(0, 8).map((log) => (
                      <div key={log.id} className="flex items-start gap-2">
                        <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] leading-relaxed">
                            <span className="font-medium">{log.changed_by_name || "System"}</span>{" "}
                            switched conversation to{" "}
                            <span className="font-medium">{log.to_mode}</span> mode
                          </p>
                          {log.created_at && (
                            <p className="text-[10px] text-muted-foreground">
                              {timeAgo(log.created_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>

      {/* ── Invite Modal ── */}
      <AnimatePresence>
        {showInvite && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowInvite(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[20%] z-50 mx-auto max-w-md rounded-2xl border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 pb-0">
                <div>
                  <h2 className="text-lg font-semibold">Add Team Member</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">They'll be able to sign in with these credentials</p>
                </div>
                <button onClick={() => setShowInvite(false)} className="p-1 rounded-md hover:bg-muted">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                  <Input placeholder="Amara Okafor" value={invName} onChange={(e) => setInvName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input type="email" placeholder="amara@business.com" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <select
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={invRole}
                    onChange={(e) => setInvRole(e.target.value)}
                  >
                    {currentUser?.role === "owner" && <option value="admin">Admin</option>}
                    <option value="agent">Agent</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Temporary Password</label>
                  <Input type="password" placeholder="Min 6 characters" value={invPassword} onChange={(e) => setInvPassword(e.target.value)} minLength={6} />
                </div>

                {inviteError && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
                  >
                    {inviteError}
                  </motion.div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowInvite(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleInvite}
                    disabled={inviting || !invName || !invEmail || !invPassword}
                  >
                    {inviting ? "Adding..." : "Add Member"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
