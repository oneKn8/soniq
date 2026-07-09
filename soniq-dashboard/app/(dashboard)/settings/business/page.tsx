"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { put } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MapPin, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import type { IndustryType } from "@/types";

// Aceternity & MagicUI components
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";
import { SpotlightNew } from "@/components/aceternity/spotlight";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { ShineBorder } from "@/components/magicui/shine-border";

interface BusinessSettings {
  business_name: string;
  industry: IndustryType | null;
  location_city: string;
  location_address: string;
}

export default function BusinessSettingsPage() {
  const { currentTenant, refreshTenants } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<BusinessSettings>({
    business_name: "",
    industry: null,
    location_city: "",
    location_address: "",
  });

  useEffect(() => {
    if (currentTenant) {
      setFormData({
        business_name: currentTenant.business_name || "",
        industry: (currentTenant.industry as IndustryType) || null,
        location_city:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (currentTenant as Record<string, any>).location_city || "",
        location_address:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (currentTenant as Record<string, any>).location_address || "",
      });
      setIsLoading(false);
    }
  }, [currentTenant]);

  const handleSave = async () => {
    if (!currentTenant) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await put(`/api/tenants/${currentTenant.id}`, {
        business_name: formData.business_name,
        // industry column is retained but no longer user-selectable; send the
        // existing value so the write stays null-safe against the schema.
        industry: formData.industry,
        location_city: formData.location_city,
        location_address: formData.location_address,
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

  const canSave = formData.business_name.trim() !== "";

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
            words="Business Information"
            className="text-2xl font-semibold text-foreground md:text-3xl"
            duration={0.3}
          />
          <p className="mt-2 text-muted-foreground">
            Manage your business identity and location
          </p>
        </div>

        {/* Business name with shine border */}
        <div className="relative z-10 space-y-2">
          <Label htmlFor="business-name">Business Name</Label>
          <ShineBorder
            borderRadius={8}
            borderWidth={1}
            duration={10}
            color={formData.business_name ? "#6366f1" : "#64748b"}
            className="w-full min-w-full bg-background p-0"
          >
            <Input
              id="business-name"
              placeholder="Sunrise Dental"
              value={formData.business_name}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  business_name: e.target.value,
                }));
                setSaveSuccess(false);
                setError(null);
              }}
              className="border-0 bg-transparent focus-visible:ring-0"
            />
          </ShineBorder>
        </div>

        {/* Location */}
        <div className="relative z-10 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="city">City / Region</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="city"
                placeholder="Austin, TX"
                value={formData.location_city}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    location_city: e.target.value,
                  }));
                  setSaveSuccess(false);
                  setError(null);
                }}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              Full Address{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="address"
              placeholder="123 Main St, Austin, TX 78701"
              value={formData.location_address}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  location_address: e.target.value,
                }));
                setSaveSuccess(false);
                setError(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Used to give directions to callers
            </p>
          </div>
        </div>

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
            disabled={!canSave || isSaving}
            shimmerColor="#ffffff"
            shimmerSize="0.05em"
            borderRadius="8px"
            background={canSave ? "hsl(var(--primary))" : "hsl(var(--muted))"}
            className={cn(
              "px-8 py-3 text-sm font-medium",
              !canSave && "cursor-not-allowed opacity-50",
            )}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </ShimmerButton>
        </div>
      </div>
    </div>
  );
}
