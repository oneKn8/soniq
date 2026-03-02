"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface FAQDetailsProps {
  data: Record<string, unknown>;
  onChange: (details: Record<string, unknown>) => void;
}

export function FAQDetails({ data, onChange }: FAQDetailsProps) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Common questions */}
      <div className="space-y-2">
        <Label htmlFor="common-questions">Common questions</Label>
        <Textarea
          id="common-questions"
          placeholder="What are your hours?
Do you accept walk-ins?
What payment methods do you accept?
Is parking available?
Do you offer any discounts?"
          value={(data.commonQuestions as string) || ""}
          onChange={(e) => updateField("commonQuestions", e.target.value)}
          rows={5}
        />
        <p className="text-xs text-muted-foreground">
          Add questions your customers frequently ask. Your AI will learn to
          answer these based on your business information.
        </p>
      </div>

      {/* Pricing info */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Share pricing information</Label>
            <p className="text-xs text-muted-foreground">
              Let callers know about your pricing
            </p>
          </div>
          <Switch
            checked={(data.sharePricing as boolean) ?? false}
            onCheckedChange={(checked) => updateField("sharePricing", checked)}
          />
        </div>

        {Boolean(data.sharePricing) && (
          <div className="ml-4 space-y-2 border-l-2 pl-4">
            <Label htmlFor="pricing-info">Pricing details</Label>
            <Textarea
              id="pricing-info"
              placeholder="Initial consultation: $100
Follow-up visits: $75
Packages available for regular clients..."
              value={(data.pricingInfo as string) || ""}
              onChange={(e) => updateField("pricingInfo", e.target.value)}
              rows={3}
            />
          </div>
        )}

        {!Boolean(data.sharePricing) && (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Your assistant will say &quot;Pricing varies based on the service. I
            can have someone follow up with specific pricing information.&quot;
          </div>
        )}
      </div>

      {/* Policies */}
      <div className="space-y-2">
        <Label htmlFor="policies">Business policies</Label>
        <Textarea
          id="policies"
          placeholder="Cancellation policy: 24-hour notice required
Late arrivals: We can accommodate up to 15 minutes late
Refund policy: Consultations are non-refundable..."
          value={(data.policies as string) || ""}
          onChange={(e) => updateField("policies", e.target.value)}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Important policies your assistant should communicate to callers
        </p>
      </div>

      {/* Custom information */}
      <div className="space-y-2">
        <Label htmlFor="custom-info">Additional information</Label>
        <Textarea
          id="custom-info"
          placeholder="Any other information your assistant should know about your business..."
          value={(data.customInfo as string) || ""}
          onChange={(e) => updateField("customInfo", e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
