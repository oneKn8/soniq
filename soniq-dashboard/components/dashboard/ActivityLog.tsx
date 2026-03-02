"use client";

import React, { useRef, useEffect } from "react";
import { useLogs } from "@/context/ConfigContext";
import { formatTimestamp } from "@/lib/mockData";
import type { LogEntry, LogLevel, LogCategory } from "@/types";
import { cn } from "@/lib/utils";
import {
  Terminal,
  Pause,
  Play,
  Trash2,
  Radio,
  CircleOff,
  Filter,
  Download,
} from "lucide-react";

// ============================================================================
// LOG COLORS
// ============================================================================

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: "text-slate-500",
  INFO: "text-blue-500",
  WARN: "text-amber-500",
  ERROR: "text-red-500",
  CRITICAL: "text-red-600 font-bold",
};

const LEVEL_BG_COLORS: Record<LogLevel, string> = {
  DEBUG: "bg-slate-500/10",
  INFO: "bg-blue-500/10",
  WARN: "bg-amber-500/10",
  ERROR: "bg-red-500/10",
  CRITICAL: "bg-red-500/20",
};

const CATEGORY_ICONS: Record<LogCategory, React.ElementType> = {
  SYSTEM: Terminal,
  CALL: Radio,
  INTENT: Filter,
  BOOKING: Filter,
  PAYMENT: Filter,
  TRANSFER: Filter,
  ERROR: CircleOff,
  SECURITY: Filter,
};

// ============================================================================
// ACTIVITY LOG COMPONENT - Right Column
// ============================================================================

export default function ActivityLog() {
  const { logs, addLog } = useLogs();
  const [isPaused, setIsPaused] = React.useState(false);
  const [filter, setFilter] = React.useState<LogLevel | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (!isPaused && shouldScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  // Handle scroll to detect manual scrolling
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      shouldScrollRef.current = isNearBottom;

      // Auto-resume scrolling if user scrolls to bottom
      if (isNearBottom && isPaused) {
        setIsPaused(false);
      }
    }
  };

  // Filter logs
  const filteredLogs = React.useMemo(() => {
    let filtered =
      filter === "ALL" ? logs : logs.filter((log) => log.level === filter);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          log.category.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [logs, filter, searchQuery]);

  // Clear logs (add a clear marker)
  const handleClear = () => {
    addLog({
      level: "INFO",
      category: "SYSTEM",
      message: "--- LOG CLEARED ---",
    });
  };

  // Export logs
  const handleExport = () => {
    const logText = filteredLogs
      .map(
        (log) =>
          `[${formatTimestamp(log.timestamp)}] ${log.level} ${log.category}: ${log.message}`,
      )
      .join("\n");
    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soniq-logs-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const logCounts = React.useMemo(() => {
    return {
      ALL: logs.length,
      INFO: logs.filter((l) => l.level === "INFO").length,
      WARN: logs.filter((l) => l.level === "WARN").length,
      ERROR: logs.filter((l) => l.level === "ERROR").length,
      DEBUG: logs.filter((l) => l.level === "DEBUG").length,
    };
  }, [logs]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {isPaused ? (
            <CircleOff className="h-4 w-4 text-amber-500" />
          ) : (
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
          )}
          <span className="text-sm font-semibold text-foreground">
            Activity Log
          </span>
          {isPaused && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-medium">
              PAUSED
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Export */}
          <button
            onClick={handleExport}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Export logs"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          {/* Pause/Play */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              isPaused
                ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            title={isPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
          >
            {isPaused ? (
              <Play className="h-3.5 w-3.5" />
            ) : (
              <Pause className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
            title="Clear logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-b border-border px-4 py-2 space-y-2">
        {/* Search */}
        <input
          type="text"
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {/* Level Filter */}
        <div className="flex gap-1">
          {(["ALL", "INFO", "WARN", "ERROR", "DEBUG"] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                filter === level
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {level}{" "}
              {logCounts[level as keyof typeof logCounts] > 0 &&
                `(${logCounts[level as keyof typeof logCounts]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Log Entries */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-mono text-xs scrollbar-thin"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No log entries</p>
              {searchQuery && (
                <p className="text-xs mt-1">Try adjusting your search</p>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredLogs.map((log) => (
              <LogLine key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">
          {filteredLogs.length} entries
        </span>
        {isPaused && (
          <button
            onClick={() => setIsPaused(false)}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium"
          >
            Resume scrolling
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LOG LINE COMPONENT
// ============================================================================

function LogLine({ log }: { log: LogEntry }) {
  const CategoryIcon = CATEGORY_ICONS[log.category] || Terminal;

  return (
    <div
      className={cn(
        "group flex items-start gap-2 px-4 py-2 hover:bg-accent/50 transition-colors",
        LEVEL_BG_COLORS[log.level],
      )}
    >
      {/* Timestamp */}
      <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums pt-0.5">
        {formatTimestamp(log.timestamp)}
      </span>

      {/* Level Badge */}
      <span
        className={cn(
          "shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
          LEVEL_COLORS[log.level],
        )}
      >
        {log.level.slice(0, 4)}
      </span>

      {/* Category */}
      <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
        <CategoryIcon className="h-3 w-3" />
        {log.category}
      </span>

      {/* Message */}
      <span className="flex-1 text-xs text-foreground break-all">
        {log.message}
      </span>
    </div>
  );
}
