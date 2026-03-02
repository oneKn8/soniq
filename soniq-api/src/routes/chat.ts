// Chat API Routes
// Text-based chat interface for website widget
// Multi-provider fallback: Gemini -> GPT -> Groq

import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { buildSystemPrompt } from "../services/gemini/chat.js";
import {
  chatAgentFunctions,
  executeChatTool,
} from "../services/chat/chat-tools.js";
import {
  getOrCreateSession,
  getConversationHistory,
  saveToHistory,
  updateVisitorInfo,
  getVisitorInfo,
  getSessionCount,
} from "../services/chat/conversation-store.js";
import { getTenantById } from "../services/database/tenant-cache.js";
import { findOrCreateByPhone } from "../services/contacts/contact-service.js";
import type { ToolExecutionContext } from "../types/voice.js";
import {
  chatWithFallback,
  sendToolResults,
  getProviderStatus,
  type LLMResponse,
} from "../services/llm/multi-provider.js";

export const chatRoutes = new Hono();

// CORS for embeddable widget - wildcard is intentional since the chat widget
// is embedded on customer websites across different domains.
// Configure CHAT_ALLOWED_ORIGINS to restrict if needed.
chatRoutes.use(
  "/*",
  cors({
    origin: (origin) => {
      const allowedOrigins = process.env.CHAT_ALLOWED_ORIGINS;
      if (!allowedOrigins) return origin; // Allow all for embeddable widget
      const allowed = allowedOrigins.split(",").map((o) => o.trim());
      return allowed.includes(origin || "") ? origin : allowed[0];
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Tenant-ID"],
  }),
);

// ============================================================================
// POST /api/chat - Send a message
// ============================================================================

// Soniq marketing site system prompt
const SONIQ_MARKETING_PROMPT = `You are the Soniq AI assistant on the Soniq website. Your job is to help potential customers understand Soniq's AI voice and chat agent platform.

## About Soniq
Soniq is an AI-powered voice and chat platform that helps businesses automate customer interactions. Key features:

1. **AI Voice Agents**: Handle phone calls 24/7 with natural-sounding AI that can:
   - Answer questions about your business
   - Book appointments and manage calendars
   - Transfer to humans when needed
   - Integrate with your CRM and booking systems

2. **Chat Widgets**: Embeddable chat for websites that:
   - Answers FAQs instantly
   - Captures leads and contact info
   - Provides consistent customer service
   - Works across industries (healthcare, hospitality, services, etc.)

3. **Multi-Provider Reliability**: Uses Gemini, OpenAI, and Groq with automatic fallback for 99.9% uptime

4. **Easy Setup**: Get started in minutes with our dashboard - no coding required

## Your Role
- Explain how Soniq works and its benefits
- Answer questions about features, pricing, and integration
- Offer to schedule a demo or connect with sales
- Be enthusiastic about helping businesses automate their customer service
- If asked to demonstrate, suggest clicking the demo buttons or trying the call feature

## Tone
Be friendly, professional, and helpful. You're representing Soniq as a cutting-edge AI platform, so be knowledgeable and confident.

Keep responses conversational and concise - this is a chat widget, not a documentation page.`;

interface ChatResponse {
  response: string;
  session_id: string;
  provider?: string;
  tool_calls?: Array<{
    name: string;
    result: unknown;
  }>;
}

// Zod schema for chat request validation
const chatRequestSchema = z.object({
  tenant_id: z.string().uuid("Invalid tenant_id format"),
  session_id: z.string().min(1).max(256),
  message: z
    .string()
    .min(1, "message is required")
    .max(10000, "Message too long"),
  visitor_info: z
    .object({
      name: z.string().max(256).optional(),
      email: z.string().email().max(256).optional(),
      phone: z.string().max(50).optional(),
    })
    .optional(),
  marketing_mode: z.boolean().optional(),
});

chatRoutes.post("/", async (c) => {
  try {
    const rawBody = await c.req.json();
    const parsed = chatRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid request";
      return c.json({ error: firstError }, 400);
    }

    const { tenant_id, session_id, message, visitor_info, marketing_mode } =
      parsed.data;

    // Get tenant configuration
    const tenant = await getTenantById(tenant_id);
    if (!tenant) {
      return c.json({ error: "Invalid tenant" }, 404);
    }

    // Get or create session (ensures session exists for history operations)
    getOrCreateSession(session_id, tenant_id);

    // Update visitor info if provided
    if (visitor_info) {
      updateVisitorInfo(session_id, visitor_info);
    }

    // Build system prompt - use Soniq marketing prompt if in marketing mode
    const systemPrompt = marketing_mode
      ? SONIQ_MARKETING_PROMPT
      : buildSystemPrompt(
          tenant.agent_name || "Assistant",
          tenant.business_name,
          tenant.industry,
          tenant.agent_personality || {
            tone: "friendly",
            verbosity: "balanced",
            empathy: "medium",
          },
        );

    // Get conversation history
    const history = getConversationHistory(session_id);

    // Build context for tool execution
    const context: ToolExecutionContext & { sessionId: string } = {
      tenantId: tenant_id,
      callSid: session_id,
      callerPhone: visitor_info?.phone || getVisitorInfo(session_id)?.phone,
      sessionId: session_id,
    };

    // Chat with multi-provider fallback
    const chatResult = await chatWithMultiProvider(
      message,
      history,
      systemPrompt,
      context,
    );

    // Save to history
    saveToHistory(session_id, message, chatResult.text);

    // Create/update contact if we have contact info
    const currentVisitor = getVisitorInfo(session_id);
    if (currentVisitor?.phone || currentVisitor?.email) {
      try {
        await findOrCreateByPhone(
          tenant_id,
          currentVisitor.phone || currentVisitor.email || "",
          {
            name: currentVisitor.name,
            email: currentVisitor.email,
            source: "web",
          },
        );
      } catch (err) {
        console.warn("[CHAT] Failed to create/update contact:", err);
      }
    }

    const response: ChatResponse = {
      response: chatResult.text,
      session_id,
      provider: chatResult.provider,
      tool_calls: chatResult.toolCalls?.map((tc) => ({
        name: tc.name,
        result: tc.result,
      })),
    };

    return c.json(response);
  } catch (err) {
    console.error("[CHAT] Error:", err);
    return c.json(
      {
        error: "Chat error",
        message:
          process.env.NODE_ENV === "development" && err instanceof Error
            ? err.message
            : "An unexpected error occurred",
      },
      500,
    );
  }
});

