"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useConfig } from "@/context/ConfigContext";
import type { ViewType } from "@/types";
import {
  LayoutDashboard,
  Phone,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
  Users,
  Calendar,
  Bell,
  Package,
  Headphones,
  AlertCircle,
  User,
  Target,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIndustry } from "@/context/IndustryContext";

// Route mapping for navigation
const VIEW_ROUTES: Record<
  ViewType | "workstation" | "escalations" | "profile",
  string
> = {
  dashboard: "/dashboard",
  workstation: "/workstation",
  calls: "/calls",
  analytics: "/analytics",
  escalations: "/escalations",
  contacts: "/contacts",
  deals: "/deals",
  tasks: "/tasks",
  calendar: "/calendar",
  notifications: "/notifications",
  resources: "/resources",
  settings: "/settings",
  profile: "/profile",
};

// ============================================================================
// NAV ITEMS
// ============================================================================

interface NavItem {
  id: ViewType | "workstation" | "escalations" | "profile";
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function buildNavSections(dealPluralLabel: string): NavSection[] {
  return [
    {
      title: "Workspace",
      items: [
        { id: "workstation", label: "Workstation", icon: Headphones },
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "escalations", label: "Escalations", icon: AlertCircle },
      ],
    },
    {
      title: "Activity",
      items: [
        { id: "calls", label: "Calls", icon: Phone },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
      ],
    },
    {
      title: "CRM",
      items: [
        { id: "contacts", label: "Contacts", icon: Users },
        { id: "deals", label: dealPluralLabel, icon: Target },
        { id: "tasks", label: "Tasks", icon: CheckSquare },
        { id: "calendar", label: "Calendar", icon: Calendar },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "resources", label: "Resources", icon: Package },
      ],
    },
    {
      title: "Account",
      items: [
        { id: "profile", label: "Profile", icon: User },
        { id: "settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { config, uiState, setView, toggleSidebar, resetConfig } = useConfig();
  const { dealPluralLabel } = useIndustry();
  const { sidebarCollapsed } = uiState;

  const NAV_SECTIONS = React.useMemo(
    () => buildNavSections(dealPluralLabel),
    [dealPluralLabel],
  );

  // Determine active view from current pathname
  const currentPath = React.useMemo(() => {
    return pathname?.replace("/", "") || "dashboard";
  }, [pathname]);

  // Handle navigation
  const handleNavClick = (viewId: string) => {
    if (viewId in VIEW_ROUTES) {
      const route = VIEW_ROUTES[viewId as keyof typeof VIEW_ROUTES];
      // Only update context for ViewType items
      if (
        [
          "dashboard",
          "calls",
          "analytics",
          "contacts",
          "deals",
          "tasks",
          "calendar",
          "notifications",
          "resources",
          "settings",
        ].includes(viewId)
      ) {
        setView(viewId as ViewType);
      }
      router.push(route);
    }
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        sidebarCollapsed ? "w-16" : "w-56",
      )}
    >
      {/* Logo Area */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sidebar-foreground">
              Soniq
            </span>
          </div>
        )}
        {sidebarCollapsed && <Zap className="mx-auto h-5 w-5 text-primary" />}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.title} className={cn(sectionIndex > 0 && "mt-4")}>
            {!sidebarCollapsed && (
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
            )}
            {sidebarCollapsed && sectionIndex > 0 && (
              <div className="mx-2 mb-2 border-t border-sidebar-border" />
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = currentPath === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      sidebarCollapsed && "justify-center px-2",
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="flex-1 text-left">{item.label}</span>
                    )}
                    {!sidebarCollapsed &&
                      item.badge !== undefined &&
                      item.badge > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium text-destructive-foreground">
                          {item.badge}
                        </span>
                      )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Business Info */}
      {!sidebarCollapsed && config && (
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-1 truncate text-sm font-medium text-sidebar-foreground">
            {config.businessName}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {config.agentName} Agent
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Reset (Dev) */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={resetConfig}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive",
            sidebarCollapsed && "justify-center",
          )}
          title="Reset Configuration"
        >
          <LogOut className="h-4 w-4" />
          {!sidebarCollapsed && <span>Reset</span>}
        </button>
      </div>
    </aside>
  );
}
