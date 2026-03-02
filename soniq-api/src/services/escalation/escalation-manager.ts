// Smart Escalation Manager
// Handles human escalation requests intelligently
// Key principle: Don't escalate just because user asks - prove AI can't help first

export interface EscalationState {
  humanRequestCount: number;
  lastHumanRequestTurn: number;
  aiAttemptsSinceRequest: number;
  totalTurns: number;
  taskCompleted: boolean;
  validReasonProvided: boolean;
  validReason?: string;
}

export interface EscalationDecision {
  shouldEscalate: boolean;
  deflectionResponse?: string;
  escalationReason?: string;
}

// Immediate escalation triggers - bypass all deflection
const IMMEDIATE_TRIGGERS = [
  /\b(complaint|complain|refund|money back)\b/i,
  /\b(emergency|urgent|crisis|medical)\b/i,
  /\b(manager|supervisor|owner|boss)\b/i,
  /\b(harassment|discrimination|safety|threat)\b/i,
  /\b(lawyer|lawsuit|sue|legal)\b/i,
  /\b(cancel\s*(all|everything)|close.*account)\b/i,
  /\b(police|authorities)\b/i,
];

// Human request patterns - trigger deflection flow
const HUMAN_REQUEST_PATTERNS = [
  /\b(human|person|someone|somebody|agent)\b/i,
  /\b(real\s*person|actual\s*person|live\s*person)\b/i,
  /\b(talk\s*to|speak\s*to|speak\s*with|transfer\s*to)\b/i,
  /\b(representative|staff|employee|operator)\b/i,
  /\b(connect\s*me|put\s*me\s*through)\b/i,
  /\b(not\s*a\s*bot|not\s*ai|hate\s*bots)\b/i,
];

// Valid reasons that justify escalation
const VALID_ESCALATION_REASONS = [
  { pattern: /\b(complaint|complain)\b/i, reason: "customer_complaint" },
  { pattern: /\b(refund|money\s*back)\b/i, reason: "refund_request" },
  { pattern: /\b(problem|issue|wrong)\b/i, reason: "service_issue" },
  { pattern: /\b(billing|charge|payment\s*issue)\b/i, reason: "billing_issue" },
  {
    pattern: /\b(cancel.*appointment|cancel.*booking)\b/i,
    reason: "cancellation",
  },
  {
    pattern: /\b(reschedule|change.*time|move.*appointment)\b/i,
    reason: "reschedule",
  },
  {
    pattern: /\b(special\s*request|accommodation)\b/i,
    reason: "special_request",
  },
];

// Deflection responses - designed to prove AI value
const DEFLECTION_RESPONSES = {
  first_ask: [
    "I can help you with that right now, no waiting. What would you like to book?",
    "I'm here to help immediately. What time works best for you?",
    "I can get you sorted in seconds. What day were you thinking?",
  ],

  second_ask: [
    "I hear you. Let me try once more - I'm really fast with bookings. What date did you have in mind?",
    "I understand. Before transferring, let me help - it'll be much quicker. What do you need?",
  ],

  third_ask_no_reason: [
    "I really can help you faster than waiting. Last try - what can I book for you?",
    "One more shot - tell me what you need and I'll get it done instantly.",
  ],

  final_before_escalation: [
    "Alright, I'll connect you with our team. Please hold for the next available person.",
  ],

  immediate_escalation: [
    "I understand. Let me transfer you to our team right away. Please hold.",
  ],
};

/**
 * Initialize a new escalation state for a call
 */
export function createEscalationState(): EscalationState {
  return {
    humanRequestCount: 0,
    lastHumanRequestTurn: -1,
    aiAttemptsSinceRequest: 0,
    totalTurns: 0,
    taskCompleted: false,
    validReasonProvided: false,
    validReason: undefined,
  };
}

/**
 * Check if message contains immediate escalation triggers
 */
function hasImmediateTrigger(message: string): boolean {
  return IMMEDIATE_TRIGGERS.some((pattern) => pattern.test(message));
}

/**
 * Check if message is requesting human
 */
