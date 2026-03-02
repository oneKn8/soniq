"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSetup } from "../SetupContext";
import { SelectionCard } from "../SelectionCard";
import { INDUSTRY_PRESETS } from "@/lib/industryPresets";
import type { IndustryType } from "@/types";

export function BusinessStep() {
  const router = useRouter();
  const { state, dispatch, saveStep, goToNextStep } = useSetup();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const industries = Object.values(INDUSTRY_PRESETS);

  const canContinue =
    state.businessData.name.trim() !== "" &&
    state.businessData.industry !== null &&
    state.businessData.city.trim() !== "";

  const handleContinue = async () => {
    if (!canContinue) return;

    setIsSubmitting(true);
    const success = await saveStep("business");
    if (success) {
      goToNextStep();
      router.push("/setup/capabilities");
    }
    setIsSubmitting(false);
  };

  const handleSelectIndustry = (industry: IndustryType) => {
    dispatch({
      type: "SET_BUSINESS_DATA",
      payload: { industry },
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Let&apos;s get to know your business
        </h1>
        <p className="mt-2 text-muted-foreground">
          This helps us customize your AI assistant for your specific needs
        </p>
      </div>

      {/* Business name */}
      <div className="space-y-2">
        <Label htmlFor="business-name">Business Name</Label>
        <Input
          id="business-name"
          placeholder="Sunrise Dental"
          value={state.businessData.name}
          onChange={(e) =>
            dispatch({
              type: "SET_BUSINESS_DATA",
              payload: { name: e.target.value },
            })
          }
        />
      </div>

      {/* Industry selection */}
      <div className="space-y-4">
        <Label>What type of business do you run?</Label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((industry) => (
            <SelectionCard
              key={industry.id}
              selected={state.businessData.industry === industry.id}
              onClick={() => handleSelectIndustry(industry.id)}
              icon={Building2}
              title={industry.label}
              description={industry.description}
            />
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="city">City / Region</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="city"
              placeholder="Austin, TX"
              value={state.businessData.city}
              onChange={(e) =>
                dispatch({
                  type: "SET_BUSINESS_DATA",
                  payload: { city: e.target.value },
                })
              }
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
            value={state.businessData.address}
            onChange={(e) =>
              dispatch({
                type: "SET_BUSINESS_DATA",
                payload: { address: e.target.value },
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Used to give directions to callers
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          disabled={!canContinue || isSubmitting}
          size="lg"
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
