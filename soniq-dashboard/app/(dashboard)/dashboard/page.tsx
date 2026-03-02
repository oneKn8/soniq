"use client";

import { useState } from "react";
import {
  SystemHealth,
  Waveform,
  ActivityLog,
  SetupIncompleteBanner,
} from "@/components/dashboard";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Setup Incomplete Banner - shows when tenant setup is incomplete */}
      <div className="flex-shrink-0 px-4 pt-4">
        <SetupIncompleteBanner />
      </div>

      {/* Main Dashboard Grid - Responsive */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel - System Health */}
        <aside
          className={cn(
            "hidden md:flex flex-col border-r border-border bg-card/50 transition-all duration-300",
            leftPanelOpen ? "w-64" : "w-12",
          )}
        >
          {/* Panel Toggle */}
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="flex items-center justify-center h-10 border-b border-border hover:bg-accent transition-colors"
            aria-label={leftPanelOpen ? "Collapse panel" : "Expand panel"}
          >
            {leftPanelOpen ? (
              <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
            ) : (
              <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {leftPanelOpen ? (
            <div className="flex-1 overflow-hidden">
              <SystemHealth />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center py-4 gap-4">
              {/* Collapsed icons */}
              <div
                className="h-2 w-2 rounded-full bg-green-500"
                title="System Online"
              />
              <div className="text-xs font-mono text-muted-foreground rotate-90 whitespace-nowrap mt-8">
                Metrics
              </div>
            </div>
          )}
        </aside>

        {/* Center Panel - Waveform */}
        <main className="flex-1 overflow-hidden bg-background">
          <Waveform />
        </main>

        {/* Right Panel - Activity Log */}
        <aside
          className={cn(
            "hidden lg:flex flex-col border-l border-border bg-card/50 transition-all duration-300",
            rightPanelOpen ? "w-80" : "w-12",
          )}
        >
          {/* Panel Toggle */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="flex items-center justify-center h-10 border-b border-border hover:bg-accent transition-colors"
            aria-label={rightPanelOpen ? "Collapse panel" : "Expand panel"}
          >
            {rightPanelOpen ? (
              <PanelRightClose className="h-4 w-4 text-muted-foreground" />
            ) : (
              <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {rightPanelOpen ? (
            <div className="flex-1 overflow-hidden">
              <ActivityLog />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center py-4 gap-4">
              <div
                className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"
                title="Live Logs"
              />
              <div className="text-xs font-mono text-muted-foreground -rotate-90 whitespace-nowrap mt-8">
                Activity
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Mobile: Tab navigation for panels */}
      <div className="md:hidden flex border-t border-border bg-card">
        <button className="flex-1 py-3 text-sm font-medium text-primary border-t-2 border-primary">
          Live Call
        </button>
        <button className="flex-1 py-3 text-sm font-medium text-muted-foreground">
          Metrics
        </button>
        <button className="flex-1 py-3 text-sm font-medium text-muted-foreground">
          Activity
        </button>
      </div>
    </div>
  );
}
