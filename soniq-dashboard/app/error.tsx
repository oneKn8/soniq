"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { SoniqMark } from "@/components/brand/SoniqMark";
import { Button } from "@/components/ui/button";
import { captureException } from "@/lib/observability/reporting";

/**
 * Route-level error boundary. Next.js renders this whenever a Server or Client
 * Component in the segment throws during render, keeping the app shell alive.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for local debugging and any attached reporter.
    console.error(error);
    // No-op unless an error-reporting DSN is configured.
    captureException(error, { digest: error.digest, boundary: "route" });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <div className="relative mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
          <SoniqMark className="h-9 w-9" decorative />
        </div>
      </div>

      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <span className="text-sm font-medium uppercase tracking-wide">
          Something went wrong
        </span>
      </div>

      <h1 className="mt-3 text-2xl font-semibold text-foreground">
        We hit an unexpected error
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your data is safe. You can retry the action or head back to the
        dashboard. If this keeps happening, please contact support.
      </p>

      {error.digest && (
        <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-1 font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <a href="/dashboard">
            <Home className="h-4 w-4" />
            Back to dashboard
          </a>
        </Button>
      </div>
    </div>
  );
}