// ============================================================================
// GET /api/chat/config/:tenant_id - Get widget configuration
// ============================================================================

interface WidgetConfig {
  agent_name: string;
  business_name: string;
  greeting: string;
  industry: string;
  theme_color: string;
}

chatRoutes.get("/config/:tenant_id", async (c) => {
  try {
    const tenantId = c.req.param("tenant_id");

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return c.json({ error: "Tenant not found" }, 404);
    }

    const config: WidgetConfig = {
      agent_name: tenant.agent_name || "Assistant",
      business_name: tenant.business_name,
      greeting:
        tenant.greeting_standard
          ?.replace(/{businessName}/g, tenant.business_name)
          .replace(/{agentName}/g, tenant.agent_name || "Assistant") ||
        `Hi! I'm ${tenant.agent_name || "here"} to help you with ${tenant.business_name}. How can I assist you today?`,
      industry: tenant.industry,
      theme_color: "#6366f1",
    };

    return c.json(config);
  } catch (err) {
    console.error("[CHAT] Config error:", err);
    return c.json({ error: "Failed to get config" }, 500);
  }
});

// ============================================================================
// GET /api/chat/health - Health check with provider status
// ============================================================================

chatRoutes.get("/health", (c) => {
  const providers = getProviderStatus();
  return c.json({
    status: "ok",
    providers,
    sessions: getSessionCount(),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Chat with multi-provider fallback and tool execution
// ============================================================================

interface ChatResult {
  text: string;
  provider: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
}

async function chatWithMultiProvider(
  userMessage: string,
  conversationHistory: Parameters<
    typeof chatWithFallback
  >[0]["conversationHistory"],
  systemPrompt: string,
  context: ToolExecutionContext & { sessionId: string },
): Promise<ChatResult> {
  console.log(`[CHAT] Processing message with multi-provider fallback`);

  const options = {
    userMessage,
    conversationHistory,
    systemPrompt,
    tools: chatAgentFunctions,
  };

  // First call - may return tool calls
  let response: LLMResponse = await chatWithFallback(options);

  console.log(`[CHAT] Response from ${response.provider}`);

  // Handle tool calls if present
  if (response.toolCalls && response.toolCalls.length > 0) {
    console.log(`[CHAT] Executing ${response.toolCalls.length} tool calls`);

    const toolResults: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
      result: unknown;
    }> = [];

    for (const tc of response.toolCalls) {
      console.log(`[CHAT] Executing tool: ${tc.name}`, tc.args);

      const result = await executeChatTool(tc.name, tc.args, context);
      toolResults.push({
        id: tc.id,
        name: tc.name,
        args: tc.args,
        result,
      });
    }

    // Send tool results back to get final response
    const finalResponse = await sendToolResults(
      response.provider,
      options,
      toolResults,
    );

    return {
      text: finalResponse.text,
      provider: finalResponse.provider,
      toolCalls: toolResults,
    };
  }

  // No tool calls, return text response
  return {
    text: response.text,
    provider: response.provider,
  };
}

export default chatRoutes;