function hasHumanRequest(message: string): boolean {
  return HUMAN_REQUEST_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Extract valid escalation reason from message
 */
function extractValidReason(message: string): string | undefined {
  for (const { pattern, reason } of VALID_ESCALATION_REASONS) {
    if (pattern.test(message)) {
      return reason;
    }
  }
  return undefined;
}

/**
 * Get random deflection response for stage
 */
function getDeflectionResponse(
  stage: keyof typeof DEFLECTION_RESPONSES,
): string {
  const responses = DEFLECTION_RESPONSES[stage];
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Main escalation decision function
 * Returns whether to escalate and what to say if not
 */
export function evaluateEscalation(
  state: EscalationState,
  userMessage: string,
): EscalationDecision {
  // Update turn count
  state.totalTurns++;

  // Check for immediate triggers - always escalate
  if (hasImmediateTrigger(userMessage)) {
    return {
      shouldEscalate: true,
      escalationReason: "immediate_trigger",
      deflectionResponse: getDeflectionResponse("immediate_escalation"),
    };
  }

  // Check if user is requesting human
  if (!hasHumanRequest(userMessage)) {
    // Not asking for human, increment AI attempts since last request
    if (state.humanRequestCount > 0) {
      state.aiAttemptsSinceRequest++;
    }
    return { shouldEscalate: false };
  }

  // User is requesting human
  state.humanRequestCount++;
  state.lastHumanRequestTurn = state.totalTurns;
  state.aiAttemptsSinceRequest = 0;

  // Check for valid reason in this message
  const validReason = extractValidReason(userMessage);
  if (validReason) {
    state.validReasonProvided = true;
    state.validReason = validReason;
  }

  // First request - soft deflect
  if (state.humanRequestCount === 1) {
    console.log("[ESCALATION] First human request - deflecting");
    return {
      shouldEscalate: false,
      deflectionResponse: getDeflectionResponse("first_ask"),
    };
  }

  // Second request - try once more
  if (state.humanRequestCount === 2) {
    // If valid reason provided, escalate
    if (state.validReasonProvided) {
      console.log(
        `[ESCALATION] Valid reason provided: ${state.validReason} - escalating`,
      );
      return {
        shouldEscalate: true,
        escalationReason: state.validReason,
        deflectionResponse: getDeflectionResponse("immediate_escalation"),
      };
    }

    console.log("[ESCALATION] Second human request - final deflect attempt");
    return {
      shouldEscalate: false,
      deflectionResponse: getDeflectionResponse("second_ask"),
    };
  }

  // Third request - last chance or valid reason
  if (state.humanRequestCount === 3) {
    if (state.validReasonProvided) {
      console.log(`[ESCALATION] Third request with valid reason - escalating`);
      return {
        shouldEscalate: true,
        escalationReason: state.validReason,
        deflectionResponse: getDeflectionResponse("final_before_escalation"),
      };
    }

    console.log("[ESCALATION] Third request, no valid reason - final try");
    return {
      shouldEscalate: false,
      deflectionResponse: getDeflectionResponse("third_ask_no_reason"),
    };
  }

  // Fourth+ request - respect user autonomy, escalate
  console.log(
    `[ESCALATION] ${state.humanRequestCount} requests - escalating (user persistence)`,
  );
  return {
    shouldEscalate: true,
    escalationReason: "persistent_request",
    deflectionResponse: getDeflectionResponse("final_before_escalation"),
  };
}

/**
 * Check if AI has failed enough times to warrant escalation
 * Used when AI itself can't handle the request
 */
export function shouldEscalateOnAIFailure(
  state: EscalationState,
  consecutiveFailures: number,
): boolean {
  // If AI has failed 3+ times in a row, escalate
  if (consecutiveFailures >= 3) {
    console.log("[ESCALATION] AI failed 3+ times - escalating");
    return true;
  }

  // If total conversation is too long without resolution
  if (state.totalTurns >= 10 && !state.taskCompleted) {
    console.log("[ESCALATION] 10+ turns without completion - escalating");
    return true;
  }

  return false;
}

/**
 * Mark task as completed (prevents unnecessary escalation)
 */
export function markTaskCompleted(state: EscalationState): void {
  state.taskCompleted = true;
  // Reset escalation state since we succeeded
  state.humanRequestCount = 0;
  state.validReasonProvided = false;
}

/**
 * Get escalation metrics for logging/analytics
 */
export function getEscalationMetrics(state: EscalationState): {
  humanRequests: number;
  totalTurns: number;
  wasEscalated: boolean;
  reason?: string;
} {
  return {
    humanRequests: state.humanRequestCount,
    totalTurns: state.totalTurns,
    wasEscalated: state.validReasonProvided || state.humanRequestCount >= 4,
    reason: state.validReason,
  };
}
