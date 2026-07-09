import { Loader2 } from "lucide-react";
import { SoniqMark } from "@/components/brand/SoniqMark";

/**
 * Root loading UI. Shown via Suspense while a route segment streams in, so a
 * navigation never leaves the viewport blank.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <div className="relative mb-6">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
          <SoniqMark className="h-9 w-9" animated decorative />
        </div>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading</span>
      </div>
    </div>
  );
}
