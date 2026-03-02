"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Moon,
  Sun,
  User,
  LogOut,
  Settings,
  Command,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIndustry } from "@/context/IndustryContext";
import { useTheme } from "next-themes";

interface TopBarProps {
  onOpenCommandPalette?: () => void;
  sidebarCollapsed?: boolean;
}

export function TopBar({
  onOpenCommandPalette,
  sidebarCollapsed = false,
}: TopBarProps) {
  const router = useRouter();
  const { tenant, customerLabel } = useIndustry();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificationCount] = useState(3);

  // Prevent hydration mismatch - using layout effect pattern
  useEffect(() => {
    // This is intentional for hydration matching with next-themes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenCommandPalette?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenCommandPalette]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <header
      className={cn(
        "fixed top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6 transition-all duration-200",
        sidebarCollapsed ? "left-[72px]" : "left-[240px]",
        "right-0",
      )}
    >
      {/* Search / Command Palette Trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="group flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-border-muted hover:bg-muted"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">
          Search {customerLabel?.toLowerCase()}s, calls...
        </span>
        <span className="sm:hidden">Search...</span>
        <kbd className="ml-auto hidden items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs font-medium text-muted-foreground sm:flex">
          <Command className="h-3 w-3" />
          <span>K</span>
        </kbd>
      </button>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={() => router.push("/notifications")}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-industry text-white">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden flex-col items-start md:flex">
              <span className="text-sm font-medium text-foreground">
                {tenant?.agent_name || "User"}
              </span>
              <span className="text-xs text-muted-foreground">
                {tenant?.business_name || "Business"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />

                {/* Dropdown */}
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-popover p-1.5 shadow-elevated"
                >
                  <div className="border-b border-border px-3 py-2 mb-1">
                    <p className="text-sm font-medium text-foreground">
                      {tenant?.agent_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tenant?.business_name || "Business"}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push("/profile");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push("/settings");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </button>

                  <div className="my-1 border-t border-border" />

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      // Add logout logic here
                      router.push("/auth/login");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
