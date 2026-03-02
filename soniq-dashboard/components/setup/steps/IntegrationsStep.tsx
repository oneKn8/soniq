"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link,
  Calendar,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSetup } from "../SetupContext";
import { SelectionCard } from "../SelectionCard";
import { get, API_BASE } from "@/lib/api/client";
import type { IntegrationProvider, TenantIntegration } from "@/types";

interface AuthorizeResponse {
  authUrl: string;
}

interface IntegrationOption {
  id: IntegrationProvider;
  name: string;
  description: string;
  logo?: string;
  type: "calendar" | "booking" | "pos";
  industries?: string[];
  comingSoon?: boolean;
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
    comingSoon: true,
  },
  {
    id: "square",
    name: "Square Appointments",
    description: "Connect Square for scheduling",
    type: "booking",
    comingSoon: true,
  },
  {
    id: "vagaro",
    name: "Vagaro",
    description: "Salon & spa scheduling",
    type: "booking",
    industries: ["salon"],
    comingSoon: true,
  },
  {
    id: "mindbody",
    name: "Mindbody",
    description: "Fitness & wellness booking",
    type: "booking",
    industries: ["salon"],
    comingSoon: true,
  },
  {
    id: "toast",
    name: "Toast",
    description: "Restaurant management",
    type: "pos",
    industries: ["restaurant"],
    comingSoon: true,
  },
  {
    id: "opentable",
    name: "OpenTable",
    description: "Restaurant reservations",
    type: "booking",
    industries: ["restaurant"],
    comingSoon: true,
  },
];

type IntegrationMode = "external" | "builtin" | "assisted";

const MODE_OPTIONS: {
  id: IntegrationMode;
  title: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: "external",
    title: "Yes, I use something else",
    description: "Connect your existing booking or calendar system",
    icon: Link,
  },
  {
    id: "builtin",
    title: "No, I'll use Soniq",
    description: "Use our built-in scheduling system",
    icon: Calendar,
  },
  {
    id: "assisted",
    title: "Just take messages for now",
    description: "Collect caller info and confirm bookings manually",
    icon: MessageSquare,
  },
];

function getOAuthCallbackOrigin(): string {
  try {
    if (API_BASE) {
      return new URL(API_BASE).origin;
    }
  } catch {
    // Fallback to app origin if API_BASE is invalid.
  }
  return window.location.origin;
}

export function IntegrationsStep() {
  const router = useRouter();
  const { state, dispatch, saveStep, goToNextStep, goToPreviousStep } =
    useSetup();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(
    state.integrationMode === "external",
  );

  const industry = state.businessData.industry;

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

  const canContinue = state.integrationMode !== null;

  const handleModeSelect = (mode: IntegrationMode) => {
    dispatch({ type: "SET_INTEGRATION_MODE", payload: mode });
    if (mode === "external") {
      setShowIntegrations(true);
    } else {
      setShowIntegrations(false);
    }
  };

  const handleConnect = async (provider: IntegrationProvider) => {
    try {
      const { authUrl } = await get<AuthorizeResponse>(
        `/api/integrations/${provider}/authorize`,
      );
      const expectedOrigin = getOAuthCallbackOrigin();

      // Open OAuth in new window
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
        console.error("Popup blocked while starting OAuth");
        return;
      }

      // Listen for message from callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== expectedOrigin) return;

        if (event.data?.type === "oauth_success") {
          const data = await get<{ integrations: TenantIntegration[] }>(
            "/api/integrations",
          );
          dispatch({
            type: "SET_INTEGRATIONS",
            payload: data.integrations || [],
          });
          popup.close();
        } else if (event.data?.type === "oauth_error") {
          console.error("OAuth error:", event.data.error);
          popup.close();
        }

        window.removeEventListener("message", handleMessage);
      };

      window.addEventListener("message", handleMessage);
    } catch (error) {
      console.error("Failed to start OAuth flow:", error);
    }
  };

  const handleDisconnect = (provider: IntegrationProvider) => {
    dispatch({
      type: "SET_INTEGRATIONS",
      payload: state.integrations.filter((i) => i.provider !== provider),
    });
  };

  const isConnected = (provider: IntegrationProvider) => {
    return state.integrations.some(
      (i) => i.provider === provider && i.status === "active",
    );
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    setIsSubmitting(true);
    const success = await saveStep("integrations");
    if (success) {
      goToNextStep();
      router.push("/setup/assistant");
    }
    setIsSubmitting(false);
  };

  const handleBack = () => {
    goToPreviousStep();
    router.push("/setup/details");
  };

  const renderIntegrationCard = (integration: IntegrationOption) => {
    const connected = isConnected(integration.id);

    return (
      <div
        key={integration.id}
        className={cn(
          "flex items-center justify-between rounded-lg border p-4",
          connected && "border-green-500/50 bg-green-50 dark:bg-green-950/20",
          integration.comingSoon && "opacity-60",
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
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Connected
            </span>
            <button
              type="button"
              onClick={() => handleDisconnect(integration.id)}
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              Disconnect
            </button>
          </div>
        ) : integration.comingSoon ? (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Coming Soon
          </span>
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {showIntegrations
            ? "Connect your systems"
            : "Do you use a booking or calendar system?"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {showIntegrations
            ? "Link your existing tools so your assistant can manage real bookings"
            : "This helps us set up how your assistant handles appointments"}
        </p>
      </div>

      {!showIntegrations ? (
        /* Mode selection with SelectionCard */
        <div className="grid gap-4 md:grid-cols-3">
          {MODE_OPTIONS.map((mode) => {
            const isSelected = state.integrationMode === mode.id;
            const Icon = mode.icon;

            return (
              <SelectionCard
                key={mode.id}
                selected={isSelected}
                onClick={() => handleModeSelect(mode.id)}
                icon={Icon}
                title={mode.title}
                description={mode.description}
              />
            );
          })}
        </div>
      ) : (
        /* Integration selection */
        <div className="space-y-6">
          {/* Back to mode selection */}
          <button
            type="button"
            onClick={() => setShowIntegrations(false)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Change selection
          </button>

          {/* Calendar integrations */}
          {calendarIntegrations.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Calendars
              </h2>
              <div className="space-y-2">
                {calendarIntegrations.map(renderIntegrationCard)}
              </div>
            </div>
          )}

          {/* Booking integrations */}
          {bookingIntegrations.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Booking Systems
              </h2>
              <div className="space-y-2">
                {bookingIntegrations.map(renderIntegrationCard)}
              </div>
            </div>
          )}

          {/* POS integrations */}
          {posIntegrations.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Point of Sale
              </h2>
              <div className="space-y-2">
                {posIntegrations.map(renderIntegrationCard)}
              </div>
            </div>
          )}

          {/* Don't see your system */}
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t see your system? Your assistant will collect caller
              information and you&apos;ll confirm bookings manually.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              We add new integrations regularly.
            </p>
          </div>
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
