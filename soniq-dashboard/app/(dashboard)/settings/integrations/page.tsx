"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { get, del, API_BASE } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  Link as LinkIcon,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type {
  TenantIntegration,
  IntegrationProvider,
  IntegrationStatus,
} from "@/types";

// Aceternity & MagicUI components
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";
import { SpotlightNew } from "@/components/aceternity/spotlight";
import { ShineBorder } from "@/components/magicui/shine-border";

interface IntegrationOption {
  id: IntegrationProvider;
  name: string;
  description: string;
  type: "calendar" | "booking" | "pos";
  industries?: string[];
}

interface AuthorizeResponse {
  authUrl: string;
}

const INTEGRATION_OPTIONS: IntegrationOption[] = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Sync appointments with Google Calendar",
    type: "calendar",
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Sync with Outlook Calendar",
    type: "calendar",
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Connect your Calendly scheduling",
    type: "booking",
  },
  {
    id: "acuity",
    name: "Acuity Scheduling",
    description: "Sync with Acuity appointments",
    type: "booking",
  },
  {
    id: "square",
    name: "Square Appointments",
    description: "Connect Square for scheduling",
    type: "booking",
  },
  {
    id: "vagaro",
    name: "Vagaro",
    description: "Salon & spa scheduling",
    type: "booking",
    industries: ["salon"],
  },
  {
    id: "mindbody",
    name: "Mindbody",
    description: "Fitness & wellness booking",
    type: "booking",
    industries: ["salon"],
  },
  {
    id: "toast",
    name: "Toast",
    description: "Restaurant management",
    type: "pos",
    industries: ["restaurant"],
  },
  {
    id: "opentable",
    name: "OpenTable",
    description: "Restaurant reservations",
    type: "booking",
    industries: ["restaurant"],
  },
];

const STATUS_CONFIG: Record<
  IntegrationStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  active: { label: "Connected", color: "text-green-600", icon: CheckCircle2 },
  expired: { label: "Expired", color: "text-amber-600", icon: AlertCircle },
  revoked: {
    label: "Disconnected",
    color: "text-muted-foreground",
    icon: AlertCircle,
  },
  error: { label: "Error", color: "text-destructive", icon: AlertCircle },
};

type IntegrationMode = "external" | "builtin" | "assisted";

function getOAuthCallbackOrigin(): string {
  try {
    if (API_BASE) {
      return new URL(API_BASE).origin;
    }
  } catch {
    // Fallback to the current app origin when API_BASE is not a valid URL.
  }
  return window.location.origin;
}

const MODE_OPTIONS: {
  id: IntegrationMode;
  title: string;
  description: string;
  icon: typeof LinkIcon;
}[] = [
  {
    id: "external",
    title: "External System",
    description: "Connected to your existing booking or calendar system",
    icon: LinkIcon,
  },
  {
    id: "builtin",
    title: "Built-in Scheduling",
    description: "Using Soniq's built-in scheduling system",
    icon: Calendar,
  },
  {
    id: "assisted",
    title: "Assisted Mode",
    description: "Collecting caller info for manual confirmation",
    icon: MessageSquare,
  },
];

