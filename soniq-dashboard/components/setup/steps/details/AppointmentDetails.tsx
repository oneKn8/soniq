"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface AppointmentDetailsProps {
  data: Record<string, unknown>;
  onChange: (details: Record<string, unknown>) => void;
}

const DURATION_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
];

const REQUIRED_INFO_OPTIONS = [
  { id: "name", label: "Name" },
  { id: "phone", label: "Phone number" },
  { id: "email", label: "Email" },
  { id: "reason", label: "Reason for visit" },
];

export function AppointmentDetails({
  data,
  onChange,
}: AppointmentDetailsProps) {
  const [newService, setNewService] = useState("");

  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  const addService = () => {
    if (!newService.trim()) return;
    const current = (data.services as string[]) || [];
    if (!current.includes(newService.trim())) {
      updateField("services", [...current, newService.trim()]);
    }
    setNewService("");
  };

  const removeService = (service: string) => {
    const current = (data.services as string[]) || [];
    updateField(
      "services",
      current.filter((s) => s !== service),
    );
  };

  const toggleRequiredInfo = (id: string) => {
    const current = (data.requiredInfo as string[]) || ["name", "phone"];
    const updated = current.includes(id)
      ? current.filter((i) => i !== id)
      : [...current, id];
    updateField("requiredInfo", updated);
  };

  return (
    <div className="space-y-6">
      {/* Services offered */}
      <div className="space-y-3">
        <Label>Services offered</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a service (e.g., Consultation, Checkup)"
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addService();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addService}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {((data.services as string[]) || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {((data.services as string[]) || []).map((service) => (
              <span
                key={service}
                className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm"
              >
                {service}
                <button
                  type="button"
                  onClick={() => removeService(service)}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Appointment duration */}
      <div className="space-y-2">
        <Label htmlFor="duration">Default appointment duration</Label>
        <select
          id="duration"
          value={(data.defaultDuration as string) || "30"}
          onChange={(e) => updateField("defaultDuration", e.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Ask if new client */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Ask if new or returning client</Label>
          <p className="text-xs text-muted-foreground">
            Helps prepare for first-time clients
          </p>
        </div>
        <Switch
          checked={(data.askIfNewClient as boolean) ?? true}
          onCheckedChange={(checked) => updateField("askIfNewClient", checked)}
        />
      </div>

      {/* Required info */}
      <div className="space-y-3">
        <Label>Required information from callers</Label>
        <div className="grid grid-cols-2 gap-2">
          {REQUIRED_INFO_OPTIONS.map((info) => {
            const isSelected = (
              (data.requiredInfo as string[]) || ["name", "phone"]
            ).includes(info.id);
            return (
              <label
                key={info.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleRequiredInfo(info.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">{info.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
