"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useConfig } from "@/context/ConfigContext";
import { useIndustry } from "@/context/IndustryContext";
import { useAuth } from "@/context/AuthContext";
import {
  Circle,
  Clock,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

// ============================================================================
// TOP BAR COMPONENT - Dense Status Strip
// ============================================================================

export default function TopBar() {
  const router = useRouter();
  const { config, metrics } = useConfig();
  const { industryLabel } = useIndustry();
  const { user, signOut } = useAuth();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Update time every second
  React.useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Close menu on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const systemStatus = metrics?.system.status || "offline";
  const latency = metrics?.system.latency || 0;
  const activeCalls = metrics?.system.activeCalls || 0;

  // Status icon and color mapping
  const getStatusConfig = () => {
    switch (systemStatus) {
      case "online":
        return {
          icon: Wifi,
          color: "text-emerald-500",
          bgColor: "bg-emerald-500/10",
          label: "Online",
        };
      case "degraded":
        return {
          icon: AlertCircle,
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
          label: "Degraded",
        };
      default:
        return {
          icon: WifiOff,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          label: "Offline",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Latency color
  const getLatencyColor = (ms: number) => {
    if (ms < 50) return "text-emerald-500";
    if (ms < 100) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-4">
      {/* Left: System Status */}
      <div className="flex items-center gap-3">
        {/* Status Badge */}
        <div
          className={cn(
            "flex items-center gap-2 px-2.5 py-1 rounded-full",
            statusConfig.bgColor,
          )}
        >
          <div className="relative">
            <StatusIcon className={cn("h-3.5 w-3.5", statusConfig.color)} />
            {systemStatus === "online" && (
              <span className="absolute inset-0 animate-ping">
                <StatusIcon
                  className={cn("h-3.5 w-3.5 opacity-75", statusConfig.color)}
                />
              </span>
            )}
          </div>
          <span
            className={cn(
              "text-xs font-medium hidden sm:inline",
              statusConfig.color,
            )}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Divider */}
        <span className="h-4 w-px bg-border hidden sm:block" />

        {/* Latency */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">RTT</span>
          <span
            className={cn(
              "text-xs font-mono font-medium",
              getLatencyColor(latency),
            )}
          >
            {latency}ms
          </span>
        </div>

        {/* Divider */}
        <span className="h-4 w-px bg-border hidden md:block" />

        {/* Active Calls */}
        <div className="hidden md:flex items-center gap-1.5">
          <Circle
            className={cn(
              "h-2 w-2 fill-current",
              activeCalls > 0 ? "text-emerald-500" : "text-muted-foreground",
            )}
          />
          <span className="text-xs text-muted-foreground">
            {activeCalls} Active
          </span>
        </div>
      </div>

      {/* Center: Business Name */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
        <span className="text-sm font-medium text-foreground">
          {config?.businessName || "Soniq"}
        </span>
      </div>

      {/* Right: Time, Theme, User */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Industry Tag - Hidden on small screens */}
        <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {industryLabel}
        </span>

        {/* Theme Toggle */}
        <AnimatedThemeToggler size={18} />

        {/* Time - Hidden on small screens */}
        <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs font-mono tabular-nums">
            {currentTime.toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
              {userInitials}
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-primary transition-transform",
                showUserMenu && "rotate-180",
              )}
            />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <div className="border-b border-border p-3">
                <div className="font-medium text-sm text-foreground">
                  {userName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </div>
              </div>
              <div className="p-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/profile");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </button>
              </div>
              <div className="border-t border-border p-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    signOut();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
