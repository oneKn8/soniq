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
 * Get client key for rate limiting
 * Uses IP address, with auth user ID if available
 */
function getClientKey(c: Context): string {
  // Try to get real IP from proxy headers
  const forwardedFor = c.req.header("X-Forwarded-For");
  const realIp = c.req.header("X-Real-IP");

  let ip = "unknown";
  if (forwardedFor) {
    ip = forwardedFor.split(",")[0].trim();
  } else if (realIp) {
    ip = realIp;
  }

  // If authenticated, include user ID for more granular limiting
  const auth = c.get("auth");
  if (auth?.userId) {
    return `user:${auth.userId}`;
  }

  return `ip:${ip}`;
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
