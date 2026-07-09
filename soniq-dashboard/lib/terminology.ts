// Soniq - Universal Terminology & Defaults
// Single source of truth for the fixed, industry-agnostic vocabulary,
// pipeline, task types, and default app configuration. There is no
// per-industry relabeling: every tenant uses the same universal labels.

import type {
  AppConfig,
  AgentPersonality,
  CustomResponses,
  FeatureFlags,
  GreetingConfig,
  IndustryTaskType,
  PipelineStageConfig,
  PricingConfig,
  VoiceConfig,
} from "@/types";

// ============================================================================
// UNIVERSAL TERMINOLOGY (frozen labels)
// ============================================================================

export const UNIVERSAL_TERMINOLOGY = {
  customer: "Customer",
  customerPlural: "Customers",
  booking: "Booking",
  bookingPlural: "Bookings",
  deal: "Deal",
  dealPlural: "Deals",
  task: "Task",
  taskPlural: "Tasks",
  availability: "Availability",
  revenue: "Revenue",
} as const;

// ============================================================================
// UNIVERSAL DEAL PIPELINE (one default stage set, tenant-overridable via JSONB)
// ============================================================================

export const UNIVERSAL_PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    id: "new",
    label: "New",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    isTerminal: false,
  },
  {
    id: "qualified",
    label: "Qualified",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    isTerminal: false,
  },
  {
    id: "won",
    label: "Won",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    isTerminal: true,
  },
  {
    id: "lost",
    label: "Lost",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    isTerminal: true,
  },
];

// ============================================================================
// UNIVERSAL TASK TYPES
// ============================================================================

export const UNIVERSAL_TASK_TYPES: IndustryTaskType[] = [
  { value: "follow_up", label: "Follow Up" },
  { value: "call_back", label: "Call Back" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "review", label: "Review" },
  { value: "custom", label: "Custom" },
];

// ============================================================================
// TERMINOLOGY HOOK
// ============================================================================
// Pure function (values are static). Keeps the same field names the previous
// terminology context exposed so existing destructures stay valid.

export interface TerminologyValue {
  customerLabel: string;
  customerPluralLabel: string;
  transactionLabel: string;
  transactionPluralLabel: string;
  dealLabel: string;
  dealPluralLabel: string;
  availabilityLabel: string;
  revenueLabel: string;
  pipelineStages: PipelineStageConfig[];
  taskTypes: IndustryTaskType[];
}

export function useTerminology(): TerminologyValue {
  return {
    customerLabel: UNIVERSAL_TERMINOLOGY.customer,
    customerPluralLabel: UNIVERSAL_TERMINOLOGY.customerPlural,
    transactionLabel: UNIVERSAL_TERMINOLOGY.booking,
    transactionPluralLabel: UNIVERSAL_TERMINOLOGY.bookingPlural,
    dealLabel: UNIVERSAL_TERMINOLOGY.deal,
    dealPluralLabel: UNIVERSAL_TERMINOLOGY.dealPlural,
    availabilityLabel: UNIVERSAL_TERMINOLOGY.availability,
    revenueLabel: UNIVERSAL_TERMINOLOGY.revenue,
    pipelineStages: UNIVERSAL_PIPELINE_STAGES,
    taskTypes: UNIVERSAL_TASK_TYPES,
  };
}

// ============================================================================
// DEFAULT CONFIGURATIONS (industry-agnostic)
// ============================================================================

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  provider: "openai",
  voiceId: "nova",
  voiceName: "Nova",
  speakingRate: 1.0,
  pitch: 1.0,
  language: "en-US",
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  smsConfirmations: true,
  emailNotifications: true,
  liveTransfer: true,
  voicemailFallback: true,
  sentimentAnalysis: false,
  recordingEnabled: true,
  transcriptionEnabled: true,
  callerIdLookup: false,
  multiLanguage: false,
};

export const DEFAULT_OPERATING_HOURS = {
  timezone: "America/New_York",
  schedule: [
    { day: 0 as const, enabled: false, openTime: "09:00", closeTime: "17:00" },
    { day: 1 as const, enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: 2 as const, enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: 3 as const, enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: 4 as const, enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: 5 as const, enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: 6 as const, enabled: false, openTime: "09:00", closeTime: "17:00" },
  ],
  holidays: [],
};

export const DEFAULT_PERSONALITY: AgentPersonality = {
  tone: "professional",
  verbosity: "balanced",
  empathy: "medium",
  humor: false,
};

export const DEFAULT_GREETINGS: GreetingConfig = {
  standard:
    "Thank you for calling {businessName}. This is {agentName}, how may I assist you today?",
  afterHours:
    "Thank you for calling {businessName}. We are currently closed. I can still help with some requests or take a message.",
  holiday:
    "Happy holidays from {businessName}! We are currently closed but I can still assist you.",
  busy: "Thank you for your patience. I'm {agentName} with {businessName}. How can I help you?",
  returning:
    "Welcome back! Thank you for calling {businessName} again. How can I help you today?",
};

export const DEFAULT_RESPONSES: CustomResponses = {
  notAvailable:
    "I apologize, but that is not available at this time. Is there anything else I can help you with?",
  transferring:
    "I'll transfer you to someone who can better assist you. Please hold for just a moment.",
  bookingConfirmed:
    "Great! Your booking has been confirmed. You'll receive a confirmation shortly.",
  bookingFailed:
    "I apologize, but I was unable to complete that booking. Would you like to try a different option?",
  goodbye: "Thank you for calling {businessName}. Have a great day!",
  holdMessage: "Thank you for holding. I'm still working on your request.",
  fallback:
    "I want to make sure I understand you correctly. Could you please rephrase that?",
};

const DEFAULT_PRICING: PricingConfig = {
  baseRate: 0,
  currency: "USD",
  taxRate: 0,
  fees: [],
};

// ============================================================================
// FACTORY
// ============================================================================

export function createDefaultConfig(
  userRole: "developer" | "admin" | "staff" = "developer",
): AppConfig {
  return {
    industry: "general",
    businessName: "",
    agentName: "Soniq",
    agentVoice: { ...DEFAULT_VOICE_CONFIG },
    agentPersonality: { ...DEFAULT_PERSONALITY },
    themeColor: "indigo",
    pricing: { ...DEFAULT_PRICING, fees: [] },
    operatingHours: { ...DEFAULT_OPERATING_HOURS },
    lateNightMode: {
      enabled: true,
      startTime: "22:00",
      endTime: "06:00",
      behavior: "full_service",
    },
    escalation: {
      enabled: true,
      triggers: [
        {
          id: "angry",
          condition: "sentiment < -0.5",
          action: "transfer",
          priority: "high",
        },
        {
          id: "emergency",
          condition: "intent === emergency",
          action: "transfer",
          priority: "critical",
        },
        {
          id: "complex",
          condition: "confidence < 0.6",
          action: "message",
          priority: "medium",
        },
      ],
      notifyOnEscalation: true,
      maxWaitTime: 60,
    },
    greetings: { ...DEFAULT_GREETINGS },
    responses: { ...DEFAULT_RESPONSES },
    faqs: [],
    features: { ...DEFAULT_FEATURE_FLAGS },
    userRole,
    isConfigured: false,
  };
}
