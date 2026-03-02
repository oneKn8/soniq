"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Phone,
  PhoneForwarded,
  Calendar,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  BarChart3,
  MessageSquare,
  HelpCircle,
  MonitorDot,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIndustry } from "@/context/IndustryContext";
import { useEscalation } from "@/context/EscalationContext";
import { useTenant } from "@/context/TenantContext";
import { get } from "@/lib/api/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: HelpCircle },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

// Extended tenant type for sidebar checks
interface TenantWithAssistedMode {
  assisted_mode?: boolean;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { tenant, preset } = useIndustry();
  const { currentTenant } = useTenant();
  const { waitingCount } = useEscalation();
  const [pendingCount, setPendingCount] = useState(0);

  // Check if tenant is in assisted mode
  const extendedTenant = currentTenant as TenantWithAssistedMode | null;
  const isAssistedMode = extendedTenant?.assisted_mode ?? false;

  // Fetch pending booking count for assisted mode tenants
  useEffect(() => {
    if (!isAssistedMode || !currentTenant) return;

    const fetchPendingCount = async () => {
      try {
        const response = await get<{
          bookings: Array<{ id: string }>;
          total: number;
        }>("/api/pending-bookings", { status: "pending" });
        setPendingCount(response.bookings?.length || 0);
      } catch (err) {
        console.error("Failed to fetch pending count:", err);
      }
    };

    fetchPendingCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [isAssistedMode, currentTenant]);

  // Build nav items dynamically
  const navItems: NavItem[] = [
    { label: "Workstation", href: "/workstation", icon: MonitorDot },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Contacts", href: "/contacts", icon: Users },
    { label: "Calls", href: "/calls", icon: Phone },
    { label: "Escalations", href: "/escalations", icon: PhoneForwarded },
    // Conditionally add Pending for assisted mode
    ...(isAssistedMode
      ? [
          {
            label: "Pending",
            href: "/pending",
            icon: ClipboardList,
            badge: pendingCount > 0 ? pendingCount : undefined,
          },
        ]
      : []),
    { label: "Calendar", href: "/calendar", icon: Calendar },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
    { label: "Resources", href: "/resources", icon: Briefcase },
    { label: "Notifications", href: "/notifications", icon: Bell },
  ];

  // Map generic labels to industry-specific terminology
  const getLabel = (item: NavItem): string => {
    if (item.label === "Contacts" && preset?.terminology?.customer) {
      return `${preset.terminology.customerPlural}`;
    }
    if (item.label === "Calendar" && preset?.terminology?.transaction) {
      return `${preset.terminology.transactionPlural}`;
    }
    return item.label;
  };

  // Get badge count for nav items
  const getBadge = (item: NavItem): number | undefined => {
    if (item.label === "Escalations" && waitingCount > 0) {
      return waitingCount;
    }
    if (item.label === "Pending" && pendingCount > 0) {
      return pendingCount;
    }
    return item.badge;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar",
        "shadow-soft",
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-industry">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-foreground">
                {tenant?.business_name || "Soniq"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-industry mx-auto">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const label = getLabel(item);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-industry-muted text-industry"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive
                    ? "text-industry"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="truncate"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {getBadge(item) && !collapsed && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-white">
                  {getBadge(item)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border p-3 space-y-1">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-industry-muted text-industry"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive
                    ? "text-industry"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
