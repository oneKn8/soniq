// Request validation helpers built on zod.
// Centralizes the "parse JSON body -> safeParse against schema -> 400 on
// failure" pattern so route handlers stop hand-rolling ad-hoc checks.

import type { Context } from "hono";
import type { z } from "zod";

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: Response };

/**
 * Parse and validate a JSON request body against a zod schema.
 *
 * On success returns the typed data. On a missing/invalid body or schema
 * failure it returns a ready-to-return 400 Response (never throws / 500s).
 */
export async function parseJson<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
): Promise<ParseResult<z.infer<T>>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return {
      success: false,
      response: c.json({ error: "Invalid or missing JSON body" }, 400),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      response: c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      ),
    };
  }

  return { success: true, data: parsed.data };
}

/**
 * Validate a form-encoded webhook body (SignalWire/Twilio) against a schema.
 * Permissive by design: schemas should use optional fields / passthrough so
 * unexpected provider params never reject a legitimate callback.
 */
export async function parseForm<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
): Promise<ParseResult<z.infer<T>>> {
  let raw: unknown;
  try {
    raw = await c.req.parseBody();
  } catch {
    raw = {};
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      response: c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      ),
    };
  }

  return { success: true, data: parsed.data };
}
