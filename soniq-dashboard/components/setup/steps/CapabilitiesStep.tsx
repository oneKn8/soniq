"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Phone,
  MessageSquare,
  FileQuestion,
  Receipt,
  Clock,
  Check,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSetup } from "../SetupContext";
import {
  getUniversalCapabilities,
  getDefaultCapabilities,
} from "@/lib/capabilities";
import type { CapabilityDefinition } from "@/types";

const CAPABILITY_ICONS: Record<string, React.ElementType> = {
  appointment_booking: CalendarCheck,
  order_taking: Receipt,
  faq: FileQuestion,
  call_transfer: Phone,
  voicemail: MessageSquare,
  callbacks: Clock,
};

// One flat, universal capability set (no per-industry menus).
const CAPABILITY_OPTIONS: CapabilityDefinition[] = getUniversalCapabilities();
const RECOMMENDED_CAPABILITIES: string[] = getDefaultCapabilities();

export function CapabilitiesStep() {
  const router = useRouter();
  const { state, dispatch, saveStep, goToNextStep, goToPreviousStep } =
    useSetup();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Seed the recommended set when nothing is selected yet.
  useEffect(() => {
    if (state.capabilities.length === 0) {
      dispatch({
        type: "SET_CAPABILITIES",
        payload: RECOMMENDED_CAPABILITIES,
      });
    }
  }, [state.capabilities.length, dispatch]);

  const canContinue = state.capabilities.length > 0;

  const handleContinue = async () => {
    if (!canContinue) return;

    setIsSubmitting(true);
    const success = await saveStep("capabilities");
    if (success) {
      goToNextStep();
      router.push("/setup/details");
    }
    setIsSubmitting(false);
  };

  const handleBack = () => {
    goToPreviousStep();
    router.push("/setup/business");
  };

  const toggleCapability = (id: string) => {
    const current = state.capabilities;
    const updated = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    dispatch({ type: "SET_CAPABILITIES", payload: updated });
  };

  const coreCapabilities = CAPABILITY_OPTIONS.filter(
    (c) => c.category === "core",
  );
  const communicationCapabilities = CAPABILITY_OPTIONS.filter(
    (c) => c.category === "communication",
  );

  const renderCapabilityCard = (capability: CapabilityDefinition) => {
    const isSelected = state.capabilities.includes(capability.id);
    const isRecommended = RECOMMENDED_CAPABILITIES.includes(capability.id);
    const Icon = CAPABILITY_ICONS[capability.id] || Phone;

    return (
      <div
        key={capability.id}
        onClick={() => toggleCapability(capability.id)}
        className={cn(
          "flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors",
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/40",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{capability.label}</span>
            {isRecommended && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Recommended
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {capability.description}
          </p>
        </div>
        {isSelected && (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          What should your assistant handle?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Select the capabilities your assistant should have
        </p>
      </div>

      {/* Core capabilities */}
      {coreCapabilities.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="h-1 w-4 rounded-full bg-primary" />
            Core Features
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {coreCapabilities.map(renderCapabilityCard)}
          </div>
        </div>
      )}

      {/* Communication capabilities */}
      {communicationCapabilities.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="h-1 w-4 rounded-full bg-blue-500" />
            Communication
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {communicationCapabilities.map(renderCapabilityCard)}
          </div>
        </div>
      )}

      {/* Selection summary */}
      {state.capabilities.length > 0 && (
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm">
            <span className="font-bold text-primary">
              {state.capabilities.length}
            </span>{" "}
            {state.capabilities.length === 1 ? "capability" : "capabilities"}{" "}
            selected - your assistant is ready to help with{" "}
            {state.capabilities
              .map((c) =>
                CAPABILITY_OPTIONS.find((o) => o.id === c)?.label.toLowerCase(),
              )
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
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
