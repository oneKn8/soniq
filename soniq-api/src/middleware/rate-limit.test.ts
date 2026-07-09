import { describe, it, expect } from "vitest";
import type { Context } from "hono";
import { enforceRateLimit, getClientIp } from "./rate-limit.js";

// Minimal Context stub exposing only what getClientIp reads: req.header().
function ctxWithHeaders(headers: Record<string, string>): Context {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    req: {
      header: (name: string) => lower[name.toLowerCase()],
    },
  } as unknown as Context;
}

describe("enforceRateLimit", () => {
  it("allows requests up to max, then trips on the one over the limit", () => {
    const key = `test:trip:${Math.random()}`;
    const max = 3;
    const windowMs = 60000;

    const r1 = enforceRateLimit(key, max, windowMs);
    const r2 = enforceRateLimit(key, max, windowMs);
    const r3 = enforceRateLimit(key, max, windowMs);
    const r4 = enforceRateLimit(key, max, windowMs);

    expect(r1.limited).toBe(false);
    expect(r2.limited).toBe(false);
    expect(r3.limited).toBe(false); // 3rd == max, still allowed
    expect(r4.limited).toBe(true); // 4th exceeds max
  });

  it("reports remaining count decreasing toward zero", () => {
    const key = `test:remaining:${Math.random()}`;
    expect(enforceRateLimit(key, 2, 60000).remaining).toBe(1);
    expect(enforceRateLimit(key, 2, 60000).remaining).toBe(0);
    expect(enforceRateLimit(key, 2, 60000).remaining).toBe(0);
  });

  it("resets after the window elapses so old counts do not persist", () => {
    const key = `test:reset:${Math.random()}`;
    // windowMs 0 -> the entry is immediately expired on the next call,
    // so every call starts a fresh window and is never limited.
    const first = enforceRateLimit(key, 1, 0);
    const second = enforceRateLimit(key, 1, 0);
    expect(first.limited).toBe(false);
    expect(second.limited).toBe(false);
  });

  it("keys are independent (one key tripping does not affect another)", () => {
    const a = `test:a:${Math.random()}`;
    const b = `test:b:${Math.random()}`;
    enforceRateLimit(a, 1, 60000);
    expect(enforceRateLimit(a, 1, 60000).limited).toBe(true);
    expect(enforceRateLimit(b, 1, 60000).limited).toBe(false);
  });

  it("returns a positive retryAfter when limited", () => {
    const key = `test:retry:${Math.random()}`;
    enforceRateLimit(key, 1, 60000);
    const over = enforceRateLimit(key, 1, 60000);
    expect(over.limited).toBe(true);
    expect(over.retryAfter).toBeGreaterThan(0);
  });
});

describe("getClientIp", () => {
  it("prefers X-Real-IP over X-Forwarded-For", () => {
    const c = ctxWithHeaders({
      "X-Real-IP": "203.0.113.7",
      "X-Forwarded-For": "1.1.1.1, 2.2.2.2",
    });
    expect(getClientIp(c)).toBe("203.0.113.7");
  });

  it("uses the RIGHTMOST X-Forwarded-For entry (the trusted proxy hop), not the leftmost client-controlled one", () => {
    const c = ctxWithHeaders({
      // Attacker can spoof the leftmost value (9.9.9.9); our proxy appends the real hop last.
      "X-Forwarded-For": "9.9.9.9, 10.0.0.1, 172.16.0.9",
    });
    expect(getClientIp(c)).toBe("172.16.0.9");
  });

  it("trims whitespace from the chosen X-Forwarded-For entry", () => {
    const c = ctxWithHeaders({ "X-Forwarded-For": "1.1.1.1 ,  8.8.8.8 " });
    expect(getClientIp(c)).toBe("8.8.8.8");
  });

  it("trims X-Real-IP", () => {
    const c = ctxWithHeaders({ "X-Real-IP": "  203.0.113.9 " });
    expect(getClientIp(c)).toBe("203.0.113.9");
  });

  it("returns 'unknown' when no proxy headers are present", () => {
    expect(getClientIp(ctxWithHeaders({}))).toBe("unknown");
  });

  it("returns 'unknown' when X-Forwarded-For is empty/comma-only", () => {
    expect(getClientIp(ctxWithHeaders({ "X-Forwarded-For": " , , " }))).toBe(
      "unknown",
    );
  });
});