export default function IntegrationsSettingsPage() {
  const { currentTenant, refreshTenants } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [integrations, setIntegrations] = useState<TenantIntegration[]>([]);
  const [integrationMode, setIntegrationMode] =
    useState<IntegrationMode>("builtin");
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const industry = currentTenant?.industry;

  // Filter integrations relevant to this industry
  const availableIntegrations = INTEGRATION_OPTIONS.filter((integration) => {
    if (!integration.industries) return true;
    return industry && integration.industries.includes(industry);
  });

  // Group by type
  const calendarIntegrations = availableIntegrations.filter(
    (i) => i.type === "calendar",
  );
  const bookingIntegrations = availableIntegrations.filter(
    (i) => i.type === "booking",
  );
  const posIntegrations = availableIntegrations.filter((i) => i.type === "pos");

  useEffect(() => {
    const loadIntegrations = async () => {
      if (!currentTenant) return;

      try {
        const data = await get<{ integrations: TenantIntegration[] }>(
          "/api/integrations",
        );
        setIntegrations(data.integrations || []);

        // Determine mode based on integrations and tenant data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenantData = currentTenant as Record<string, any>;
        if (data.integrations?.length > 0) {
          setIntegrationMode("external");
        } else if (tenantData.assisted_mode) {
          setIntegrationMode("assisted");
        } else {
          setIntegrationMode("builtin");
        }
      } catch (err) {
        // Use defaults if API fails
        setIntegrations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadIntegrations();
  }, [currentTenant]);

  const handleConnect = async (provider: IntegrationProvider) => {
    if (!currentTenant) return;

    setError(null);

    try {
      const { authUrl } = await get<AuthorizeResponse>(
        `/api/integrations/${provider}/authorize`,
      );
      const expectedOrigin = getOAuthCallbackOrigin();

      // Open OAuth provider URL in a popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        "oauth",
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      if (!popup) {
        setError("Popup blocked. Please allow popups and try again.");
        return;
      }

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== expectedOrigin) return;

        if (event.data?.type === "oauth_success") {
          const data = await get<{ integrations: TenantIntegration[] }>(
            "/api/integrations",
          );
          setIntegrations(data.integrations || []);
          setIntegrationMode("external");
          popup.close();
        } else if (event.data?.type === "oauth_error") {
          setError(event.data.error || "Failed to connect integration");
          popup.close();
        }

        window.removeEventListener("message", handleMessage);
      };

      window.addEventListener("message", handleMessage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start OAuth flow",
      );
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!currentTenant) return;

    setDisconnecting(integrationId);
    setError(null);

    try {
      await del(`/api/integrations/${integrationId}`);
      setIntegrations((prev) => prev.filter((i) => i.id !== integrationId));

      // Update mode if no integrations left
      if (integrations.length <= 1) {
        setIntegrationMode("builtin");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to disconnect integration",
      );
    } finally {
      setDisconnecting(null);
    }
  };

  const isConnected = (provider: IntegrationProvider) => {
    return integrations.some(
      (i) => i.provider === provider && i.status === "active",
    );
  };

  const getIntegration = (provider: IntegrationProvider) => {
    return integrations.find((i) => i.provider === provider);
  };

  const renderIntegrationCard = (integration: IntegrationOption) => {
    const connected = isConnected(integration.id);
    const existingIntegration = getIntegration(integration.id);
    const status = existingIntegration?.status;
    const StatusIcon = status ? STATUS_CONFIG[status]?.icon : CheckCircle2;
    const statusColor = status
      ? STATUS_CONFIG[status]?.color
      : "text-muted-foreground";
    const statusLabel = status ? STATUS_CONFIG[status]?.label : "";

    return (
      <div
        key={integration.id}
        className={cn(
          "flex items-center justify-between rounded-lg border p-4",
          connected && "border-green-500/50 bg-green-50 dark:bg-green-950/20",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{integration.name}</p>
            <p className="text-sm text-muted-foreground">
              {integration.description}
            </p>
          </div>
        </div>
        {connected ? (
          <div className="flex items-center gap-2">
            <span
              className={cn("flex items-center gap-1 text-sm", statusColor)}
            >
              <StatusIcon className="h-4 w-4" />
              {statusLabel}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                existingIntegration && handleDisconnect(existingIntegration.id)
              }
              disabled={disconnecting === existingIntegration?.id}
            >
              {disconnecting === existingIntegration?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Disconnect"
              )}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleConnect(integration.id)}
          >
            Connect
            <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentMode = MODE_OPTIONS.find((m) => m.id === integrationMode);
  const ModeIcon = currentMode?.icon || LinkIcon;

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
            words="Integrations"
            className="text-2xl font-semibold text-foreground md:text-3xl"
            duration={0.3}
          />
          <p className="mt-2 text-muted-foreground">
            Connect your booking and calendar systems
          </p>
        </div>

        {/* Current Mode */}
        <div className="relative z-10">
          <ShineBorder
            borderRadius={12}
            borderWidth={2}
            duration={8}
            color={integrationMode === "external" ? "#22c55e" : "#6366f1"}
            className="w-full min-w-full bg-card p-0"
          >
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <ModeIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{currentMode?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentMode?.description}
                  </p>
                </div>
              </div>
            </div>
          </ShineBorder>
        </div>

        {/* Connected Integrations */}
        {integrations.length > 0 && (
          <div className="relative z-10 space-y-4">
            <Label>Connected Integrations</Label>
            <div className="space-y-2">
              {integrations.map((integration) => {
                const option = INTEGRATION_OPTIONS.find(
                  (o) => o.id === integration.provider,
                );
                if (!option) return null;
                return renderIntegrationCard(option);
              })}
            </div>
          </div>
        )}

        {/* Available Integrations */}
        <div className="relative z-10 space-y-6">
          {/* Calendar integrations */}
          {calendarIntegrations.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Calendars
              </Label>
              <div className="space-y-2">
                {calendarIntegrations
                  .filter((i) => !isConnected(i.id))
                  .map(renderIntegrationCard)}
              </div>
            </div>
          )}

          {/* Booking integrations */}
          {bookingIntegrations.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Booking Systems
              </Label>
              <div className="space-y-2">
                {bookingIntegrations
                  .filter((i) => !isConnected(i.id))
                  .map(renderIntegrationCard)}
              </div>
            </div>
          )}

          {/* POS integrations */}
          {posIntegrations.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Point of Sale
              </Label>
              <div className="space-y-2">
                {posIntegrations
                  .filter((i) => !isConnected(i.id))
                  .map(renderIntegrationCard)}
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="relative z-10 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Help Section */}
        <div className="relative z-10 rounded-xl border border-dashed p-6">
          <h3 className="font-medium">Don&apos;t see your system?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Your assistant will collect caller information and you&apos;ll
            confirm bookings manually. We add new integrations regularly.
          </p>
          <Button variant="outline" className="mt-4">
            Request Integration
          </Button>
        </div>
      </div>
    </div>
  );
}
