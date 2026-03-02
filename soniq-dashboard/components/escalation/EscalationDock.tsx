"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  Phone,
  AlertTriangle,
  Clock,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEscalation } from "@/context/EscalationContext";
import { useConfig } from "@/context/ConfigContext";
import { EscalationCard } from "./EscalationCard";
import type { EscalationItem } from "@/types/escalation";

interface EscalationDockProps {
  className?: string;
}

function formatAvgWaitTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s avg`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m avg`;
}

export function EscalationDock({ className }: EscalationDockProps) {
  const {
    waitingQueue,
    waitingCount,
    urgentCount,
    highPriorityCount,
    avgWaitTime,
    isDockExpanded,
    toggleDock,
    setDockExpanded,
    takeCall,
    openPanel,
  } = useEscalation();

  const { uiState } = useConfig();
  const sidebarWidth = uiState.sidebarCollapsed ? 64 : 224;

  const [isDockMinimized, setDockMinimized] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isDockExpanded &&
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node)
      ) {
        setDockExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDockExpanded, setDockExpanded]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDockExpanded) {
        setDockExpanded(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDockExpanded, setDockExpanded]);

  const handleCardClick = (escalation: EscalationItem) => {
    openPanel(escalation);
  };

  const handleTakeCall = (escalationId: string) => {
    takeCall(escalationId);
  };

  // Don't render if no waiting escalations
  if (waitingCount === 0) {
    return null;
  }

  return (
    <div
      ref={drawerRef}
      className={cn(
        "fixed bottom-0 right-0 z-40 pointer-events-none transition-all duration-200",
        className,
      )}
      style={{ left: `${sidebarWidth}px` }}
    >
      <div className="pointer-events-auto mx-auto max-w-5xl px-4 pb-4">
        <AnimatePresence mode="wait">
          {isDockMinimized ? (
            /* Minimized pill — small floating badge */
            <motion.button
              key="minimized"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={() => setDockMinimized(false)}
              className={cn(
                "ml-auto flex items-center gap-2 rounded-full border px-3 py-2 shadow-lg transition-all hover:scale-105",
                urgentCount > 0
                  ? "border-red-500/50 bg-red-500/10"
                  : highPriorityCount > 0
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-border bg-card",
              )}
            >
              <div className="relative">
                <Phone
                  className={cn(
                    "h-4 w-4",
                    urgentCount > 0
                      ? "text-red-500"
                      : highPriorityCount > 0
                        ? "text-amber-500"
                        : "text-industry",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-sm font-semibold",
                  urgentCount > 0
                    ? "text-red-500"
                    : highPriorityCount > 0
                      ? "text-amber-500"
                      : "text-foreground",
                )}
              >
                {waitingCount}
              </span>
            </motion.button>
          ) : (
            /* Full dock bar */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Expanded Drawer */}
              <AnimatePresence>
                {isDockExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="mb-2 rounded-xl border border-border bg-card shadow-elevated overflow-hidden"
                  >
                    {/* Drawer header */}
                    <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-industry/10">
                          <Users className="h-4 w-4 text-industry" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            Escalation Queue
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {waitingCount} waiting -{" "}
                            {formatAvgWaitTime(avgWaitTime)} wait time
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={toggleDock}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Queue list */}
                    <div className="max-h-[400px] overflow-y-auto p-4 space-y-3 scrollbar-thin">
                      {waitingQueue.map((escalation, index) => (
                        <motion.div
                          key={escalation.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <EscalationCard
                            escalation={escalation}
                            onTakeCall={() => handleTakeCall(escalation.id)}
                            onClick={() => handleCardClick(escalation)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapsed Dock Bar */}
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={toggleDock}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    "flex flex-1 items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-lg transition-all",
                    urgentCount > 0
                      ? "border-red-500/50 bg-red-500/5"
                      : highPriorityCount > 0
                        ? "border-amber-500/50 bg-amber-500/5"
                        : "border-border",
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Badge */}
                    <div className="relative">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full",
                          urgentCount > 0
                            ? "bg-red-500/10"
                            : highPriorityCount > 0
                              ? "bg-amber-500/10"
                              : "bg-industry/10",
                        )}
                      >
                        <Phone
                          className={cn(
                            "h-5 w-5",
                            urgentCount > 0
                              ? "text-red-500"
                              : highPriorityCount > 0
                                ? "text-amber-500"
                                : "text-industry",
                          )}
                        />
                      </div>
                      {/* Count badge */}
                      <span
                        className={cn(
                          "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white",
                          urgentCount > 0
                            ? "bg-red-500"
                            : highPriorityCount > 0
                              ? "bg-amber-500"
                              : "bg-industry",
                        )}
                      >
                        {waitingCount}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {waitingCount} {waitingCount === 1 ? "Call" : "Calls"}{" "}
                          Waiting
                        </span>
                        {urgentCount > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                            <AlertTriangle className="h-3 w-3" />
                            {urgentCount} urgent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatAvgWaitTime(avgWaitTime)}
                        </span>
                        {highPriorityCount > 0 && (
                          <span className="flex items-center gap-1 text-amber-500">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {highPriorityCount} high priority
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expand indicator */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm">
                      {isDockExpanded ? "Collapse" : "Expand"}
                    </span>
                    <ChevronUp
                      className={cn(
                        "h-5 w-5 transition-transform",
                        isDockExpanded && "rotate-180",
                      )}
                    />
                  </div>
                </motion.button>

                {/* Minimize button */}
                <button
                  onClick={() => {
                    setDockExpanded(false);
                    setDockMinimized(true);
                  }}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-lg hover:bg-accent hover:text-foreground transition-colors"
                  title="Minimize dock"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
