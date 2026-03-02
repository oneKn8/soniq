"use client";

import React from "react";
import { Bell, Mail, MessageSquare, Phone, Volume2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationSettings {
  email: {
    callSummaries: boolean;
    escalationAlerts: boolean;
    weeklyReports: boolean;
    billing: boolean;
    productUpdates: boolean;
  };
  push: {
    escalations: boolean;
    missedCalls: boolean;
    systemAlerts: boolean;
  };
  sound: {
    enabled: boolean;
    volume: number;
  };
}

interface NotificationPreferencesProps {
  settings: NotificationSettings;
  onChange: (settings: NotificationSettings) => void;
}

// ============================================================================
// NOTIFICATION SECTION COMPONENT
// ============================================================================

interface NotificationToggleProps {
  label: string;
  description: string;
  icon: React.ElementType;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function NotificationToggle({
  label,
  description,
  icon: Icon,
  checked,
  onChange,
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ============================================================================
// NOTIFICATION PREFERENCES COMPONENT
// ============================================================================

export function NotificationPreferences({
  settings,
  onChange,
}: NotificationPreferencesProps) {
  const updateEmailSetting = (
    key: keyof NotificationSettings["email"],
    value: boolean,
  ) => {
    onChange({
      ...settings,
      email: { ...settings.email, [key]: value },
    });
  };

  const updatePushSetting = (
    key: keyof NotificationSettings["push"],
    value: boolean,
  ) => {
    onChange({
      ...settings,
      push: { ...settings.push, [key]: value },
    });
  };

  const updateSoundSetting = <K extends keyof NotificationSettings["sound"]>(
    key: K,
    value: NotificationSettings["sound"][K],
  ) => {
    onChange({
      ...settings,
      sound: { ...settings.sound, [key]: value },
    });
  };

  return (
    <div className="space-y-8">
      {/* Email Notifications */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-foreground">
            Email Notifications
          </h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Choose which emails you want to receive
        </p>

        <div className="space-y-3">
          <NotificationToggle
            label="Call Summaries"
            description="Daily digest of call activity and AI performance"
            icon={Phone}
            checked={settings.email.callSummaries}
            onChange={(v) => updateEmailSetting("callSummaries", v)}
          />
          <NotificationToggle
            label="Escalation Alerts"
            description="Immediate notification when calls need human attention"
            icon={Bell}
            checked={settings.email.escalationAlerts}
            onChange={(v) => updateEmailSetting("escalationAlerts", v)}
          />
          <NotificationToggle
            label="Weekly Reports"
            description="Performance analytics and insights every week"
            icon={Mail}
            checked={settings.email.weeklyReports}
            onChange={(v) => updateEmailSetting("weeklyReports", v)}
          />
          <NotificationToggle
            label="Billing & Invoices"
            description="Payment receipts and subscription updates"
            icon={Mail}
            checked={settings.email.billing}
            onChange={(v) => updateEmailSetting("billing", v)}
          />
          <NotificationToggle
            label="Product Updates"
            description="New features and improvements"
            icon={MessageSquare}
            checked={settings.email.productUpdates}
            onChange={(v) => updateEmailSetting("productUpdates", v)}
          />
        </div>
      </section>

      {/* Push Notifications */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-foreground">
            Push Notifications
          </h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Real-time alerts in your browser
        </p>

        <div className="space-y-3">
          <NotificationToggle
            label="Escalations"
            description="Calls waiting for human attention"
            icon={Bell}
            checked={settings.push.escalations}
            onChange={(v) => updatePushSetting("escalations", v)}
          />
          <NotificationToggle
            label="Missed Calls"
            description="Calls that could not be completed"
            icon={Phone}
            checked={settings.push.missedCalls}
            onChange={(v) => updatePushSetting("missedCalls", v)}
          />
          <NotificationToggle
            label="System Alerts"
            description="Important system status changes"
            icon={Bell}
            checked={settings.push.systemAlerts}
            onChange={(v) => updatePushSetting("systemAlerts", v)}
          />
        </div>
      </section>

      {/* Sound Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-foreground">Sound</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Audio alerts for notifications
        </p>

        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">
                Enable Sound
              </div>
              <div className="text-xs text-muted-foreground">
                Play audio for important alerts
              </div>
            </div>
            <Switch
              checked={settings.sound.enabled}
              onCheckedChange={(v) => updateSoundSetting("enabled", v)}
            />
          </div>

          {settings.sound.enabled && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Volume</span>
                <span className="font-mono text-sm text-foreground">
                  {Math.round(settings.sound.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.sound.volume}
                onChange={(e) =>
                  updateSoundSetting("volume", parseFloat(e.target.value))
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Quiet</span>
                <span>Loud</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default NotificationPreferences;
