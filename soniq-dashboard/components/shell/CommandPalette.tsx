"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Users,
  Phone,
  Calendar,
  Bell,
  Settings,
  BarChart3,
  Briefcase,
  Plus,
  Moon,
  Sun,
  LogOut,
  User,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIndustry } from "@/context/IndustryContext";
import { useTheme } from "next-themes";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: "navigation" | "actions" | "recent" | "settings";
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { customerLabel, transactionLabel } = useIndustry();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build command items
  const commands = useMemo<CommandItem[]>(() => {
    const navigate = (path: string) => () => {
      router.push(path);
      onClose();
    };

    return [
      // Navigation
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        icon: LayoutDashboard,
        action: navigate("/dashboard"),
        category: "navigation",
        keywords: ["home", "main", "overview"],
      },
      {
        id: "nav-contacts",
        label: `Go to ${customerLabel}s`,
        icon: Users,
        action: navigate("/contacts"),
        category: "navigation",
        keywords: ["customers", "patients", "guests", "clients", "people"],
      },
      {
        id: "nav-calls",
        label: "Go to Calls",
        icon: Phone,
        action: navigate("/calls"),
        category: "navigation",
        keywords: ["phone", "history", "logs"],
      },
      {
        id: "nav-calendar",
        label: `Go to ${transactionLabel}s`,
        icon: Calendar,
        action: navigate("/calendar"),
        category: "navigation",
        keywords: ["appointments", "bookings", "reservations", "schedule"],
      },
      {
        id: "nav-analytics",
        label: "Go to Analytics",
        icon: BarChart3,
        action: navigate("/analytics"),
        category: "navigation",
        keywords: ["stats", "reports", "metrics", "data"],
      },
      {
        id: "nav-resources",
        label: "Go to Resources",
        icon: Briefcase,
        action: navigate("/resources"),
        category: "navigation",
        keywords: ["staff", "rooms", "equipment", "inventory"],
      },
      {
        id: "nav-notifications",
        label: "Go to Notifications",
        icon: Bell,
        action: navigate("/notifications"),
        category: "navigation",
        keywords: ["alerts", "messages"],
      },

      // Actions
      {
        id: "action-new-contact",
        label: `New ${customerLabel}`,
        description: `Create a new ${customerLabel.toLowerCase()}`,
        icon: Plus,
        action: () => {
          router.push("/contacts?new=true");
          onClose();
        },
        category: "actions",
        keywords: ["add", "create", "customer", "patient", "guest"],
      },
      {
        id: "action-new-booking",
        label: `New ${transactionLabel}`,
        description: `Schedule a new ${transactionLabel.toLowerCase()}`,
        icon: Plus,
        action: () => {
          router.push("/calendar?new=true");
          onClose();
        },
        category: "actions",
        keywords: ["add", "create", "book", "schedule", "appointment"],
      },

      // Settings
      {
        id: "settings-profile",
        label: "Profile Settings",
        icon: User,
        action: navigate("/profile"),
        category: "settings",
        keywords: ["account", "user", "personal"],
      },
      {
        id: "settings-general",
        label: "General Settings",
        icon: Settings,
        action: navigate("/settings"),
        category: "settings",
        keywords: ["preferences", "config", "options"],
      },
      {
        id: "settings-theme",
        label:
          theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
        icon: theme === "dark" ? Sun : Moon,
        action: () => {
          setTheme(theme === "dark" ? "light" : "dark");
          onClose();
        },
        category: "settings",
        keywords: ["dark", "light", "appearance", "mode"],
      },
      {
        id: "settings-logout",
        label: "Sign Out",
        icon: LogOut,
        action: () => {
          router.push("/auth/login");
          onClose();
        },
        category: "settings",
        keywords: ["logout", "exit", "leave"],
      },
    ];
  }, [router, onClose, customerLabel, transactionLabel, theme, setTheme]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(lowerQuery);
      const matchDesc = cmd.description?.toLowerCase().includes(lowerQuery);
      const matchKeywords = cmd.keywords?.some((kw) =>
        kw.toLowerCase().includes(lowerQuery),
      );
      return matchLabel || matchDesc || matchKeywords;
    });
  }, [commands, query]);

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      actions: [],
      settings: [],
    };

    filteredCommands.forEach((cmd) => {
      if (groups[cmd.category]) {
        groups[cmd.category].push(cmd);
      }
    });

    return groups;
  }, [filteredCommands]);

  // Flat list for keyboard navigation
  const flatList = useMemo(() => {
    return [
      ...groupedCommands.actions,
      ...groupedCommands.navigation,
      ...groupedCommands.settings,
    ];
  }, [groupedCommands]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      // Resetting state when dialog opens is intentional UI behavior
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatList.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatList.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (flatList[selectedIndex]) {
            flatList[selectedIndex].action();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, flatList, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Reset selected index when query changes
  useEffect(() => {
    // Resetting selection on search is intentional UI behavior
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(0);
  }, [query]);

  const renderGroup = (
    title: string,
    items: CommandItem[],
    startIndex: number,
  ) => {
    if (items.length === 0) return null;

    return (
      <div key={title}>
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
        {items.map((item, idx) => {
          const globalIndex = startIndex + idx;
          const Icon = item.icon;
          const isSelected = globalIndex === selectedIndex;

          return (
            <button
              key={item.id}
              data-index={globalIndex}
              onClick={item.action}
              onMouseEnter={() => setSelectedIndex(globalIndex)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                isSelected
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isSelected ? "text-industry" : "text-muted-foreground",
                )}
              />
              <div className="flex-1 truncate">
                <div className="font-medium">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </div>
                )}
              </div>
              {isSelected && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2"
          >
            <div className="mx-4 overflow-hidden rounded-2xl border border-border bg-popover shadow-elevated">
              {/* Search Input */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  onClick={onClose}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="max-h-80 overflow-y-auto p-2 scrollbar-thin"
              >
                {flatList.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No results found for &quot;{query}&quot;
                  </div>
                ) : (
                  <>
                    {renderGroup("Quick Actions", groupedCommands.actions, 0)}
                    {renderGroup(
                      "Navigation",
                      groupedCommands.navigation,
                      groupedCommands.actions.length,
                    )}
                    {renderGroup(
                      "Settings",
                      groupedCommands.settings,
                      groupedCommands.actions.length +
                        groupedCommands.navigation.length,
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">
                      ↑↓
                    </kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">
                      ↵
                    </kbd>
                    Select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">
                    Esc
                  </kbd>
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
