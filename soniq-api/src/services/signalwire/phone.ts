/**
 * SignalWire Phone Number Management
 * Handles provisioning, searching, and configuring phone numbers
 */

const SIGNALWIRE_SPACE_URL = process.env.SIGNALWIRE_SPACE_URL || "";
const SIGNALWIRE_PROJECT_ID = process.env.SIGNALWIRE_PROJECT_ID || "";
const SIGNALWIRE_API_TOKEN = process.env.SIGNALWIRE_API_TOKEN || "";

const BASE_URL = `https://${SIGNALWIRE_SPACE_URL}/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}`;

function appendWebhookSecret(url: string): string {
  const secret = process.env.SIGNALWIRE_WEBHOOK_SECRET;
  if (!secret) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("webhook_secret", secret);
    return parsed.toString();
  } catch {
    return url;
  }
}

function buildStatusCallbackUrl(voiceUrl: string): string {
  try {
    const parsed = new URL(voiceUrl);
    if (parsed.pathname.endsWith("/voice")) {
      parsed.pathname = parsed.pathname.slice(0, -"/voice".length) + "/status";
    } else {
      parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/status`;
    }
    return parsed.toString();
  } catch {
    return voiceUrl.endsWith("/voice")
      ? `${voiceUrl.slice(0, -"/voice".length)}/status`
      : `${voiceUrl}/status`;
  }
}

async function signalwireRequest(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: Record<string, string>,
): Promise<Response> {
  const auth = Buffer.from(
    `${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`,
  ).toString("base64");

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  if (body) {
    options.body = new URLSearchParams(body).toString();
  }

  return fetch(`${BASE_URL}${path}`, options);
}

/**
 * Search for available phone numbers
 */
export async function searchAvailableNumbers(
  areaCode?: string,
  country: string = "US",
): Promise<{ numbers: string[]; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (areaCode) {
      params.set("AreaCode", areaCode);
    }
    params.set("SmsEnabled", "true");
    params.set("VoiceEnabled", "true");

    const response = await signalwireRequest(
      `/AvailablePhoneNumbers/${country}/Local.json?${params.toString()}`,
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[SIGNALWIRE] Search error:", error);
      return { numbers: [], error: "Failed to search numbers" };
    }

    const data = (await response.json()) as {
      available_phone_numbers?: { phone_number: string }[];
    };

    const numbers = (data.available_phone_numbers || [])
      .map((n) => n.phone_number)
      .slice(0, 10);

    return { numbers };
  } catch (e) {
    console.error("[SIGNALWIRE] Search exception:", e);
    return { numbers: [], error: "Failed to search numbers" };
  }
}

/**
 * Provision (purchase) a phone number
 */
export async function provisionNumber(
  phoneNumber: string,
): Promise<{ sid?: string; error?: string }> {
  try {
    const response = await signalwireRequest(
      "/IncomingPhoneNumbers.json",
      "POST",
      {
        PhoneNumber: phoneNumber,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[SIGNALWIRE] Provision error:", error);
      return { error: "Failed to provision number" };
    }

    const data = (await response.json()) as { sid?: string };
    return { sid: data.sid };
  } catch (e) {
    console.error("[SIGNALWIRE] Provision exception:", e);
    return { error: "Failed to provision number" };
  }
}

/**
 * Configure webhooks for an incoming number
 */
export async function configureNumberWebhooks(
  sid: string,
  webhookUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const voiceUrl = appendWebhookSecret(webhookUrl);
    const statusCallbackUrl = appendWebhookSecret(
      buildStatusCallbackUrl(webhookUrl),
    );

    const response = await signalwireRequest(
      `/IncomingPhoneNumbers/${sid}.json`,
      "POST",
      {
        VoiceUrl: voiceUrl,
        VoiceMethod: "POST",
        StatusCallback: statusCallbackUrl,
        StatusCallbackMethod: "POST",
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[SIGNALWIRE] Configure error:", error);
      return { success: false, error: "Failed to configure webhooks" };
    }

    return { success: true };
  } catch (e) {
    console.error("[SIGNALWIRE] Configure exception:", e);
    return { success: false, error: "Failed to configure webhooks" };
  }
}

/**
 * Release (delete) a phone number
 */
export async function releaseNumber(
  sid: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await signalwireRequest(
      `/IncomingPhoneNumbers/${sid}.json`,
      "DELETE",
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      console.error("[SIGNALWIRE] Release error:", error);
      return { success: false, error: "Failed to release number" };
    }

    return { success: true };
  } catch (e) {
    console.error("[SIGNALWIRE] Release exception:", e);
    return { success: false, error: "Failed to release number" };
  }
}

/**
 * Get details about a phone number
 */
export async function getNumberDetails(
  sid: string,
): Promise<{
  number?: { phoneNumber: string; status: string };
  error?: string;
}> {
  try {
    const response = await signalwireRequest(
      `/IncomingPhoneNumbers/${sid}.json`,
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[SIGNALWIRE] Get details error:", error);
      return { error: "Failed to get number details" };
    }

    const data = (await response.json()) as {
      phone_number?: string;
      status?: string;
    };
    return {
      number: {
        phoneNumber: data.phone_number || "",
        status: data.status || "unknown",
      },
    };
  } catch (e) {
    console.error("[SIGNALWIRE] Get details exception:", e);
    return { error: "Failed to get number details" };
  }
}
