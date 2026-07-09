// Soniq Core - Mock Data Generators
// SOW-Aligned Realistic Data

import type {
  DashboardMetrics,
  SystemMetrics,
  BusinessMetrics,
  CallMetrics,
  CallSession,
  LogEntry,
  LogLevel,
  LogCategory,
  MetricValue,
} from "@/types";

// Neutral base rate used for mock revenue figures (no per-industry pricing).
const MOCK_BASE_RATE = 120;

// Domain-neutral intents used only to seed mock call sessions.
const MOCK_INTENTS = [
  { id: "book", name: "Booking", action: "book" as const },
  { id: "inquiry", name: "Inquiry", action: "inquire" as const },
  { id: "support", name: "Support", action: "message" as const },
];

// ============================================================================
// SYSTEM METRICS
// ============================================================================

export function generateSystemMetrics(): SystemMetrics {
  return {
    status: "online",
    latency: Math.floor(18 + Math.random() * 12), // 18-30ms
    uptime: 99.9 + Math.random() * 0.09, // 99.9-99.99%
    activeCalls: Math.floor(Math.random() * 3),
    queuedCalls: Math.floor(Math.random() * 2),
    cpuUsage: 15 + Math.random() * 25,
    memoryUsage: 45 + Math.random() * 20,
  };
}

// ============================================================================
// BUSINESS METRICS (SOW-ALIGNED)
// ============================================================================

export function generateBusinessMetrics(): BusinessMetrics {
  const baseRate = MOCK_BASE_RATE;

  const transactionsToday = Math.floor(12 + Math.random() * 24); // 12-36

  const avgValue = baseRate * (0.9 + Math.random() * 0.2);
  const revenueToday = transactionsToday * avgValue;

  return {
    revenueToday: Math.round(revenueToday),
    revenueWeek: Math.round(revenueToday * 6.5),
    revenueMonth: Math.round(revenueToday * 28),
    transactionsToday,
    transactionsWeek: transactionsToday * 7,
    conversionRate: 72 + Math.random() * 15, // 72-87%
    avgTransactionValue: Math.round(avgValue),
    missedOpportunities: Math.floor(Math.random() * 3), // Near zero per SOW
  };
}

// ============================================================================
// CALL METRICS
// ============================================================================

export function generateCallMetrics(): CallMetrics {
  const totalToday = Math.floor(45 + Math.random() * 30);
  return {
    totalToday,
    totalWeek: totalToday * 7,
    avgDuration: Math.floor(120 + Math.random() * 180), // 2-5 minutes
    avgWaitTime: Math.floor(Math.random() * 3), // Near instant per SOW
    abandonRate: Math.random() * 3, // Very low
    satisfactionScore: 4.2 + Math.random() * 0.6,
  };
}

// ============================================================================
// COMBINED DASHBOARD METRICS
// ============================================================================

export function generateDashboardMetrics(): DashboardMetrics {
  return {
    system: generateSystemMetrics(),
    business: generateBusinessMetrics(),
    calls: generateCallMetrics(),
  };
}

// ============================================================================
// INDUSTRY-SPECIFIC METRICS
// ============================================================================

export function generateIndustryMetrics(): MetricValue[] {
  const now = new Date().toISOString();

  // Universal, industry-agnostic metric set.
  return [
    {
      id: "calls",
      value: Math.floor(20 + Math.random() * 15),
      status: "nominal",
      timestamp: now,
    },
    {
      id: "bookings",
      value: Math.floor(8 + Math.random() * 8),
      status: "nominal",
      timestamp: now,
    },
    {
      id: "conversion",
      value: 45 + Math.random() * 25,
      status: "nominal",
      timestamp: now,
    },
    {
      id: "revenue",
      value: 1500 + Math.random() * 1000,
      status: "nominal",
      timestamp: now,
    },
  ];
}

// ============================================================================
// LOG GENERATION
// ============================================================================

