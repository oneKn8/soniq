"use client";

import { DemoOrchestrator, useDemoOrchestrator } from "./DemoOrchestrator";
import { SoniqWidget } from "./SoniqWidget";

interface DemoProviderProps {
  children: React.ReactNode;
}

export function DemoProvider({ children }: DemoProviderProps) {
  return (
    <DemoOrchestrator>
      {children}
      <DemoWidgetConnector />
    </DemoOrchestrator>
  );
}

// Internal component that connects widget to orchestrator
function DemoWidgetConnector() {
  const { triggerDemo } = useDemoOrchestrator();

  const handleDemoTrigger = (demoType: string) => {
    const validTypes = [
      "incoming-call",
      "booking",
      "contact",
      "dashboard",
      "check-in",
    ];
    if (validTypes.includes(demoType)) {
      triggerDemo(
        demoType as
          | "incoming-call"
          | "booking"
          | "contact"
          | "dashboard"
          | "check-in",
      );
    }
  };

  return <SoniqWidget onDemoTrigger={handleDemoTrigger} />;
}
