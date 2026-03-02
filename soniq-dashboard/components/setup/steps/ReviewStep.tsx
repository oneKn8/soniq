"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Sparkles,
  User,
  Phone,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Rocket,
  PhoneCall,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { useSetup } from "../SetupContext";
import { INDUSTRY_PRESETS } from "@/lib/industryPresets";
import type { SetupStep } from "@/types";

interface SummaryCardProps {
  title: string;
  icon: React.ElementType;
  items: { label: string; value: string }[];
  step: SetupStep;
  onEdit: () => void;
}

function SummaryCard({ title, icon: Icon, items, onEdit }: SummaryCardProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold">{title}</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-primary transition-colors hover:bg-primary/10"
        >
          <Edit3 className="h-3 w-3" />
          Edit
        </button>
      </div>
      <div className="space-y-2 p-4">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReviewStep() {
  const router = useRouter();
  const { state, completeSetup, goToPreviousStep } = useSetup();
  const [isLaunching, setIsLaunching] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testingCall, setTestingCall] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const industry = state.businessData.industry
    ? INDUSTRY_PRESETS[state.businessData.industry]
    : null;

  const checklistItems = [
    {
      label: "Business information",
      complete: !!state.businessData.name && !!state.businessData.industry,
    },
    {
      label: "Phone number configured",
      complete: !!state.phoneData.setupType,
    },
    {
      label: "Escalation contact added",
      complete: state.escalationData.contacts.length > 0,
    },
    {
      label: "Operating hours set",
      complete: !!state.hoursData.timezone,
    },
  ];

  const allComplete = checklistItems.every((item) => item.complete);
  const completedCount = checklistItems.filter((item) => item.complete).length;

  const handleEditStep = (step: SetupStep) => {
    router.push(`/setup/${step}`);
  };

  const handleTestCall = async () => {
    if (!testPhoneNumber) return;

    setTestingCall(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setTestingCall(false);
    setShowTestModal(false);
  };

  const handleLaunch = async () => {
    if (!allComplete) return;

    setIsLaunching(true);
    setLaunchError(null);

    try {
      const success = await completeSetup();
      if (success) {
        router.push("/dashboard?setup=complete");
      } else {
        setLaunchError("Failed to launch. Please try again.");
      }
    } catch (err) {
      setLaunchError(
        err instanceof Error
          ? err.message
          : "Failed to launch. Please try again.",
      );
    } finally {
      setIsLaunching(false);
    }
  };

  const handleBack = () => {
    goToPreviousStep();
    router.push("/setup/escalation");
  };

  const getHoursSummary = () => {
    const { schedule, sameEveryDay } = state.hoursData;
    if (sameEveryDay) {
      const mon = schedule.monday;
      if (mon?.status === "open") {
        return `Mon-Fri ${mon.open} - ${mon.close}`;
      }
      return "Custom schedule";
    }
    const openDays = Object.values(schedule).filter(
      (s) => s.status === "open",
    ).length;
    return `${openDays} days/week`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 shadow-lg shadow-primary/30">
          <Sparkles className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Your assistant is ready!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Review your configuration and launch when you&apos;re ready
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Business"
          icon={Building2}
          step="business"
          onEdit={() => handleEditStep("business")}
          items={[
            { label: "Name", value: state.businessData.name || "-" },
            { label: "Industry", value: industry?.label || "-" },
            { label: "Location", value: state.businessData.city || "-" },
          ]}
        />

        <SummaryCard
          title="Capabilities"
          icon={Sparkles}
          step="capabilities"
          onEdit={() => handleEditStep("capabilities")}
          items={[
            {
              label: "Active features",
              value: `${state.capabilities.length} selected`,
            },
            {
              label: "Integration mode",
              value:
                state.integrationMode === "external"
                  ? "External system"
                  : state.integrationMode === "builtin"
                    ? "Soniq"
                    : "Manual",
            },
          ]}
        />

        <SummaryCard
          title="Assistant"
          icon={User}
          step="assistant"
          onEdit={() => handleEditStep("assistant")}
          items={[
            { label: "Name", value: state.assistantData.name || "-" },
            {
              label: "Personality",
              value:
                state.assistantData.personality.charAt(0).toUpperCase() +
                state.assistantData.personality.slice(1),
            },
          ]}
        />

        <SummaryCard
          title="Phone"
          icon={Phone}
          step="phone"
          onEdit={() => handleEditStep("phone")}
          items={[
            {
              label: "Setup type",
              value:
                state.phoneData.setupType === "new"
                  ? "New number"
                  : state.phoneData.setupType === "port"
                    ? "Porting"
                    : state.phoneData.setupType === "sip"
                      ? "SIP Trunk"
                      : "Forwarding",
            },
            { label: "Number", value: state.phoneData.number || "Pending" },
          ]}
        />

        <SummaryCard
          title="Hours"
          icon={Clock}
          step="hours"
          onEdit={() => handleEditStep("hours")}
          items={[
            { label: "Timezone", value: state.hoursData.timezone || "-" },
            { label: "Schedule", value: getHoursSummary() },
            {
              label: "After hours",
              value:
                state.hoursData.afterHoursBehavior === "answer_closed"
                  ? "Answer + message"
                  : state.hoursData.afterHoursBehavior,
            },
          ]}
        />

        <SummaryCard
          title="Escalation"
          icon={Users}
          step="escalation"
          onEdit={() => handleEditStep("escalation")}
          items={[
            {
              label: "Contacts",
              value: `${state.escalationData.contacts.length} configured`,
            },
            {
              label: "Primary",
              value:
                state.escalationData.contacts.find((c) => c.is_primary)?.name ||
                "-",
            },
            {
              label: "Transfer type",
              value:
                state.escalationData.transferBehavior.type
                  .charAt(0)
                  .toUpperCase() +
                state.escalationData.transferBehavior.type.slice(1),
            },
          ]}
        />
      </div>

      {/* Pre-launch checklist */}
      <div className="rounded-xl border bg-card">
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Pre-launch checklist</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-primary">{completedCount}</span>
              <span className="text-muted-foreground">
                / {checklistItems.length} complete
              </span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {checklistItems.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-3 transition-colors",
                  item.complete
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-amber-500/30 bg-amber-500/5",
                )}
              >
                {item.complete ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    item.complete ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test call button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => setShowTestModal(true)}
          className="gap-2 border-primary/30 hover:border-primary hover:bg-primary/5"
        >
          <PhoneCall className="h-4 w-4" />
          Test your assistant
        </Button>
      </div>

      {/* Error display */}
      {launchError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
          {launchError}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleLaunch}
          disabled={!allComplete || isLaunching}
          size="lg"
        >
          {isLaunching ? (
            "Launching..."
          ) : (
            <span className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Launch Your Assistant
            </span>
          )}
        </Button>
      </div>

      {/* Test call modal */}
      <Modal open={showTestModal} onOpenChange={setShowTestModal}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Test your assistant</ModalTitle>
          </ModalHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your phone number and we&apos;ll have your assistant call
              you so you can experience how it works.
            </p>
            <div className="space-y-2">
              <Label htmlFor="test-phone">Your phone number</Label>
              <Input
                id="test-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTestModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleTestCall}
                disabled={!testPhoneNumber || testingCall}
              >
                {testingCall ? "Calling..." : "Call me"}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
