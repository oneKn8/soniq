"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { get, put } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Check,
  Search,
  ChevronDown,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { IndustryType, IndustryCategory } from "@/types";
import {
  INDUSTRY_CATEGORIES,
  INDUSTRY_PRESETS,
  getPopularIndustries,
} from "@/lib/industryPresets";

// Aceternity & MagicUI components
import { WobbleCard } from "@/components/aceternity/wobble-card";
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

  const [showAllIndustries, setShowAllIndustries] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    IndustryCategory | "all"
  >("all");

  const [formData, setFormData] = useState<BusinessSettings>({
    business_name: "",
    industry: null,
    location_city: "",
    location_address: "",
  });

  const popularIndustries = getPopularIndustries();
  const allIndustries = Object.values(INDUSTRY_PRESETS);

  // Filter industries based on search and category
  const filteredIndustries = allIndustries.filter((industry) => {
    const matchesSearch =
      searchQuery === "" ||
      industry.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      industry.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || industry.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group filtered industries by category
  const groupedIndustries = filteredIndustries.reduce(
    (acc, industry) => {
      if (!acc[industry.category]) {
        acc[industry.category] = [];
      }
      acc[industry.category].push(industry);
      return acc;
    },
    {} as Record<IndustryCategory, typeof allIndustries>,
  );

  // Industry colors for wobble cards
  const industryColors: Record<string, string> = {
    healthcare: "bg-emerald-800",
    hospitality: "bg-amber-800",
    services: "bg-blue-800",
    retail: "bg-purple-800",
    professional: "bg-slate-800",
    automotive: "bg-red-800",
    personal_care: "bg-pink-800",
    property: "bg-cyan-800",
  };

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

  const handleSelectIndustry = (industry: IndustryType) => {
    setFormData((prev) => ({ ...prev, industry }));
    setSaveSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await put(`/api/tenants/${currentTenant.id}`, {
        business_name: formData.business_name,
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

  const canSave =
    formData.business_name.trim() !== "" && formData.industry !== null;

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

        {/* Industry selection */}
        <div className="relative z-10 space-y-4">
          <Label>Industry</Label>

          {!showAllIndustries ? (
            <>
              {/* Popular industries with wobble cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {popularIndustries.map((industry) => {
                  const isSelected = formData.industry === industry.id;
                  const colorClass =
                    industryColors[industry.category] || "bg-indigo-800";

                  return (
                    <div key={industry.id} className="relative">
                      {isSelected && (
                        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary via-primary/50 to-primary opacity-75 blur-sm" />
                      )}
                      <WobbleCard
                        containerClassName={cn(
                          "min-h-[120px] cursor-pointer relative",
                          isSelected ? "bg-primary" : colorClass,
                        )}
                        className="p-4"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectIndustry(industry.id)}
                          className="flex h-full w-full flex-col items-start text-left"
                        >
                          {isSelected && (
                            <div className="absolute right-3 top-3">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                                <Check className="h-4 w-4 text-primary" />
                              </div>
                            </div>
                          )}
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                            <Building2 className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="mt-3 text-lg font-semibold text-white">
                            {industry.label}
                          </h3>
                          <p className="mt-1 text-sm text-white/70">
                            {industry.description}
                          </p>
                        </button>
                      </WobbleCard>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowAllIndustries(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <span>Show all industries</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              {/* Search and category filter */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search industries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) =>
                    setSelectedCategory(
                      e.target.value as IndustryCategory | "all",
                    )
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(INDUSTRY_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Industry list by category */}
              <div className="max-h-80 space-y-6 overflow-y-auto rounded-lg border p-4">
                {Object.entries(groupedIndustries).map(
                  ([category, industries]) => (
                    <div key={category}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {
                          INDUSTRY_CATEGORIES[category as IndustryCategory]
                            .label
                        }
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {industries.map((industry) => {
                          const isSelected = formData.industry === industry.id;
                          return (
                            <button
                              key={industry.id}
                              type="button"
                              onClick={() => handleSelectIndustry(industry.id)}
                              className={cn(
                                "flex items-center gap-2 rounded-md border p-2 text-left text-sm transition-all hover:border-primary/50 hover:bg-primary/5",
                                isSelected &&
                                  "border-primary bg-primary/5 ring-1 ring-primary/20",
                              )}
                            >
                              {isSelected && (
                                <Check className="h-3 w-3 shrink-0 text-primary" />
                              )}
                              <span className={cn(!isSelected && "ml-5")}>
                                {industry.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
                {filteredIndustries.length === 0 && (
                  <p className="py-8 text-center text-muted-foreground">
                    No industries found matching your search
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAllIndustries(false);
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Show fewer options
              </button>
            </>
          )}
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