const LOG_TEMPLATES: Array<{
  level: LogLevel;
  category: LogCategory;
  messages: string[];
}> = [
  {
    level: "INFO",
    category: "SYSTEM",
    messages: [
      "WEBSOCKET_HEARTBEAT_ACK latency={}ms",
      "CONFIG_SYNC completed in {}ms",
      "CACHE_REFRESH key=availability",
      "HEALTH_CHECK all_systems_nominal",
    ],
  },
  {
    level: "INFO",
    category: "CALL",
    messages: [
      "CALL_INITIATED id={} from=+1***{}",
      "AUDIO_STREAM_CONNECTED codec=opus bitrate=48k",
      "VAD_TRIGGER confidence=0.{}",
      "CALL_DURATION {}s revenue=${}",
    ],
  },
  {
    level: "INFO",
    category: "INTENT",
    messages: [
      "INTENT_DETECTED type=BOOKING confidence=0.{}",
      "INTENT_DETECTED type=INQUIRY confidence=0.{}",
      "SLOT_FILLED slot=date value={}",
      "INTENT_CONFIRMED user_acknowledged=true",
    ],
  },
  {
    level: "INFO",
    category: "BOOKING",
    messages: [
      "BOOKING_CREATED id=BK-{} amount=${}",
      "AVAILABILITY_CHECK rooms={} date={}",
      "CONFIRMATION_SENT sms=true email=true",
      "CALENDAR_SYNC provider=google status=success",
    ],
  },
  {
    level: "WARN",
    category: "SYSTEM",
    messages: [
      "LATENCY_SPIKE current={}ms threshold=50ms",
      "RATE_LIMIT_APPROACHING usage={}%",
      "MEMORY_PRESSURE heap={}MB",
    ],
  },
  {
    level: "DEBUG",
    category: "CALL",
    messages: [
      "AUDIO_CHUNK seq={} bytes=1024",
      'STT_PARTIAL text="..." confidence=0.{}',
      "TTS_BUFFER queued={}chars",
    ],
  },
];

function generateRandomValue(
  type:
    | "id"
    | "phone"
    | "confidence"
    | "latency"
    | "amount"
    | "duration"
    | "date"
    | "rooms"
    | "percentage"
    | "memory",
): string {
  switch (type) {
    case "id":
      return Math.random().toString(36).slice(2, 8).toUpperCase();
    case "phone":
      return String(Math.floor(1000 + Math.random() * 9000));
    case "confidence":
      return String(Math.floor(85 + Math.random() * 14));
    case "latency":
      return String(Math.floor(18 + Math.random() * 30));
    case "amount":
      return String(Math.floor(100 + Math.random() * 100));
    case "duration":
      return String(Math.floor(60 + Math.random() * 300));
    case "date":
      return new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    case "rooms":
      return String(Math.floor(1 + Math.random() * 5));
    case "percentage":
      return String(Math.floor(70 + Math.random() * 25));
    case "memory":
      return String(Math.floor(256 + Math.random() * 256));
    default:
      return String(Math.floor(Math.random() * 100));
  }
}

function fillTemplate(template: string): string {
  const types: Array<
    | "id"
    | "phone"
    | "confidence"
    | "latency"
    | "amount"
    | "duration"
    | "date"
    | "rooms"
    | "percentage"
    | "memory"
  > = [
    "id",
    "phone",
    "confidence",
    "latency",
    "amount",
    "duration",
    "date",
    "rooms",
    "percentage",
    "memory",
  ];

  let result = template;
  let typeIndex = 0;

  while (result.includes("{}")) {
    result = result.replace(
      "{}",
      generateRandomValue(types[typeIndex % types.length]),
    );
    typeIndex++;
  }

  return result;
}

export function generateLogEntry(): LogEntry {
  const template =
    LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
  const message =
    template.messages[Math.floor(Math.random() * template.messages.length)];

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    level: template.level,
    category: template.category,
    message: fillTemplate(message),
  };
}

export function generateInitialLogs(count: number = 25): LogEntry[] {
  const logs: LogEntry[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const log = generateLogEntry();
    log.timestamp = new Date(now - i * 2000).toISOString(); // 2 second intervals
    logs.push(log);
  }

  return logs;
}

// ============================================================================
// CALL SESSION GENERATION
// ============================================================================

export function generateCallSession(): CallSession {
  const randomIntent =
    MOCK_INTENTS[Math.floor(Math.random() * MOCK_INTENTS.length)];
  const duration = Math.floor(60 + Math.random() * 300);
  const success = Math.random() > 0.15; // 85% success rate

  return {
    id: `CALL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    startTime: new Date(Date.now() - duration * 1000).toISOString(),
    endTime: new Date().toISOString(),
    duration,
    status: "completed",
    callerPhone: `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`,
    intentsDetected: [
      {
        id: randomIntent.id,
        name: randomIntent.name,
        confidence: 0.85 + Math.random() * 0.14,
        timestamp: new Date().toISOString(),
      },
    ],
    sentimentScore: 0.3 + Math.random() * 0.6,
    outcome: {
      type: randomIntent.action === "book" ? "booking" : "inquiry",
      success,
      details: success ? { confirmed: true } : undefined,
    },
    revenue:
      success && randomIntent.action === "book" ? MOCK_BASE_RATE : undefined,
  };
}

// ============================================================================
// TIME FORMATTING
// ============================================================================

export function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatCurrency(
  amount: number,
  currency: string = "USD",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
