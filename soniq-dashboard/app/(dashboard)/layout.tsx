"use client";

import { ConfigProvider, useConfig } from "@/context/ConfigContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { TenantProvider, useTenant } from "@/context/TenantContext";
import { IndustryProvider } from "@/context/IndustryContext";
import { EscalationProvider } from "@/context/EscalationContext";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import MobileNav from "@/components/dashboard/MobileNav";
import { EscalationDock, EscalationPanel } from "@/components/escalation";
import { SkipLinks } from "@/components/ui/skip-links";
import { Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <div className="relative mb-6">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
          <Zap className="h-8 w-8 text-primary" />
        </div>
      </div>
      <div className="text-center">
        <h1 className="mb-2 text-lg font-semibold text-foreground">Soniq</h1>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Loading dashboard...
          </span>
        </div>
      </div>
      <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-pulse bg-primary" />
      </div>
    </div>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isLoading: configLoading } = useConfig();
  const { isLoading: authLoading, user } = useAuth();
  const { isLoading: tenantLoading, currentTenant, tenants } = useTenant();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Redirect to setup if user has no tenants
  useEffect(() => {
    if (!authLoading && !tenantLoading && user && tenants.length === 0) {
      router.replace("/setup");
    }
  }, [authLoading, tenantLoading, user, tenants, router]);

  if (authLoading || configLoading || tenantLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoadingScreen />;
  }

  if (!currentTenant) {
    return <LoadingScreen />;
  }

  return (
    <>
      {/* Accessibility: Skip Links */}
      <SkipLinks
        links={[
          { href: "#main-content", label: "Skip to main content" },
          { href: "#navigation", label: "Skip to navigation" },
        ]}
      />

      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Desktop Navigation Sidebar */}
        <nav
          id="navigation"
          aria-label="Main navigation"
          className="hidden md:block"
        >
          <Sidebar />
        </nav>

        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          {/* Main Content with ARIA landmark */}
          <main
            id="main-content"
            role="main"
            aria-label="Dashboard content"
            tabIndex={-1}
            className="flex-1 overflow-hidden outline-none pb-16 md:pb-14"
          >
            {children}
          </main>
        </div>

        {/* Escalation System */}
        <aside aria-label="Escalation queue">
          <EscalationDock />
          <EscalationPanel />
        </aside>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TenantProvider>
          <ConfigProvider>
            <IndustryProvider>
              <EscalationProvider>
                <DashboardContent>{children}</DashboardContent>
              </EscalationProvider>
            </IndustryProvider>
          </ConfigProvider>
        </TenantProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
