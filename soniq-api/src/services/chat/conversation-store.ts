// Chat Conversation Store
// In-memory store for demo, can be replaced with Redis for production

import type { ConversationMessage } from "../../types/voice.js";

// In-memory conversation store
const conversations = new Map<
  string,
  {
    messages: ConversationMessage[];
    tenantId: string;
    visitorInfo?: VisitorInfo;
    createdAt: Date;
    lastMessageAt: Date;
  }
>();

// Session expiry - 30 minutes of inactivity
const SESSION_EXPIRY_MS = 30 * 60 * 1000;

export interface VisitorInfo {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ConversationSession {
  sessionId: string;
  tenantId: string;
  messages: ConversationMessage[];
  visitorInfo?: VisitorInfo;
  createdAt: Date;
  lastMessageAt: Date;
}

/**
 * Get or create a conversation session
 */
export function getOrCreateSession(
  sessionId: string,
  tenantId: string,
): ConversationSession {
  let session = conversations.get(sessionId);

  if (!session) {
    session = {
      messages: [],
      tenantId,
      createdAt: new Date(),
      lastMessageAt: new Date(),
    };
    conversations.set(sessionId, session);
  }

  return {
    sessionId,
    tenantId: session.tenantId,
    messages: session.messages,
    visitorInfo: session.visitorInfo,
    createdAt: session.createdAt,
    lastMessageAt: session.lastMessageAt,
  };
}

/**
 * Get conversation history for a session
 */
export function getConversationHistory(
  sessionId: string,
): ConversationMessage[] {
  const session = conversations.get(sessionId);
  return session?.messages || [];
}

/**
 * Save message exchange to history
 */
export function saveToHistory(
  sessionId: string,
  userMessage: string,
  assistantMessage: string,
): void {
  const session = conversations.get(sessionId);
  if (!session) return;

  const now = new Date();
  session.messages.push(
    { role: "user", content: userMessage, timestamp: now },
    { role: "assistant", content: assistantMessage, timestamp: now },
  );

  session.lastMessageAt = new Date();

  // Trim to last 40 messages (20 exchanges) to manage context
  if (session.messages.length > 40) {
    session.messages = session.messages.slice(-40);
  }
}

/**
 * Update visitor info for a session
 */
export function updateVisitorInfo(
  sessionId: string,
  info: Partial<VisitorInfo>,
): void {
  const session = conversations.get(sessionId);
  if (!session) return;

  session.visitorInfo = {
    ...session.visitorInfo,
    ...info,
  };
}

/**
 * Get visitor info for a session
 */
export function getVisitorInfo(sessionId: string): VisitorInfo | undefined {
  return conversations.get(sessionId)?.visitorInfo;
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, session] of conversations.entries()) {
    if (now - session.lastMessageAt.getTime() > SESSION_EXPIRY_MS) {
      conversations.delete(sessionId);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Get session count (for monitoring)
 */
export function getSessionCount(): number {
  return conversations.size;
}

/**
 * Clear all sessions (for testing)
 */
export function clearAllSessions(): void {
  conversations.clear();
}

// Start periodic cleanup
setInterval(
  () => {
    const cleaned = cleanupExpiredSessions();
    if (cleaned > 0) {
      console.log(`[CHAT] Cleaned up ${cleaned} expired sessions`);
    }
  },
  5 * 60 * 1000,
); // Every 5 minutes
