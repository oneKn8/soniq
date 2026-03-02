"use client";

import React from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

type ThemeMode = "light" | "dark" | "system";

interface ThemeOption {
  value: ThemeMode;
  label: string;
  description: string;
  icon: React.ElementType;
}

// ============================================================================
// THEME OPTIONS
// ============================================================================

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    description: "Classic light appearance",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easier on the eyes",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match device settings",
    icon: Monitor,
  },
];

// ============================================================================
// THEME SELECTOR COMPONENT
// ============================================================================

export function ThemeSelector() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-foreground">Appearance</h4>
        <p className="text-xs text-muted-foreground">
          Choose how Soniq looks on your device
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = theme === option.value;
          const isCurrentResolved =
            option.value === "system"
              ? false
              : option.value === resolvedTheme && theme === "system";

          return (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                "relative flex flex-col items-center rounded-xl border p-4 transition-all",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
              )}
            >
              {isSelected && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}

              {/* Preview */}
              <div
                className={cn(
                  "mb-3 flex h-14 w-full items-center justify-center rounded-lg border",
                  option.value === "dark" ||
                    (option.value === "system" && resolvedTheme === "dark")
                    ? "border-zinc-700 bg-zinc-900"
                    : "border-zinc-200 bg-white",
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6",
                    option.value === "dark" ||
                      (option.value === "system" && resolvedTheme === "dark")
                      ? "text-zinc-300"
                      : "text-zinc-600",
                  )}
                />
              </div>

              <span
                className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-primary" : "text-foreground",
                )}
              >
                {option.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>

              {isCurrentResolved && (
                <span className="mt-1 text-[10px] text-primary">
                  Currently active
                </span>
              )}
            </button>
          );
        })}
      </div>

      {theme === "system" && (
        <p className="text-xs text-muted-foreground">
          Your system is currently using{" "}
          <span className="font-medium text-foreground">{resolvedTheme}</span>{" "}
          mode
        </p>
      )}
    </div>
  );
}

export default ThemeSelector;
