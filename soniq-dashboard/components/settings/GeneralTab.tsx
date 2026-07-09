"use client";

import { useState, useEffect } from "react";
import { useConfig } from "@/context/ConfigContext";
import { useTenant } from "@/context/TenantContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useToast } from "@/context/ToastContext";
import { put } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Building2, Check, Palette, Phone, Loader2 } from "lucide-react";
import type { ThemeColor } from "@/types";
import { UNIVERSAL_TERMINOLOGY } from "@/lib/terminology";
import { cn } from "@/lib/utils";

// ============================================================================
// THEME COLORS
// ============================================================================

const THEME_COLORS: { value: ThemeColor; label: string; class: string }[] = [
  { value: "zinc", label: "Zinc", class: "bg-zinc-500" },
  { value: "indigo", label: "Indigo", class: "bg-indigo-500" },
  { value: "emerald", label: "Emerald", class: "bg-emerald-500" },
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "violet", label: "Violet", class: "bg-violet-500" },
  { value: "amber", label: "Amber", class: "bg-amber-500" },
  { value: "rose", label: "Rose", class: "bg-rose-500" },
];

// ============================================================================
// DEFAULT FEATURES
// ============================================================================

const DEFAULT_FEATURES = {
  sms_confirmations: false,
  email_notifications: false,
  live_transfer: false,
  voicemail_fallback: false,
  sentiment_analysis: false,
  recording_enabled: false,
  transcription_enabled: false,
};

// Fixed, universal terminology surfaced read-only in settings.
const TERMINOLOGY_ROWS: { label: string; value: string }[] = [
  { label: "Customer", value: UNIVERSAL_TERMINOLOGY.customerPlural },
  { label: "Booking", value: UNIVERSAL_TERMINOLOGY.bookingPlural },
  { label: "Deal", value: UNIVERSAL_TERMINOLOGY.dealPlural },
  { label: "Task", value: UNIVERSAL_TERMINOLOGY.taskPlural },
];

// ============================================================================
// GENERAL TAB COMPONENT
// ============================================================================

export default function GeneralTab() {
  const { config, updateConfig } = useConfig();
  const { refreshCurrentTenant } = useTenant();
  const { toast } = useToast();
  const { tenant, error, clearError, updateSettings } = useTenantConfig();

  // Phone number local state (separate save logic)
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState(false);

  // Initialize phone number from tenant
  useEffect(() => {
    if (tenant?.phone_number) {
      setPhoneNumber(tenant.phone_number);
    }
  }, [tenant?.phone_number]);

  const handlePhoneSave = async () => {
    if (!tenant) return;

    setPhoneSaving(true);
    setPhoneError(null);
    setPhoneSuccess(false);

    try {
      await put(`/api/tenants/${tenant.id}/phone`, {
        phone_number: phoneNumber,
      });
      setPhoneSuccess(true);
      toast.success(
        "Phone number updated",
        "Your business phone has been saved successfully.",
      );
      await refreshCurrentTenant();
      setTimeout(() => setPhoneSuccess(false), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update phone number";
      setPhoneError(message);
      toast.error("Failed to save", message);
    } finally {
      setPhoneSaving(false);
    }
  };

  if (!tenant) return null;

  const isPhoneChanged = phoneNumber !== (tenant.phone_number || "");
  const isOwner = tenant.role === "owner";
  const features = tenant.features || DEFAULT_FEATURES;

  const handleFeatureToggle = (
    key: keyof typeof DEFAULT_FEATURES,
    value: boolean,
  ) => {
    updateSettings({ features: { ...features, [key]: value } });
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            General Settings
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure your business identity and agent personality
          </p>
        </div>
        {/* Save Status Indicator - Only show error, success uses toast */}
        {error && (
          <button
            onClick={clearError}
            className="text-sm text-destructive hover:underline"
          >
            {error}
          </button>
        )}
      </div>

      {/* Business Identity */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">
            Business Identity
          </h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Business Name</Label>
            <Input
              value={tenant.business_name || ""}
              onChange={(e) =>
                updateSettings({ business_name: e.target.value })
              }
              placeholder="Your business name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Agent Name</Label>
            <Input
              value={tenant.agent_name || ""}
              onChange={(e) => updateSettings({ agent_name: e.target.value })}
              placeholder="e.g., Jessica"
            />
            <p className="text-xs text-muted-foreground">
              The name your AI agent will use when greeting callers
            </p>
          </div>
        </div>
      </section>

      {/* Phone Configuration */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Phone className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">Phone Number</h4>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Business Phone Number
            </Label>
            <div className="flex gap-2">
              <Input
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneError(null);
                  setPhoneSuccess(false);
                }}
                placeholder="+1 (555) 123-4567"
                disabled={!isOwner}
              />
              <Button
                onClick={handlePhoneSave}
                disabled={!isOwner || !isPhoneChanged || phoneSaving}
                className="shrink-0"
              >
                {phoneSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : phoneSuccess ? (
                  <Check className="h-4 w-4" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This is the phone number customers will call to reach your AI
              agent. Incoming calls to this number will be handled by Soniq.
            </p>
            {phoneError && (
              <p className="text-xs text-destructive">{phoneError}</p>
            )}
            {phoneSuccess && (
              <p className="text-xs text-green-600">
                Phone number updated successfully
              </p>
            )}
            {!isOwner && (
              <p className="text-xs text-amber-600">
                Only the account owner can change the phone number.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Workspace Terminology (fixed / universal) */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">
            Workspace Terminology
          </h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Soniq uses one universal vocabulary across every workspace.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TERMINOLOGY_ROWS.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
            >
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {row.label}
              </span>
              <span className="text-sm font-medium text-foreground">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Theme Color */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Palette className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">Theme Color</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Choose an accent color for your dashboard
        </p>

        <div className="flex gap-3">
          {THEME_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => updateConfig("themeColor", color.value)}
              className={cn(
                "h-10 w-10 rounded-full transition-all",
                color.class,
                config?.themeColor === color.value
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : "opacity-60 hover:opacity-80",
              )}
              title={color.label}
            />
          ))}
        </div>
      </section>

      {/* Feature Flags */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="border-b border-border pb-3">
          <h4 className="text-sm font-medium text-foreground">Features</h4>
          <p className="text-xs text-muted-foreground">
            Enable or disable features for your agent
          </p>
        </div>

        <div className="space-y-4">
          <FeatureToggle
            label="SMS Confirmations"
            description="Send booking confirmations via SMS"
            checked={features.sms_confirmations}
            onChange={(v) => handleFeatureToggle("sms_confirmations", v)}
          />
          <FeatureToggle
            label="Email Notifications"
            description="Send email alerts for bookings"
            checked={features.email_notifications}
            onChange={(v) => handleFeatureToggle("email_notifications", v)}
          />
          <FeatureToggle
            label="Live Transfer"
            description="Allow transfer to human agents"
            checked={features.live_transfer}
            onChange={(v) => handleFeatureToggle("live_transfer", v)}
          />
          <FeatureToggle
            label="Call Recording"
            description="Record calls for quality assurance"
            checked={features.recording_enabled}
            onChange={(v) => handleFeatureToggle("recording_enabled", v)}
          />
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// FEATURE TOGGLE COMPONENT
// ============================================================================

interface FeatureToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function FeatureToggle({
  label,
  description,
  checked,
  onChange,
}: FeatureToggleProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
