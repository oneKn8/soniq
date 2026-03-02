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
import { createContact, updateContact } from "@/lib/api";
import type {
  Contact,
  CreateContactInput,
  UpdateContactInput,
} from "@/types/crm";

// ============================================================================
// TYPES
// ============================================================================

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact;
  onSuccess?: (contact: Contact) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ContactForm({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: ContactFormProps) {
  const isEditing = !!contact;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    phone: "",
    email: "",
    first_name: "",
    last_name: "",
    company: "",
    notes: "",
  });

  // Reset form when opening/closing or when contact changes
  React.useEffect(() => {
    if (open) {
      if (contact) {
        setFormData({
          phone: contact.phone || "",
          email: contact.email || "",
          first_name: contact.first_name || "",
          last_name: contact.last_name || "",
          company: contact.company || "",
          notes: contact.notes || "",
        });
      } else {
        setFormData({
          phone: "",
          email: "",
          first_name: "",
          last_name: "",
          company: "",
          notes: "",
        });
      }
      setError(null);
    }
  }, [open, contact]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let result: Contact;

      if (isEditing && contact) {
        const input: UpdateContactInput = {
          email: formData.email || undefined,
          first_name: formData.first_name || undefined,
          last_name: formData.last_name || undefined,
          company: formData.company || undefined,
          notes: formData.notes || undefined,
        };
        result = await updateContact(contact.id, input);
      } else {
        if (!formData.phone) {
          throw new Error("Phone number is required");
        }
        const input: CreateContactInput = {
          phone: formData.phone,
          email: formData.email || undefined,
          first_name: formData.first_name || undefined,
          last_name: formData.last_name || undefined,
          company: formData.company || undefined,
          notes: formData.notes || undefined,
          source: "manual",
        };
        result = await createContact(input);
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
              {isEditing ? "Edit Contact" : "Add New Contact"}
            </ModalTitle>
            <ModalDescription>
              {isEditing
                ? "Update contact information"
                : "Add a new contact to your database"}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Phone (required for new) */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={handleChange}
                disabled={isEditing}
                required={!isEditing}
              />
              {isEditing && (
                <p className="text-xs text-zinc-500">
                  Phone number cannot be changed after creation
                </p>
              )}
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                placeholder="Acme Inc."
                value={formData.company}
                onChange={handleChange}
              />
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
              {isEditing ? "Save Changes" : "Add Contact"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
