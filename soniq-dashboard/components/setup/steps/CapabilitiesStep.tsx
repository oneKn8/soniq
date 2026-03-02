"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Phone,
  MessageSquare,
  FileQuestion,
  AlertTriangle,
  Megaphone,
  Clock,
  Receipt,
  Check,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSetup } from "../SetupContext";
import { INDUSTRY_PRESETS } from "@/lib/industryPresets";
import type { CapabilityOption } from "@/types";

const CAPABILITY_ICONS: Record<string, React.ElementType> = {
  appointments: CalendarCheck,
  reservations: CalendarCheck,
  call_handling: Phone,
  message_taking: MessageSquare,
  faq: FileQuestion,
  emergency_dispatch: AlertTriangle,
  promotions: Megaphone,
  after_hours: Clock,
  patient_intake: Receipt,
};

// Define capabilities by category
const CAPABILITY_OPTIONS: CapabilityOption[] = [
  {
    id: "appointments",
    label: "Appointments",
    description: "Schedule, reschedule, and cancel appointments",
    icon: "CalendarCheck",
    category: "core",
  },
  {
    id: "reservations",
    label: "Reservations",
    description: "Book tables, rooms, or services",
    icon: "CalendarCheck",
    category: "core",
  },
  {
    id: "patient_intake",
    label: "Patient Intake",
    description: "Collect patient information before visits",
    icon: "Receipt",
    category: "core",
  },
  {
    id: "call_handling",
    label: "Call Handling",
    description: "Answer calls and route to the right person",
    icon: "Phone",
    category: "core",
  },
  {
    id: "message_taking",
    label: "Message Taking",
    description: "Record messages when you're unavailable",
    icon: "MessageSquare",
    category: "communication",
  },
  {
    id: "faq",
    label: "FAQ & Information",
    description: "Answer common questions about your business",
    icon: "FileQuestion",
    category: "communication",
  },
  {
    id: "emergency_dispatch",
    label: "Emergency Routing",
    description: "Identify and escalate urgent situations",
    icon: "AlertTriangle",
    category: "advanced",
  },
  {
    id: "promotions",
    label: "Promotions",
    description: "Mention special offers to callers",
    icon: "Megaphone",
    category: "advanced",
  },
  {
    id: "after_hours",
    label: "After Hours",
    description: "Handle calls outside business hours",
    icon: "Clock",
    category: "advanced",
  },
];

// Map industries to recommended capabilities
const INDUSTRY_CAPABILITIES: Record<string, string[]> = {
  dental: ["appointments", "patient_intake", "faq", "emergency_dispatch"],
  medical: ["appointments", "patient_intake", "faq", "emergency_dispatch"],
  restaurant: ["reservations", "faq", "promotions", "after_hours"],
  hotel: ["reservations", "faq", "after_hours"],
  motel: ["reservations", "faq", "after_hours"],
  salon: ["appointments", "faq", "promotions"],
  auto_service: ["appointments", "faq", "promotions"],
  default: ["call_handling", "message_taking", "faq"],
};

export function CapabilitiesStep() {
  const router = useRouter();
  const { state, dispatch, saveStep, goToNextStep, goToPreviousStep } =
    useSetup();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const industry = state.businessData.industry;
  const industryPreset = industry ? INDUSTRY_PRESETS[industry] : null;

  const recommendedCapabilities =
    (industry && INDUSTRY_CAPABILITIES[industry]) ||
    INDUSTRY_CAPABILITIES.default;

  // Filter capabilities to only show those relevant to the selected industry
  const availableCapabilityIds =
    (industry && INDUSTRY_CAPABILITIES[industry]) ||
    INDUSTRY_CAPABILITIES.default;
  const availableOptions = CAPABILITY_OPTIONS.filter((c) =>
    availableCapabilityIds.includes(c.id),
  );

  // Strip capabilities that no longer belong when industry changes
  useEffect(() => {
    const available =
      (industry && INDUSTRY_CAPABILITIES[industry]) ||
      INDUSTRY_CAPABILITIES.default;
    const filtered = state.capabilities.filter((c) => available.includes(c));
    if (filtered.length !== state.capabilities.length) {
      dispatch({ type: "SET_CAPABILITIES", payload: filtered });
    }
  }, [industry, state.capabilities, dispatch]);

  useEffect(() => {
    if (state.capabilities.length === 0 && recommendedCapabilities.length > 0) {
      dispatch({
        type: "SET_CAPABILITIES",
        payload: recommendedCapabilities,
      });
    }
  }, [recommendedCapabilities, state.capabilities.length, dispatch]);

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

  const coreCapabilities = availableOptions.filter(
    (c) => c.category === "core",
  );
  const communicationCapabilities = availableOptions.filter(
    (c) => c.category === "communication",
  );
  const advancedCapabilities = availableOptions.filter(
    (c) => c.category === "advanced",
  );

  const renderCapabilityCard = (capability: CapabilityOption) => {
    const isSelected = state.capabilities.includes(capability.id);
    const isRecommended = recommendedCapabilities.includes(capability.id);
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
          {industryPreset
            ? `Common tasks for ${industryPreset.label.toLowerCase()} businesses`
            : "Select the capabilities your assistant should have"}
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

      {/* Advanced capabilities */}
      {advancedCapabilities.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="h-1 w-4 rounded-full bg-amber-500" />
            Advanced
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {advancedCapabilities.map(renderCapabilityCard)}
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
