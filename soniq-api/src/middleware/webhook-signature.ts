/**
 * Webhook Signature Verification Middleware
 *
 * Verifies inbound telephony webhooks (SignalWire / Twilio-compatible LAML)
 * using the Twilio-compatible HMAC-SHA1 signature scheme:
 *
 *   base64( HMAC_SHA1( signingKey, fullUrl + concat(sortedParamKey + paramValue) ) )
 *
 * compared in constant time against the request signature header. We rely on
 * the already-installed `twilio` SDK's `validateRequest`, which implements this
 * exact algorithm (and internally retries with/without port and a legacy
 * querystring variant, so proxy port differences do not break verification).
 *
 * SignalWire's compatibility API uses the identical algorithm; the only
 * differences are the header name (`x-signalwire-signature`) and that the
 * signing key is the project's dashboard signing key. We accept either header.
 *
 * Fail-closed: with a configured signing key, a missing or invalid signature
 * returns 401 before the handler runs. The only pass-through without a
 * signature is the explicit non-production bypass when NO signing key is set.
 */

import type { Context, Next } from "hono";
import twilio from "twilio";
import { logger } from "../lib/logger.js";

function resolveSigningKey(): string | undefined {
  return (
    process.env.SIGNALWIRE_SIGNING_KEY || process.env.SIGNALWIRE_WEBHOOK_SECRET
  );
}

/**
 * Reconstruct the exact URL the provider signed.
 *
 * Prefer BACKEND_URL (the value used when configuring the webhook) over the
 * Host header, which a proxy/ngrok can rewrite and which is attacker-influenced.
 */
function reconstructUrl(c: Context): string {
  const base = (process.env.BACKEND_URL || "").replace(/\/$/, "");
  const reqUrl = new URL(c.req.url);
  return base ? base + reqUrl.pathname + reqUrl.search : c.req.url;
}

export function verifyTelephonyWebhook() {
  return async (c: Context, next: Next) => {
    const signingKey = resolveSigningKey();
    const isProduction = process.env.NODE_ENV === "production";

    if (!signingKey) {
      if (isProduction) {
        // Fail closed: never accept unverified telephony webhooks in production.
        return c.json({ error: "Webhook verification not configured" }, 401);
      }
      logger.warn("[WEBHOOK] No signing secret set - skipping signature verification (non-production only)");
      return next();
    }

    const url = reconstructUrl(c);

    // SignalWire sends application/x-www-form-urlencoded. Hono caches
    // parseBody() per request, so downstream handlers re-reading the body get
    // the same parsed object (no double-read error).
    const params: Record<string, string> = {};
    try {
      const body = await c.req.parseBody();
      for (const [k, v] of Object.entries(body)) {
        if (typeof v === "string") params[k] = v;
      }
    } catch {
      // Body could not be parsed as form data - treat as no params; signature
      // will simply fail to match and we fail closed below.
    }

    const header =
      c.req.header("x-signalwire-signature") ||
      c.req.header("X-Twilio-Signature") ||
      "";

    const ok = header
      ? twilio.validateRequest(signingKey, header, url, params)
      : false;

    if (!ok) {
      logger.warn({
        path: new URL(c.req.url).pathname,
        hasHeader: Boolean(header),
      }, "[WEBHOOK] Rejected request with invalid/missing signature");
      return c.json({ error: "Invalid webhook signature" }, 401);
    }

    return next();
  };
}
