// Multi-Provider LLM Service with Fallback
// Order: Gemini -> GPT -> Groq

import { genAI, modelName as geminiModel } from "../gemini/client.js";
import { openaiClient, modelName as openaiModel } from "../openai/client.js";
import { groqClient, toolConfig } from "../groq/client.js";
import type { FunctionDeclaration, Content, Part } from "@google/generative-ai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import type { ConversationMessage } from "../../types/voice.js";

// Provider status tracking
type ProviderStatus = "available" | "rate_limited" | "error";
const providerStatus: Record<
  string,
  { status: ProviderStatus; until?: number }
> = {
  gemini: { status: "available" },
  openai: { status: "available" },
  groq: { status: "available" },
};

// Log provider availability at startup
console.log(`[LLM] Provider status at startup:`);
console.log(`  - Gemini: ${genAI ? "READY" : "NOT CONFIGURED"}`);
console.log(`  - OpenAI: ${openaiClient ? "READY" : "NOT CONFIGURED"}`);
console.log(`  - Groq: ${groqClient ? "READY" : "NOT CONFIGURED"}`);

// Rate limit cooldown (5 minutes)
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;

function isProviderAvailable(provider: string): boolean {
  const status = providerStatus[provider];
  if (!status) return false;
  if (status.status === "available") return true;
  if (status.until && Date.now() > status.until) {
    status.status = "available";
    status.until = undefined;
    console.log(`[LLM] ${provider} cooldown expired, marking available`);
    return true;
  }
  return false;
}

function markProviderRateLimited(provider: string): void {
  providerStatus[provider] = {
    status: "rate_limited",
    until: Date.now() + RATE_LIMIT_COOLDOWN_MS,
  };
  console.log(`[LLM] ${provider} rate limited, cooling down for 5 minutes`);
}

function markProviderError(provider: string): void {
  providerStatus[provider] = {
    status: "error",
    until: Date.now() + 60000, // 1 minute cooldown for errors
  };
  console.log(`[LLM] ${provider} error, cooling down for 1 minute`);
}

// Convert Gemini function declarations to OpenAI/Groq format
function toOpenAITools(
  geminiTools: FunctionDeclaration[],
): ChatCompletionTool[] {
  return geminiTools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: convertGeminiSchemaToJsonSchema(tool.parameters),
    },
  }));
}

// Convert Gemini schema types to JSON Schema
function convertGeminiSchemaToJsonSchema(
  schema: unknown,
): Record<string, unknown> {
  if (!schema || typeof schema !== "object") {
    return { type: "object", properties: {} };
  }

  const s = schema as Record<string, unknown>;

  // Map Gemini SchemaType to JSON Schema type
  // Note: SchemaType enum values are already lowercase ("object", "string", etc.)
  const validTypes = new Set([
    "string",
    "number",
    "integer",
    "boolean",
    "array",
    "object",
  ]);

  const jsonSchema: Record<string, unknown> = {};

  if (s.type) {
    const schemaType = String(s.type).toLowerCase();
    jsonSchema.type = validTypes.has(schemaType) ? schemaType : "string";
  }

  if (s.description) {
    jsonSchema.description = s.description;
  }

  if (s.properties && typeof s.properties === "object") {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(s.properties)) {
      props[key] = convertGeminiSchemaToJsonSchema(value);
    }
    jsonSchema.properties = props;
  }

  if (s.required && Array.isArray(s.required)) {
    jsonSchema.required = s.required;
  }

  if (s.items) {
    jsonSchema.items = convertGeminiSchemaToJsonSchema(s.items);
  }

  return jsonSchema;
}

// Convert conversation history to OpenAI format
function toOpenAIMessages(
  messages: ConversationMessage[],
  systemPrompt: string,
): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of messages) {
    if (msg.role === "system") continue;
    if (msg.role === "user") {
      result.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant") {
      result.push({ role: "assistant", content: msg.content });
    } else if (msg.role === "tool") {
      result.push({
        role: "tool" as const,
        tool_call_id: msg.toolCallId || "unknown",
        content: JSON.stringify(msg.toolResult || msg.content),
      });
    }
  }

  return result;
}

// Convert conversation history to Gemini format
function toGeminiContents(messages: ConversationMessage[]): Content[] {
  const contents: Content[] = [];

  for (const msg of messages) {
    if (msg.role === "system") continue;
    if (msg.role === "user") {
      contents.push({ role: "user", parts: [{ text: msg.content }] });
    } else if (msg.role === "assistant") {
      contents.push({ role: "model", parts: [{ text: msg.content }] });
    } else if (msg.role === "tool") {
      contents.push({
        role: "function",
        parts: [
          {
            functionResponse: {
              name: msg.toolName || "unknown",
              response: { result: msg.toolResult || msg.content },
            },
          },
        ],
      });
    }
  }

  return contents;
}

export interface LLMResponse {
  text: string;
  provider: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
}

export interface LLMChatOptions {
  userMessage: string;
  conversationHistory: ConversationMessage[];
  systemPrompt: string;
  tools: FunctionDeclaration[];
}

