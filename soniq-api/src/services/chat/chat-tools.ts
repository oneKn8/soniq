// Chat-specific Tool Definitions
// Uses Gemini function declaration format for the chat widget LLM

import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import type { ToolExecutionContext } from "../../types/voice.js";
import { executeTool as executeVoiceTool } from "../gemini/tools.js";
import { updateVisitorInfo, type VisitorInfo } from "./conversation-store.js";

// Shared tool declarations (used by both voice agent and chat widget)
const sharedFunctions: FunctionDeclaration[] = [
  {
    name: "check_availability",
    description:
      "Check available appointment slots for a date. Call this when customer asks about availability, open times, or when they can book.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: "Date in YYYY-MM-DD format.",
        },
        service_type: {
          type: SchemaType.STRING,
          description: "Optional service type like haircut, consultation.",
        },
      },
      required: ["date"],
    },
  },
  {
    name: "create_booking",
    description:
      "Create an appointment booking. Only call after customer confirms a specific time slot and provides their name.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        customer_name: {
          type: SchemaType.STRING,
          description: "Customer's name.",
        },
        customer_phone: {
          type: SchemaType.STRING,
          description: "Phone number. Use caller ID if available.",
        },
        date: {
          type: SchemaType.STRING,
          description: "Booking date in YYYY-MM-DD format.",
        },
        time: {
          type: SchemaType.STRING,
          description: "Time in 24-hour HH:MM format.",
        },
        service_type: {
          type: SchemaType.STRING,
          description: "Type of service.",
        },
        notes: {
          type: SchemaType.STRING,
          description: "Special requests or notes.",
        },
      },
      required: ["customer_name", "customer_phone", "date", "time"],
    },
  },
  {
    name: "create_order",
    description:
      "Place a food order. Must have customer name, items, and order type (pickup or delivery) before calling.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        customer_name: {
          type: SchemaType.STRING,
          description: "Customer's name for the order.",
        },
        customer_phone: {
          type: SchemaType.STRING,
          description: "Leave empty - system uses caller ID automatically.",
        },
        order_type: {
          type: SchemaType.STRING,
          description: "Must be 'pickup' or 'delivery'.",
        },
        items: {
          type: SchemaType.STRING,
          description: "Comma-separated list of items.",
        },
        delivery_address: {
          type: SchemaType.STRING,
          description: "Required for delivery orders.",
        },
        special_instructions: {
          type: SchemaType.STRING,
          description: "Optional special requests.",
        },
      },
      required: ["customer_name", "order_type", "items"],
    },
  },
];

// Chat-specific function declarations
const chatOnlyFunctions: FunctionDeclaration[] = [
  {
    name: "collect_contact_info",
    description:
      "Collect visitor contact information. Use when: (1) creating a booking/order and you need their name, (2) visitor offers their email or phone, (3) you need to reach them about their request. Ask naturally in conversation rather than all at once.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Visitor's name. Example: 'John Smith'",
        },
        email: {
          type: SchemaType.STRING,
          description: "Email address. Example: 'john@example.com'",
        },
        phone: {
          type: SchemaType.STRING,
          description: "Phone number. Example: '555-123-4567'",
        },
      },
    },
  },
  {
    name: "request_callback",
    description:
      "Request a human callback. Use when: (1) visitor explicitly asks to speak with someone, (2) issue is too complex for chat, (3) visitor wants to schedule a call with staff.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        reason: {
          type: SchemaType.STRING,
          description:
            "Why they want a callback. Example: 'wants to discuss pricing options'",
        },
        preferred_time: {
          type: SchemaType.STRING,
          description:
            "When they prefer to be called. Example: 'tomorrow morning', 'anytime after 2pm'",
        },
      },
      required: ["reason"],
    },
  },
];

// Combined chat tools: shared tools + chat-specific
export const chatAgentFunctions: FunctionDeclaration[] = [
  ...sharedFunctions,
  ...chatOnlyFunctions,
];

// Chat tool execution with chat-specific handlers
export async function executeChatTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext & { sessionId: string },
): Promise<unknown> {
  // Handle chat-specific tools
  if (toolName === "collect_contact_info") {
    return executeCollectContactInfo(args, context);
  }

  if (toolName === "request_callback") {
    return executeRequestCallback(args, context);
  }

  // Delegate to voice tool executor for shared tools
  return executeVoiceTool(toolName, args, context);
}

// Collect contact info handler
async function executeCollectContactInfo(
  args: Record<string, unknown>,
  context: ToolExecutionContext & { sessionId: string },
): Promise<{ success: boolean; message: string; info: VisitorInfo }> {
  const info: VisitorInfo = {};

  if (args.name && typeof args.name === "string") {
    info.name = args.name;
  }
  if (args.email && typeof args.email === "string") {
    info.email = args.email;
  }
  if (args.phone && typeof args.phone === "string") {
    info.phone = args.phone;
  }

  // Update session with visitor info
  updateVisitorInfo(context.sessionId, info);

  console.log(
    `[CHAT] Collected contact info for session ${context.sessionId}:`,
    info,
  );

  return {
    success: true,
    message: "Contact information saved",
    info,
  };
}

// Request callback handler
async function executeRequestCallback(
  args: Record<string, unknown>,
  context: ToolExecutionContext & { sessionId: string },
): Promise<{ success: boolean; message: string }> {
  const reason = args.reason as string;
  const preferredTime = args.preferred_time as string | undefined;

  console.log(
    `[CHAT] Callback requested - Tenant: ${context.tenantId}, Session: ${context.sessionId}, Reason: ${reason}, Time: ${preferredTime || "any"}`,
  );

  return {
    success: true,
    message: preferredTime
      ? `We'll call you ${preferredTime}. A team member will reach out soon.`
      : "We'll have someone call you back as soon as possible.",
  };
}
