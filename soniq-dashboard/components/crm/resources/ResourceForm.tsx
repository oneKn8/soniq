"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal";
import { createResource, updateResource } from "@/lib/api";
import type {
  Resource,
  ResourceType,
  CreateResourceInput,
  UpdateResourceInput,
} from "@/types/crm";

// ============================================================================
// TYPES
// ============================================================================

interface ResourceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: Resource;
  onSuccess?: (resource: Resource) => void;
}

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: "staff", label: "Staff Member" },
  { value: "room", label: "Room" },
  { value: "equipment", label: "Equipment" },
  { value: "service", label: "Service" },
  { value: "other", label: "Other" },
];

const COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ResourceForm({
  open,
  onOpenChange,
  resource,
  onSuccess,
}: ResourceFormProps) {
  const isEditing = !!resource;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    name: "",
    type: "staff" as ResourceType,
    description: "",
    capacity: 1,
    default_duration_minutes: 60,
    accepts_bookings: true,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    color: COLORS[0],
  });

  // Reset form when opening/closing or when resource changes
  React.useEffect(() => {
    if (open) {
      if (resource) {
        setFormData({
          name: resource.name,
          type: resource.type,
          description: resource.description || "",
          capacity: resource.capacity,
          default_duration_minutes: resource.default_duration_minutes,
          accepts_bookings: resource.accepts_bookings,
          buffer_before_minutes: resource.buffer_before_minutes,
          buffer_after_minutes: resource.buffer_after_minutes,
          color: resource.color || COLORS[0],
        });
      } else {
        setFormData({
          name: "",
          type: "staff",
          description: "",
          capacity: 1,
          default_duration_minutes: 60,
          accepts_bookings: true,
          buffer_before_minutes: 0,
          buffer_after_minutes: 0,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
      setError(null);
    }
  }, [open, resource]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value) || 0 : value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let result: Resource;

      if (isEditing && resource) {
        const input: UpdateResourceInput = {
          name: formData.name,
          type: formData.type,
          description: formData.description || undefined,
          capacity: formData.capacity,
          default_duration_minutes: formData.default_duration_minutes,
          accepts_bookings: formData.accepts_bookings,
          buffer_before_minutes: formData.buffer_before_minutes,
          buffer_after_minutes: formData.buffer_after_minutes,
          color: formData.color,
        };
        result = await updateResource(resource.id, input);
      } else {
        if (!formData.name) {
          throw new Error("Name is required");
        }
        const input: CreateResourceInput = {
          name: formData.name,
          type: formData.type,
          description: formData.description || undefined,
          capacity: formData.capacity,
          default_duration_minutes: formData.default_duration_minutes,
          accepts_bookings: formData.accepts_bookings,
          buffer_before_minutes: formData.buffer_before_minutes,
          buffer_after_minutes: formData.buffer_after_minutes,
          color: formData.color,
        };
        result = await createResource(input);
      }

      onSuccess?.(result);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>
              {isEditing ? "Edit Resource" : "Add New Resource"}
            </ModalTitle>
            <ModalDescription>
              {isEditing
                ? "Update resource information"
                : "Create a new bookable resource"}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., John Smith, Room A, Projector"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Optional description..."
                value={formData.description}
                onChange={handleChange}
                rows={2}
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${
                      formData.color === color
                        ? "border-white scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            {/* Duration & Capacity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_duration_minutes">
                  Default Duration (minutes)
                </Label>
                <Input
                  id="default_duration_minutes"
                  name="default_duration_minutes"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.default_duration_minutes}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Buffers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buffer_before_minutes">
                  Buffer Before (minutes)
                </Label>
                <Input
                  id="buffer_before_minutes"
                  name="buffer_before_minutes"
                  type="number"
                  min="0"
                  step="5"
                  value={formData.buffer_before_minutes}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buffer_after_minutes">
                  Buffer After (minutes)
                </Label>
                <Input
                  id="buffer_after_minutes"
                  name="buffer_after_minutes"
                  type="number"
                  min="0"
                  step="5"
                  value={formData.buffer_after_minutes}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Accepts Bookings */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="accepts_bookings"
                name="accepts_bookings"
                checked={formData.accepts_bookings}
                onChange={handleCheckboxChange}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
              />
              <Label htmlFor="accepts_bookings" className="cursor-pointer">
                Available for bookings
              </Label>
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Save Changes" : "Add Resource"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
