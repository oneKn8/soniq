// Call Logger Service
// Saves call records to the database for review and analytics

import { insertOne, updateOne } from "../database/query-helpers.js";
import type { CallSession, ConversationMessage } from "../../types/voice.js";

export interface CallRecord {
  tenant_id: string;
  vapi_call_id: string; // Using callSid here
  caller_phone: string | null;
  caller_name: string | null;
  direction: "inbound" | "outbound";
  status: "completed" | "failed" | "transferred" | "no-answer";
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  ended_reason: string | null;
  // Must match database CHECK constraint: ('booking', 'inquiry', 'support', 'escalation', 'hangup')
  outcome_type:
    | "booking"
    | "inquiry"
    | "support"
    | "escalation"
    | "hangup"
    | null;
  outcome_success: boolean;
  transcript: string | null;
  summary: string | null;
  sentiment_score: number | null;
  intents_detected: string[] | null;
  recording_url: string | null;
  cost_cents: number | null;
  contact_id: string | null;
}

/**
 * Build transcript string from conversation history
 */
function buildTranscript(conversationHistory: ConversationMessage[]): string {
  return conversationHistory
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => {
      const speaker = msg.role === "user" ? "Customer" : "Agent";
      return `${speaker}: ${msg.content}`;
    })
    .join("\n");
}

/**
 * Detect intents from conversation
 */
function detectIntents(conversationHistory: ConversationMessage[]): string[] {
  const intents: string[] = [];
  const fullText = conversationHistory
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  // Common intent patterns
  if (
    fullText.includes("book") ||
    fullText.includes("appointment") ||
    fullText.includes("schedule")
  ) {
    intents.push("booking");
  }
  if (fullText.includes("cancel")) {
    intents.push("cancellation");
  }
  if (
    fullText.includes("price") ||
    fullText.includes("cost") ||
    fullText.includes("rate")
  ) {
    intents.push("pricing");
  }
  if (
    fullText.includes("available") ||
    fullText.includes("opening") ||
    fullText.includes("slot")
  ) {
    intents.push("availability");
  }
  if (
    fullText.includes("room") ||
    fullText.includes("suite") ||
    fullText.includes("reservation")
  ) {
    intents.push("reservation");
  }
  if (
    fullText.includes("question") ||
    fullText.includes("help") ||
    fullText.includes("information")
  ) {
    intents.push("inquiry");
  }
  if (
    fullText.includes("transfer") ||
    fullText.includes("human") ||
    fullText.includes("manager") ||
    fullText.includes("speak to")
  ) {
    intents.push("escalation");
  }
  if (
    fullText.includes("complaint") ||
    fullText.includes("problem") ||
    fullText.includes("issue")
  ) {
    intents.push("complaint");
  }

  return intents.length > 0 ? intents : ["general"];
}

/**
 * Calculate simple sentiment score based on conversation
 * Returns 0-1 where 1 is most positive
 */
function calculateSentiment(
  conversationHistory: ConversationMessage[],
): number {
  const userMessages = conversationHistory
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase());

  if (userMessages.length === 0) return 0.5;

  const fullText = userMessages.join(" ");

  // Positive indicators
  const positiveWords = [
    "thank",
    "thanks",
    "great",
    "perfect",
    "wonderful",
    "excellent",
    "appreciate",
    "helpful",
    "good",
    "yes",
  ];
  const negativeWords = [
    "angry",
    "upset",
    "frustrated",
    "terrible",
    "awful",
    "bad",
    "horrible",
    "worst",
    "unacceptable",
    "ridiculous",
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of positiveWords) {
    if (fullText.includes(word)) positiveCount++;
  }

  for (const word of negativeWords) {
    if (fullText.includes(word)) negativeCount++;
  }

  // Calculate score
  const total = positiveCount + negativeCount;
  if (total === 0) return 0.7; // Neutral-positive default

  return Math.max(
    0.1,
    Math.min(0.99, 0.5 + (positiveCount - negativeCount) * 0.1),
  );
}

// Valid outcome types as defined in the database constraint
// CHECK (outcome_type IN ('booking', 'inquiry', 'support', 'escalation', 'hangup'))
type OutcomeType = "booking" | "inquiry" | "support" | "escalation" | "hangup";

/**
 * Determine outcome type from conversation
 * Returns only valid outcome_type values that match the database constraint
 */
