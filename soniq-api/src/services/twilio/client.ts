import Twilio from "twilio";
import { logger } from "../../lib/logger.js";

let twilioClient: Twilio.Twilio | null = null;

/**
 * Get or create Twilio client
 */
export function getTwilioClient(): Twilio.Twilio | null {
  if (twilioClient) {
    return twilioClient;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    logger.warn("[TWILIO] Missing credentials, SMS disabled");
    return null;
  }

  twilioClient = Twilio(accountSid, authToken);
  logger.info("[TWILIO] Client initialized");

  return twilioClient;
}
