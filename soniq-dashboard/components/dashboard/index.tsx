"use client";

import React from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import SystemHealth from "./SystemHealth";
import Waveform from "./Waveform";
import ActivityLog from "./ActivityLog";
import { SetupIncompleteBanner } from "./SetupIncompleteBanner";

// ============================================================================
// DASHBOARD LAYOUT - War Room View
// ============================================================================

export default function Dashboard() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {/* War Room Grid - 3 Columns */}
        <div className="flex-1 grid grid-cols-[240px_1fr_300px] overflow-hidden">
          {/* Left: System Health */}
          <div className="overflow-hidden border-r border-zinc-800">
            <SystemHealth />
          </div>

          {/* Center: Waveform Visualizer */}
          <div className="overflow-hidden">
            <Waveform />
          </div>

          {/* Right: Activity Log */}
          <div className="overflow-hidden">
            <ActivityLog />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Sidebar,
  TopBar,
  SystemHealth,
  Waveform,
  ActivityLog,
  SetupIncompleteBanner,
};
