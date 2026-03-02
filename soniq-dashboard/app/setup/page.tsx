"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import { Loader2 } from "lucide-react";
import { get } from "@/lib/api/client";
import type { SetupStep } from "@/types";

interface ProgressResponse {
  step: SetupStep;
  completed: boolean;
}

export default function SetupPage() {
  const { isLoading: tenantLoading, refreshTenants } = useTenant();
  const router = useRouter();
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Check for completed setup or redirect to current step
  // Auth is handled by middleware - if we're here, user is authenticated
  useEffect(() => {
    async function checkProgress() {
      if (!tenantLoading) {
        // Load setup progress and redirect to current step
        setLoadingProgress(true);
        try {
          const progress = await get<ProgressResponse>("/api/setup/progress");

          if (progress.completed) {
            await refreshTenants();
            router.replace("/dashboard");
          } else {
            router.replace(`/setup/${progress.step}`);
          }
        } catch {
          // No progress yet, start from beginning
          router.replace("/setup/business");
        } finally {
          setLoadingProgress(false);
        }
      }
    }

    checkProgress();
  }, [tenantLoading, router, refreshTenants]);

  if (tenantLoading || loadingProgress) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading your progress...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Redirecting...</p>
    </div>
  );
}
