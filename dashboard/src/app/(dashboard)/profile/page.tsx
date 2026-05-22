"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Shield,
  Building2,
  Key,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition, FadeIn } from "@/components/ui/motion";

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  business_id: string;
}

interface BusinessData {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  category: string;
}

const roleBadges: Record<string, { label: string; variant: "default" | "info" | "success" | "secondary" }> = {
  owner: { label: "Owner", variant: "default" },
  admin: { label: "Admin", variant: "info" },
  agent: { label: "Agent", variant: "success" },
  viewer: { label: "Viewer", variant: "secondary" },
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  // Edit fields
  const [fullName, setFullName] = useState("");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Load user from localStorage (set at login)
        const userStr = localStorage.getItem("bf_user");
        if (userStr) {
          const user = JSON.parse(userStr) as ProfileData;
          setProfile(user);
          setFullName(user.full_name);
        }

        const biz = await api.get<BusinessData>("/business/me");
        setBusiness(biz);
      } catch (err: any) {
        showToast(err.message || "Failed to load profile", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveProfile() {
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      // For now, update the local storage — backend profile update endpoint can be added later
      if (profile) {
        const updated = { ...profile, full_name: fullName };
        setProfile(updated);
        localStorage.setItem("bf_user", JSON.stringify(updated));
      }
      showToast("Profile updated");
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Please fill in all password fields", "warning");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords don't match", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "warning");
      return;
    }
    setChangingPassword(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      showToast("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showToast(err.message || "Failed to change password", "error");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  const badge = roleBadges[profile?.role || "viewer"] || roleBadges.viewer;

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Left Column ── */}
        <div className="space-y-6">
          {/* Profile Card */}
          <FadeIn>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
                    {fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-base">{fullName}</CardTitle>
                    <CardDescription className="text-xs">{profile?.email}</CardDescription>
                  </div>
                  <Badge variant={badge.variant} className="ml-auto">
                    {badge.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Full Name
                  </label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> Email
                  </label>
                  <Input value={profile?.email || ""} disabled className="opacity-60" />
                  <p className="text-[10px] text-muted-foreground">Email cannot be changed</p>
                </div>

                <Button onClick={handleSaveProfile} disabled={saving || fullName === profile?.full_name}>
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Password Change */}
          <FadeIn delay={0.05}>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <Key className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Change Password</CardTitle>
                    <CardDescription className="text-xs">Update your account password</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showPasswords ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">New Password</label>
                    <Input
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                    <Input
                      type={showPasswords ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswords ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showPasswords ? "Hide" : "Show"} passwords
                  </button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                    variant="outline"
                  >
                    {changingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-4">
          {/* Business Info */}
          <FadeIn delay={0.05}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Business
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold">{business?.name || "—"}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{business?.business_type || "—"} business</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Category</p>
                  <p className="text-xs font-medium capitalize">{business?.category?.replace("_", " ") || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Slug</p>
                  <p className="text-xs font-mono">{business?.slug || "—"}</p>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Role Info */}
          <FadeIn delay={0.1}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-violet-500" />
                  Your Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={badge.variant} className="text-xs mb-2">{badge.label}</Badge>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {profile?.role === "owner" && "Full access to all features, team management, and billing."}
                  {profile?.role === "admin" && "Manage team, settings, and conversations. Cannot access billing."}
                  {profile?.role === "agent" && "Handle customer conversations and view customer data."}
                  {profile?.role === "viewer" && "Read-only access to the dashboard and analytics."}
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