function determineOutcome(
  conversationHistory: ConversationMessage[],
  intents: string[],
  endReason: string,
): { type: OutcomeType; success: boolean } {
  const fullText = conversationHistory
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  // Check for hangup (caller ended without completing)
  if (
    endReason === "hangup" ||
    endReason === "caller-hangup" ||
    conversationHistory.length <= 2
  ) {
    return { type: "hangup", success: false };
  }

  // Check for booking/reservation confirmation
  if (intents.includes("booking") || intents.includes("reservation")) {
    if (
      fullText.includes("confirm") ||
      fullText.includes("booked") ||
      fullText.includes("reserved")
    ) {
      return { type: "booking", success: true };
    }
    return { type: "booking", success: false };
  }

  // Check for escalation
  if (intents.includes("escalation")) {
    return { type: "escalation", success: true };
  }

  // Check for support-related issues (complaints, problems)
  if (intents.includes("complaint") || intents.includes("cancellation")) {
    return { type: "support", success: true };
  }

  // Check for inquiry (pricing, availability, general questions)
  if (
    intents.includes("inquiry") ||
    intents.includes("pricing") ||
    intents.includes("availability")
  ) {
    return { type: "inquiry", success: true };
  }

  // Default to inquiry for general conversations (valid database value)
  return { type: "inquiry", success: true };
}

/**
 * Generate a brief summary of the call
 */
function generateSummary(
  conversationHistory: ConversationMessage[],
  intents: string[],
  outcome: { type: OutcomeType; success: boolean },
): string {
  const turnCount = Math.ceil(conversationHistory.length / 2);

  let summary = "";

  switch (outcome.type) {
    case "booking":
      summary = outcome.success
        ? "Successful booking completed."
        : "Booking inquiry - not completed.";
      break;
    case "escalation":
      summary = "Call escalated to human agent.";
      break;
    case "support":
      summary = "Support request handled.";
      break;
    case "inquiry":
      summary = "Inquiry handled.";
      break;
    case "hangup":
      summary = "Caller disconnected.";
      break;
    default:
      summary = "Call completed.";
  }

  summary += ` ${turnCount} conversation turns.`;

  if (intents.length > 0 && intents[0] !== "general") {
    summary += ` Topics: ${intents.join(", ")}.`;
  }

  return summary;
}

/**
 * Save call record to database
 */
export async function saveCallRecord(
  session: CallSession,
  endReason: string = "completed",
): Promise<void> {
  try {
    const endTime = new Date();
    const durationSeconds = Math.floor(
      (endTime.getTime() - session.startTime.getTime()) / 1000,
    );

    const transcript = buildTranscript(session.conversationHistory);
    const intents = detectIntents(session.conversationHistory);
    const sentiment = calculateSentiment(session.conversationHistory);
    const outcome = determineOutcome(
      session.conversationHistory,
      intents,
      endReason,
    );
    const summary = generateSummary(
      session.conversationHistory,
      intents,
      outcome,
    );

    // Determine status
    let status: CallRecord["status"] = "completed";
    if (endReason === "transfer") {
      status = "transferred";
    } else if (endReason === "error" || endReason === "failed") {
      status = "failed";
    }

    const callRecord: Omit<CallRecord, "id" | "created_at" | "updated_at"> = {
      tenant_id: session.tenantId,
      vapi_call_id: session.callSid,
      caller_phone: session.callerPhone || null,
      caller_name: null, // Could be extracted from conversation
      direction: "inbound",
      status,
      started_at: session.startTime.toISOString(),
      ended_at: endTime.toISOString(),
      duration_seconds: durationSeconds,
      ended_reason: endReason,
      outcome_type: outcome.type,
      outcome_success: outcome.success,
      transcript: transcript || null,
      summary,
      sentiment_score: sentiment,
      intents_detected: intents,
      recording_url: null,
      cost_cents: null,
      contact_id: null,
    };

    await insertOne("calls", callRecord);

    console.log(
      `[CALL-LOGGER] Saved call ${session.callSid}: ${durationSeconds}s, ${outcome.type}, sentiment: ${sentiment.toFixed(2)}`,
    );
  } catch (error) {
    console.error("[CALL-LOGGER] Error saving call record:", error);
    throw error;
  }
}

/**
 * Update an existing call record
 */
export async function updateCallRecord(
  callSid: string,
  updates: Partial<CallRecord>,
): Promise<void> {
  try {
    await updateOne("calls", updates, { vapi_call_id: callSid });
  } catch (error) {
    console.error("[CALL-LOGGER] Error updating call record:", error);
    throw error;
  }
}
