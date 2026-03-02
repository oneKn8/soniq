"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { get, post, put, del } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Megaphone,
  Calendar,
  Loader2,
  Tag,
} from "lucide-react";
import Link from "next/link";
import type { TenantPromotion, MentionBehavior } from "@/types";

// Aceternity & MagicUI components
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";
import { SpotlightNew } from "@/components/aceternity/spotlight";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { ShineBorder } from "@/components/magicui/shine-border";

const MENTION_BEHAVIOR_OPTIONS: {
  value: MentionBehavior;
  label: string;
  description: string;
}[] = [
  {
    value: "always",
    label: "Always mention",
    description: "Tell every caller about this promotion",
  },
  {
    value: "relevant",
    label: "When relevant",
    description: "Mention when the caller's request relates to the promotion",
  },
  {
    value: "interested",
    label: "Only if interested",
    description: "Wait for caller to ask about deals or specials",
  },
];

interface NewPromotion {
  offer_text: string;
  mention_behavior: MentionBehavior;
  starts_at: string;
  ends_at: string;
}

const DEFAULT_NEW_PROMOTION: NewPromotion = {
  offer_text: "",
  mention_behavior: "relevant",
  starts_at: "",
  ends_at: "",
};

export default function PromotionsSettingsPage() {
  const { currentTenant, refreshTenants } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [promotions, setPromotions] = useState<TenantPromotion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPromotion, setNewPromotion] = useState<NewPromotion>(
    DEFAULT_NEW_PROMOTION,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const loadPromotions = async () => {
      if (!currentTenant) return;

      try {
        const data = await get<{ promotions: TenantPromotion[] }>(
          "/api/promotions",
        );
        setPromotions(data.promotions || []);
      } catch (err) {
        // Use empty array if API fails
        setPromotions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPromotions();
  }, [currentTenant]);

  const handleCreatePromotion = async () => {
    if (!currentTenant || !newPromotion.offer_text.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const data = await post<TenantPromotion>("/api/promotions", {
        offer_text: newPromotion.offer_text,
        mention_behavior: newPromotion.mention_behavior,
        is_active: true,
        starts_at: newPromotion.starts_at || null,
        ends_at: newPromotion.ends_at || null,
      });

      setPromotions((prev) => [...prev, data]);
      setNewPromotion(DEFAULT_NEW_PROMOTION);
      setShowNewForm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create promotion",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePromotion = async (
    id: string,
    updates: Partial<TenantPromotion>,
  ) => {
    if (!currentTenant) return;

    try {
      await put(`/api/promotions/${id}`, updates);
      setPromotions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      );
      setEditingId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update promotion",
      );
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!currentTenant) return;

    setDeletingId(id);
    setError(null);

    try {
      await del(`/api/promotions/${id}`);
      setPromotions((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete promotion",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await handleUpdatePromotion(id, { is_active: isActive });
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (promotion: TenantPromotion) => {
    if (!promotion.ends_at) return false;
    return new Date(promotion.ends_at) < new Date();
  };

  const isUpcoming = (promotion: TenantPromotion) => {
    if (!promotion.starts_at) return false;
    return new Date(promotion.starts_at) > new Date();
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
            words="Promotions"
            className="text-2xl font-semibold text-foreground md:text-3xl"
            duration={0.3}
          />
          <p className="mt-2 text-muted-foreground">
            Manage special offers your assistant can mention to callers
          </p>
        </div>

        {/* Add Promotion Button */}
        {!showNewForm && (
          <div className="relative z-10">
            <Button onClick={() => setShowNewForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Promotion
            </Button>
          </div>
        )}

        {/* New Promotion Form */}
        {showNewForm && (
          <div className="relative z-10">
            <ShineBorder
              borderRadius={12}
              borderWidth={2}
              duration={8}
              color={["#6366f1", "#8b5cf6", "#a855f7"]}
              className="w-full min-w-full bg-card p-0"
            >
              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    New Promotion
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewForm(false);
                      setNewPromotion(DEFAULT_NEW_PROMOTION);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offer-text">Offer Text</Label>
                  <Textarea
                    id="offer-text"
                    placeholder="e.g., Get 20% off your first visit when you mention this special!"
                    value={newPromotion.offer_text}
                    onChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        offer_text: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>When to Mention</Label>
                  <div className="space-y-2">
                    {MENTION_BEHAVIOR_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                          newPromotion.mention_behavior === option.value &&
                            "border-primary bg-primary/5",
                        )}
                      >
                        <input
                          type="radio"
                          name="mention_behavior"
                          value={option.value}
                          checked={
                            newPromotion.mention_behavior === option.value
                          }
                          onChange={() =>
                            setNewPromotion((prev) => ({
                              ...prev,
                              mention_behavior: option.value,
                            }))
                          }
                          className="mt-0.5 h-4 w-4"
                        />
                        <div>
                          <span className="font-medium">{option.label}</span>
                          <p className="text-xs text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="starts-at">
                      Start Date{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="starts-at"
                      type="date"
                      value={newPromotion.starts_at}
                      onChange={(e) =>
                        setNewPromotion((prev) => ({
                          ...prev,
                          starts_at: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ends-at">
                      End Date{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="ends-at"
                      type="date"
                      value={newPromotion.ends_at}
                      onChange={(e) =>
                        setNewPromotion((prev) => ({
                          ...prev,
                          ends_at: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewForm(false);
                      setNewPromotion(DEFAULT_NEW_PROMOTION);
                    }}
                  >
                    Cancel
                  </Button>
                  <ShimmerButton
                    onClick={handleCreatePromotion}
                    disabled={!newPromotion.offer_text.trim() || isSaving}
                    shimmerColor="#ffffff"
                    shimmerSize="0.05em"
                    borderRadius="8px"
                    background="hsl(var(--primary))"
                    className="px-6 py-2 text-sm font-medium"
                  >
                    {isSaving ? "Creating..." : "Create Promotion"}
                  </ShimmerButton>
                </div>
              </div>
            </ShineBorder>
          </div>
        )}

        {/* Promotions List */}
        <div className="relative z-10 space-y-4">
          {promotions.length === 0 && !showNewForm ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Megaphone className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 font-medium">No promotions yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add promotions to let your assistant share special offers with
                callers
              </p>
            </div>
          ) : (
            promotions.map((promotion) => {
              const expired = isExpired(promotion);
              const upcoming = isUpcoming(promotion);
              const isEditing = editingId === promotion.id;

              return (
                <div
                  key={promotion.id}
                  className={cn(
                    "rounded-lg border p-4",
                    expired && "opacity-60",
                    promotion.is_active && !expired && "border-green-500/30",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full",
                          promotion.is_active && !expired
                            ? "bg-green-500/10"
                            : "bg-muted",
                        )}
                      >
                        <Tag
                          className={cn(
                            "h-5 w-5",
                            promotion.is_active && !expired
                              ? "text-green-500"
                              : "text-muted-foreground",
                          )}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {promotion.is_active && !expired && (
                            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                              Active
                            </span>
                          )}
                          {expired && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              Expired
                            </span>
                          )}
                          {upcoming && (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
                              Upcoming
                            </span>
                          )}
                          {!promotion.is_active && !expired && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              Inactive
                            </span>
                          )}
                        </div>
                        {(promotion.starts_at || promotion.ends_at) && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {promotion.starts_at &&
                              formatDate(promotion.starts_at)}
                            {promotion.starts_at && promotion.ends_at && " - "}
                            {promotion.ends_at && formatDate(promotion.ends_at)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={promotion.is_active}
                        onCheckedChange={(checked) =>
                          handleToggleActive(promotion.id, checked)
                        }
                        disabled={expired}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingId(isEditing ? null : promotion.id)
                        }
                        className="text-muted-foreground hover:text-primary"
                      >
                        {isEditing ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Edit2 className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePromotion(promotion.id)}
                        disabled={deletingId === promotion.id}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        {deletingId === promotion.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <Textarea
                          value={promotion.offer_text}
                          onChange={(e) =>
                            setPromotions((prev) =>
                              prev.map((p) =>
                                p.id === promotion.id
                                  ? { ...p, offer_text: e.target.value }
                                  : p,
                              ),
                            )
                          }
                          rows={2}
                        />
                        <div className="flex gap-2">
                          {MENTION_BEHAVIOR_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setPromotions((prev) =>
                                  prev.map((p) =>
                                    p.id === promotion.id
                                      ? { ...p, mention_behavior: option.value }
                                      : p,
                                  ),
                                )
                              }
                              className={cn(
                                "rounded-full px-3 py-1 text-xs transition-colors",
                                promotion.mention_behavior === option.value
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted hover:bg-muted/80",
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleUpdatePromotion(promotion.id, {
                                offer_text: promotion.offer_text,
                                mention_behavior: promotion.mention_behavior,
                              })
                            }
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm">{promotion.offer_text}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {MENTION_BEHAVIOR_OPTIONS.find(
                            (o) => o.value === promotion.mention_behavior,
                          )?.label || promotion.mention_behavior}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="relative z-10 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
