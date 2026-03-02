"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { get, put, post, del } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  X,
  GripVertical,
  User,
  Loader2,
  Trash2,
  Edit2,
  Check,
} from "lucide-react";
import Link from "next/link";
import type {
  EscalationContact,
  TransferType,
  NoAnswerBehavior,
  ContactAvailability,
} from "@/types";

// Aceternity & MagicUI components
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";
import { SpotlightNew } from "@/components/aceternity/spotlight";
import { ShimmerButton } from "@/components/magicui/shimmer-button";

const DEFAULT_TRIGGERS = [
  { id: "caller_asks_for_person", label: "Caller asks for a person" },
  { id: "caller_frustrated", label: "Caller sounds frustrated or angry" },
  { id: "caller_emergency", label: "Caller mentions emergency" },
  { id: "caller_complaint", label: "Caller wants to make a complaint" },
  {
    id: "caller_unknown_question",
    label: "Caller asks something assistant doesn't know",
  },
  { id: "payment_billing", label: "Payment or billing questions" },
];

const TRANSFER_OPTIONS: {
  value: TransferType;
  label: string;
  description: string;
  recommended?: boolean;
}[] = [
  {
    value: "warm",
    label: "Warm transfer",
    description: "Assistant introduces caller to human before connecting",
    recommended: true,
  },
  {
    value: "cold",
    label: "Cold transfer",
    description: "Direct connection, assistant hangs up immediately",
  },
  {
    value: "callback",
    label: "Callback request",
    description: "Take caller info, human calls back later",
  },
];

const NO_ANSWER_OPTIONS: {
  value: NoAnswerBehavior;
  label: string;
  description: string;
}[] = [
  {
    value: "next_contact",
    label: "Try next contact on list",
    description: "Automatically try the next available person",
  },
  {
    value: "message",
    label: "Take a message",
    description: "Collect contact info and message for callback",
  },
  {
    value: "retry",
    label: "Offer to try again later",
    description: "Ask caller if they want a callback",
  },
  {
    value: "voicemail",
    label: "Send to voicemail",
    description: "Let caller leave a voice message",
  },
];

const AVAILABILITY_OPTIONS = [
  { value: "business_hours", label: "Business hours only" },
  { value: "always", label: "Always available" },
  { value: "custom", label: "Custom schedule" },
];

interface EscalationSettings {
  contacts: EscalationContact[];
  triggers: string[];
  customTriggers: string[];
  transferBehavior: {
    type: TransferType;
    no_answer: NoAnswerBehavior;
  };
}

interface EscalationTriggersResponse {
  enabled: boolean;
  triggers: string[];
  customTriggers: string[];
  transfer_behavior: {
    type: TransferType;
    no_answer: NoAnswerBehavior;
  };
}

