// Vapi Assistant Configuration
// Builds dynamic assistant configuration per tenant

import type { Tenant } from "../../types/database.js";

// Tool definitions in Vapi format
const vapiTools = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "Check available appointment slots for a date. Call this when customer asks about availability, open times, or when they can book.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description:
              "Date in YYYY-MM-DD format. Convert spoken dates to this format.",
          },
          service_type: {
            type: "string",
            description:
              "Optional service type like 'haircut', 'consultation'.",
          },
        },
        required: ["date"],
      },
    },
    async: false,
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description:
        "Create an appointment booking. ONLY call after customer confirms a specific time slot and provides their name.",
      parameters: {
        type: "object",
        properties: {
          customer_name: {
            type: "string",
            description: "Customer's name.",
          },
          customer_phone: {
            type: "string",
            description: "Phone number. Use caller ID if available.",
          },
          date: {
            type: "string",
            description: "Booking date in YYYY-MM-DD format.",
          },
          time: {
            type: "string",
            description: "Time in 24-hour HH:MM format.",
          },
          service_type: {
            type: "string",
            description: "Type of service.",
          },
          notes: {
            type: "string",
            description: "Special requests or notes.",
          },
        },
        required: ["customer_name", "customer_phone", "date", "time"],
      },
    },
    async: false,
  },
  {
    type: "function",
    function: {
      name: "create_order",
      description:
        "Place a food order. Must have: customer_name, items, order_type (pickup/delivery). For delivery, also need delivery_address.",
      parameters: {
        type: "object",
        properties: {
          customer_name: {
            type: "string",
            description: "Customer's name for the order.",
          },
          customer_phone: {
            type: "string",
            description: "Phone number. Leave empty to use caller ID.",
          },
          order_type: {
            type: "string",
            enum: ["pickup", "delivery"],
            description: "Must be 'pickup' or 'delivery'.",
          },
          items: {
            type: "string",
            description: "Comma-separated list of items with sizes.",
          },
          delivery_address: {
            type: "string",
            description: "Full street address. Required for delivery orders.",
          },
          special_instructions: {
            type: "string",
            description: "Optional special requests.",
          },
        },
        required: ["customer_name", "order_type", "items"],
      },
    },
    async: false,
  },
];

// Build system prompt from tenant config
export function buildSystemPrompt(tenant: Tenant): string {
  const agentName = tenant.agent_name || "AI Assistant";
  const businessName = tenant.business_name || "the business";
  const industry = tenant.industry || "general";
  const personality = tenant.agent_personality || "friendly and professional";

  const industryPrompts: Record<string, string> = {
    restaurant: `You handle food orders, reservations, and menu questions. Be helpful with menu recommendations.`,
    salon: `You handle appointment bookings, service inquiries, and availability checks. Be knowledgeable about services offered.`,
    medical: `You handle appointment scheduling and general inquiries. Be professional and HIPAA-conscious. Never provide medical advice.`,
    general: `You handle appointment bookings, inquiries, and general customer service.`,
  };

  const industryContext = industryPrompts[industry] || industryPrompts.general;

  return `You are ${agentName}, the AI phone assistant for ${businessName}.

PERSONALITY: ${personality}

ROLE: ${industryContext}

VOICE GUIDELINES:
- Keep responses conversational and concise (1-3 sentences max)
- Use natural speech patterns, not robotic or formal language
- When interrupted, acknowledge gracefully and let the caller continue
- If you don't understand, ask for clarification naturally

IMPORTANT RULES:
- NEVER make up information about the business
- NEVER provide placeholder values like "unknown" - ask the customer instead
- If you can't help, offer to transfer to a human
- Always confirm important details before taking action

CURRENT DATE: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;
}

// Build transient assistant config for Vapi
export function buildAssistantConfig(
  tenant: Tenant,
  serverUrl: string,
): Record<string, unknown> {
  const voiceId =
    tenant.voice_config?.voice_id || "a0e99841-438c-4a64-b679-ae501e7d6091"; // Default: Barbershop Man

  return {
    name: `${tenant.business_name} Assistant`,
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(tenant),
        },
      ],
    },
    voice: {
      provider: "cartesia",
      voiceId: voiceId,
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
    },
    firstMessage:
      tenant.greeting_standard ||
      `Hello! Thanks for calling ${tenant.business_name}. How can I help you today?`,
    serverUrl: `${serverUrl}/vapi/webhook`,
    serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET,
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 1800, // 30 minutes max
    backgroundSound: "off",
    backchannelingEnabled: true,
    recordingEnabled: true,
    endCallFunctionEnabled: true,
    dialKeypadFunctionEnabled: false,
    hipaaEnabled: tenant.industry === "medical",
    clientMessages: [
      "transcript",
      "hang",
      "function-call",
      "speech-update",
      "metadata",
      "conversation-update",
    ],
    serverMessages: [
      "end-of-call-report",
      "status-update",
      "hang",
      "function-call",
      "tool-calls",
      "transfer-destination-request",
    ],
    // Tool configuration
    tools: vapiTools.map((tool) => ({
      ...tool,
      server: { url: `${serverUrl}/vapi/tools` },
    })),
  };
}

// Build transfer destination for escalation
export function buildTransferDestination(
  escalationPhone: string,
): Record<string, unknown> {
  return {
    type: "number",
    number: escalationPhone,
    message: "I'm transferring you to a team member now. Please hold.",
  };
}
