import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { SoniqMark } from "@/components/brand/SoniqMark";
import { Button } from "@/components/ui/button";

/**
 * Root not-found UI. Rendered for unmatched routes and explicit notFound()
 * calls, keeping users inside the branded shell with a way back.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
        <SoniqMark className="h-9 w-9" decorative />
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        <Compass className="h-5 w-5" />
        <span className="text-sm font-medium uppercase tracking-wide">
          Error 404
        </span>
      </div>

      <h1 className="mt-3 text-2xl font-semibold text-foreground">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you are looking for does not exist or may have been moved.
        Check the address or return to your dashboard.
      </p>

      <div className="mt-8">
        <Button asChild>
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
