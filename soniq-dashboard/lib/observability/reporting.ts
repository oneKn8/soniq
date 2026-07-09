/**
 * Client-side error reporting, gated entirely behind a build-time DSN.
 *
 * The dashboard ships without any observability backend by default. When a DSN
 * is provided via `NEXT_PUBLIC_SENTRY_DSN` (or the `NEXT_PUBLIC_GLITCHTIP_DSN`
 * alias) every export here becomes active; with no DSN each export is a
 * guaranteed no-op that never throws, never blocks, and never pulls the SDK
 * into the client bundle. That keeps local dev and production builds green
 * without requiring any secret to be set.
 *
 * GlitchTip is wire-compatible with Sentry, so the same `@sentry/react` SDK
 * reports to a self-hosted GlitchTip instance simply by pointing the DSN at it.
 * See `.env.example` for the variable documentation.
 */

// Resolved once at module load. `NEXT_PUBLIC_*` values are inlined by Next at
// build time, so an unset DSN collapses to an empty string here.
const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  process.env.NEXT_PUBLIC_GLITCHTIP_DSN ??
  "";

// Guards duplicate `Sentry.init` calls across the several boundaries that
// report through this module.
let initialized = false;

/** True only when a DSN is configured. Reporting is a no-op otherwise. */
export function isErrorReportingEnabled(): boolean {
  return DSN.length > 0;
}

/**
 * Report a caught error to the configured backend.
 *
 * No-op (returns immediately) when no DSN is set or when called outside the
 * browser. The SDK is imported dynamically so it stays out of the main bundle
 * until an error actually needs reporting on a DSN-configured deployment.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!isErrorReportingEnabled() || typeof window === "undefined") {
    return;
  }

  // Fire-and-forget: never let reporting failures surface to the user or block
  // the error-boundary render path.
  void import("@sentry/react")
    .then((Sentry) => {
      if (!initialized) {
        Sentry.init({
          dsn: DSN,
          environment: process.env.NODE_ENV,
          // Error monitoring only; no performance/replay overhead by default.
          tracesSampleRate: 0,
        });
        initialized = true;
      }

      Sentry.captureException(
        error,
        context ? { extra: context } : undefined,
      );
    })
    .catch(() => {
      // Swallow: a broken reporter must never degrade the app.
    });
}
