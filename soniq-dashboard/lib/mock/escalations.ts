// Mock escalation queue data

export type EscalationPriority = "urgent" | "high" | "normal" | "low";
export type EscalationStatus =
  | "waiting"
  | "in-progress"
  | "resolved"
  | "callback-scheduled";

export interface EscalationMessage {
  role: "ai" | "caller";
  content: string;
  timestamp: Date;
}

export interface MockEscalation {
  id: string;
  callId: string;
  contactId?: string;
  contactName?: string;
  phone: string;
  priority: EscalationPriority;
  status: EscalationStatus;
  reason: string;
  waitTime: number; // seconds
  startedAt: Date;
  assignedTo?: string;
  resolvedAt?: Date;
  conversation: EscalationMessage[];
  aiSummary: string;
  extractedIntents: string[];
  suggestedActions: string[];
  sentiment: "positive" | "neutral" | "negative" | "frustrated";
}

// Generate wait time based on priority
const getWaitTime = (priority: EscalationPriority): number => {
  switch (priority) {
    case "urgent":
      return Math.floor(Math.random() * 60) + 10; // 10-70 seconds
    case "high":
      return Math.floor(Math.random() * 120) + 60; // 1-3 minutes
    case "normal":
      return Math.floor(Math.random() * 300) + 120; // 2-7 minutes
    case "low":
      return Math.floor(Math.random() * 600) + 300; // 5-15 minutes
    default:
      return 180;
  }
};

