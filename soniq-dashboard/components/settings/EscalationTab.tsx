"use client";

import React, { useState } from "react";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  PhoneForwarded,
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_TRIGGERS = ["speak to human", "manager"];

// ============================================================================
// ESCALATION TAB COMPONENT
// ============================================================================

export default function EscalationTab() {
  const { tenant, saveStatus, error, clearError, updateSettings } =
    useTenantConfig();

  const [newTrigger, setNewTrigger] = useState("");

  if (!tenant) return null;

  const enabled = tenant.escalation_enabled ?? true;
  const phone = tenant.escalation_phone ?? "";
  const triggers = tenant.escalation_triggers ?? DEFAULT_TRIGGERS;

  const addTrigger = () => {
    const trimmed = newTrigger.trim();
    if (!trimmed) return;
    // Avoid duplicates (case-insensitive)
    if (triggers.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setNewTrigger("");
      return;
    }
    updateSettings({ escalation_triggers: [...triggers, trimmed] });
    setNewTrigger("");
  };

  const removeTrigger = (index: number) => {
    updateSettings({
      escalation_triggers: triggers.filter((_, i) => i !== index),
    });
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTrigger();
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header with Save Status */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Escalation Rules</h3>
          <p className="text-sm text-zinc-500">
            Configure when and how calls should be escalated to human agents
          </p>
        </div>

        {/* Save Status Indicator */}
        <div className="flex items-center gap-2">
          {error && (
            <button
              onClick={clearError}
              className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-400"
            >
              <AlertCircle className="h-3 w-3" />
              <span>Failed to save</span>
            </button>
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

      {/* Enable/Disable */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div>
            <h4 className="text-sm font-medium text-white">Call Escalation</h4>
            <p className="text-xs text-zinc-600">
              Allow calls to be transferred to human agents
            </p>
          </div>
          <button
            onClick={() => updateSettings({ escalation_enabled: !enabled })}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              enabled ? "bg-indigo-600" : "bg-zinc-700",
            )}
          >
            <div
              className={cn(
                "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                enabled && "translate-x-5",
              )}
            />
          </button>
        </div>
      </section>

      {enabled && (
        <>
          {/* Fallback Contact */}
          <section className="space-y-4">
            <div className="border-b border-zinc-800 pb-2">
              <h4 className="text-sm font-medium text-white">
                Fallback Contact
              </h4>
              <p className="text-xs text-zinc-600">
                Where to route calls when AI cannot help
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Phone Number</Label>
              <div className="relative">
                <PhoneForwarded className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={phone}
                  onChange={(e) =>
                    updateSettings({
                      escalation_phone: e.target.value || undefined,
                    })
                  }
                  placeholder="+1 (555) 123-4567"
                  className="border-zinc-800 bg-zinc-950 pl-9 text-white"
                />
              </div>
            </div>
          </section>

          {/* Escalation Triggers */}
          <section className="space-y-4">
            <div className="border-b border-zinc-800 pb-2">
              <h4 className="text-sm font-medium text-white">
                Escalation Triggers
              </h4>
              <p className="text-xs text-zinc-600">
                Keywords or phrases that trigger escalation to a human
              </p>
            </div>

            {/* Add new trigger */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <AlertTriangle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  onKeyDown={handleTriggerKeyDown}
                  placeholder='e.g. "speak to a manager"'
                  className="border-zinc-800 bg-zinc-950 pl-9 text-white"
                />
              </div>
              <Button
                onClick={addTrigger}
                disabled={!newTrigger.trim()}
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>

            {/* Trigger list */}
            <div className="space-y-2">
              {triggers.map((trigger, index) => (
                <div
                  key={`${trigger}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                      <AlertTriangle className="h-4 w-4 text-zinc-400" />
                    </div>
                    <span className="text-sm text-white">{trigger}</span>
                  </div>
                  <button
                    onClick={() => removeTrigger(index)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {triggers.length === 0 && (
                <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center">
                  <p className="text-sm text-zinc-500">
                    No escalation triggers configured
                  </p>
                  <p className="text-xs text-zinc-600">
                    Add trigger phrases that will cause the AI to transfer the
                    call
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Info */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <PhoneForwarded className="mt-0.5 h-4 w-4 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-400">
              How escalation works
            </p>
            <p className="text-xs text-zinc-400">
              When a trigger condition is met, the AI will gracefully hand off
              the call based on the configured action. For transfers, the caller
              will be connected to your fallback number. For messages, the AI
              will take detailed notes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
