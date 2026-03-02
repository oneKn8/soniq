"use client";

import React from "react";
import { useConfig } from "@/context/ConfigContext";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Database,
  MessageSquare,
  Cloud,
  Check,
  ExternalLink,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// INTEGRATIONS DATA
// ============================================================================

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "calendar" | "pms" | "messaging" | "crm";
  connected: boolean;
}

const INTEGRATIONS: Integration[] = [
  // Calendar
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Sync appointments",
    icon: Calendar,
    category: "calendar",
    connected: true,
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Booking integration",
    icon: Calendar,
    category: "calendar",
    connected: false,
  },
  {
    id: "acuity",
    name: "Acuity Scheduling",
    description: "Appointment management",
    icon: Calendar,
    category: "calendar",
    connected: false,
  },

  // PMS (Hotel)
  {
    id: "cloudbeds",
    name: "Cloudbeds",
    description: "Property management",
    icon: Database,
    category: "pms",
    connected: false,
  },
  {
    id: "opera",
    name: "Oracle Opera",
    description: "Enterprise PMS",
    icon: Database,
    category: "pms",
    connected: false,
  },
  {
    id: "guesty",
    name: "Guesty",
    description: "Vacation rentals",
    icon: Database,
    category: "pms",
    connected: false,
  },

  // Messaging
  {
    id: "twilio",
    name: "Twilio",
    description: "SMS notifications",
    icon: MessageSquare,
    category: "messaging",
    connected: true,
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Email delivery",
    icon: MessageSquare,
    category: "messaging",
    connected: false,
  },

  // CRM
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Customer data sync",
    icon: Cloud,
    category: "crm",
    connected: false,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Marketing CRM",
    icon: Cloud,
    category: "crm",
    connected: false,
  },
];

const CATEGORIES = [
  { id: "calendar", label: "Calendar & Scheduling" },
  { id: "pms", label: "Property Management" },
  { id: "messaging", label: "Messaging" },
  { id: "crm", label: "CRM" },
];

// ============================================================================
// INTEGRATIONS TAB COMPONENT
// ============================================================================

export default function IntegrationsTab() {
  const { config } = useConfig();

  if (!config) return null;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white">Integrations</h3>
        <p className="text-sm text-zinc-500">
          Connect third-party services to extend your AI agent capabilities
        </p>
      </div>

      {/* Connected Summary */}
      <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
          <Plug className="h-5 w-5 text-green-500" />
        </div>
        <div>
          <div className="text-sm font-medium text-white">
            {INTEGRATIONS.filter((i) => i.connected).length} Connected
          </div>
          <div className="text-xs text-zinc-500">
            {INTEGRATIONS.filter((i) => !i.connected).length} available
            integrations
          </div>
        </div>
      </div>

      {/* Categories */}
      {CATEGORIES.map((category) => {
        const categoryIntegrations = INTEGRATIONS.filter(
          (i) => i.category === category.id,
        );

        // Only show relevant categories based on industry
        if (category.id === "pms" && config.industry !== "hotel") return null;

        return (
          <section key={category.id} className="space-y-4">
            <div className="border-b border-zinc-800 pb-2">
              <h4 className="text-sm font-medium text-white">
                {category.label}
              </h4>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {categoryIntegrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* API Access */}
      <section className="space-y-4">
        <div className="border-b border-zinc-800 pb-2">
          <h4 className="text-sm font-medium text-white">API Access</h4>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">REST API</div>
              <div className="text-xs text-zinc-500">
                Connect custom systems via our API
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white"
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              View Docs
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-xs text-zinc-600">API Key</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-400">
                lum_sk_********************************
              </code>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white"
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Webhooks */}
      <section className="space-y-4">
        <div className="border-b border-zinc-800 pb-2">
          <h4 className="text-sm font-medium text-white">Webhooks</h4>
        </div>

        <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center">
          <Plug className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-400">No webhooks configured</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 border-zinc-700 text-zinc-400"
          >
            Add Webhook
          </Button>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// INTEGRATION CARD COMPONENT
// ============================================================================

function IntegrationCard({ integration }: { integration: Integration }) {
  const Icon = integration.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4 transition-all",
        integration.connected
          ? "border-green-500/30 bg-green-500/5"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg border",
            integration.connected
              ? "border-green-500/30 bg-green-500/10"
              : "border-zinc-700 bg-zinc-800",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              integration.connected ? "text-green-500" : "text-zinc-400",
            )}
          />
        </div>
        <div>
          <div className="text-sm font-medium text-white">
            {integration.name}
          </div>
          <div className="text-xs text-zinc-500">{integration.description}</div>
        </div>
      </div>

      {integration.connected ? (
        <div className="flex items-center gap-1 text-xs text-green-500">
          <Check className="h-3 w-3" />
          <span>Connected</span>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white"
        >
          Connect
        </Button>
      )}
    </div>
  );
}
