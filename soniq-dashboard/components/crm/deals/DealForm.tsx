"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal";
import { createDeal, updateDeal } from "@/lib/api/deals";
import type { Deal, DealStage, CreateDealInput } from "@/lib/api/deals";
import { useIndustry } from "@/context/IndustryContext";

// ============================================================================
// TYPES
// ============================================================================

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal;
  onSuccess?: (deal: Deal) => void;
}

// Stage options derived from industry context (see component below)

// ============================================================================
// COMPONENT
// ============================================================================

export function DealForm({
  open,
  onOpenChange,
  deal,
  onSuccess,
}: DealFormProps) {
  const { customerLabel, dealLabel, pipelineStages } = useIndustry();
  const stageOptions = pipelineStages.map((s) => ({
    value: s.id,
    label: s.label,
  }));
  const defaultStage = pipelineStages[0]?.id || "new";
  const isEditing = !!deal;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    name: "",
    company: "",
    amount: "",
    expected_close: "",
    stage: defaultStage as DealStage,
    description: "",
    contact_id: "",
  });

  // Reset form when opening/closing or when deal changes
  React.useEffect(() => {
    if (open) {
      if (deal) {
        setFormData({
          name: deal.name || "",
          company: deal.company || "",
          amount: deal.amount_cents ? String(deal.amount_cents / 100) : "",
          expected_close: deal.expected_close
            ? deal.expected_close.split("T")[0]
            : "",
          stage: deal.stage || defaultStage,
          description: deal.description || "",
          contact_id: deal.contact_id || "",
        });
      } else {
        setFormData({
          name: "",
          company: "",
          amount: "",
          expected_close: "",
          stage: defaultStage,
          description: "",
          contact_id: "",
        });
      }
      setError(null);
    }
  }, [open, deal, defaultStage]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!formData.name.trim()) {
        throw new Error("Deal name is required");
      }

      const amountCents = formData.amount
        ? Math.round(parseFloat(formData.amount) * 100)
        : 0;

      let result: Deal;

      if (isEditing && deal) {
        result = await updateDeal(deal.id, {
          name: formData.name,
          company: formData.company || undefined,
          amount_cents: amountCents,
          expected_close: formData.expected_close || undefined,
          stage: formData.stage,
          description: formData.description || undefined,
          contact_id: formData.contact_id || undefined,
        });
      } else {
        const input: CreateDealInput = {
          name: formData.name,
          company: formData.company || undefined,
          amount_cents: amountCents,
          expected_close: formData.expected_close || undefined,
          stage: formData.stage,
          description: formData.description || undefined,
          contact_id: formData.contact_id || undefined,
          source: "manual",
        };
        result = await createDeal(input);
      }

      onSuccess?.(result);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>
              {isEditing ? `Edit ${dealLabel}` : `Add New ${dealLabel}`}
            </ModalTitle>
            <ModalDescription>
              {isEditing
                ? `Update ${dealLabel.toLowerCase()} information`
                : `Add a new ${dealLabel.toLowerCase()} to your pipeline`}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Name (required) */}
            <div className="space-y-2">
              <Label htmlFor="deal-name">{dealLabel} Name *</Label>
              <Input
                id="deal-name"
                name="name"
                placeholder="Website Redesign Project"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Company + Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deal-company">Company</Label>
                <Input
                  id="deal-company"
                  name="company"
                  placeholder="Acme Inc."
                  value={formData.company}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-amount">Amount ($)</Label>
                <Input
                  id="deal-amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="5,000"
                  value={formData.amount}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Expected Close + Stage */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deal-close">Expected Close</Label>
                <Input
                  id="deal-close"
                  name="expected_close"
                  type="date"
                  value={formData.expected_close}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value: DealStage) =>
                    setFormData((prev) => ({ ...prev, stage: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact / Customer */}
            <div className="space-y-2">
              <Label htmlFor="deal-contact">{customerLabel}</Label>
              <Input
                id="deal-contact"
                name="contact_id"
                placeholder={`${customerLabel} ID (optional)`}
                value={formData.contact_id}
                onChange={handleChange}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="deal-description">Description</Label>
              <Textarea
                id="deal-description"
                name="description"
                placeholder="Add any details about this deal..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Save Changes" : `Add ${dealLabel}`}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
