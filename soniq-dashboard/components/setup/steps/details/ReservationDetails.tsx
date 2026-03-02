"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ReservationDetailsProps {
  data: Record<string, unknown>;
  onChange: (details: Record<string, unknown>) => void;
}

const ACCOMMODATIONS = [
  { id: "outdoor", label: "Outdoor seating" },
  { id: "high_chair", label: "High chairs available" },
  { id: "wheelchair", label: "Wheelchair accessible" },
  { id: "private_room", label: "Private rooms" },
];

export function ReservationDetails({
  data,
  onChange,
}: ReservationDetailsProps) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  const toggleAccommodation = (id: string) => {
    const current = (data.accommodations as string[]) || [];
    const updated = current.includes(id)
      ? current.filter((a) => a !== id)
      : [...current, id];
    updateField("accommodations", updated);
  };

  return (
    <div className="space-y-6">
      {/* Max party size */}
      <div className="space-y-2">
        <Label htmlFor="max-party">Maximum party size</Label>
        <Input
          id="max-party"
          type="number"
          min="1"
          max="100"
          placeholder="12"
          value={(data.maxPartySize as number) || ""}
          onChange={(e) =>
            updateField("maxPartySize", parseInt(e.target.value) || "")
          }
        />
        <p className="text-xs text-muted-foreground">
          The largest group your assistant will accept reservations for
        </p>
      </div>

      {/* Reservation hours */}
      <div className="space-y-2">
        <Label>Reservation hours</Label>
        <div className="flex items-center gap-2">
          <Input
            type="time"
            value={(data.reservationOpenTime as string) || "11:00"}
            onChange={(e) => updateField("reservationOpenTime", e.target.value)}
            className="w-32"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="time"
            value={(data.reservationCloseTime as string) || "21:00"}
            onChange={(e) =>
              updateField("reservationCloseTime", e.target.value)
            }
            className="w-32"
          />
        </div>
      </div>

      {/* Deposit */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Require deposit</Label>
            <p className="text-xs text-muted-foreground">
              For large parties or special occasions
            </p>
          </div>
          <Switch
            checked={(data.depositRequired as boolean) || false}
            onCheckedChange={(checked) =>
              updateField("depositRequired", checked)
            }
          />
        </div>

        {Boolean(data.depositRequired) && (
          <div className="ml-4 space-y-2 border-l-2 pl-4">
            <Label htmlFor="deposit-amount">Deposit amount ($)</Label>
            <Input
              id="deposit-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="50.00"
              value={(data.depositAmount as number) || ""}
              onChange={(e) =>
                updateField("depositAmount", parseFloat(e.target.value) || "")
              }
              className="w-32"
            />
          </div>
        )}
      </div>

      {/* Accommodations */}
      <div className="space-y-3">
        <Label>Available accommodations</Label>
        <div className="grid grid-cols-2 gap-2">
          {ACCOMMODATIONS.map((acc) => {
            const isSelected = (
              (data.accommodations as string[]) || []
            ).includes(acc.id);
            return (
              <label
                key={acc.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleAccommodation(acc.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">{acc.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
