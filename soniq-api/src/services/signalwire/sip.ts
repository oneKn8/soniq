/**
 * SignalWire SIP Endpoint Management
 * Handles creating and managing SIP trunks for businesses with VOIP/PBX systems
 */

import { randomBytes } from "crypto";
import { logger } from "../../lib/logger.js";

const SIGNALWIRE_SPACE_URL = process.env.SIGNALWIRE_SPACE_URL || "";
const SIGNALWIRE_PROJECT_ID = process.env.SIGNALWIRE_PROJECT_ID || "";
const SIGNALWIRE_API_TOKEN = process.env.SIGNALWIRE_API_TOKEN || "";

const RELAY_BASE_URL = `https://${SIGNALWIRE_SPACE_URL}/api/relay/rest`;

async function relayRequest(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: Record<string, unknown>,
): Promise<Response> {
  const auth = Buffer.from(
    `${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`,
  ).toString("base64");

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetch(`${RELAY_BASE_URL}${path}`, options);
}

/**
 * Generate a secure random password for SIP authentication
 */
function generateSipPassword(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Generate a unique SIP username from tenant ID
 */
function generateSipUsername(tenantId: string): string {
  const short = tenantId.replace(/-/g, "").substring(0, 12);
  return `lum-${short}`;
}

export interface SipEndpointResult {
  endpointId: string;
  sipUri: string;
  username: string;
  password: string;
}

/**
 * Create a SIP endpoint (domain app) on SignalWire for a tenant
 * This endpoint receives SIP INVITE from the business PBX
 */
export async function createSipEndpoint(
  tenantId: string,
): Promise<{ endpoint?: SipEndpointResult; error?: string }> {
  try {
    const username = generateSipUsername(tenantId);
    const password = generateSipPassword();

    // Create a SIP endpoint on SignalWire
    // This uses the Relay REST API for domain app management
    const response = await relayRequest("/endpoints/sip", "POST", {
      username,
      password,
      caller_id: username,
      encryption: "optional",
      codecs: ["PCMU", "PCMA", "OPUS"],
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ errorText }, "[SIP] Failed to create endpoint:");
      return { error: "Failed to create SIP endpoint" };
    }

    const data = (await response.json()) as { id?: string };

    if (!data.id) {
      return { error: "No endpoint ID returned from SignalWire" };
    }

    // Build the SIP URI for the business to configure in their PBX
    const sipUri = `${username}@${SIGNALWIRE_SPACE_URL}`;

    logger.info(`[SIP] Created endpoint for tenant ${tenantId}: ${sipUri}`);

    return {
      endpoint: {
        endpointId: data.id,
        sipUri,
        username,
        password,
      },
    };
  } catch (e) {
    logger.error({ e }, "[SIP] Create endpoint exception:");
    return { error: "Failed to create SIP endpoint" };
  }
}

/**
 * Configure SIP endpoint routing to point to our voice webhook
 */
export async function configureSipRouting(
  endpointId: string,
  webhookUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await relayRequest(`/endpoints/sip/${endpointId}`, "PUT", {
      // Route incoming SIP calls to our voice webhook
      call_handler: "laml_webhooks",
      call_request_url: webhookUrl,
      call_request_method: "POST",
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ errorText }, "[SIP] Failed to configure routing:");
      return { success: false, error: "Failed to configure SIP routing" };
    }

    logger.info(`[SIP] Routing configured for endpoint ${endpointId}`);
    return { success: true };
  } catch (e) {
    logger.error({ e }, "[SIP] Configure routing exception:");
    return { success: false, error: "Failed to configure SIP routing" };
  }
}

/**
 * Get SIP endpoint status (check if registered)
 */
export async function getSipEndpointStatus(
  endpointId: string,
): Promise<{ registered: boolean; error?: string }> {
  try {
    const response = await relayRequest(`/endpoints/sip/${endpointId}`);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ errorText }, "[SIP] Failed to get endpoint status:");
      return { registered: false, error: "Failed to check SIP status" };
    }

    const data = (await response.json()) as {
      id?: string;
      online?: boolean;
    };

    return { registered: !!data.online };
  } catch (e) {
    logger.error({ e }, "[SIP] Get status exception:");
    return { registered: false, error: "Failed to check SIP status" };
  }
}

/**
 * Delete a SIP endpoint
 */
export async function deleteSipEndpoint(
  endpointId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await relayRequest(
      `/endpoints/sip/${endpointId}`,
      "DELETE",
    );

    if (!response.ok && response.status !== 204) {
      const errorText = await response.text();
      logger.error({ errorText }, "[SIP] Failed to delete endpoint:");
      return { success: false, error: "Failed to delete SIP endpoint" };
    }

    return { success: true };
  } catch (e) {
    logger.error({ e }, "[SIP] Delete endpoint exception:");
    return { success: false, error: "Failed to delete SIP endpoint" };
  }
}