// Mock escalation queue
export const MOCK_ESCALATIONS: MockEscalation[] = [
  {
    id: "esc1",
    callId: "call_active_1",
    contactId: "c2",
    contactName: "Sarah Johnson",
    phone: "+1 555-234-5678",
    priority: "high",
    status: "waiting",
    reason: "VIP customer requested human assistance",
    waitTime: getWaitTime("high"),
    startedAt: new Date(Date.now() - 1000 * 120),
    conversation: [
      {
        role: "ai",
        content: "Hello, thank you for calling. How can I help you today?",
        timestamp: new Date(Date.now() - 1000 * 180),
      },
      {
        role: "caller",
        content:
          "Hi, I've been a customer for 5 years and I have a billing question.",
        timestamp: new Date(Date.now() - 1000 * 165),
      },
      {
        role: "ai",
        content:
          "I'd be happy to help with your billing question. Can you tell me more about what you're seeing?",
        timestamp: new Date(Date.now() - 1000 * 150),
      },
      {
        role: "caller",
        content:
          "I was charged twice last month and I need to speak to someone who can fix this.",
        timestamp: new Date(Date.now() - 1000 * 135),
      },
      {
        role: "ai",
        content:
          "I understand. Let me connect you with a team member who can look into your billing right away.",
        timestamp: new Date(Date.now() - 1000 * 120),
      },
    ],
    aiSummary:
      "VIP customer (5 years) reporting duplicate charge on last month's bill. Caller is calm but wants immediate resolution. Requested human agent for billing correction.",
    extractedIntents: ["billing-issue", "duplicate-charge", "refund-request"],
    suggestedActions: [
      "Review billing history for duplicate charges",
      "Process refund if duplicate confirmed",
      "Offer loyalty credit for inconvenience",
    ],
    sentiment: "frustrated",
  },
  {
    id: "esc2",
    callId: "call_active_2",
    contactName: "Michael Brown",
    phone: "+1 555-345-6789",
    priority: "normal",
    status: "waiting",
    reason: "Complex scheduling request",
    waitTime: getWaitTime("normal"),
    startedAt: new Date(Date.now() - 1000 * 300),
    conversation: [
      {
        role: "ai",
        content: "Good afternoon, how can I assist you today?",
        timestamp: new Date(Date.now() - 1000 * 360),
      },
      {
        role: "caller",
        content:
          "I need to schedule appointments for my whole family - there are 4 of us.",
        timestamp: new Date(Date.now() - 1000 * 345),
      },
      {
        role: "ai",
        content:
          "I can help with that. Would you like to schedule all appointments on the same day?",
        timestamp: new Date(Date.now() - 1000 * 330),
      },
      {
        role: "caller",
        content:
          "Yes, ideally back-to-back. We need Saturday morning if possible. And can we have the same provider for all of us?",
        timestamp: new Date(Date.now() - 1000 * 315),
      },
      {
        role: "ai",
        content:
          "Let me check our Saturday availability. This is a complex request, so let me connect you with our scheduling team who can best accommodate your family.",
        timestamp: new Date(Date.now() - 1000 * 300),
      },
    ],
    aiSummary:
      "Family of 4 requesting back-to-back appointments on Saturday morning with the same provider. Complex scheduling that requires manual coordination.",
    extractedIntents: [
      "family-booking",
      "same-day-appointments",
      "provider-preference",
    ],
    suggestedActions: [
      "Check Saturday morning availability for 4 consecutive slots",
      "Verify preferred provider's schedule",
      "Consider offering early morning slots to fit all appointments",
    ],
    sentiment: "neutral",
  },
  {
    id: "esc3",
    callId: "call_active_3",
    phone: "+1 555-888-7777",
    priority: "urgent",
    status: "waiting",
    reason: "Emergency situation",
    waitTime: getWaitTime("urgent"),
    startedAt: new Date(Date.now() - 1000 * 45),
    conversation: [
      {
        role: "ai",
        content: "Hello, thank you for calling. How can I help you?",
        timestamp: new Date(Date.now() - 1000 * 60),
      },
      {
        role: "caller",
        content:
          "This is urgent - I'm having severe pain and need to be seen today!",
        timestamp: new Date(Date.now() - 1000 * 50),
      },
      {
        role: "ai",
        content:
          "I understand this is urgent. Let me immediately connect you with our team to get you seen as soon as possible.",
        timestamp: new Date(Date.now() - 1000 * 45),
      },
    ],
    aiSummary:
      "Caller reporting severe pain requiring same-day emergency appointment. Urgent escalation needed.",
    extractedIntents: ["emergency", "same-day-appointment", "pain-complaint"],
    suggestedActions: [
      "Check for emergency/same-day appointment slots",
      "Triage severity level",
      "Consider referring to emergency services if medically necessary",
    ],
    sentiment: "frustrated",
  },
  {
    id: "esc4",
    callId: "call_active_4",
    contactId: "c6",
    contactName: "Jennifer Martinez",
    phone: "+1 555-678-9012",
    priority: "low",
    status: "callback-scheduled",
    reason: "Detailed service inquiry",
    waitTime: 0,
    startedAt: new Date(Date.now() - 1000 * 600),
    resolvedAt: new Date(Date.now() - 1000 * 300),
    assignedTo: "Agent Smith",
    conversation: [
      {
        role: "ai",
        content: "Hello! How can I help you today?",
        timestamp: new Date(Date.now() - 1000 * 660),
      },
      {
        role: "caller",
        content:
          "I want to learn about all your premium services and pricing options.",
        timestamp: new Date(Date.now() - 1000 * 645),
      },
      {
        role: "ai",
        content:
          "I'd be happy to go over our premium services. Would you prefer to speak with one of our specialists who can give you a comprehensive overview?",
        timestamp: new Date(Date.now() - 1000 * 630),
      },
      {
        role: "caller",
        content:
          "Actually, can someone call me back? I'm about to go into a meeting.",
        timestamp: new Date(Date.now() - 1000 * 615),
      },
      {
        role: "ai",
        content:
          "Of course! When would be a good time for us to call you back?",
        timestamp: new Date(Date.now() - 1000 * 600),
      },
    ],
    aiSummary:
      "VIP customer interested in premium service consultation. Callback scheduled for this afternoon. Customer has time constraints due to meeting.",
    extractedIntents: [
      "service-inquiry",
      "premium-consultation",
      "callback-request",
    ],
    suggestedActions: [
      "Prepare premium service overview",
      "Pull customer history for personalized recommendations",
      "Call back at scheduled time",
    ],
    sentiment: "positive",
  },
];

// Get escalation queue with filters
export function getEscalationQueue(options?: {
  status?: EscalationStatus;
  priority?: EscalationPriority;
  limit?: number;
}): MockEscalation[] {
  let queue = [...MOCK_ESCALATIONS];

  if (options?.status) {
    queue = queue.filter((e) => e.status === options.status);
  }

  if (options?.priority) {
    queue = queue.filter((e) => e.priority === options.priority);
  }

  // Sort by priority and wait time
  queue.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.waitTime - a.waitTime;
  });

  if (options?.limit) {
    queue = queue.slice(0, options.limit);
  }

  return queue;
}

// Get waiting queue count
export function getWaitingCount(): number {
  return MOCK_ESCALATIONS.filter((e) => e.status === "waiting").length;
}

// Get queue stats
export function getEscalationStats() {
  const waiting = MOCK_ESCALATIONS.filter((e) => e.status === "waiting");

  return {
    totalWaiting: waiting.length,
    urgent: waiting.filter((e) => e.priority === "urgent").length,
    high: waiting.filter((e) => e.priority === "high").length,
    avgWaitTime: Math.round(
      waiting.reduce((sum, e) => sum + e.waitTime, 0) / waiting.length || 0,
    ),
    longestWait: Math.max(...waiting.map((e) => e.waitTime), 0),
  };
}
