// Chat API Routes
// Text-based chat interface for website widget
// Multi-provider fallback: Gemini -> GPT -> Groq

import { Hono } from "hono";
import type { Context, Next } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { chatIpRateLimit, enforceRateLimit } from "../middleware/index.js";
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
import { logger } from "../lib/logger.js";

export const chatRoutes = new Hono();

// Max chat request body size. The LLM path only ever needs a small JSON
// payload; anything larger is abuse. Enforced before JSON parsing.
const MAX_CHAT_BODY_BYTES = 32 * 1024;

/**
 * Parse the global CHAT_ALLOWED_ORIGINS env allow-list (comma-separated).
 * Empty list means "not configured" -> wildcard (embeddable widget default).
 */
function getGlobalAllowedOrigins(): string[] {
  const raw = process.env.CHAT_ALLOWED_ORIGINS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Read a per-tenant allowed-origins list from the tenant record if such a field
 * already exists (string[] or comma-separated string). Returns [] when absent,
 * so enforcement is skipped gracefully with no schema dependency.
 */
function extractTenantAllowedOrigins(tenant: unknown): string[] {
  if (!tenant || typeof tenant !== "object") return [];
  const value = (tenant as Record<string, unknown>).allowed_origins;
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  return [];
}

// CORS for embeddable widget - wildcard is intentional since the chat widget
// is embedded on customer websites across different domains.
// Configure CHAT_ALLOWED_ORIGINS to restrict if needed. When it is set, a
// disallowed origin gets no CORS header (browser blocks) AND the send path
// returns 403 (see chatGuards below).
chatRoutes.use(
  "/*",
  cors({
    origin: (origin) => {
      const allowed = getGlobalAllowedOrigins();
      if (allowed.length === 0) return origin; // Allow all for embeddable widget
      return allowed.includes(origin || "") ? origin : null;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Tenant-ID"],
  }),
);

/**
 * Abuse guards for the anonymous chat send path (no login required):
 *  - body-size cap (413) before any JSON parse / LLM call
 *  - global origin allow-list enforcement (403) when configured
 * Per-IP and per-tenant rate limits are applied as separate middleware, and
 * per-tenant origin enforcement happens in the handler once the tenant loads.
 */
async function chatGuards(c: Context, next: Next) {
  // Require an accurate Content-Length so the body size is bounded BEFORE we
  // buffer it. A chunked request (no Content-Length) could otherwise stream an
  // arbitrarily large body into memory before the post-read cap rejects it.
  const clHeader = c.req.header("content-length");
  if (!clHeader) {
    return c.json({ error: "Length Required" }, 411);
  }
  const len = Number(clHeader);
  if (!Number.isFinite(len) || len > MAX_CHAT_BODY_BYTES) {
    return c.json({ error: "Payload too large" }, 413);
  }

  const allowed = getGlobalAllowedOrigins();
  if (allowed.length > 0) {
    const origin = c.req.header("Origin");
    // Only enforce when an Origin header is present (browser requests). Non-
    // browser clients without an Origin are still bounded by rate limits.
    if (origin && !allowed.includes(origin)) {
      return c.json({ error: "Origin not allowed" }, 403);
    }
  }

  return next();
}

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

chatRoutes.post(
  "/",
  chatGuards,
  chatIpRateLimit(20),
  async (c) => {
  try {
    // Defensive: cap body size after read too (Content-Length can be spoofed).
    const rawText = await c.req.text();
    if (rawText.length > MAX_CHAT_BODY_BYTES) {
      return c.json({ error: "Payload too large" }, 413);
    }
    let rawBody: unknown;
    try {
      rawBody = JSON.parse(rawText);
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
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

    // Per-tenant abuse cap, keyed on the VALIDATED body tenant_id (not the
    // spoofable X-Tenant-ID header) and only after the tenant is confirmed to
    // exist. This is what actually bounds LLM cost per real tenant.
    const tenantLimit = enforceRateLimit(`chat:tenant:${tenant_id}`, 120, 60000);
    if (tenantLimit.limited) {
      c.header("Retry-After", String(tenantLimit.retryAfter));
      return c.json(
        {
          error: "Too Many Requests",
          message:
            "This assistant is receiving too many requests, please try later",
          retryAfter: tenantLimit.retryAfter,
        },
        429,
      );
    }

    // Per-tenant origin allow-list enforcement, where the tenant record carries
    // one. No schema change is required: we only read a field if it already
    // exists, and skip enforcement gracefully when it is absent.
    const tenantOrigins = extractTenantAllowedOrigins(tenant);
    if (tenantOrigins.length > 0) {
      const origin = c.req.header("Origin");
      if (origin && !tenantOrigins.includes(origin)) {
        return c.json({ error: "Origin not allowed for this tenant" }, 403);
      }
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
        logger.warn({ err }, "[CHAT] Failed to create/update contact:");
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
    logger.error({ err }, "[CHAT] Error:");
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
  },
);

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
    logger.error({ err }, "[CHAT] Config error:");
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
  logger.info(`[CHAT] Processing message with multi-provider fallback`);

  const options = {
    userMessage,
    conversationHistory,
    systemPrompt,
    tools: chatAgentFunctions,
  };

  // First call - may return tool calls
  let response: LLMResponse = await chatWithFallback(options);

  logger.info(`[CHAT] Response from ${response.provider}`);

  // Handle tool calls if present
  if (response.toolCalls && response.toolCalls.length > 0) {
    logger.info(`[CHAT] Executing ${response.toolCalls.length} tool calls`);

    const toolResults: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
      result: unknown;
    }> = [];

    for (const tc of response.toolCalls) {
      logger.info({ args: tc.args }, `[CHAT] Executing tool: ${tc.name}`);

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
