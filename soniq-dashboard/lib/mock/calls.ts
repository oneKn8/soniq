// Mock call data

export type CallDirection = "inbound" | "outbound";
export type CallOutcome =
  | "completed"
  | "missed"
  | "voicemail"
  | "transferred"
  | "no_answer";
export type CallStatus = "active" | "completed" | "escalated";

export interface MockCall {
  id: string;
  contactId?: string;
  contactName?: string;
  phone: string;
  direction: CallDirection;
  outcome: CallOutcome;
  status: CallStatus;
  duration: number; // seconds
  startedAt: Date;
  endedAt?: Date;
  transcript?: string[];
  summary?: string;
  intent?: string;
  sentiment?: "positive" | "neutral" | "negative";
  aiHandled: boolean;
  escalationReason?: string;
  tags?: string[];
}

// Generate random duration
const randomDuration = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min) + min);

// Generate random date within last 7 days
const recentDate = (hoursAgo: number) =>
  new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

// Sample transcripts
const SAMPLE_TRANSCRIPTS = [
  [
    "AI: Hello, thank you for calling. How can I help you today?",
    "Caller: Hi, I'd like to schedule an appointment for next week.",
    "AI: I'd be happy to help you schedule an appointment. What day works best for you?",
    "Caller: How about Tuesday afternoon?",
    "AI: I have availability on Tuesday at 2:00 PM and 3:30 PM. Which would you prefer?",
    "Caller: 2:00 PM works great.",
    "AI: Perfect. I've scheduled your appointment for Tuesday at 2:00 PM. Is there anything else I can help you with?",
    "Caller: No, that's all. Thank you!",
    "AI: You're welcome. We'll see you Tuesday. Have a great day!",
  ],
  [
    "AI: Good morning, how can I assist you?",
    "Caller: I need to cancel my appointment for tomorrow.",
    "AI: I can help you with that. Let me pull up your information. Can I have your name please?",
    "Caller: It's Sarah Johnson.",
    "AI: Thank you, Sarah. I see your appointment for tomorrow at 10:30 AM. Would you like to reschedule or cancel completely?",
    "Caller: Can I reschedule to next Friday?",
    "AI: Absolutely. I have openings at 9:00 AM, 11:00 AM, and 2:00 PM on Friday. Which time works for you?",
    "Caller: 11 AM please.",
    "AI: Done. I've rescheduled your appointment to Friday at 11:00 AM. You'll receive a confirmation text shortly.",
  ],
  [
    "AI: Hello, thank you for calling. How may I help you today?",
    "Caller: I have a question about your services.",
    "AI: Of course, I'd be happy to answer any questions. What would you like to know?",
    "Caller: Actually, can I speak to someone in person?",
    "AI: Absolutely, let me connect you with one of our team members. Please hold for just a moment.",
  ],
];

