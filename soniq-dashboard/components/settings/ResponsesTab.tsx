"use client";

import React, { useEffect } from "react";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Label } from "@/components/ui/label";
import {
  XCircle,
  PhoneForwarded,
  CheckCircle,
  AlertCircle,
  LogOut,
  Pause,
  HelpCircle,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// RESPONSE TYPES
// ============================================================================

interface ResponseField {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  placeholder: string;
  iconColor: string;
}

const RESPONSE_FIELDS: ResponseField[] = [
  {
    id: "notAvailable",
    label: "Not Available",
    description: "When requested service/item isn't available",
    icon: XCircle,
    iconColor: "text-red-400",
    placeholder: "I apologize, but that is not available at this time...",
  },
  {
    id: "transferring",
    label: "Transferring Call",
    description: "Before transferring to a human agent",
    icon: PhoneForwarded,
    iconColor: "text-blue-400",
    placeholder: "I'll transfer you to someone who can better assist you...",
  },
  {
    id: "bookingConfirmed",
    label: "Booking Confirmed",
    description: "After successfully completing a booking",
    icon: CheckCircle,
    iconColor: "text-green-400",
    placeholder: "Great! Your booking has been confirmed...",
  },
  {
    id: "bookingFailed",
    label: "Booking Failed",
    description: "When a booking cannot be completed",
    icon: AlertCircle,
    iconColor: "text-amber-400",
    placeholder: "I apologize, but I was unable to complete that booking...",
  },
  {
    id: "goodbye",
    label: "Goodbye",
    description: "End of call farewell message",
    icon: LogOut,
    iconColor: "text-violet-400",
    placeholder: "Thank you for calling {businessName}. Have a great day!",
  },
  {
    id: "holdMessage",
    label: "Hold Message",
    description: "While processing a request",
    icon: Pause,
    iconColor: "text-cyan-400",
    placeholder: "Thank you for holding. I'm still working on your request.",
  },
  {
    id: "fallback",
    label: "Fallback Response",
    description: "When the AI doesn't understand",
    icon: HelpCircle,
    iconColor: "text-zinc-400",
    placeholder: "I want to make sure I understand you correctly...",
  },
];

// ============================================================================
// RESPONSES TAB COMPONENT
// ============================================================================

export default function ResponsesTab() {
  const { tenant, saveStatus, error, clearError, updateSettings } =
    useTenantConfig();

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(clearError, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, clearError]);

  if (!tenant) return null;

  const responses: Record<string, string> = tenant.responses || {};

  const updateResponse = (field: string, value: string) => {
    updateSettings({ responses: { ...responses, [field]: value } });
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header with Save Status */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Custom Responses</h3>
          <p className="text-sm text-zinc-500">
            Customize how your AI agent responds in specific situations
          </p>
        </div>

        {/* Save Status Indicator */}
        <div className="flex items-center gap-2">
          {error && (
            <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              <span>Failed to save</span>
            </div>
          )}
          {!error && saveStatus === "saving" && (
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          {!error && saveStatus === "saved" && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
              <Check className="h-3 w-3" />
              <span>Saved</span>
            </div>
          )}
        </div>
      </div>

      {/* Variables Reference */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Available Variables
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { token: "{businessName}", preview: tenant.business_name },
            { token: "{agentName}", preview: tenant.agent_name },
            { token: "{callerName}", preview: null },
          ].map(({ token, preview }) => (
            <span key={token} className="inline-flex items-center gap-1.5">
              <code className="rounded bg-zinc-800 px-2 py-1 font-mono text-xs text-indigo-400">
                {token}
              </code>
              {preview && (
                <span className="text-[10px] text-zinc-600">{preview}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Response Fields */}
      <div className="space-y-6">
        {RESPONSE_FIELDS.map((field) => {
          const Icon = field.icon;
          const value = responses[field.id] || "";

          return (
            <section key={field.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800">
                  <Icon className={cn("h-4 w-4", field.iconColor)} />
                </div>
                <div>
                  <Label className="text-white">{field.label}</Label>
                  <p className="text-xs text-zinc-600">{field.description}</p>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={value}
                  onChange={(e) => updateResponse(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={2}
                  className={cn(
                    "w-full resize-none rounded-lg border bg-zinc-950 px-4 py-3 text-sm text-white",
                    "placeholder:text-zinc-600",
                    "focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
                    "border-zinc-800",
                  )}
                />
                <div className="absolute bottom-2 right-2 text-[10px] text-zinc-600">
                  {value.length} characters
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Conversation Flow Note */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          How responses work
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          These responses are used by your AI agent in specific situations
          during a call. The agent will naturally incorporate these messages
          while maintaining a conversational tone. Custom responses help ensure
          consistency and brand alignment across all customer interactions.
        </p>
      </div>

      {/* Tips */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="text-sm font-medium text-amber-400">
          Response best practices
        </div>
        <ul className="mt-2 space-y-1 text-xs text-zinc-400">
          <li>Be empathetic, especially for negative situations</li>
          <li>Keep responses clear and actionable</li>
          <li>Avoid jargon or overly technical language</li>
          <li>Always offer an alternative or next step when possible</li>
        </ul>
      </div>
    </div>
  );
}
