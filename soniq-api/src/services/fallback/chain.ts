// Fallback Chain
// Simple retry and escalation logic for voice conversations
// No FunctionGemma - direct Groq LLM calls

import {
  EscalationState,
  createEscalationState,
  evaluateEscalation,
  shouldEscalateOnAIFailure,
  markTaskCompleted,
} from "../escalation/escalation-manager.js";
import type {
  ConversationMessage,
  ToolExecutionContext,
} from "../../types/voice.js";

// Retry configuration
const RETRY_CONFIG = {
  maxLlmRetries: 2,
  maxTotalRetries: 3,
  clarificationPrompts: [
    "I want to make sure I understand. Could you tell me more specifically what you're looking for?",
    "Let me help you with that. What day and time were you thinking?",
    "I'd be happy to help. Can you give me a few more details?",
  ],
};

export interface ChainResult {
  text: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
  action: "response" | "escalate" | "retry";
  escalationReason?: string;
  metrics: {
    llmUsed: boolean;
    retryCount: number;
    totalLatencyMs: number;
  };
}

export interface ChainContext {
  tenantId: string;
  callSid: string;
  callerPhone?: string;
  escalationPhone?: string;
  conversationHistory: ConversationMessage[];
  systemPrompt: string;
  escalationState: EscalationState;
}

// Track retry state per call
interface RetryState {
  consecutiveFailures: number;
  lastFailureReason?: string;
  totalRetries: number;
}

const retryStates = new Map<string, RetryState>();

/**
 * Get or create retry state for a call
 */
function getRetryState(callSid: string): RetryState {
  if (!retryStates.has(callSid)) {
    retryStates.set(callSid, {
      consecutiveFailures: 0,
      totalRetries: 0,
    });
  }
  return retryStates.get(callSid)!;
}

/**
 * Clean up retry state when call ends
 */
export function cleanupRetryState(callSid: string): void {
  retryStates.delete(callSid);
}

/**
 * Get a random clarification prompt
 */
function getClarificationPrompt(): string {
  const prompts = RETRY_CONFIG.clarificationPrompts;
  return prompts[Math.floor(Math.random() * prompts.length)];
}

/**
 * Main fallback chain execution - direct LLM with retry logic
 */
export async function executeChain(
  userMessage: string,
  context: ChainContext,
  llmChatFn: (
    message: string,
    history: ConversationMessage[],
    systemPrompt: string,
    toolContext: ToolExecutionContext,
  ) => Promise<{
    text: string;
    toolCalls?: Array<{
      name: string;
      args: Record<string, unknown>;
      result: unknown;
    }>;
  }>,
): Promise<ChainResult> {
  const startTime = Date.now();
  const retryState = getRetryState(context.callSid);

  const metrics = {
    llmUsed: false,
    retryCount: retryState.totalRetries,
    totalLatencyMs: 0,
  };

  const toolContext: ToolExecutionContext = {
    tenantId: context.tenantId,
    callSid: context.callSid,
    callerPhone: context.callerPhone,
    escalationPhone: context.escalationPhone,
  };

  // Step 1: Check escalation first
  const escalationDecision = evaluateEscalation(
    context.escalationState,
    userMessage,
  );

  if (escalationDecision.shouldEscalate) {
    metrics.totalLatencyMs = Date.now() - startTime;
    return {
      text: escalationDecision.deflectionResponse || "Let me transfer you now.",
      action: "escalate",
      escalationReason: escalationDecision.escalationReason,
      metrics,
    };
  }

  // If we got a deflection response, return it
  if (escalationDecision.deflectionResponse) {
    metrics.totalLatencyMs = Date.now() - startTime;
    return {
      text: escalationDecision.deflectionResponse,
      action: "response",
      metrics,
    };
  }

  // Step 2: Direct LLM call with native tool support
  try {
    metrics.llmUsed = true;

    const llmResult = await llmChatFn(
      userMessage,
      context.conversationHistory,
      context.systemPrompt,
      toolContext,
    );

    // Check if booking was completed
    if (llmResult.toolCalls?.some((tc) => tc.name === "create_booking")) {
      const bookingCall = llmResult.toolCalls.find(
        (tc) => tc.name === "create_booking",
      );
      if ((bookingCall?.result as { success?: boolean })?.success) {
        markTaskCompleted(context.escalationState);
      }
    }

    // Check for transfer request
    if (llmResult.toolCalls?.some((tc) => tc.name === "transfer_to_human")) {
      metrics.totalLatencyMs = Date.now() - startTime;
      return {
        text: llmResult.text,
        toolCalls: llmResult.toolCalls,
        action: "escalate",
        escalationReason: "user_requested_transfer",
        metrics,
      };
    }

    retryState.consecutiveFailures = 0;

    metrics.totalLatencyMs = Date.now() - startTime;
    return {
      text: llmResult.text,
      toolCalls: llmResult.toolCalls,
      action: "response",
      metrics,
    };
  } catch (error) {
    console.error("[CHAIN] LLM error:", error);

    // Increment failure count
    retryState.consecutiveFailures++;
    retryState.totalRetries++;
    retryState.lastFailureReason = (error as Error).message;

    // Check if we should escalate due to AI failures
    if (
      shouldEscalateOnAIFailure(
        context.escalationState,
        retryState.consecutiveFailures,
      )
    ) {
      metrics.totalLatencyMs = Date.now() - startTime;
      return {
        text: "I'm having trouble with that request. Let me connect you with someone who can help.",
        action: "escalate",
        escalationReason: "ai_failure",
        metrics,
      };
    }

    // Still have retries - ask for clarification
    if (retryState.totalRetries < RETRY_CONFIG.maxTotalRetries) {
      metrics.totalLatencyMs = Date.now() - startTime;
      return {
        text: getClarificationPrompt(),
        action: "retry",
        metrics,
      };
    }

    // Out of retries - escalate
    metrics.totalLatencyMs = Date.now() - startTime;
    return {
      text: "I apologize, but I'm having difficulty helping you. Let me transfer you to our team.",
      action: "escalate",
      escalationReason: "max_retries_exceeded",
      metrics,
    };
  }
}

/**
 * Create a new chain context for a call
 */
export function createChainContext(
  tenantId: string,
  callSid: string,
  callerPhone: string | undefined,
  conversationHistory: ConversationMessage[],
  systemPrompt: string,
  escalationPhone?: string,
): ChainContext {
  return {
    tenantId,
    callSid,
    callerPhone,
    escalationPhone,
    conversationHistory,
    systemPrompt,
    escalationState: createEscalationState(),
  };
}