export default function EscalationSettingsPage() {
  const { currentTenant, refreshTenants } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTriggerInput, setCustomTriggerInput] = useState("");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [deletedContactIds, setDeletedContactIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<EscalationSettings>({
    contacts: [],
    triggers: [],
    customTriggers: [],
    transferBehavior: {
      type: "warm",
      no_answer: "next_contact",
    },
  });

  useEffect(() => {
    const loadData = async () => {
      if (!currentTenant) return;

      try {
        const [contactsData, triggersData] = await Promise.all([
          get<{ contacts: EscalationContact[] }>("/api/escalation/contacts"),
          get<EscalationTriggersResponse>("/api/escalation/triggers"),
        ]);

        setFormData({
          contacts: contactsData.contacts || [],
          triggers: triggersData.triggers || [],
          customTriggers: triggersData.customTriggers || [],
          transferBehavior: triggersData.transfer_behavior || {
            type: "warm",
            no_answer: "next_contact",
          },
        });
        setDeletedContactIds([]);
      } catch (err) {
        // Use defaults if API fails
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenantData = currentTenant as Record<string, any>;
        setFormData({
          contacts: [],
          triggers: tenantData.escalation_triggers || [],
          customTriggers: [],
          transferBehavior: tenantData.transfer_behavior || {
            type: "warm",
            no_answer: "next_contact",
          },
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentTenant]);

  const addContact = () => {
    const newContact: EscalationContact = {
      id: `temp_${Date.now()}`,
      tenant_id: currentTenant?.id || "",
      name: "",
      phone: "",
      role: "",
      is_primary: formData.contacts.length === 0,
      availability: "business_hours",
      sort_order: formData.contacts.length,
      created_at: new Date().toISOString(),
    };
    setFormData((prev) => ({
      ...prev,
      contacts: [...prev.contacts, newContact],
    }));
    setEditingContactId(newContact.id);
    setSaveSuccess(false);
    setError(null);
  };

  const updateContact = (
    id: string,
    field: keyof EscalationContact,
    value: unknown,
  ) => {
    setFormData((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) =>
        c.id === id ? { ...c, [field]: value } : c,
      ),
    }));
    setSaveSuccess(false);
    setError(null);
  };

  const removeContact = (id: string) => {
    if (!id.startsWith("temp_")) {
      setDeletedContactIds((prev) => [...prev, id]);
    }

    setFormData((prev) => {
      const updated = prev.contacts.filter((c) => c.id !== id);
      // Update is_primary if needed
      if (updated.length > 0 && !updated.some((c) => c.is_primary)) {
        updated[0].is_primary = true;
      }
      return { ...prev, contacts: updated };
    });
    setSaveSuccess(false);
    setError(null);
  };

  const toggleTrigger = (triggerId: string) => {
    setFormData((prev) => ({
      ...prev,
      triggers: prev.triggers.includes(triggerId)
        ? prev.triggers.filter((t) => t !== triggerId)
        : [...prev.triggers, triggerId],
    }));
    setSaveSuccess(false);
    setError(null);
  };

  const addCustomTrigger = () => {
    if (!customTriggerInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      customTriggers: [...prev.customTriggers, customTriggerInput.trim()],
    }));
    setCustomTriggerInput("");
    setSaveSuccess(false);
    setError(null);
  };

  const removeCustomTrigger = (trigger: string) => {
    setFormData((prev) => ({
      ...prev,
      customTriggers: prev.customTriggers.filter((t) => t !== trigger),
    }));
    setSaveSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      for (const contactId of deletedContactIds) {
        await del(`/api/escalation/contacts/${contactId}`);
      }

      // Save contacts
      for (const contact of formData.contacts) {
        if (contact.id.startsWith("temp_")) {
          // Create new contact
          await post("/api/escalation/contacts", {
            name: contact.name,
            phone: contact.phone,
            role: contact.role,
            is_primary: contact.is_primary,
            availability: contact.availability,
            sort_order: contact.sort_order,
          });
        } else {
          // Update existing contact
          await put(`/api/escalation/contacts/${contact.id}`, {
            name: contact.name,
            phone: contact.phone,
            role: contact.role,
            is_primary: contact.is_primary,
            availability: contact.availability,
            sort_order: contact.sort_order,
          });
        }
      }

      // Save triggers and transfer behavior
      await put("/api/escalation/triggers", {
        enabled: formData.contacts.length > 0,
        triggers: [...formData.triggers, ...formData.customTriggers],
        transfer_behavior: formData.transferBehavior,
      });

      await refreshTenants();
      setDeletedContactIds([]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <SpotlightNew className="opacity-20" />

        {/* Header */}
        <div className="relative z-10">
          <Link
            href="/settings"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          <TextGenerateEffect
            words="Escalation Settings"
            className="text-2xl font-semibold text-foreground md:text-3xl"
            duration={0.3}
          />
          <p className="mt-2 text-muted-foreground">
            Configure when and how calls are transferred to your team
          </p>
        </div>

        {/* Contacts */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Escalation Contacts</Label>
            <Button variant="outline" size="sm" onClick={addContact}>
              <Plus className="mr-1 h-4 w-4" />
              Add contact
            </Button>
          </div>

          {formData.contacts.length === 0 ? (
            <button
              type="button"
              onClick={addContact}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Plus className="h-6 w-6" />
              </div>
              <span className="font-medium">Add your first contact</span>
              <span className="text-sm">
                Someone to call when help is needed
              </span>
            </button>
          ) : (
            <div className="space-y-4">
              {formData.contacts.map((contact) => {
                const isEditing = editingContactId === contact.id;

                return (
                  <div
                    key={contact.id}
                    className={cn(
                      "rounded-lg border p-4",
                      contact.is_primary && "border-primary/50 bg-primary/5",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" />
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4" />
                        </div>
                        {contact.is_primary && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => setEditingContactId(contact.id)}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => setEditingContactId(null)}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeContact(contact.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`name-${contact.id}`}
                            className="text-xs"
                          >
                            Name
                          </Label>
                          <Input
                            id={`name-${contact.id}`}
                            placeholder="John Smith"
                            value={contact.name}
                            onChange={(e) =>
                              updateContact(contact.id, "name", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`phone-${contact.id}`}
                            className="text-xs"
                          >
                            Phone
                          </Label>
                          <Input
                            id={`phone-${contact.id}`}
                            type="tel"
                            placeholder="(555) 123-4567"
                            value={contact.phone}
                            onChange={(e) =>
                              updateContact(contact.id, "phone", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`role-${contact.id}`}
                            className="text-xs"
                          >
                            Role (optional)
                          </Label>
                          <Input
                            id={`role-${contact.id}`}
                            placeholder="Manager"
                            value={contact.role || ""}
                            onChange={(e) =>
                              updateContact(contact.id, "role", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`availability-${contact.id}`}
                            className="text-xs"
                          >
                            Availability
                          </Label>
                          <select
                            id={`availability-${contact.id}`}
                            value={contact.availability}
                            onChange={(e) =>
                              updateContact(
                                contact.id,
                                "availability",
                                e.target.value as ContactAvailability,
                              )
                            }
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                          >
                            {AVAILABILITY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <div>
                          <p className="text-sm font-medium">
                            {contact.name || "No name"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {contact.role || "No role"}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-sm">
                            {contact.phone || "No phone"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {AVAILABILITY_OPTIONS.find(
                              (o) => o.value === contact.availability,
                            )?.label || contact.availability}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Escalation triggers */}
        <div className="relative z-10 space-y-4">
          <Label>When to Escalate</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEFAULT_TRIGGERS.map((trigger) => {
              const isSelected = formData.triggers.includes(trigger.id);
              return (
                <label
                  key={trigger.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTrigger(trigger.id)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">{trigger.label}</span>
                </label>
              );
            })}
          </div>

          {/* Custom triggers */}
          <div className="space-y-2">
            <Label className="text-xs">Custom triggers</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a custom escalation phrase..."
                value={customTriggerInput}
                onChange={(e) => setCustomTriggerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTrigger();
                  }
                }}
              />
              <Button variant="outline" onClick={addCustomTrigger}>
                Add
              </Button>
            </div>
            {formData.customTriggers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.customTriggers.map((trigger) => (
                  <span
                    key={trigger}
                    className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                  >
                    {trigger}
                    <button
                      type="button"
                      onClick={() => removeCustomTrigger(trigger)}
                      className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transfer behavior */}
        <div className="relative z-10 space-y-3">
          <Label>Transfer Behavior</Label>
          <div className="space-y-2">
            {TRANSFER_OPTIONS.map((option) => {
              const isSelected =
                formData.transferBehavior.type === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-muted/50",
                    isSelected && "border-primary bg-primary/5",
                  )}
                >
                  <input
                    type="radio"
                    name="transferType"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => {
                      setFormData((prev) => ({
                        ...prev,
                        transferBehavior: {
                          ...prev.transferBehavior,
                          type: option.value,
                        },
                      }));
                      setSaveSuccess(false);
                      setError(null);
                    }}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{option.label}</span>
                      {option.recommended && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* If no answer */}
        <div className="relative z-10 space-y-3">
          <Label>If No One Answers</Label>
          <div className="space-y-2">
            {NO_ANSWER_OPTIONS.map((option) => {
              const isSelected =
                formData.transferBehavior.no_answer === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/50",
                    isSelected && "border-primary bg-primary/5",
                  )}
                >
                  <input
                    type="radio"
                    name="noAnswer"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => {
                      setFormData((prev) => ({
                        ...prev,
                        transferBehavior: {
                          ...prev.transferBehavior,
                          no_answer: option.value,
                        },
                      }));
                      setSaveSuccess(false);
                      setError(null);
                    }}
                    className="mt-0.5 h-4 w-4"
                  />
                  <div>
                    <span className="font-medium">{option.label}</span>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="relative z-10 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="relative z-10 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-600">
            Settings saved successfully
          </div>
        )}

        {/* Save button */}
        <div className="relative z-10 flex justify-end pt-4">
          <ShimmerButton
            onClick={handleSave}
            disabled={isSaving}
            shimmerColor="#ffffff"
            shimmerSize="0.05em"
            borderRadius="8px"
            background="hsl(var(--primary))"
            className="px-8 py-3 text-sm font-medium"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </ShimmerButton>
        </div>
      </div>
    </div>
  );
}
