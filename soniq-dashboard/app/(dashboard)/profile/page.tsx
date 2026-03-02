"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Shield,
  Bell,
  Settings,
  ArrowLeft,
  Save,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AvatarUpload,
  ThemeSelector,
  LanguageSelector,
  NotificationPreferences,
} from "@/components/profile";
import type { NotificationSettings } from "@/components/profile";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ============================================================================
// TYPES
// ============================================================================

type ProfileTab = "profile" | "security" | "notifications" | "preferences";

interface ProfileData {
  displayName: string;
  email: string;
  phone: string;
  role: string;
  avatar: string | null;
  language: string;
}

// ============================================================================
// TAB CONFIGURATION
// ============================================================================

const TABS: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "preferences", label: "Preferences", icon: Settings },
];

// ============================================================================
// DEFAULT NOTIFICATION SETTINGS
// ============================================================================

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email: {
    callSummaries: true,
    escalationAlerts: true,
    weeklyReports: true,
    billing: true,
    productUpdates: false,
  },
  push: {
    escalations: true,
    missedCalls: true,
    systemAlerts: false,
  },
  sound: {
    enabled: true,
    volume: 0.7,
  },
};

// ============================================================================
// PROFILE PAGE COMPONENT
// ============================================================================

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({
    displayName:
      user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User",
    email: user?.email || "",
    phone: "",
    role: "Administrator",
    avatar: user?.user_metadata?.avatar_url || null,
    language: "en",
  });

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const updateProfile = <K extends keyof ProfileData>(
    key: K,
    value: ProfileData[K],
  ) => {
    setProfileData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
        {/* Header */}
        <div className="border-b border-border p-6">
          <Link
            href="/dashboard"
            className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-xl font-semibold text-foreground">Account</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile and preferences
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Save Button */}
        <div className="border-t border-border p-4">
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </span>
            ) : showSaved ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Saved
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </span>
            )}
          </Button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-8 scrollbar-thin">
        <div className="mx-auto max-w-2xl">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "profile" && (
              <ProfileTab data={profileData} onUpdate={updateProfile} />
            )}

            {activeTab === "security" && <SecurityTab />}

            {activeTab === "notifications" && (
              <NotificationPreferences
                settings={notificationSettings}
                onChange={setNotificationSettings}
              />
            )}

            {activeTab === "preferences" && (
              <PreferencesTab
                language={profileData.language}
                onLanguageChange={(lang) => updateProfile("language", lang)}
              />
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// PROFILE TAB
// ============================================================================

interface ProfileTabProps {
  data: ProfileData;
  onUpdate: <K extends keyof ProfileData>(
    key: K,
    value: ProfileData[K],
  ) => void;
}

function ProfileTab({ data, onUpdate }: ProfileTabProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your personal information and account details
        </p>
      </div>

      {/* Avatar */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-medium text-foreground">Profile Photo</h3>
        <AvatarUpload
          currentAvatar={data.avatar || undefined}
          userName={data.displayName}
          onAvatarChange={(url) => onUpdate("avatar", url)}
        />
      </section>

      {/* Personal Info */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-medium text-foreground">
          Personal Information
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Display Name</Label>
            <Input
              value={data.displayName}
              onChange={(e) => onUpdate("displayName", e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Role</Label>
            <Input value={data.role} disabled className="bg-muted" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Email Address</Label>
          <Input
            type="email"
            value={data.email}
            onChange={(e) => onUpdate("email", e.target.value)}
            placeholder="you@example.com"
          />
          <p className="text-xs text-muted-foreground">
            Used for login and important notifications
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Phone Number</Label>
          <Input
            type="tel"
            value={data.phone}
            onChange={(e) => onUpdate("phone", e.target.value)}
            placeholder="+1 (555) 000-0000"
          />
          <p className="text-xs text-muted-foreground">
            Optional - for SMS notifications and two-factor authentication
          </p>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// SECURITY TAB
// ============================================================================

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = newPassword === confirmPassword;
  const canChangePassword =
    currentPassword.length > 0 && newPassword.length >= 8 && passwordsMatch;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Security</h2>
        <p className="text-sm text-muted-foreground">
          Manage your password and security settings
        </p>
      </div>

      {/* Change Password */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-medium text-foreground">Change Password</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="text-xs text-destructive">
                Password must be at least 8 characters
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Confirm New Password
            </Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
        </div>

        <Button disabled={!canChangePassword} className="mt-2">
          Update Password
        </Button>
      </section>

      {/* Two-Factor Authentication */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              Two-Factor Authentication
            </h3>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            Not enabled
          </span>
        </div>

        <Button variant="outline">Enable 2FA</Button>
      </section>

      {/* Active Sessions */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-medium text-foreground">Active Sessions</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <div>
                <div className="text-sm font-medium text-foreground">
                  Current Session
                </div>
                <div className="text-xs text-muted-foreground">
                  Chrome on Linux
                </div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Active now</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
        >
          Sign Out All Devices
        </Button>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <Button
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          Delete Account
        </Button>
      </section>
    </div>
  );
}

// ============================================================================
// PREFERENCES TAB
// ============================================================================

interface PreferencesTabProps {
  language: string;
  onLanguageChange: (language: string) => void;
}

function PreferencesTab({ language, onLanguageChange }: PreferencesTabProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Customize your experience
        </p>
      </div>

      {/* Theme */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <ThemeSelector />
      </section>

      {/* Language */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <LanguageSelector value={language} onChange={onLanguageChange} />
      </section>

      {/* Accessibility */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h4 className="text-sm font-medium text-foreground">Accessibility</h4>
          <p className="text-xs text-muted-foreground">
            Customize the interface for your needs
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">Reduce Motion</div>
              <div className="text-xs text-muted-foreground">
                Minimize animations throughout the interface
              </div>
            </div>
            <button
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                "bg-muted",
              )}
            >
              <div
                className={cn(
                  "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform",
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">High Contrast</div>
              <div className="text-xs text-muted-foreground">
                Increase contrast for better visibility
              </div>
            </div>
            <button
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                "bg-muted",
              )}
            >
              <div
                className={cn(
                  "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform",
                )}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h4 className="text-sm font-medium text-foreground">
            Keyboard Shortcuts
          </h4>
          <p className="text-xs text-muted-foreground">
            Quick actions with keyboard combinations
          </p>
        </div>

        <div className="space-y-2">
          {[
            { keys: ["Cmd", "K"], action: "Open command palette" },
            { keys: ["Cmd", "B"], action: "Toggle sidebar" },
            { keys: ["Cmd", "/"], action: "Show keyboard shortcuts" },
            { keys: ["Esc"], action: "Close dialog" },
          ].map((shortcut, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.action}
              </span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, j) => (
                  <kbd
                    key={j}
                    className="rounded border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
