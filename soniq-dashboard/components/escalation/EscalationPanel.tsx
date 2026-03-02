"use client";

import { useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Phone,
  Clock,
  User,
  MessageSquare,
  PhoneOff,
  CalendarClock,
  CheckCircle2,
  Mic,
  MicOff,
  PhoneForwarded,
  FileText,
  History,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEscalation } from "@/context/EscalationContext";
import { AISummary } from "./AISummary";
import type { EscalationMessage } from "@/types/escalation";

interface EscalationPanelProps {
  className?: string;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatWaitTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// Conversation timeline component
function ConversationTimeline({ messages }: { messages: EscalationMessage[] }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="space-y-3">
      {messages.map((message, index) => {
        const isAI = message.role === "ai";
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className={cn("flex gap-3", isAI ? "flex-row" : "flex-row-reverse")}
          >
            {/* Avatar */}
            <div
              className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                isAI ? "bg-industry/10" : "bg-secondary",
              )}
            >
              {isAI ? (
                <MessageSquare className="h-4 w-4 text-industry" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Message */}
            <div
              className={cn(
                "max-w-[75%] rounded-xl px-4 py-2.5",
                isAI
                  ? "bg-industry/10 text-foreground"
                  : "bg-secondary text-foreground",
              )}
            >
              <p className="text-sm">{message.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatTimestamp(message.timestamp)}
              </p>
            </div>
          </motion.div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

export function EscalationPanel({ className }: EscalationPanelProps) {
  const {
    activeEscalation,
    isPanelOpen,
    closePanel,
    resolveEscalation,
    scheduleCallback,
  } = useEscalation();

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPanelOpen) {
        closePanel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPanelOpen, closePanel]);

  // Mock call controls state
  const isInProgress = activeEscalation?.status === "in-progress";

  const handleResolve = () => {
    if (activeEscalation) {
      resolveEscalation(activeEscalation.id);
    }
  };

  const handleScheduleCallback = () => {
    if (activeEscalation) {
      scheduleCallback(activeEscalation.id, "Current User");
    }
  };

  if (!activeEscalation) return null;

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closePanel}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col border-l border-border bg-background shadow-elevated",
              className,
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border p-4">
              <div className="flex items-start gap-4">
                {/* Caller avatar */}
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-industry/10">
                  <User className="h-6 w-6 text-industry" />
                </div>

                {/* Caller info */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {activeEscalation.contactName || "Unknown Caller"}
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {activeEscalation.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatWaitTime(activeEscalation.waitTime)} wait
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        activeEscalation.priority === "urgent" &&
                          "bg-red-500/10 text-red-500",
                        activeEscalation.priority === "high" &&
                          "bg-amber-500/10 text-amber-500",
                        activeEscalation.priority === "normal" &&
                          "bg-blue-500/10 text-blue-500",
                        activeEscalation.priority === "low" &&
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {activeEscalation.priority} priority
                    </span>
                    {isInProgress && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        Live Call
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={closePanel}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {/* Escalation reason */}
              <div className="border-b border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Escalation Reason
                  </span>
                </div>
                <p className="text-sm text-foreground">
                  {activeEscalation.reason}
                </p>
              </div>

              {/* AI Summary */}
              <div className="border-b border-border p-4">
                <AISummary
                  summary={activeEscalation.aiSummary}
                  extractedIntents={activeEscalation.extractedIntents}
                  suggestedActions={activeEscalation.suggestedActions}
                  sentiment={activeEscalation.sentiment}
                  defaultExpanded
                />
              </div>

              {/* Conversation Timeline */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Conversation History
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {activeEscalation.conversation.length} messages
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 max-h-[300px] overflow-y-auto scrollbar-thin">
                  <ConversationTimeline
                    messages={activeEscalation.conversation}
                  />
                </div>
              </div>

              {/* Contact history placeholder */}
              {activeEscalation.contactId && (
                <div className="border-t border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Contact History
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">8 previous calls</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">5 appointments</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Call Controls - Fixed at bottom */}
            <div className="border-t border-border bg-card p-4">
              {isInProgress ? (
                <div className="space-y-3">
                  {/* Live call controls */}
                  <div className="flex items-center justify-center gap-4">
                    <button className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-accent">
                      <Mic className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleResolve}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <PhoneOff className="h-6 w-6" />
                    </button>
                    <button className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-accent">
                      <PhoneForwarded className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Notes input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add notes about this call..."
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-industry/50"
                    />
                    <button className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent">
                      <FileText className="h-4 w-4" />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResolve}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-3 text-sm font-medium text-white hover:bg-green-600"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Mark Resolved
                  </button>
                  <button
                    onClick={handleScheduleCallback}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground hover:bg-accent"
                  >
                    <CalendarClock className="h-5 w-5" />
                    Schedule Callback
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
