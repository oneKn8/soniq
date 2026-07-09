/**
 * Rate Limiting Middleware
 * Protects against brute force and DDoS attacks
 */

import { Context, Next } from "hono";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production for multi-instance)
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 60000); // Clean every minute

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  keyGenerator?: (c: Context) => string; // Custom key generator
  skip?: (c: Context) => boolean; // Skip rate limiting for certain requests
  message?: string; // Custom error message
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  max: 60, // 60 requests per minute
  message: "Too many requests, please try again later",
};

/**
 * Create rate limiting middleware
 */
export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const options = { ...defaultConfig, ...config };

  return async (c: Context, next: Next) => {
    // Check if we should skip
    if (options.skip?.(c)) {
      return next();
    }

    // Generate key for this client
    const key = options.keyGenerator
      ? options.keyGenerator(c)
      : getClientKey(c);

    const now = Date.now();
    let entry = store.get(key);

    // Create or reset entry if expired
    if (!entry || entry.resetAt <= now) {
      entry = {
        count: 0,
        resetAt: now + options.windowMs,
      };
    }

    // Increment count
    entry.count++;
    store.set(key, entry);

    // Calculate remaining
    const remaining = Math.max(0, options.max - entry.count);
    const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);

    // Set rate limit headers
    c.header("X-RateLimit-Limit", options.max.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());
    c.header("X-RateLimit-Reset", resetInSeconds.toString());

    // Check if over limit
    if (entry.count > options.max) {
      c.header("Retry-After", resetInSeconds.toString());
      return c.json(
        {
          error: "Too Many Requests",
          message: options.message,
          retryAfter: resetInSeconds,
        },
        429,
      );
    }

    await next();
  };
}

/**
 * Extract the client IP from proxy headers, falling back to "unknown".
 *
 * SECURITY: the app is deployed behind a single trusted reverse proxy
 * (nginx / Traefik). We must NOT trust the leftmost X-Forwarded-For entry, which
 * the client fully controls and can rotate to evade per-IP limits. We prefer the
 * proxy-set X-Real-IP, then fall back to the RIGHTMOST X-Forwarded-For entry (the
 * hop appended by our own proxy). Direct (non-proxied) deployments should not
 * expose this service to the internet without a proxy in front.
 */
export function getClientIp(c: Context): string {
  const realIp = c.req.header("X-Real-IP");
  if (realIp) return realIp.trim();

  const forwardedFor = c.req.header("X-Forwarded-For");
  if (forwardedFor) {
    const parts = forwardedFor
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return "unknown";
}

/**
 * Imperative rate-limit check for use inside a handler, keyed on a caller-chosen
 * string. Unlike the middleware, this lets a route key on a VALIDATED value (e.g.
 * the body tenant_id after zod + existence checks) rather than a spoofable header.
 * Returns whether the request is over the limit and the retry-after seconds.
 */
export function enforceRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { limited: boolean; retryAfter: number; remaining: number } {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count++;
  store.set(key, entry);
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return {
    limited: entry.count > max,
    retryAfter,
    remaining: Math.max(0, max - entry.count),
  };
}

/**
 * Get client key for rate limiting
 * Uses IP address, with auth user ID if available
 */
export function getClientKey(c: Context): string {
  // If authenticated, include user ID for more granular limiting
  const auth = c.get("auth");
  if (auth?.userId) {
    return `user:${auth.userId}`;
  }

  return `ip:${getClientIp(c)}`;
}

/**
 * Stricter rate limit for sensitive endpoints (login, signup)
 */
export function strictRateLimit() {
  return rateLimit({
    windowMs: 60000, // 1 minute
    max: 10, // 10 attempts per minute
    message: "Too many attempts, please try again later",
  });
}

/**
 * Very strict rate limit for critical operations (password reset)
 */
export function criticalRateLimit() {
  return rateLimit({
    windowMs: 3600000, // 1 hour
    max: 5, // 5 attempts per hour
    message: "Rate limit exceeded. Please try again in an hour.",
  });
}

/**
 * Generous rate limit for read-heavy endpoints
 */
export function readRateLimit() {
  return rateLimit({
    windowMs: 60000, // 1 minute
    max: 120, // 120 requests per minute
  });
}

/**
 * Per-IP rate limit for the anonymous chat widget send path.
 * Keeps the expensive multi-provider LLM call bounded per client without
 * requiring login. Keyed purely on IP (chat requests are unauthenticated).
 */
export function chatIpRateLimit(maxPerMinute: number = 20) {
  return rateLimit({
    windowMs: 60000,
    max: maxPerMinute,
    keyGenerator: (c) => `chat:ip:${getClientIp(c)}`,
    message: "Too many chat requests, please slow down",
  });
}

// NOTE: per-tenant chat limiting is enforced INSIDE the chat handler via
// enforceRateLimit(`chat:tenant:${validatedTenantId}`, ...) using the body
// tenant_id AFTER zod + existence validation. A middleware keyed on the
// unvalidated X-Tenant-ID header was removed: it was bypassable by sending a
// valid tenant in the body while rotating the header, so the per-tenant cap
// never bound the tenant actually being billed for the LLM call.

/**
 * Rate limit by tenant (for multi-tenant fair usage)
 */
export function tenantRateLimit(maxPerMinute: number = 300) {
  return rateLimit({
    windowMs: 60000,
    max: maxPerMinute,
    keyGenerator: (c) => {
      const auth = c.get("auth");
      if (auth?.tenantId) {
        return `tenant:${auth.tenantId}`;
      }
      const tenantId = c.req.header("X-Tenant-ID");
      return tenantId ? `tenant:${tenantId}` : getClientKey(c);
    },
  });
}
