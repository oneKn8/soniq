"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { get } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Phone,
  ArrowLeftRight,
  PhoneForwarded,
  Clock,
  ChevronDown,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import type { PhoneSetupType, PhoneStatus, PortStatus } from "@/types";

// Aceternity & MagicUI components
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";
import { SpotlightNew } from "@/components/aceternity/spotlight";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { ShineBorder } from "@/components/magicui/shine-border";

const CARRIERS = [
  { id: "att", name: "AT&T" },
  { id: "verizon", name: "Verizon" },
  { id: "tmobile", name: "T-Mobile" },
  { id: "sprint", name: "Sprint" },
  { id: "other", name: "Other" },
];

const FORWARDING_INSTRUCTIONS: Record<string, string[]> = {
  att: [
    "Dial *72 from your phone",
    "Enter the forwarding number when prompted",
    "Wait for confirmation tone",
  ],
  verizon: [
    "Dial *71 from your phone",
    "Enter the forwarding number",
    "Press # and hang up",
  ],
  tmobile: [
    "Go to Settings > Phone > Call Forwarding",
    "Enable call forwarding",
    "Enter the forwarding number",
  ],
  sprint: [
    "Dial *72 from your phone",
    "Enter the forwarding number",
    "Wait for two beeps to confirm",
  ],
  other: [
    "Contact your carrier for call forwarding instructions",
    "Ask to forward all calls to the number below",
  ],
};

const STATUS_CONFIG: Record<
  PhoneStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  active: { label: "Active", color: "text-green-600", icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-amber-600", icon: Clock },
  porting: {
    label: "Porting in Progress",
    color: "text-blue-600",
    icon: Clock,
  },
  porting_with_temp: {
    label: "Porting (Temp Number Active)",
    color: "text-blue-600",
    icon: Clock,
  },
  failed: { label: "Failed", color: "text-destructive", icon: AlertCircle },
};

const PORT_STATUS_CONFIG: Record<PortStatus, { label: string; color: string }> =
  {
    draft: { label: "Draft", color: "text-muted-foreground" },
    submitted: { label: "Submitted", color: "text-blue-600" },
    pending: { label: "Pending Review", color: "text-amber-600" },
    approved: { label: "Approved", color: "text-green-600" },
    rejected: { label: "Rejected", color: "text-destructive" },
    completed: { label: "Completed", color: "text-green-600" },
  };

interface PhoneConfig {
  phone_number: string;
  setup_type: PhoneSetupType;
  status: PhoneStatus;
  forwarding_number?: string;
  port_status?: PortStatus;
  port_estimated_completion?: string;
  port_rejection_reason?: string;
}

interface PhoneConfigResponse {
  config: {
    phone_number: string | null;
    setup_type: PhoneSetupType;
    status: PhoneStatus;
  } | null;
  portRequest?: {
    status?: PortStatus;
    estimated_completion?: string | null;
    rejection_reason?: string | null;
  } | null;
}

