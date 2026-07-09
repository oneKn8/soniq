// Soniq - Universal Capabilities
// One flat set of capabilities shared by every tenant. There is no
// per-industry capability menu. Order/request taking is OFF by default.

import type { CapabilityDefinition } from "@/types";

export type CapabilityId =
  | "appointment_booking"
  | "order_taking"
  | "faq"
  | "call_transfer"
  | "voicemail"
  | "callbacks";

// ============================================================================
// UNIVERSAL CAPABILITY DEFINITIONS
// ============================================================================

export const UNIVERSAL_CAPABILITY_DEFS: CapabilityDefinition[] = [
  {
    id: "appointment_booking",
    label: "Appointment Booking",
    description: "Schedule, reschedule, and cancel appointments or bookings",
    icon: "calendar-check",
    category: "core",
    questions: [
      {
        id: "services",
        label: "What can callers book?",
        type: "textarea",
        required: false,
        placeholder: "e.g., Consultation, Service visit, Table, Room",
      },
      {
        id: "default_duration",
        label: "Default booking duration",
        type: "select",
        required: false,
        options: [
          { value: "15", label: "15 minutes" },
          { value: "30", label: "30 minutes" },
          { value: "45", label: "45 minutes" },
          { value: "60", label: "1 hour" },
          { value: "90", label: "1.5 hours" },
        ],
      },
    ],
  },
  {
    id: "order_taking",
    label: "Order / Request Taking",
    description: "Capture orders or service requests from callers",
    icon: "package",
    category: "core",
    questions: [
      {
        id: "fulfillment",
        label: "How are orders/requests fulfilled?",
        type: "multiselect",
        required: false,
        options: [
          { value: "pickup", label: "Pickup" },
          { value: "delivery", label: "Delivery" },
          { value: "onsite", label: "On-site" },
          { value: "none", label: "No fulfillment step" },
        ],
      },
    ],
  },
  {
    id: "faq",
    label: "FAQ & Knowledge",
    description: "Answer common questions about your business",
    icon: "help-circle",
    category: "communication",
    questions: [
      {
        id: "common_questions",
        label: "What do callers ask most often?",
        type: "textarea",
        required: false,
        placeholder:
          "List common questions - we'll help your assistant answer them",
      },
      {
        id: "policies",
        label: "Important policies",
        type: "textarea",
        required: false,
        placeholder: "e.g., Cancellation policy, payment terms, refund policy",
      },
    ],
  },
  {
    id: "call_transfer",
    label: "Call Transfer / Escalation",
    description: "Route callers to a human when needed",
    icon: "phone-forwarded",
    category: "communication",
    questions: [],
  },
  {
    id: "voicemail",
    label: "Voicemail",
    description: "Capture a message when no one is available",
    icon: "voicemail",
    category: "communication",
    questions: [],
  },
  {
    id: "callbacks",
    label: "Callbacks",
    description: "Collect caller details for a callback",
    icon: "phone-call",
    category: "communication",
    questions: [
      {
        id: "callback_promise",
        label: "Callback timeframe",
        type: "select",
        required: false,
        options: [
          { value: "asap", label: "As soon as possible" },
          { value: "1hour", label: "Within 1 hour" },
          { value: "same_day", label: "Same business day" },
          { value: "24hours", label: "Within 24 hours" },
          { value: "none", label: "Don't promise specific timeframe" },
        ],
      },
    ],
  },
];

// Default-enabled capabilities the setup wizard writes for a new tenant
// (everything except order_taking).
const DEFAULT_CAPABILITY_IDS: string[] = [
  "appointment_booking",
  "faq",
  "call_transfer",
  "voicemail",
  "callbacks",
];

// ============================================================================
// HELPERS
// ============================================================================

export function getUniversalCapabilities(): CapabilityDefinition[] {
  return UNIVERSAL_CAPABILITY_DEFS;
}

export function getDefaultCapabilities(): string[] {
  return [...DEFAULT_CAPABILITY_IDS];
}

export function getCapabilityById(
  capabilityId: string,
): CapabilityDefinition | undefined {
  return UNIVERSAL_CAPABILITY_DEFS.find((c) => c.id === capabilityId);
}
