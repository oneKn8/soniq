"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import {
  useSetup,
  isValidStep,
  canAccessStep,
  SETUP_STEPS,
  STEP_LABELS,
} from "@/components/setup/SetupContext";
import { SetupProgressBar } from "@/components/setup/SetupProgressBar";
import { BusinessStep } from "@/components/setup/steps/BusinessStep";
import { CapabilitiesStep } from "@/components/setup/steps/CapabilitiesStep";
import { DetailsStep } from "@/components/setup/steps/DetailsStep";
import { IntegrationsStep } from "@/components/setup/steps/IntegrationsStep";
import { AssistantStep } from "@/components/setup/steps/AssistantStep";
import { PhoneStep } from "@/components/setup/steps/PhoneStep";
import { HoursStep } from "@/components/setup/steps/HoursStep";
import { EscalationStep } from "@/components/setup/steps/EscalationStep";
import { ReviewStep } from "@/components/setup/steps/ReviewStep";
import type { SetupStep } from "@/types";
import { useToast } from "@/context/ToastContext";

const STEP_COMPONENTS: Record<SetupStep, React.ComponentType> = {
  business: BusinessStep,
  capabilities: CapabilitiesStep,
  details: DetailsStep,
  integrations: IntegrationsStep,
  assistant: AssistantStep,
  phone: PhoneStep,
  hours: HoursStep,
  escalation: EscalationStep,
  review: ReviewStep,
};

// Create steps array for progress bar
const STEPS = SETUP_STEPS.map((id) => ({
  id,
  label: STEP_LABELS[id],
}));

export default function SetupStepPage() {
  const params = useParams();
  const step = params.step as string;
  const { user, isLoading: authLoading } = useAuth();
  const { state, goToStep } = useSetup();
  const { toast } = useToast();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // Handle invalid or inaccessible steps
  useEffect(() => {
    if (!state.isLoading) {
      // Validate step parameter
      if (!isValidStep(step)) {
        router.replace("/setup");
        return;
      }

      // Check if can access this step
      if (!canAccessStep(step, state.completedSteps)) {
        router.replace(`/setup/${state.currentStep}`);
        return;
      }

      // Update current step in state if different
      if (step !== state.currentStep && isValidStep(step)) {
        goToStep(step);
      }
    }
  }, [
    step,
    state.isLoading,
    state.currentStep,
    state.completedSteps,
    router,
    goToStep,
  ]);

  // Show error toast
  useEffect(() => {
    if (state.error) {
      toast.error("Setup Error", state.error);
    }
  }, [state.error, toast]);

  // Show loading while checking auth or loading progress
  if (authLoading || state.isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  // Validate step
  if (!isValidStep(step)) {
    return null; // Will redirect
  }

  const StepComponent = STEP_COMPONENTS[step];
  const currentStepIndex = SETUP_STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <SetupProgressBar
            steps={STEPS}
            currentStep={currentStepIndex}
            variant="horizontal"
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="mx-auto max-w-2xl px-4 py-8">
        <StepComponent />
      </div>
    </div>
  );
}
