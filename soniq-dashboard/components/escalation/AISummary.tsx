"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, Target, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface AISummaryProps {
  summary: string;
  extractedIntents?: string[];
  suggestedActions?: string[];
  sentiment?: "positive" | "neutral" | "negative" | "frustrated";
  defaultExpanded?: boolean;
  className?: string;
}

const SENTIMENT_STYLES = {
  positive: {
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-500/20",
    label: "Positive",
  },
  neutral: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    label: "Neutral",
  },
  negative: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    label: "Concerned",
  },
  frustrated: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
    label: "Frustrated",
  },
};

export function AISummary({
  summary,
  extractedIntents = [],
  suggestedActions = [],
  sentiment = "neutral",
  defaultExpanded = false,
  className,
}: AISummaryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const sentimentStyle = SENTIMENT_STYLES[sentiment];

  return (
    <div
      className={cn(
        "rounded-lg border bg-card overflow-hidden",
        sentimentStyle.border,
        className,
      )}
    >
      {/* Collapsed view - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50"
      >
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
            sentimentStyle.bg,
          )}
        >
          <Sparkles className={cn("h-4 w-4", sentimentStyle.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              AI Summary
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                sentimentStyle.bg,
                sentimentStyle.text,
              )}
            >
              {sentimentStyle.label}
            </span>
          </div>
          <p className="text-sm text-foreground line-clamp-2">{summary}</p>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mt-1"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-3 pb-3 pt-2 space-y-4">
              {/* Full summary */}
              <div>
                <p className="text-sm text-foreground">{summary}</p>
              </div>

              {/* Extracted intents */}
              {extractedIntents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Detected Intents
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedIntents.map((intent, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                      >
                        {intent.replace(/-/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested actions */}
              {suggestedActions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Suggested Actions
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {suggestedActions.map((action, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-industry/10 text-xs font-medium text-industry">
                          {index + 1}
                        </span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact inline version for cards
interface AISummaryInlineProps {
  summary: string;
  sentiment?: "positive" | "neutral" | "negative" | "frustrated";
  className?: string;
}

export function AISummaryInline({
  summary,
  sentiment = "neutral",
  className,
}: AISummaryInlineProps) {
  const sentimentStyle = SENTIMENT_STYLES[sentiment];

  return (
    <div className={cn("flex items-start gap-2", className)}>
      <Sparkles
        className={cn("h-3.5 w-3.5 flex-shrink-0 mt-0.5", sentimentStyle.text)}
      />
      <p className="text-xs text-muted-foreground line-clamp-1">{summary}</p>
    </div>
  );
}
