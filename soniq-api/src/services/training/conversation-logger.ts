import { query } from "../database/client.js";
import { insertOne, updateOne } from "../database/query-helpers.js";

export interface ConversationMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  timestamp: string;
  tool_call_id?: string;
  tool_name?: string;
  tool_result?: unknown;
}

export interface ConversationLogInput {
  tenantId: string;
  callId?: string;
  sessionId: string;
  industry?: string;
  scenarioType?: string;
  language?: string;
}

export interface ConversationLogUpdate {
  messages?: ConversationMessage[];
  qualityScore?: number;
  isComplete?: boolean;
  hasToolCalls?: boolean;
  hasEscalation?: boolean;
  outcomeSuccess?: boolean;
  turnCount?: number;
  userTurns?: number;
  assistantTurns?: number;
  toolCallsCount?: number;
  totalTokensEstimate?: number;
  durationSeconds?: number;
  tags?: string[];
}

interface ConversationLogRow {
  id: string;
}

class ConversationLogger {
  private activeConversations: Map<
    string,
    { id: string; messages: ConversationMessage[] }
  > = new Map();

  async startConversation(input: ConversationLogInput): Promise<string> {
    const data = await insertOne<ConversationLogRow>("conversation_logs", {
      tenant_id: input.tenantId,
      call_id: input.callId,
      session_id: input.sessionId,
      industry: input.industry,
      scenario_type: input.scenarioType || "general",
      language: input.language || "en",
      messages: JSON.stringify([]),
    });

    this.activeConversations.set(input.sessionId, {
      id: data.id,
      messages: [],
    });

    console.log(`[TRAINING] Started logging conversation: ${data.id}`);
    return data.id;
  }

  async addMessage(
    sessionId: string,
    message: Omit<ConversationMessage, "timestamp">,
  ): Promise<void> {
    const conversation = this.activeConversations.get(sessionId);
    if (!conversation) {
      console.warn(
        `[TRAINING] No active conversation for session: ${sessionId}`,
      );
      return;
    }

    const fullMessage: ConversationMessage = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    conversation.messages.push(fullMessage);

    // Batch update - only write to DB every 5 messages or on important events
    if (
      conversation.messages.length % 5 === 0 ||
      message.role === "tool" ||
      message.content.toLowerCase().includes("transfer") ||
      message.content.toLowerCase().includes("goodbye")
    ) {
      await this.flushMessages(sessionId);
    }
  }

  async addSystemMessage(sessionId: string, content: string): Promise<void> {
    await this.addMessage(sessionId, { role: "system", content });
  }

  async addUserMessage(sessionId: string, content: string): Promise<void> {
    await this.addMessage(sessionId, { role: "user", content });
  }

  async addAssistantMessage(sessionId: string, content: string): Promise<void> {
    await this.addMessage(sessionId, { role: "assistant", content });
  }

  async addToolCall(
    sessionId: string,
    toolName: string,
    toolCallId: string,
    result: unknown,
  ): Promise<void> {
    await this.addMessage(sessionId, {
      role: "tool",
      content: JSON.stringify(result),
      tool_name: toolName,
      tool_call_id: toolCallId,
      tool_result: result,
    });
  }

  private async flushMessages(sessionId: string): Promise<void> {
    const conversation = this.activeConversations.get(sessionId);
    if (!conversation) return;

    try {
      await query(
        `UPDATE conversation_logs
         SET messages = $1,
             turn_count = $2,
             user_turns = $3,
             assistant_turns = $4,
             tool_calls_count = $5,
             has_tool_calls = $6
         WHERE id = $7`,
        [
          JSON.stringify(conversation.messages),
          conversation.messages.length,
          conversation.messages.filter((m) => m.role === "user").length,
          conversation.messages.filter((m) => m.role === "assistant").length,
          conversation.messages.filter((m) => m.role === "tool").length,
          conversation.messages.some((m) => m.role === "tool"),
          conversation.id,
        ],
      );
    } catch (error) {
      console.error("[TRAINING] Failed to flush messages:", error);
      throw error;
    }
  }