// Mock calls data
export const MOCK_CALLS: MockCall[] = [
  {
    id: "call1",
    contactId: "c2",
    contactName: "Sarah Johnson",
    phone: "+1 555-234-5678",
    direction: "inbound",
    outcome: "completed",
    status: "completed",
    duration: randomDuration(120, 300),
    startedAt: recentDate(0.5),
    transcript: SAMPLE_TRANSCRIPTS[0],
    summary:
      "Scheduled appointment for Tuesday at 2:00 PM. New customer inquiry handled successfully.",
    intent: "booking",
    sentiment: "positive",
    aiHandled: true,
    tags: ["booking", "new-appointment"],
  },
  {
    id: "call2",
    contactId: "c1",
    contactName: "John Smith",
    phone: "+1 555-123-4567",
    direction: "inbound",
    outcome: "completed",
    status: "completed",
    duration: randomDuration(180, 420),
    startedAt: recentDate(2),
    transcript: SAMPLE_TRANSCRIPTS[1],
    summary: "Rescheduled appointment from tomorrow to Friday at 11:00 AM.",
    intent: "reschedule",
    sentiment: "neutral",
    aiHandled: true,
    tags: ["reschedule"],
  },
  {
    id: "call3",
    phone: "+1 555-999-8888",
    direction: "inbound",
    outcome: "transferred",
    status: "completed",
    duration: randomDuration(45, 90),
    startedAt: recentDate(4),
    transcript: SAMPLE_TRANSCRIPTS[2],
    summary: "Caller requested human agent. Transferred to team member.",
    intent: "inquiry",
    sentiment: "neutral",
    aiHandled: false,
    escalationReason: "Customer requested human agent",
    tags: ["escalated"],
  },
  {
    id: "call4",
    contactId: "c3",
    contactName: "Michael Brown",
    phone: "+1 555-345-6789",
    direction: "inbound",
    outcome: "missed",
    status: "completed",
    duration: 0,
    startedAt: recentDate(6),
    aiHandled: false,
    tags: ["missed", "callback-needed"],
  },
  {
    id: "call5",
    contactId: "c4",
    contactName: "Emily Davis",
    phone: "+1 555-456-7890",
    direction: "outbound",
    outcome: "completed",
    status: "completed",
    duration: randomDuration(60, 180),
    startedAt: recentDate(8),
    summary: "Appointment reminder call. Confirmed attendance.",
    intent: "reminder",
    sentiment: "positive",
    aiHandled: true,
    tags: ["reminder", "confirmed"],
  },
  {
    id: "call6",
    phone: "+1 555-777-6666",
    direction: "inbound",
    outcome: "voicemail",
    status: "completed",
    duration: randomDuration(30, 60),
    startedAt: recentDate(12),
    summary: "Voicemail left. Caller asked about availability next week.",
    aiHandled: false,
    tags: ["voicemail", "callback-needed"],
  },
  {
    id: "call7",
    contactId: "c6",
    contactName: "Jennifer Martinez",
    phone: "+1 555-678-9012",
    direction: "inbound",
    outcome: "completed",
    status: "completed",
    duration: randomDuration(90, 240),
    startedAt: recentDate(24),
    summary:
      "VIP customer called to book recurring appointments for next month.",
    intent: "booking",
    sentiment: "positive",
    aiHandled: true,
    tags: ["vip", "booking", "recurring"],
  },
  {
    id: "call8",
    contactId: "c5",
    contactName: "Robert Wilson",
    phone: "+1 555-567-8901",
    direction: "outbound",
    outcome: "no_answer",
    status: "completed",
    duration: 0,
    startedAt: recentDate(36),
    aiHandled: true,
    tags: ["no-answer", "retry-scheduled"],
  },
];

// Get calls with optional filters
export function getMockCalls(options?: {
  limit?: number;
  status?: CallStatus;
  direction?: CallDirection;
  aiHandled?: boolean;
}): MockCall[] {
  let calls = [...MOCK_CALLS];

  if (options?.status) {
    calls = calls.filter((c) => c.status === options.status);
  }

  if (options?.direction) {
    calls = calls.filter((c) => c.direction === options.direction);
  }

  if (options?.aiHandled !== undefined) {
    calls = calls.filter((c) => c.aiHandled === options.aiHandled);
  }

  if (options?.limit) {
    calls = calls.slice(0, options.limit);
  }

  return calls;
}

// Get call stats
export function getCallStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCalls = MOCK_CALLS.filter((c) => c.startedAt >= today);

  return {
    totalToday: todayCalls.length,
    completed: todayCalls.filter((c) => c.outcome === "completed").length,
    missed: todayCalls.filter((c) => c.outcome === "missed").length,
    avgDuration: Math.round(
      todayCalls
        .filter((c) => c.duration > 0)
        .reduce((sum, c) => sum + c.duration, 0) /
        todayCalls.filter((c) => c.duration > 0).length || 0,
    ),
    aiHandledPercent: Math.round(
      (todayCalls.filter((c) => c.aiHandled).length / todayCalls.length) * 100,
    ),
  };
}