export default function PhoneSettingsPage() {
  const { currentTenant } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [phoneConfig, setPhoneConfig] = useState<PhoneConfig | null>(null);
  const [forwardCarrier, setForwardCarrier] = useState("att");
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const loadPhoneConfig = async () => {
      if (!currentTenant) return;

      try {
        const data = await get<PhoneConfigResponse>("/api/phone/config");
        const mappedConfig: PhoneConfig = {
          phone_number:
            data.config?.phone_number || currentTenant.phone_number || "",
          setup_type: data.config?.setup_type || "new",
          status:
            data.config?.status ||
            (currentTenant.phone_number ? "active" : "pending"),
          port_status: data.portRequest?.status,
          port_estimated_completion:
            data.portRequest?.estimated_completion || undefined,
          port_rejection_reason:
            data.portRequest?.rejection_reason || undefined,
        };
        setPhoneConfig(mappedConfig);
      } catch (err) {
        // If no config exists, use defaults from tenant
        setPhoneConfig({
          phone_number: currentTenant.phone_number || "",
          setup_type: "new",
          status: currentTenant.phone_number ? "active" : "pending",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPhoneConfig();
  }, [currentTenant]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const forwardingNumber =
    phoneConfig?.forwarding_number || "+1 (800) 555-0199";

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!phoneConfig) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Unable to load phone settings</p>
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[phoneConfig.status]?.icon || Clock;
  const statusColor =
    STATUS_CONFIG[phoneConfig.status]?.color || "text-muted-foreground";
  const statusLabel = STATUS_CONFIG[phoneConfig.status]?.label || "Unknown";

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <SpotlightNew className="opacity-20" />

        {/* Header */}
        <div className="relative z-10">
          <Link
            href="/settings"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          <TextGenerateEffect
            words="Phone Settings"
            className="text-2xl font-semibold text-foreground md:text-3xl"
            duration={0.3}
          />
          <p className="mt-2 text-muted-foreground">
            Manage your business phone configuration
          </p>
        </div>

        {/* Current Phone Number */}
        <div className="relative z-10 space-y-4">
          <Label>Current Phone Number</Label>
          <ShineBorder
            borderRadius={12}
            borderWidth={2}
            duration={8}
            color={phoneConfig.status === "active" ? "#22c55e" : "#f59e0b"}
            className="w-full min-w-full bg-card p-0"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono text-xl font-semibold">
                      {phoneConfig.phone_number || "Not configured"}
                    </p>
                    <div
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        statusColor,
                      )}
                    >
                      <StatusIcon className="h-4 w-4" />
                      <span>{statusLabel}</span>
                    </div>
                  </div>
                </div>
                {phoneConfig.phone_number && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(phoneConfig.phone_number)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span className="ml-2">{copied ? "Copied" : "Copy"}</span>
                  </Button>
                )}
              </div>
            </div>
          </ShineBorder>
        </div>

        {/* Setup Type Info */}
        <div className="relative z-10 rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3">
            {phoneConfig.setup_type === "new" && (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <Phone className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-medium">New Number</p>
                  <p className="text-sm text-muted-foreground">
                    This is a dedicated phone number provisioned for your
                    assistant
                  </p>
                </div>
              </>
            )}
            {phoneConfig.setup_type === "port" && (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <ArrowLeftRight className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Ported Number</p>
                  <p className="text-sm text-muted-foreground">
                    Your existing number has been transferred to our service
                  </p>
                </div>
              </>
            )}
            {phoneConfig.setup_type === "forward" && (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                  <PhoneForwarded className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">Call Forwarding</p>
                  <p className="text-sm text-muted-foreground">
                    Calls are forwarded from your existing number to your
                    assistant
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Port Status (if porting) */}
        {(phoneConfig.status === "porting" ||
          phoneConfig.status === "porting_with_temp") &&
          phoneConfig.port_status && (
            <div className="relative z-10 space-y-4">
              <Label>Port Request Status</Label>
              <div className="rounded-xl border bg-card p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        PORT_STATUS_CONFIG[phoneConfig.port_status].color,
                      )}
                    >
                      {PORT_STATUS_CONFIG[phoneConfig.port_status].label}
                    </span>
                  </div>
                  {phoneConfig.port_estimated_completion && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Estimated Completion
                      </span>
                      <span className="font-medium">
                        {new Date(
                          phoneConfig.port_estimated_completion,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {phoneConfig.port_rejection_reason && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                      <p className="text-sm text-destructive">
                        {phoneConfig.port_rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Forwarding Instructions (if forwarding) */}
        {phoneConfig.setup_type === "forward" && (
          <div className="relative z-10 space-y-4">
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex w-full items-center justify-between"
            >
              <Label className="cursor-pointer">
                Call Forwarding Instructions
              </Label>
              <ChevronDown
                className={cn(
                  "h-5 w-5 transition-transform",
                  showInstructions && "rotate-180",
                )}
              />
            </button>

            {showInstructions && (
              <div className="space-y-4 rounded-xl border bg-card p-6">
                {/* Forwarding number display */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">
                    Forward your calls to:
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-mono text-lg font-semibold">
                      {forwardingNumber}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(forwardingNumber)}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    This is your dedicated assistant line
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forward-carrier" className="text-xs">
                    Select your carrier
                  </Label>
                  <select
                    id="forward-carrier"
                    value={forwardCarrier}
                    onChange={(e) => setForwardCarrier(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {CARRIERS.map((carrier) => (
                      <option key={carrier.id} value={carrier.id}>
                        {carrier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Instructions:</p>
                  <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                    {FORWARDING_INSTRUCTIONS[forwardCarrier]?.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="relative z-10 rounded-xl border border-dashed p-6">
          <h3 className="font-medium">Need to change your phone setup?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Contact our support team to modify your phone configuration, port a
            new number, or switch between setup types.
          </p>
          <Button variant="outline" className="mt-4">
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