  async endConversation(
    sessionId: string,
    finalData?: Partial<ConversationLogUpdate>,
  ): Promise<void> {
    const conversation = this.activeConversations.get(sessionId);
    if (!conversation) return;

    // Calculate quality score based on conversation characteristics
    const qualityScore = this.calculateQualityScore(conversation.messages);

    // Estimate tokens (rough: 4 chars per token)
    const totalChars = conversation.messages.reduce(
      (sum, m) => sum + m.content.length,
      0,
    );
    const tokenEstimate = Math.ceil(totalChars / 4);

    // Check for escalation patterns
    const hasEscalation = conversation.messages.some(
      (m) =>
        m.content.toLowerCase().includes("transfer") ||
        m.content.toLowerCase().includes("speak to") ||
        m.content.toLowerCase().includes("human") ||
        m.content.toLowerCase().includes("representative"),
    );

    // Build update data
    const updateData: Record<string, unknown> = {
      messages: JSON.stringify(conversation.messages),
      turn_count: conversation.messages.length,
      user_turns: conversation.messages.filter((m) => m.role === "user").length,
      assistant_turns: conversation.messages.filter(
        (m) => m.role === "assistant",
      ).length,
      tool_calls_count: conversation.messages.filter((m) => m.role === "tool")
        .length,
      has_tool_calls: conversation.messages.some((m) => m.role === "tool"),
      has_escalation: hasEscalation,
      quality_score: qualityScore,
      total_tokens_estimate: tokenEstimate,
      is_complete: true,
    };

    // Convert camelCase finalData to snake_case for database
    if (finalData) {
      if (finalData.durationSeconds !== undefined) {
        updateData.duration_seconds = finalData.durationSeconds;
      }
      if (finalData.outcomeSuccess !== undefined) {
        updateData.outcome_success = finalData.outcomeSuccess;
      }
      if (finalData.qualityScore !== undefined) {
        updateData.quality_score = finalData.qualityScore;
      }
      if (finalData.isComplete !== undefined) {
        updateData.is_complete = finalData.isComplete;
      }
      if (finalData.hasToolCalls !== undefined) {
        updateData.has_tool_calls = finalData.hasToolCalls;
      }
      if (finalData.hasEscalation !== undefined) {
        updateData.has_escalation = finalData.hasEscalation;
      }
      if (finalData.turnCount !== undefined) {
        updateData.turn_count = finalData.turnCount;
      }
      if (finalData.userTurns !== undefined) {
        updateData.user_turns = finalData.userTurns;
      }
      if (finalData.assistantTurns !== undefined) {
        updateData.assistant_turns = finalData.assistantTurns;
      }
      if (finalData.toolCallsCount !== undefined) {
        updateData.tool_calls_count = finalData.toolCallsCount;
      }
      if (finalData.totalTokensEstimate !== undefined) {
        updateData.total_tokens_estimate = finalData.totalTokensEstimate;
      }
      if (finalData.tags !== undefined) {
        updateData.tags = finalData.tags;
      }
      if (finalData.messages !== undefined) {
        updateData.messages = JSON.stringify(finalData.messages);
      }
    }

    try {
      await updateOne("conversation_logs", updateData, { id: conversation.id });

      console.log(
        `[TRAINING] Ended conversation: ${conversation.id} (${conversation.messages.length} turns, quality: ${qualityScore})`,
      );
    } catch (error) {
      console.error("[TRAINING] Failed to end conversation:", error);
      throw error;
    }

    this.activeConversations.delete(sessionId);
  }

  private calculateQualityScore(messages: ConversationMessage[]): number {
    let score = 0.5; // Start at neutral

    // More turns = more training value (up to a point)
    const turnBonus = Math.min(messages.length / 20, 0.2);
    score += turnBonus;

    // Has tool calls = more complex, valuable
    if (messages.some((m) => m.role === "tool")) {
      score += 0.15;
    }

    // Good back-and-forth pattern
    let alternations = 0;
    for (let i = 1; i < messages.length; i++) {
      if (
        (messages[i].role === "user" && messages[i - 1].role === "assistant") ||
        (messages[i].role === "assistant" && messages[i - 1].role === "user")
      ) {
        alternations++;
      }
    }
    const alternationRatio =
      messages.length > 1 ? alternations / (messages.length - 1) : 0;
    score += alternationRatio * 0.1;

    // Penalize very short responses
    const avgLength =
      messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    if (avgLength < 20) score -= 0.1;
    if (avgLength > 100) score += 0.05;

    return Math.max(0, Math.min(1, score));
  }

  // Get active conversation for a session
  getActiveConversation(
    sessionId: string,
  ): { id: string; messages: ConversationMessage[] } | undefined {
    return this.activeConversations.get(sessionId);
  }

  // Check if session has active logging
  hasActiveConversation(sessionId: string): boolean {
    return this.activeConversations.has(sessionId);
  }
}

export const conversationLogger = new ConversationLogger();

// Export functions for convenience
export const startConversationLog = (input: ConversationLogInput) =>
  conversationLogger.startConversation(input);
export const addUserTurn = (sessionId: string, content: string) =>
  conversationLogger.addUserMessage(sessionId, content);
export const addAssistantTurn = (sessionId: string, content: string) =>
  conversationLogger.addAssistantMessage(sessionId, content);
export const addToolTurn = (
  sessionId: string,
  toolName: string,
  toolCallId: string,
  result: unknown,
) => conversationLogger.addToolCall(sessionId, toolName, toolCallId, result);
export const endConversationLog = (
  sessionId: string,
  finalData?: Partial<ConversationLogUpdate>,
) => conversationLogger.endConversation(sessionId, finalData);
