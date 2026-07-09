import * as Sentry from "@sentry/node";
import { logger } from "./logger.js";

/**
 * Error reporting via the Sentry SDK.
 *
 * GlitchTip is Sentry-compatible: point SENTRY_DSN (or GLITCHTIP_DSN) at a
 * self-hosted GlitchTip instance and the @sentry/* SDKs report to it unchanged.
 *
 * This module is a strict NO-OP when no DSN is configured: initialization does
 * nothing and captureException silently returns. Nothing here ever throws to the
 * caller, so telemetry can never crash a request path or the process.
 */

let initialized = false;

function resolveDsn(): string | undefined {
  const dsn = process.env.SENTRY_DSN || process.env.GLITCHTIP_DSN;
  return dsn && dsn.trim().length > 0 ? dsn.trim() : undefined;
}

/**
 * Initialize error reporting exactly once. No-op (and returns false) when no DSN
 * is set, so local and CI runs never require a DSN and never emit telemetry.
 */
export function initErrorReporting(): boolean {
  if (initialized) return true;

  const dsn = resolveDsn();
  if (!dsn) return false;

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      release: process.env.RELEASE_VERSION || process.env.GIT_SHA,
      // Error reporting only by default; opt in to tracing via env if wanted.
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
        ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
        : 0,
    });
    initialized = true;
    logger.info("[OBSERVABILITY] Error reporting initialized");
    return true;
  } catch (err) {
    // A misconfigured DSN must not take the process down.
    logger.warn({ err }, "[OBSERVABILITY] Error reporting init failed");
    return false;
  }
}

export function isErrorReportingEnabled(): boolean {
  return initialized;
}

/**
 * Report an exception. No-op when error reporting is not initialized. Never
 * throws.
 */
export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) return;
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    // Swallow: telemetry failures must never surface to callers.
  }
}
