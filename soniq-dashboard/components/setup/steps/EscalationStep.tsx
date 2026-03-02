"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, GripVertical, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSetup } from "../SetupContext";
import type {
  EscalationContact,
  TransferType,
  NoAnswerBehavior,
} from "@/types";

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

export function EscalationStep() {
  const router = useRouter();
  const { state, dispatch, saveStep, goToNextStep, goToPreviousStep } =
    useSetup();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customTriggerInput, setCustomTriggerInput] = useState("");

  const { contacts, triggers, customTriggers, transferBehavior } =
    state.escalationData;

  const canContinue = contacts.length > 0;

  const addContact = () => {
    const newContact: EscalationContact = {
      id: `contact_${Date.now()}`,
      tenant_id: state.tenantId || "",
      name: "",
      phone: "",
      role: "",
      is_primary: contacts.length === 0,
      availability: "business_hours",
      sort_order: contacts.length,
      created_at: new Date().toISOString(),
    };
    dispatch({
      type: "SET_ESCALATION_DATA",
      payload: { contacts: [...contacts, newContact] },
    });
  };

  const updateContact = (
    id: string,
    field: keyof EscalationContact,
    value: unknown,
  ) => {
    const updated = contacts.map((c) =>
      c.id === id ? { ...c, [field]: value } : c,
    );
    dispatch({
      type: "SET_ESCALATION_DATA",
      payload: { contacts: updated },
    });
  };

  const removeContact = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    // Update is_primary if needed
    if (updated.length > 0 && !updated.some((c) => c.is_primary)) {
      updated[0].is_primary = true;
    }
    dispatch({
      type: "SET_ESCALATION_DATA",
      payload: { contacts: updated },
    });
  };

  const toggleTrigger = (triggerId: string) => {
    const updated = triggers.includes(triggerId)
      ? triggers.filter((t) => t !== triggerId)
      : [...triggers, triggerId];
    dispatch({
      type: "SET_ESCALATION_DATA",
      payload: { triggers: updated },
    });
  };

  const addCustomTrigger = () => {
    if (!customTriggerInput.trim()) return;
    dispatch({
      type: "SET_ESCALATION_DATA",
      payload: {
        customTriggers: [...customTriggers, customTriggerInput.trim()],
      },
    });
    setCustomTriggerInput("");
  };

  const removeCustomTrigger = (trigger: string) => {
    dispatch({
      type: "SET_ESCALATION_DATA",
      payload: {
        customTriggers: customTriggers.filter((t) => t !== trigger),
      },
    });
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    setIsSubmitting(true);
    const success = await saveStep("escalation");
    if (success) {
      goToNextStep();
      router.push("/setup/review");
    }
    setIsSubmitting(false);
  };

  const handleBack = () => {
    goToPreviousStep();
    router.push("/setup/hours");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Sometimes callers need to speak with a person
        </h1>
        <p className="mt-2 text-muted-foreground">
          Set up who to contact when your assistant needs human help
        </p>
      </div>

      {/* Contacts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Escalation contacts</Label>
          {contacts.length > 0 && (
            <Button variant="outline" size="sm" onClick={addContact}>
              <Plus className="mr-1 h-4 w-4" />
              Add contact
            </Button>
          )}
        </div>

        {contacts.length === 0 ? (
          <button
            type="button"
            onClick={addContact}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plus className="h-6 w-6" />
            </div>
            <span className="font-medium">Add your first contact</span>
            <span className="text-sm">Someone to call when help is needed</span>
          </button>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
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
                  <button
                    type="button"
                    onClick={() => removeContact(contact.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${contact.id}`} className="text-xs">
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
                    <Label htmlFor={`phone-${contact.id}`} className="text-xs">
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
                    <Label htmlFor={`role-${contact.id}`} className="text-xs">
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
                          e.target.value,
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Escalation triggers */}
      <div className="space-y-4">
        <Label>When to escalate</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEFAULT_TRIGGERS.map((trigger) => {
            const isSelected = triggers.includes(trigger.id);
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
          {customTriggers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customTriggers.map((trigger) => (
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
      <div className="space-y-3">
        <Label>Transfer behavior</Label>
        <div className="space-y-2">
          {TRANSFER_OPTIONS.map((option) => {
            const isSelected = transferBehavior.type === option.value;
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
                  onChange={() =>
                    dispatch({
                      type: "SET_ESCALATION_DATA",
                      payload: {
                        transferBehavior: {
                          ...transferBehavior,
                          type: option.value,
                        },
                      },
                    })
                  }
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
      <div className="space-y-3">
        <Label>If no one answers</Label>
        <div className="space-y-2">
          {NO_ANSWER_OPTIONS.map((option) => {
            const isSelected = transferBehavior.no_answer === option.value;
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
                  onChange={() =>
                    dispatch({
                      type: "SET_ESCALATION_DATA",
                      payload: {
                        transferBehavior: {
                          ...transferBehavior,
                          no_answer: option.value,
                        },
                      },
                    })
                  }
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

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!canContinue || isSubmitting}
          size="lg"
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
