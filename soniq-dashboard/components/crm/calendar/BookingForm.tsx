"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBooking, updateBooking, lookupByPhone } from "@/lib/api";
import { useIndustry } from "@/context/IndustryContext";
import type { Booking, Contact } from "@/types/crm";

// ============================================================================
// TYPES
// ============================================================================

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: Booking;
  initialDate?: string;
  initialTime?: string;
  onSuccess?: (booking: Booking) => void;
}

interface FormData {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  booking_type: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: string;
  notes: string;
}

const BOOKING_TYPES = [
  { value: "appointment", label: "Appointment" },
  { value: "consultation", label: "Consultation" },
  { value: "service", label: "Service" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

const DURATION_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function BookingForm({
  open,
  onOpenChange,
  booking,
  initialDate,
  initialTime,
  onSuccess,
}: BookingFormProps) {
  const { transactionLabel } = useIndustry();
  const isEditing = !!booking;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLookingUp, setIsLookingUp] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [linkedContact, setLinkedContact] = React.useState<Contact | null>(
    null,
  );

  const [formData, setFormData] = React.useState<FormData>({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    booking_type: "appointment",
    booking_date: "",
    booking_time: "",
    duration_minutes: "30",
    notes: "",
  });

  // Reset form when opening/closing or when booking changes
  React.useEffect(() => {
    if (open) {
      if (booking) {
        setFormData({
          customer_name: booking.customer_name || "",
          customer_phone: booking.customer_phone || "",
          customer_email: booking.customer_email || "",
          booking_type: booking.booking_type || "appointment",
          booking_date: booking.booking_date || "",
          booking_time: booking.booking_time || "",
          duration_minutes: String(booking.duration_minutes || 30),
          notes: booking.notes || "",
        });
      } else {
        // For new booking, use initial date/time if provided
        const today = new Date().toISOString().split("T")[0];
        setFormData({
          customer_name: "",
          customer_phone: "",
          customer_email: "",
          booking_type: "appointment",
          booking_date: initialDate || today,
          booking_time: initialTime || "09:00",
          duration_minutes: "30",
          notes: "",
        });
      }
      setError(null);
      setLinkedContact(null);
    }
  }, [open, booking, initialDate, initialTime]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Look up contact by phone number
  const handlePhoneLookup = async () => {
    if (!formData.customer_phone || formData.customer_phone.length < 10) {
      return;
    }

    setIsLookingUp(true);
    try {
      const result = await lookupByPhone(formData.customer_phone);
      if (result.found && result.contact) {
        const contact = result.contact;
        setLinkedContact(contact);
        // Auto-fill name and email from contact
        setFormData((prev) => ({
          ...prev,
          customer_name:
            contact.name ||
            `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
            prev.customer_name,
          customer_email: contact.email || prev.customer_email,
        }));
      } else {
        setLinkedContact(null);
      }
    } catch {
      // Contact not found - that's okay
      setLinkedContact(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.customer_name.trim()) {
        throw new Error("Customer name is required");
      }
      if (!formData.customer_phone.trim()) {
        throw new Error("Customer phone is required");
      }
      if (!formData.booking_date) {
        throw new Error("Booking date is required");
      }
      if (!formData.booking_time) {
        throw new Error("Booking time is required");
      }

      let result: Booking;

      if (isEditing && booking) {
        result = await updateBooking(booking.id, {
          customer_name: formData.customer_name,
          customer_email: formData.customer_email || undefined,
          booking_type: formData.booking_type,
          booking_date: formData.booking_date,
          booking_time: formData.booking_time,
          duration_minutes: parseInt(formData.duration_minutes, 10),
          notes: formData.notes || undefined,
        });
      } else {
        result = await createBooking({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email || undefined,
          booking_type: formData.booking_type,
          booking_date: formData.booking_date,
          booking_time: formData.booking_time,
          duration_minutes: parseInt(formData.duration_minutes, 10),
          notes: formData.notes || undefined,
          contact_id: linkedContact?.id,
          source: "manual",
        });
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
              {isEditing
                ? `Edit ${transactionLabel}`
                : `New ${transactionLabel}`}
            </ModalTitle>
            <ModalDescription>
              {isEditing
                ? `Update ${transactionLabel.toLowerCase()} details`
                : `Create a new ${transactionLabel.toLowerCase()} manually`}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {linkedContact && (
              <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
                Linked to contact: {linkedContact.name || linkedContact.phone}
              </div>
            )}

            {/* Customer Phone */}
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Phone Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="customer_phone"
                  name="customer_phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  disabled={isEditing}
                  required
                  className="flex-1"
                />
                {!isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handlePhoneLookup}
                    disabled={isLookingUp}
                    title="Look up contact"
                  >
                    {isLookingUp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                name="customer_name"
                placeholder="John Doe"
                value={formData.customer_name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Customer Email */}
            <div className="space-y-2">
              <Label htmlFor="customer_email">Email</Label>
              <Input
                id="customer_email"
                name="customer_email"
                type="email"
                placeholder="john@example.com"
                value={formData.customer_email}
                onChange={handleChange}
              />
            </div>

            {/* Booking Type */}
            <div className="space-y-2">
              <Label htmlFor="booking_type">{transactionLabel} Type *</Label>
              <Select
                value={formData.booking_type}
                onValueChange={(v) => handleSelectChange("booking_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booking_date">Date *</Label>
                <Input
                  id="booking_date"
                  name="booking_date"
                  type="date"
                  value={formData.booking_date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking_time">Time *</Label>
                <Input
                  id="booking_time"
                  name="booking_time"
                  type="time"
                  value={formData.booking_time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration</Label>
              <Select
                value={formData.duration_minutes}
                onValueChange={(v) => handleSelectChange("duration_minutes", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Add any additional notes..."
                value={formData.notes}
                onChange={handleChange}
                rows={3}
              />
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
              {isEditing ? "Save Changes" : `Create ${transactionLabel}`}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
