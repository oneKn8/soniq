"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureException } from "@/lib/observability/reporting";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
  /** Optional hook for logging to an error reporter. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Reusable client-side error boundary. Wrap any subtree that could throw during
 * render so a single failing widget never blanks the surrounding page. App
 * Router error.tsx files cover route-level errors; this covers in-page regions.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No-op unless an error-reporting DSN is configured.
    captureException(error, {
      componentStack: info.componentStack,
      boundary: "component",
    });
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (error) {
      if (this.props.fallback) {
        return this.props.fallback({ error, reset: this.reset });
      }

      return (
        <div
          role="alert"
          className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              This section failed to load. You can retry without leaving the
              page.
            </p>
          </div>
          <Button onClick={this.reset} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