// Check if provider has initialized client
function isProviderInitialized(provider: string): boolean {
  if (provider === "gemini") return genAI !== null;
  if (provider === "openai") return openaiClient !== null;
  if (provider === "groq") return groqClient !== null;
  return false;
}

// Main chat function with fallback
export async function chatWithFallback(
  options: LLMChatOptions,
): Promise<LLMResponse> {
  const providers = [
    { name: "gemini", fn: () => chatWithGemini(options) },
    { name: "openai", fn: () => chatWithOpenAI(options) },
    { name: "groq", fn: () => chatWithGroq(options) },
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    // Skip if client not initialized (no API key)
    if (!isProviderInitialized(provider.name)) {
      console.log(
        `[LLM] Skipping ${provider.name} (not initialized - no API key)`,
      );
      continue;
    }

    // Skip if temporarily unavailable (rate limited or recent error)
    if (!isProviderAvailable(provider.name)) {
      console.log(`[LLM] Skipping ${provider.name} (cooling down)`);
      continue;
    }

    try {
      console.log(`[LLM] Trying ${provider.name}...`);
      const result = await provider.fn();
      console.log(`[LLM] ${provider.name} succeeded`);
      return result;
    } catch (error: unknown) {
      // Extract error message safely
      let errMsg = "Unknown error";
      if (error instanceof Error) {
        errMsg = error.message;
      } else if (typeof error === "object" && error !== null) {
        errMsg = JSON.stringify(error).slice(0, 200);
      } else {
        errMsg = String(error);
      }

      console.error(`[LLM] ${provider.name} failed: ${errMsg}`);
      errors.push(`${provider.name}: ${errMsg}`);

      // Check for rate limiting indicators
      const isRateLimit =
        errMsg.includes("429") ||
        errMsg.includes("rate") ||
        errMsg.includes("quota") ||
        errMsg.includes("RESOURCE_EXHAUSTED");

      if (isRateLimit) {
        markProviderRateLimited(provider.name);
      } else {
        markProviderError(provider.name);
      }

      // Continue to next provider
      console.log(`[LLM] Falling back to next provider...`);
    }
  }

  // All providers failed
  console.error(`[LLM] All providers failed:`, errors);
  throw new Error(`All LLM providers failed: ${errors.join("; ")}`);
}

// Gemini implementation
async function chatWithGemini(options: LLMChatOptions): Promise<LLMResponse> {
  if (!genAI) {
    throw new Error("Gemini client not initialized");
  }

  const { userMessage, conversationHistory, systemPrompt, tools } = options;

  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 500,
    },
  });

  const contents = toGeminiContents(conversationHistory);
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const chatSession = model.startChat({
    history: contents.slice(0, -1),
    systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
    tools: [{ functionDeclarations: tools }],
  });

  const result = await chatSession.sendMessage(userMessage);
  const response = result.response;

  const functionCalls = response.functionCalls();
  if (functionCalls && functionCalls.length > 0) {
    return {
      text: "",
      provider: "gemini",
      toolCalls: functionCalls.map((fc, i) => ({
        id: `gemini_${Date.now()}_${i}`,
        name: fc.name,
        args: fc.args as Record<string, unknown>,
      })),
    };
  }

  return {
    text: response.text(),
    provider: "gemini",
  };
}

// OpenAI implementation
async function chatWithOpenAI(options: LLMChatOptions): Promise<LLMResponse> {
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized");
  }

  const { userMessage, conversationHistory, systemPrompt, tools } = options;

  const messages = toOpenAIMessages(conversationHistory, systemPrompt);
  messages.push({ role: "user", content: userMessage });

  const openaiTools = toOpenAITools(tools);

  const response = await openaiClient.chat.completions.create({
    model: openaiModel,
    messages,
    tools: openaiTools.length > 0 ? openaiTools : undefined,
    temperature: 0.4,
    max_tokens: 500,
  });

  const choice = response.choices[0];
  const message = choice.message;

  if (message.tool_calls && message.tool_calls.length > 0) {
    return {
      text: message.content || "",
      provider: "openai",
      toolCalls: message.tool_calls.map((tc) => {
        // OpenAI SDK types - cast to access function property safely
        const toolCall = tc as {
          id: string;
          function: { name: string; arguments: string };
        };
        return {
          id: toolCall.id,
          name: toolCall.function.name,
          args: JSON.parse(toolCall.function.arguments || "{}"),
        };
      }),
    };
  }

  return {
    text: message.content || "",
    provider: "openai",
  };
}

