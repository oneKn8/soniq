"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { TenantPromotion, MentionBehavior } from "@/types";

interface PromotionDetailsProps {
  data: {
    promotions?: TenantPromotion[];
    [key: string]: unknown;
  };
  onChange: (details: {
    promotions?: TenantPromotion[];
    [key: string]: unknown;
  }) => void;
}

const MENTION_OPTIONS: {
  value: MentionBehavior;
  label: string;
  description: string;
}[] = [
  {
    value: "always",
    label: "Always mention",
    description: "Share the offer with every caller",
  },
  {
    value: "relevant",
    label: "When relevant",
    description: "Only when the conversation topic is related",
  },
  {
    value: "interested",
    label: "When interested",
    description: "Only when the caller asks about deals or prices",
  },
];

export function PromotionDetails({ data, onChange }: PromotionDetailsProps) {
  const promotions = data.promotions || [];
  const hasPromotion = promotions.length > 0;
  const currentPromotion = promotions[0] || {
    offer_text: "",
    mention_behavior: "relevant" as MentionBehavior,
    is_active: false,
  };

  const updatePromotion = (field: string, value: unknown) => {
    const updated = {
      ...currentPromotion,
      id: currentPromotion.id || `promo_${Date.now()}`,
      tenant_id: currentPromotion.tenant_id || "",
      created_at: currentPromotion.created_at || new Date().toISOString(),
      [field]: value,
    } as TenantPromotion;
    onChange({ ...data, promotions: [updated] });
  };

  const togglePromotion = (enabled: boolean) => {
    if (enabled) {
      const newPromotion: TenantPromotion = {
        id: `promo_${Date.now()}`,
        tenant_id: "",
        offer_text: "",
        mention_behavior: "relevant",
        is_active: true,
        created_at: new Date().toISOString(),
      };
      onChange({ ...data, promotions: [newPromotion] });
    } else {
      onChange({ ...data, promotions: [] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Enable promotions */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Enable promotions</Label>
          <p className="text-xs text-muted-foreground">
            Have your assistant mention special offers to callers
          </p>
        </div>
        <Switch
          checked={hasPromotion && currentPromotion.is_active}
          onCheckedChange={togglePromotion}
        />
      </div>

      {hasPromotion && currentPromotion.is_active && (
        <>
          {/* Offer text */}
          <div className="space-y-2">
            <Label htmlFor="offer-text">Promotion message</Label>
            <Textarea
              id="offer-text"
              placeholder="We're currently offering 20% off for first-time customers! Would you like to hear more about this special?"
              value={currentPromotion.offer_text || ""}
              onChange={(e) => updatePromotion("offer_text", e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              What your assistant will say about the offer
            </p>
          </div>

          {/* Mention behavior */}
          <div className="space-y-3">
            <Label>When to mention</Label>
            <div className="space-y-2">
              {MENTION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50"
                >
                  <input
                    type="radio"
                    name="mention_behavior"
                    value={option.value}
                    checked={currentPromotion.mention_behavior === option.value}
                    onChange={() =>
                      updatePromotion("mention_behavior", option.value)
                    }
                    className="mt-1 h-4 w-4"
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
        </>
      )}

      {!hasPromotion && (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Enable promotions to configure special offers your assistant can
          mention to callers.
        </div>
      )}
    </div>
  );
}
