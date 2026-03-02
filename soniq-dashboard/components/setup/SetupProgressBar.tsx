"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface SetupProgressBarProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  variant?: "horizontal" | "vertical";
}

export function SetupProgressBar({
  steps,
  currentStep,
  className,
  variant = "horizontal",
}: SetupProgressBarProps) {
  if (variant === "vertical") {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div key={step.id} className="flex gap-3">
              {/* Step indicator line */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent &&
                      "bg-primary/10 text-primary border-2 border-primary",
                    isPending && "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 my-1",
                      isCompleted ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </div>

              {/* Step label */}
              <div className="pb-6">
                <div
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal variant
  return (
    <div className={cn("w-full", className)}>
      {/* Progress steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div
              key={step.id}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground",
                    isPending &&
                      "bg-muted text-muted-foreground border border-border",
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : index + 1}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium hidden sm:block",
                    isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 sm:mx-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      isCompleted ? "bg-primary w-full" : "w-0",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Show current step label */}
      <div className="sm:hidden text-center mt-2">
        <span className="text-sm font-medium text-foreground">
          Step {currentStep + 1}: {steps[currentStep]?.label}
        </span>
        {steps[currentStep]?.description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {steps[currentStep].description}
          </p>
        )}
      </div>
    </div>
  );
}

// Compact version for inline display
export function SetupProgressCompact({
  steps,
  currentStep,
  className,
}: SetupProgressBarProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          Setup Progress
        </span>
        <span className="text-xs text-muted-foreground">
          {currentStep + 1} of {steps.length}
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        {steps.map((step, index) => (
          <span
            key={step.id}
            className={cn(
              "text-[10px]",
              index <= currentStep
                ? "text-primary font-medium"
                : "text-muted-foreground",
            )}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}
