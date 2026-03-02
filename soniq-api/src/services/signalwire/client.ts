// SignalWire Client Setup
// Telephony provider (Twilio-compatible API, 50% cheaper)

const SIGNALWIRE_PROJECT_ID = process.env.SIGNALWIRE_PROJECT_ID;
const SIGNALWIRE_API_TOKEN = process.env.SIGNALWIRE_API_TOKEN;
const SIGNALWIRE_SPACE_URL = process.env.SIGNALWIRE_SPACE_URL;
const SIGNALWIRE_PHONE_NUMBER = process.env.SIGNALWIRE_PHONE_NUMBER;

if (!SIGNALWIRE_PROJECT_ID || !SIGNALWIRE_API_TOKEN || !SIGNALWIRE_SPACE_URL) {
  console.warn("[SIGNALWIRE] Warning: SignalWire credentials not fully set");
}

export const signalwireConfig = {
  projectId: SIGNALWIRE_PROJECT_ID,
  apiToken: SIGNALWIRE_API_TOKEN,
  spaceUrl: SIGNALWIRE_SPACE_URL,
  phoneNumber: SIGNALWIRE_PHONE_NUMBER,
};

// SignalWire REST API base URL
export const signalwireApiUrl = SIGNALWIRE_SPACE_URL
  ? `https://${SIGNALWIRE_SPACE_URL}/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}`
  : null;

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

// Escape special characters for XML attribute values
function escapeXmlAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Generate SWML (SignalWire Markup Language) for incoming calls
export function generateStreamXml(websocketUrl: string): string {
  // SignalWire uses TwiML-compatible XML
  // URL must be XML-escaped since & is used in query params
  const escapedUrl = escapeXmlAttr(websocketUrl);
  // Using L16@24000h for high quality audio (24kHz 16-bit linear PCM)
  // This matches Cartesia output format for clear voice quality
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapedUrl}" codec="L16@24000h">
      <Parameter name="source" value="soniq"/>
    </Stream>
  </Connect>
</Response>`;
}

// Generate SWML for playing audio while connecting
export function generateConnectingXml(
  websocketUrl: string,
  greeting?: string,
): string {
  const escapedUrl = escapeXmlAttr(websocketUrl);
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>`;

  if (greeting) {
    xml += `
  <Say voice="Polly.Joanna">${greeting}</Say>`;
  }

  xml += `
  <Connect>
    <Stream url="${escapedUrl}" codec="L16@24000h">
      <Parameter name="source" value="soniq"/>
    </Stream>
  </Connect>
</Response>`;

  return xml;
}

// Transfer call to a phone number or SIP URI
export function generateTransferXml(destination: string): string {
  const isSip = destination.startsWith("sip:") || destination.includes("@");
  const dialTarget = isSip
    ? `<Sip>${destination.startsWith("sip:") ? destination : `sip:${destination}`}</Sip>`
    : `<Number>${destination}</Number>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Transferring you now. Please hold.</Say>
  <Dial>${dialTarget}</Dial>
</Response>`;
}

// Get SignalWire REST API auth header
function getAuthHeader(): string {
  if (!SIGNALWIRE_PROJECT_ID || !SIGNALWIRE_API_TOKEN) {
    throw new Error("SignalWire credentials not configured");
  }
  const credentials = Buffer.from(
    `${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`,
  ).toString("base64");
  return `Basic ${credentials}`;
}

// Get phone number SID from SignalWire
export async function getPhoneNumberSid(
  phoneNumber: string,
): Promise<string | null> {
  if (!signalwireApiUrl) {
    throw new Error("SignalWire not configured");
  }

  const response = await fetch(
    `${signalwireApiUrl}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
    {
      headers: {
        Authorization: getAuthHeader(),
      },
    },
  );

  if (!response.ok) {
    console.error(
      "[SIGNALWIRE] Failed to get phone numbers:",
      await response.text(),
    );
    return null;
  }

  const data = (await response.json()) as {
    incoming_phone_numbers?: { sid: string }[];
  };
  if (data.incoming_phone_numbers && data.incoming_phone_numbers.length > 0) {
    return data.incoming_phone_numbers[0].sid;
  }
  return null;
}

// Configure phone number webhook via SignalWire REST API
export async function configurePhoneNumberWebhook(
  phoneNumberSid: string,
  voiceUrl: string,
  statusCallbackUrl?: string,
): Promise<boolean> {
  if (!signalwireApiUrl) {
    throw new Error("SignalWire not configured");
  }

  const params = new URLSearchParams();
  params.append("VoiceUrl", voiceUrl);
  params.append("VoiceMethod", "POST");
  if (statusCallbackUrl) {
    params.append("StatusCallback", statusCallbackUrl);
    params.append("StatusCallbackMethod", "POST");
  }

  const response = await fetch(
    `${signalwireApiUrl}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
    {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  if (!response.ok) {
    console.error(
      "[SIGNALWIRE] Failed to configure webhook:",
      await response.text(),
    );
    return false;
  }

  console.log("[SIGNALWIRE] Phone number webhook configured successfully");
  return true;
}

// Transfer an active call to another phone number
export async function transferCall(
  callSid: string,
  destinationPhone: string,
  backendUrl: string,
): Promise<{ success: boolean; error?: string }> {
  if (!signalwireApiUrl) {
    return { success: false, error: "SignalWire not configured" };
  }

  try {
    const credentials = Buffer.from(
      `${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`,
    ).toString("base64");

    // Create a TwiML URL that will dial the destination
    // SignalWire will fetch this URL and execute the transfer
    const transferUrl = new URL(`${backendUrl}/signalwire/transfer`);
    transferUrl.searchParams.set("to", destinationPhone);
    if (process.env.SIGNALWIRE_WEBHOOK_SECRET) {
      transferUrl.searchParams.set(
        "webhook_secret",
        process.env.SIGNALWIRE_WEBHOOK_SECRET,
      );
    }
    const twimlUrl = transferUrl.toString();

    const response = await fetch(`${signalwireApiUrl}/Calls/${callSid}.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `Url=${encodeURIComponent(twimlUrl)}&Method=POST`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SIGNALWIRE] Transfer failed:", errorText);
      return { success: false, error: errorText };
    }

    console.log(
      `[SIGNALWIRE] Call ${callSid} transfer initiated to ${destinationPhone}`,
    );
    return { success: true };
  } catch (error) {
    console.error("[SIGNALWIRE] Transfer error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Setup SignalWire phone number with webhooks
export async function setupSignalWirePhone(backendUrl: string): Promise<void> {
  const phoneNumber = SIGNALWIRE_PHONE_NUMBER;
  if (!phoneNumber) {
    throw new Error("SIGNALWIRE_PHONE_NUMBER not set");
  }

  console.log(`[SIGNALWIRE] Setting up phone number: ${phoneNumber}`);

  // Get phone number SID
  const sid = await getPhoneNumberSid(phoneNumber);
  if (!sid) {
    throw new Error(
      `Phone number ${phoneNumber} not found in SignalWire account`,
    );
  }

  console.log(`[SIGNALWIRE] Found phone SID: ${sid}`);

  // Configure webhooks
  const voiceUrl = appendWebhookSecret(`${backendUrl}/signalwire/voice`);
  const statusUrl = appendWebhookSecret(`${backendUrl}/signalwire/status`);

  const success = await configurePhoneNumberWebhook(sid, voiceUrl, statusUrl);
  if (!success) {
    throw new Error("Failed to configure phone number webhook");
  }

  console.log(`[SIGNALWIRE] Webhook configured: ${voiceUrl}`);
}
