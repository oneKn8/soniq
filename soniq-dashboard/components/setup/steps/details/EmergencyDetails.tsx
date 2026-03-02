"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface EmergencyDetailsProps {
  data: Record<string, unknown>;
  onChange: (details: Record<string, unknown>) => void;
}

const EMERGENCY_CRITERIA = [
  { id: "severe_pain", label: "Severe or sudden pain" },
  { id: "bleeding", label: "Uncontrolled bleeding" },
  { id: "breathing", label: "Difficulty breathing" },
  { id: "injury", label: "Serious injury" },
  { id: "unconscious", label: "Loss of consciousness" },
  { id: "chest_pain", label: "Chest pain" },
];

export function EmergencyDetails({ data, onChange }: EmergencyDetailsProps) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  const toggleCriteria = (id: string) => {
    const current = (data.emergencyCriteria as string[]) || [];
    const updated = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    updateField("emergencyCriteria", updated);
  };

  return (
    <div className="space-y-6">
      {/* Emergency criteria */}
      <div className="space-y-3">
        <Label>Emergency criteria</Label>
        <p className="text-xs text-muted-foreground">
          Situations that should trigger immediate escalation
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {EMERGENCY_CRITERIA.map((criteria) => {
            const isSelected = (
              (data.emergencyCriteria as string[]) || []
            ).includes(criteria.id);
            return (
              <label
                key={criteria.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCriteria(criteria.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">{criteria.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Custom criteria */}
      <div className="space-y-2">
        <Label htmlFor="custom-criteria">Additional emergency criteria</Label>
        <Textarea
          id="custom-criteria"
          placeholder="Describe any industry-specific emergencies..."
          value={(data.customEmergencyCriteria as string) || ""}
          onChange={(e) =>
            updateField("customEmergencyCriteria", e.target.value)
          }
          rows={2}
        />
      </div>

      {/* Emergency contact */}
      <div className="space-y-4">
        <Label>Emergency contact</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emergency-name" className="text-xs">
              Contact name
            </Label>
            <Input
              id="emergency-name"
              placeholder="Dr. Smith"
              value={(data.emergencyContactName as string) || ""}
              onChange={(e) =>
                updateField("emergencyContactName", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency-phone" className="text-xs">
              Phone number
            </Label>
            <Input
              id="emergency-phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={(data.emergencyContactPhone as string) || ""}
              onChange={(e) =>
                updateField("emergencyContactPhone", e.target.value)
              }
            />
          </div>
        </div>
      </div>

      {/* After-hours emergencies */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Handle after-hours emergencies</Label>
          <p className="text-xs text-muted-foreground">
            Escalate emergencies even outside business hours
          </p>
        </div>
        <Switch
          checked={(data.afterHoursEmergencies as boolean) ?? true}
          onCheckedChange={(checked) =>
            updateField("afterHoursEmergencies", checked)
          }
        />
      </div>

      {/* Emergency message */}
      <div className="space-y-2">
        <Label htmlFor="emergency-message">Emergency response message</Label>
        <Textarea
          id="emergency-message"
          placeholder="For life-threatening emergencies, please call 911 immediately. Otherwise, I'll connect you with our on-call staff..."
          value={(data.emergencyMessage as string) || ""}
          onChange={(e) => updateField("emergencyMessage", e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          What your assistant says when an emergency is detected
        </p>
      </div>
    </div>
  );
}
