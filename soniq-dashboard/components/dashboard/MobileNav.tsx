"use client";

import { useRouter, usePathname } from "next/navigation";
import { useIndustry } from "@/context/IndustryContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Phone,
  Calendar,
  BarChart3,
  Settings,
  Headphones,
  Users,
  Bell,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}

// Extended menu items for "More" sheet
const MORE_ITEMS: NavItem[] = [
  {
    id: "workstation",
    label: "Workstation",
    icon: Headphones,
    href: "/workstation",
  },
  { id: "contacts", label: "Contacts", icon: Users, href: "/contacts" },
  { id: "notifications", label: "Alerts", icon: Bell, href: "/notifications" },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
];

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { preset } = useIndustry();
  const [showMore, setShowMore] = useState(false);

  const NAV_ITEMS: NavItem[] = [
    {
      id: "dashboard",
      label: "Dash",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    { id: "calls", label: "Calls", icon: Phone, href: "/calls" },
    {
      id: "calendar",
      label: preset.navLabels?.calendarTab || "Book",
      icon: Calendar,
      href: "/calendar",
    },
    { id: "analytics", label: "Stats", icon: BarChart3, href: "/analytics" },
    { id: "more", label: "More", icon: Settings, href: "/settings" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const handleNav = (item: NavItem) => {
    if (item.id === "more") {
      setShowMore(true);
    } else {
      router.push(item.href);
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-inset">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <button
                key={item.id}
                onClick={() => handleNav(item)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Menu Sheet */}
      {showMore && (
        <MoreSheet onClose={() => setShowMore(false)} items={MORE_ITEMS} />
      )}
    </>
  );
}

// ============================================================================
// MORE SHEET
// ============================================================================

import { useState, useEffect } from "react";
import { X } from "lucide-react";

function MoreSheet({
  onClose,
  items,
}: {
  onClose: () => void;
  items: NavItem[];
}) {
  const router = useRouter();

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleNav = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-2xl">
        {/* Handle */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">
            More Options
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-2 p-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.href)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <span className="text-xs font-medium text-foreground">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Safe area spacer */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  );
}