// Groq implementation
async function chatWithGroq(options: LLMChatOptions): Promise<LLMResponse> {
  if (!groqClient) {
    throw new Error("Groq client not initialized");
  }

  const { userMessage, conversationHistory, systemPrompt, tools } = options;

  const messages = toOpenAIMessages(conversationHistory, systemPrompt);
  messages.push({ role: "user", content: userMessage });

  const groqTools = toOpenAITools(tools);

  const response = await groqClient.chat.completions.create({
    model: toolConfig.model,
    messages: messages as Parameters<
      typeof groqClient.chat.completions.create
    >[0]["messages"],
    tools:
      groqTools.length > 0
        ? (groqTools as Parameters<
            typeof groqClient.chat.completions.create
          >[0]["tools"])
        : undefined,
    temperature: 0.4,
    max_tokens: 500,
  });

  const choice = response.choices[0];
  const message = choice.message;

  if (message.tool_calls && message.tool_calls.length > 0) {
    return {
      text: message.content || "",
      provider: "groq",
      toolCalls: message.tool_calls.map((tc) => {
        // Groq SDK has slightly different typing - cast to access function property
        const toolCall = tc as {
          id: string;
          function: { name: string; arguments: string };
        };
        return {
          id: toolCall.id,
          name: toolCall.function.name,
          args: JSON.parse(toolCall.function.arguments || "{}"),
        };
      }),
    };
  }

  return {
    text: message.content || "",
    provider: "groq",
  };
}

// Send tool results back and get final response
export async function sendToolResults(
  provider: string,
  options: LLMChatOptions,
  toolResults: Array<{ id: string; name: string; result: unknown }>,
): Promise<LLMResponse> {
  // Add tool results to history
  const updatedHistory = [...options.conversationHistory];
  for (const tr of toolResults) {
    const resultStr =
      typeof tr.result === "string" ? tr.result : JSON.stringify(tr.result);
    updatedHistory.push({
      role: "tool",
      content: resultStr,
      toolName: tr.name,
      toolCallId: tr.id,
      toolResult: resultStr,
      timestamp: new Date(),
    });
  }

  // Call with updated history (no user message this time, just continue)
  const updatedOptions = {
    ...options,
    conversationHistory: updatedHistory,
    userMessage: "", // Empty - we're continuing after tool call
  };

  // Try the same provider first, then fallback
  const providers =
    provider === "gemini"
      ? ["gemini", "openai", "groq"]
      : provider === "openai"
        ? ["openai", "groq", "gemini"]
        : ["groq", "openai", "gemini"];

  for (const p of providers) {
    if (!isProviderAvailable(p)) continue;

    try {
      if (p === "gemini") {
        return await sendGeminiToolResults(options, toolResults);
      } else if (p === "openai") {
        return await sendOpenAIToolResults(updatedOptions);
      } else {
        return await sendGroqToolResults(updatedOptions);
      }
    } catch (error) {
      console.error(`[LLM] ${p} tool result failed:`, error);
    }
  }

  throw new Error("All providers failed for tool results");
}

async function sendGeminiToolResults(
  options: LLMChatOptions,
  toolResults: Array<{ id: string; name: string; result: unknown }>,
): Promise<LLMResponse> {
  if (!genAI) throw new Error("Gemini not initialized");

  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
  });

  const contents = toGeminiContents(options.conversationHistory);
  contents.push({ role: "user", parts: [{ text: options.userMessage }] });

  const chatSession = model.startChat({
    history: contents,
    systemInstruction: {
      role: "user",
      parts: [{ text: options.systemPrompt }],
    },
    tools: [{ functionDeclarations: options.tools }],
  });

  const functionResponses: Part[] = toolResults.map((tr) => ({
    functionResponse: {
      name: tr.name,
      response: { result: tr.result },
    },
  }));

  const result = await chatSession.sendMessage(functionResponses);
  return { text: result.response.text(), provider: "gemini" };
}

async function sendOpenAIToolResults(
  options: LLMChatOptions,
): Promise<LLMResponse> {
  if (!openaiClient) throw new Error("OpenAI not initialized");

  const messages = toOpenAIMessages(
    options.conversationHistory,
    options.systemPrompt,
  );

  const response = await openaiClient.chat.completions.create({
    model: openaiModel,
    messages,
    temperature: 0.4,
    max_tokens: 500,
  });

  return {
    text: response.choices[0].message.content || "",
    provider: "openai",
  };
}

async function sendGroqToolResults(
  options: LLMChatOptions,
): Promise<LLMResponse> {
  if (!groqClient) throw new Error("Groq not initialized");

  const messages = toOpenAIMessages(
    options.conversationHistory,
    options.systemPrompt,
  );

  const response = await groqClient.chat.completions.create({
    model: toolConfig.model,
    messages: messages as Parameters<
      typeof groqClient.chat.completions.create
    >[0]["messages"],
    temperature: 0.4,
    max_tokens: 500,
  });

  return { text: response.choices[0].message.content || "", provider: "groq" };
}

// Get provider status for health checks
export function getProviderStatus(): Record<
  string,
  { status: string; model: string | null }
> {
  return {
    gemini: {
      status: isProviderAvailable("gemini")
        ? "available"
        : providerStatus.gemini.status,
      model: genAI ? geminiModel : null,
    },
    openai: {
      status: isProviderAvailable("openai")
        ? "available"
        : providerStatus.openai.status,
      model: openaiClient ? openaiModel : null,
    },
    groq: {
      status: isProviderAvailable("groq")
        ? "available"
        : providerStatus.groq.status,
      model: groqClient ? toolConfig.model : null,
    },
  };
}
