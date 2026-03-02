"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIndustry } from "@/context/IndustryContext";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  const { industry, isLoading } = useIndustry();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) {
      // Restoring persisted UI state is intentional
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarCollapsed(stored === "true");
    }
  }, []);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem("sidebar-collapsed", String(newValue));
      return newValue;
    });
  }, []);

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-industry" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background"
      data-industry={industry || "default"}
    >
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

      {/* Top Bar */}
      <TopBar
        sidebarCollapsed={sidebarCollapsed}
        onOpenCommandPalette={openCommandPalette}
      />

      {/* Main Content Area */}
      <motion.main
        initial={false}
        animate={{
          marginLeft: sidebarCollapsed ? 72 : 240,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(
          "min-h-screen pt-16 transition-all duration-200",
          className,
        )}
      >
        <div className="p-6">{children}</div>
      </motion.main>

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onClose={closeCommandPalette} />
    </div>
  );
}
