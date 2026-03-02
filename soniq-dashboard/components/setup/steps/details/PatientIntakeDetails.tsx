"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface PatientIntakeDetailsProps {
  data: Record<string, unknown>;
  onChange: (details: Record<string, unknown>) => void;
}

const REQUIRED_FIELDS = [
  { id: "name", label: "Full name" },
  { id: "dob", label: "Date of birth" },
  { id: "phone", label: "Phone number" },
  { id: "insurance", label: "Insurance information" },
  { id: "reason", label: "Reason for visit" },
  { id: "medications", label: "Current medications" },
  { id: "allergies", label: "Allergies" },
];

export function PatientIntakeDetails({
  data,
  onChange,
}: PatientIntakeDetailsProps) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  const toggleRequiredField = (id: string) => {
    const current = (data.requiredFields as string[]) || [
      "name",
      "phone",
      "dob",
    ];
    const updated = current.includes(id)
      ? current.filter((f) => f !== id)
      : [...current, id];
    updateField("requiredFields", updated);
  };

  return (
    <div className="space-y-6">
      {/* Required patient information */}
      <div className="space-y-3">
        <Label>Required patient information</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {REQUIRED_FIELDS.map((field) => {
            const isSelected = (
              (data.requiredFields as string[]) || ["name", "phone", "dob"]
            ).includes(field.id);
            return (
              <label
                key={field.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleRequiredField(field.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">{field.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Insurance accepted */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Accepts most insurance</Label>
            <p className="text-xs text-muted-foreground">
              Assistant will say &quot;We accept most major insurance
              plans&quot;
            </p>
          </div>
          <Switch
            checked={(data.acceptsMostInsurance as boolean) ?? true}
            onCheckedChange={(checked) =>
              updateField("acceptsMostInsurance", checked)
            }
          />
        </div>

        {!data.acceptsMostInsurance && (
          <div className="ml-4 space-y-2 border-l-2 pl-4">
            <Label htmlFor="insurance-list">Insurance plans accepted</Label>
            <Input
              id="insurance-list"
              placeholder="Blue Cross, Aetna, United Healthcare..."
              value={(data.insuranceAccepted as string) || ""}
              onChange={(e) => updateField("insuranceAccepted", e.target.value)}
            />
          </div>
        )}
      </div>

      {/* New patient notes */}
      <div className="space-y-2">
        <Label htmlFor="new-patient-notes">New patient information</Label>
        <Textarea
          id="new-patient-notes"
          placeholder="Please arrive 15 minutes early for paperwork. Bring your insurance card and photo ID..."
          value={(data.newPatientNotes as string) || ""}
          onChange={(e) => updateField("newPatientNotes", e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Instructions your assistant will share with new patients
        </p>
      </div>

      {/* Same-day appointments */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Same-day appointments available</Label>
          <p className="text-xs text-muted-foreground">
            For urgent cases when scheduling
          </p>
        </div>
        <Switch
          checked={(data.sameDayAvailable as boolean) ?? false}
          onCheckedChange={(checked) =>
            updateField("sameDayAvailable", checked)
          }
        />
      </div>
    </div>
  );
}
