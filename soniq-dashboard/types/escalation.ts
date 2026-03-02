export type EscalationPriority = "urgent" | "high" | "normal" | "low";

export type EscalationStatus =
  | "waiting"
  | "in-progress"
  | "resolved"
  | "callback-scheduled";

export type EscalationSentiment =
  | "positive"
  | "neutral"
  | "negative"
  | "frustrated";

export interface EscalationMessage {
  role: "ai" | "caller";
  content: string;
  timestamp: Date;
}

export interface EscalationItem {
  id: string;
  callId: string;
  contactId?: string;
  contactName?: string;
  phone: string;
  priority: EscalationPriority;
  status: EscalationStatus;
  reason: string;
  waitTime: number;
  startedAt: Date;
  assignedTo?: string;
  resolvedAt?: Date;
  conversation: EscalationMessage[];
  aiSummary: string;
  extractedIntents: string[];
  suggestedActions: string[];
  sentiment: EscalationSentiment;
}

export interface ApiEscalationMessage {
  role: "ai" | "caller";
  content: string;
  timestamp: string;
}

export interface ApiEscalationItem {
  id: string;
  callId: string;
  contactId?: string;
  contactName?: string;
  phone: string;
  priority: EscalationPriority;
  status: EscalationStatus;
  reason: string;
  waitTime: number;
  startedAt: string;
  assignedTo?: string;
  resolvedAt?: string;
  conversation: ApiEscalationMessage[];
  aiSummary: string;
  extractedIntents: string[];
  suggestedActions: string[];
  sentiment: EscalationSentiment;
}

export interface EscalationQueueResponse {
  queue: ApiEscalationItem[];
}

export function mapApiEscalation(item: ApiEscalationItem): EscalationItem {
  return {
    ...item,
    startedAt: new Date(item.startedAt),
    resolvedAt: item.resolvedAt ? new Date(item.resolvedAt) : undefined,
    conversation: item.conversation.map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp),
    })),
  };
}

export function computeEscalationStats(queue: EscalationItem[]) {
  const waiting = queue.filter((item) => item.status === "waiting");
  const totalWaiting = waiting.length;
  const urgent = waiting.filter((item) => item.priority === "urgent").length;
  const high = waiting.filter((item) => item.priority === "high").length;
  const avgWaitTime =
    totalWaiting > 0
      ? Math.round(
          waiting.reduce((sum, item) => sum + item.waitTime, 0) / totalWaiting,
        )
      : 0;
  const longestWait = waiting.reduce(
    (max, item) => Math.max(max, item.waitTime),
    0,
  );

  return {
    totalWaiting,
    urgent,
    high,
    avgWaitTime,
    longestWait,
  };
}
