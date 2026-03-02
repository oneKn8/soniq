"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export function ThemeToggle({ className, size = "sm" }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  const sizeClasses = {
    sm: "h-7 w-12",
    md: "h-8 w-14",
  };

  const iconSize = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
  };

  const thumbSize = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
  };

  const thumbTranslate = {
    sm: "translate-x-5",
    md: "translate-x-6",
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isDark ? "bg-zinc-700" : "bg-zinc-200",
        sizeClasses[size],
        className,
      )}
    >
      {/* Track icons */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-1">
        <Sun
          className={cn(
            iconSize[size],
            "text-amber-500 transition-opacity",
            isDark ? "opacity-0" : "opacity-100",
          )}
        />
        <Moon
          className={cn(
            iconSize[size],
            "text-indigo-400 transition-opacity",
            isDark ? "opacity-100" : "opacity-0",
          )}
        />
      </span>

      {/* Thumb */}
      <span
        className={cn(
          "pointer-events-none inline-block transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
          thumbSize[size],
          isDark ? thumbTranslate[size] : "translate-x-0",
        )}
      />
    </button>
  );
}

// Compact icon-only toggle for tight spaces
export function ThemeToggleIcon({ className }: { className?: string }) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent",
        className,
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-zinc-400 hover:text-zinc-100" />
      ) : (
        <Moon className="h-4 w-4 text-zinc-500 hover:text-zinc-900" />
      )}
    </button>
  );
}
