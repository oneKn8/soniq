"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSetup } from "../SetupContext";

import { ReservationDetails } from "./details/ReservationDetails";
import { AppointmentDetails } from "./details/AppointmentDetails";
import { PatientIntakeDetails } from "./details/PatientIntakeDetails";
import { EmergencyDetails } from "./details/EmergencyDetails";
import { FAQDetails } from "./details/FAQDetails";
import { PromotionDetails } from "./details/PromotionDetails";

interface DetailProps {
  data: Record<string, unknown>;
  onChange: (details: Record<string, unknown>) => void;
}

type DetailComponent = React.ComponentType<DetailProps>;

const CAPABILITY_COMPONENTS: Record<string, DetailComponent> = {
  reservations: ReservationDetails,
  appointments: AppointmentDetails,
  patient_intake: PatientIntakeDetails,
  emergency_dispatch: EmergencyDetails,
  faq: FAQDetails,
};

const CAPABILITY_LABELS: Record<string, string> = {
  reservations: "Reservation Settings",
  appointments: "Appointment Settings",
  patient_intake: "Patient Intake Settings",
  emergency_dispatch: "Emergency Settings",
  faq: "FAQ & Information",
};

export function DetailsStep() {
  const router = useRouter();
  const { state, dispatch, saveStep, goToNextStep, goToPreviousStep } =
    useSetup();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["promotions"]),
  );

  // Filter to capabilities that have detail components
  const sectionsToShow = state.capabilities.filter(
    (c) => CAPABILITY_COMPONENTS[c],
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleCapabilityChange = (
    capability: string,
    details: Record<string, unknown>,
  ) => {
    dispatch({
      type: "SET_CAPABILITY_DETAILS",
      payload: { capability, details },
    });
  };

  const handleContinue = async () => {
    setIsSubmitting(true);
    const success = await saveStep("details");
    if (success) {
      goToNextStep();
      router.push("/setup/integrations");
    }
    setIsSubmitting(false);
  };

  const handleBack = () => {
    goToPreviousStep();
    router.push("/setup/capabilities");
  };

  const isSectionComplete = (capability: string): boolean => {
    const details = state.capabilityDetails[capability];
    if (!details || Object.keys(details).length === 0) return false;
    // Basic check - has at least one non-empty value
    return Object.values(details).some(
      (v) => v !== "" && v !== null && v !== undefined,
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tell us more about your services
        </h1>
        <p className="mt-2 text-muted-foreground">
          Configure settings for each capability. You can skip sections and
          configure them later.
        </p>
      </div>

      {/* Capability detail sections */}
      {sectionsToShow.length > 0 && (
        <div className="space-y-4">
          {sectionsToShow.map((capability) => {
            const Component = CAPABILITY_COMPONENTS[capability];
            const isExpanded = expandedSections.has(capability);
            const isComplete = isSectionComplete(capability);

            return (
              <div
                key={capability}
                className="overflow-hidden rounded-lg border"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(capability)}
                  className="flex w-full items-center justify-between bg-muted/30 px-4 py-3 text-left hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {CAPABILITY_LABELS[capability] || capability}
                    </span>
                    {isComplete && (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Check className="h-3 w-3" />
                        Configured
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="border-t p-4">
                    <Component
                      data={state.capabilityDetails[capability] || {}}
                      onChange={(details) =>
                        handleCapabilityChange(capability, details)
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Promotions section - always shown */}
      <div className="overflow-hidden rounded-lg border">
        <button
          type="button"
          onClick={() => toggleSection("promotions")}
          className="flex w-full items-center justify-between bg-muted/30 px-4 py-3 text-left hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium">Promotions & Offers</span>
            {state.promotions.length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Check className="h-3 w-3" />
                Configured
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              expandedSections.has("promotions") && "rotate-180",
            )}
          />
        </button>
        {expandedSections.has("promotions") && (
          <div className="border-t p-4">
            <PromotionDetails
              data={{
                promotions: state.promotions,
              }}
              onChange={(details) => {
                if (details.promotions) {
                  dispatch({
                    type: "SET_PROMOTIONS",
                    payload: details.promotions as typeof state.promotions,
                  });
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {sectionsToShow.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No additional configuration needed for your selected capabilities.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            You can configure promotions above or continue to the next step.
          </p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={isSubmitting} size="lg">
          {isSubmitting ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
