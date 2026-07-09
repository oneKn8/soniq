"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { get, put } from "@/lib/api/client";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CalendarCheck,
  Phone,
  MessageSquare,
  FileQuestion,
  Clock,
  Receipt,
  Loader2,
  Settings,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  getUniversalCapabilities,
  getDefaultCapabilities,
} from "@/lib/capabilities";
import type { CapabilityDefinition, TenantCapability } from "@/types";

// Aceternity & MagicUI components
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";
import { SpotlightNew } from "@/components/aceternity/spotlight";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { ShineBorder } from "@/components/magicui/shine-border";

const CAPABILITY_ICONS: Record<string, React.ElementType> = {
  appointment_booking: CalendarCheck,
  order_taking: Receipt,
  faq: FileQuestion,
  call_transfer: Phone,
  voicemail: MessageSquare,
  callbacks: Clock,
};

// The single flat, universal capability set.
const CAPABILITY_OPTIONS: CapabilityDefinition[] = getUniversalCapabilities();

// Links to detailed settings for each capability.
const CAPABILITY_SETTINGS_LINKS: Record<string, string> = {
  appointment_booking: "/calendar",
  faq: "/settings/assistant",
  call_transfer: "/settings/escalation",
  callbacks: "/settings/hours",
};

export default function CapabilitiesSettingsPage() {
  const { currentTenant, refreshTenants } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>([]);

  const recommendedCapabilities = getDefaultCapabilities();

  useEffect(() => {
    const loadCapabilities = async () => {
      if (!currentTenant) return;

      try {
        const data = await get<{ capabilities: TenantCapability[] }>(
          "/api/capabilities",
        );
        const enabledCapabilities = (data.capabilities || [])
          .filter((c) => c.is_enabled)
          .map((c) => c.capability);
        setCapabilities(enabledCapabilities);
      } catch (err) {
        // Use recommended defaults if API fails
        setCapabilities(recommendedCapabilities);
      } finally {
        setIsLoading(false);
      }
    };

    loadCapabilities();
    // recommendedCapabilities is a stable constant; safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant]);

  const toggleCapability = (id: string) => {
    setCapabilities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
    setSaveSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await put("/api/capabilities", {
        capabilities: capabilities.map((c) => ({
          capability: c,
          is_enabled: true,
        })),
      });
      await refreshTenants();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const coreCapabilities = CAPABILITY_OPTIONS.filter(
    (c) => c.category === "core",
  );
  const communicationCapabilities = CAPABILITY_OPTIONS.filter(
    (c) => c.category === "communication",
  );

  const renderCapabilityCard = (capability: CapabilityDefinition) => {
    const isSelected = capabilities.includes(capability.id);
    const isRecommended = recommendedCapabilities.includes(capability.id);
    const Icon = CAPABILITY_ICONS[capability.id] || Phone;
    const settingsLink = CAPABILITY_SETTINGS_LINKS[capability.id];

    return (
      <div
        key={capability.id}
        className={cn(
          "rounded-xl border p-4 transition-all",
          isSelected
            ? "border-primary/50 bg-primary/5"
            : "border-border bg-card hover:border-primary/30",
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{capability.label}</span>
                {isRecommended && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Recommended
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {capability.description}
              </p>
            </div>
          </div>
          <Switch
            checked={isSelected}
            onCheckedChange={() => toggleCapability(capability.id)}
          />
        </div>
        {isSelected && settingsLink && (
          <Link
            href={settingsLink}
            className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Settings className="h-3 w-3" />
            Configure settings
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <SpotlightNew className="opacity-20" />

        {/* Header */}
        <div className="relative z-10">
          <Link
            href="/settings"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          <TextGenerateEffect
            words="Capabilities"
            className="text-2xl font-semibold text-foreground md:text-3xl"
            duration={0.3}
          />
          <p className="mt-2 text-muted-foreground">
            Choose what your assistant should handle
          </p>
        </div>

        {/* Core capabilities */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-4 rounded-full bg-primary" />
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Core Features
            </Label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {coreCapabilities.map(renderCapabilityCard)}
          </div>
        </div>

        {/* Communication capabilities */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-4 rounded-full bg-blue-500" />
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Communication
            </Label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {communicationCapabilities.map(renderCapabilityCard)}
          </div>
        </div>

        {/* Selection summary */}
        {capabilities.length > 0 && (
          <div className="relative z-10">
            <ShineBorder
              borderRadius={12}
              borderWidth={1}
              duration={12}
              color="#22c55e"
              className="w-full min-w-full bg-muted/30 p-4"
            >
              <p className="text-sm">
                <span className="font-bold text-primary">
                  {capabilities.length}
                </span>{" "}
                {capabilities.length === 1 ? "capability" : "capabilities"}{" "}
                enabled - your assistant can help with{" "}
                {capabilities
                  .map((c) =>
                    CAPABILITY_OPTIONS.find(
                      (o) => o.id === c,
                    )?.label.toLowerCase(),
                  )
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </ShineBorder>
          </div>
        )}

        {/* Error/Success messages */}
        {error && (
          <div className="relative z-10 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="relative z-10 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-600">
            Settings saved successfully
          </div>
        )}

        {/* Save button */}
        <div className="relative z-10 flex justify-end pt-4">
          <ShimmerButton
            onClick={handleSave}
            disabled={isSaving || capabilities.length === 0}
            shimmerColor="#ffffff"
            shimmerSize="0.05em"
            borderRadius="8px"
            background={
              capabilities.length > 0
                ? "hsl(var(--primary))"
                : "hsl(var(--muted))"
            }
            className={cn(
              "px-8 py-3 text-sm font-medium",
              capabilities.length === 0 && "cursor-not-allowed opacity-50",
            )}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </ShimmerButton>
        </div>
      </div>
    </div>
  );
}
