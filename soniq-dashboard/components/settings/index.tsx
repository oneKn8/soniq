"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useConfig } from "@/context/ConfigContext";
import type { SettingsTab, Permission } from "@/types";
import {
  Settings,
  Mic,
  DollarSign,
  Clock,
  Plug,
  User,
  MessageSquare,
  MessageCircle,
  PhoneForwarded,
  CreditCard,
  Sliders,
  ChevronRight,
  Sparkles,
  Building2,
  Phone,
  Zap,
  Megaphone,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import GeneralTab from "./GeneralTab";
import VoiceTab from "./VoiceTab";
import PricingTab from "./PricingTab";
import HoursTab from "./HoursTab";
import BillingTab from "./BillingTab";
import GreetingsTab from "./GreetingsTab";
import ResponsesTab from "./ResponsesTab";
import AgentTab from "./AgentTab";
import EscalationTab from "./EscalationTab";
import InstructionsTab from "./InstructionsTab";

// ============================================================================
// TABS CONFIGURATION
// ============================================================================
// Access tiers:
// - developer: Platform-level controls (infrastructure, all customers)
// - admin: Business owner controls (agent config, billing)
// - staff: Monitoring only (no settings access in most tabs)

type AccessTier = "staff" | "admin" | "developer";

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  description: string;
  requiredPermission?: Permission;
  minAccessTier: AccessTier;
  category: "business" | "agent" | "platform";
  href?: string; // Optional link to standalone page
}

const ALL_TABS: TabConfig[] = [
  // Business Settings
  {
    id: "general",
    label: "General",
    icon: Settings,
    description: "Business identity and branding",
    minAccessTier: "admin",
    requiredPermission: "manage_agent",
    category: "business",
  },
  {
    id: "business",
    label: "Business Info",
    icon: Building2,
    description: "Name, industry, location",
    minAccessTier: "admin",
    requiredPermission: "manage_agent",
    category: "business",
    href: "/settings/business",
  },
  {
    id: "hours",
    label: "Hours",
    icon: Clock,
    description: "Operating schedule",
    minAccessTier: "admin",
    requiredPermission: "manage_hours",
    category: "business",
    href: "/settings/hours",
  },
  {
    id: "phone",
    label: "Phone",
    icon: Phone,
    description: "Phone number setup",
    minAccessTier: "admin",
    requiredPermission: "manage_agent",
    category: "business",
    href: "/settings/phone",
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    description: "Payment and subscription",
    minAccessTier: "admin",
    requiredPermission: "manage_billing",
    category: "business",
  },

  // Agent Configuration
  {
    id: "agent",
    label: "Agent",
    icon: User,
    description: "Personality and behavior",
    minAccessTier: "admin",
    requiredPermission: "manage_agent",
    category: "agent",
  },
  {
    id: "assistant",
    label: "Assistant",
    icon: User,
    description: "Name, voice, personality",
    minAccessTier: "admin",
    requiredPermission: "manage_agent",
    category: "agent",
    href: "/settings/assistant",
  },
  {
    id: "voice",
    label: "Voice",
    icon: Mic,
    description: "Voice and speech settings",
    minAccessTier: "admin",
    requiredPermission: "manage_voice",
    category: "agent",
  },
  {
    id: "capabilities",
    label: "Capabilities",
    icon: Zap,
    description: "What your assistant handles",
    minAccessTier: "admin",
    requiredPermission: "manage_agent",
    category: "agent",
    href: "/settings/capabilities",
  },
  {
    id: "greetings",
    label: "Greetings",
    icon: MessageSquare,
    description: "Customize caller greetings",
    minAccessTier: "admin",
    requiredPermission: "manage_greetings",
    category: "agent",
  },
  {
    id: "responses",
    label: "Responses",
    icon: MessageCircle,
    description: "Custom AI responses",
    minAccessTier: "admin",
    requiredPermission: "manage_responses",
    category: "agent",
  },
  {
    id: "escalation",
    label: "Escalation",
    icon: PhoneForwarded,
    description: "Call transfer rules",
    minAccessTier: "admin",
    requiredPermission: "manage_escalation",
    category: "agent",
    href: "/settings/escalation",
  },
  {
    id: "promotions",
    label: "Promotions",
    icon: Megaphone,
    description: "Special offers for callers",
    minAccessTier: "admin",
    requiredPermission: "manage_agent",
    category: "agent",
    href: "/settings/promotions",
  },
  {
    id: "instructions",
    label: "Instructions",
    icon: Sparkles,
    description: "Custom AI instructions",
    minAccessTier: "admin",
    requiredPermission: "manage_agent",
    category: "agent",
  },

  // Platform Settings (Developer only)
  {
    id: "pricing",
    label: "Pricing",
    icon: DollarSign,
    description: "Rates, fees, and modifiers",
    minAccessTier: "developer",
    requiredPermission: "manage_pricing",
    category: "platform",
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Plug,
    description: "Connected services and APIs",
    minAccessTier: "admin",
    requiredPermission: "manage_integrations",
    category: "platform",
    href: "/settings/integrations",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: Sliders,
    description: "System configuration",
    minAccessTier: "developer",
    requiredPermission: "manage_infrastructure",
    category: "platform",
  },
];

// Access tier hierarchy for comparison
const ACCESS_TIER_LEVEL: Record<AccessTier, number> = {
  staff: 0,
  admin: 1,
  developer: 2,
};

function hasMinAccessTier(userRole: string, requiredTier: AccessTier): boolean {
  const userLevel = ACCESS_TIER_LEVEL[userRole as AccessTier] ?? 0;
  const requiredLevel = ACCESS_TIER_LEVEL[requiredTier];
  return userLevel >= requiredLevel;
}

// ============================================================================
// SETTINGS PANEL COMPONENT
// ============================================================================

export default function SettingsPanel() {
  const { config, uiState, setSettingsTab, hasPermission } = useConfig();
  const { settingsTab } = uiState;

  if (!config) return null;

  const userRole = config.userRole;
  const isDeveloper = userRole === "developer";
  const isStaff = userRole === "staff";

  // Filter tabs based on user role and permissions
  const visibleTabs = ALL_TABS.filter((tab) => {
    if (!hasMinAccessTier(userRole, tab.minAccessTier)) {
      return false;
    }
    if (tab.requiredPermission) {
      return hasPermission(tab.requiredPermission);
    }
    return true;
  });

  // Group tabs by category
  const businessTabs = visibleTabs.filter((t) => t.category === "business");
  const agentTabs = visibleTabs.filter((t) => t.category === "agent");
  const platformTabs = visibleTabs.filter((t) => t.category === "platform");

  // Staff gets no settings tabs - redirect to dashboard
  if (isStaff || visibleTabs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Settings className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Settings Access Restricted
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Contact your administrator to modify agent settings.
          </p>
        </div>
      </div>
    );
  }

  // Ensure current tab is valid for user
  const currentTabValid = visibleTabs.some((tab) => tab.id === settingsTab);
  if (!currentTabValid && visibleTabs.length > 0) {
    setSettingsTab(visibleTabs[0].id);
  }

  // Role display configuration
  const roleConfig = {
    developer: {
      label: "Developer Mode",
      color: "amber",
      description: "Full platform access",
    },
    admin: {
      label: "Admin Mode",
      color: "primary",
      description: "Business configuration access",
    },
    staff: {
      label: "Staff Mode",
      color: "muted",
      description: "Monitoring access only",
    },
  };

  const currentRoleConfig =
    roleConfig[userRole as keyof typeof roleConfig] || roleConfig.staff;

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
        {/* Header */}
        <div className="border-b border-border p-6">
          <h2 className="text-xl font-semibold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground">
            {isDeveloper ? "Platform configuration" : "Business configuration"}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {/* Business Settings */}
          {businessTabs.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Business
              </h3>
              <ul className="space-y-1">
                {businessTabs.map((tab) => (
                  <TabButton
                    key={tab.id}
                    tab={tab}
                    isActive={settingsTab === tab.id}
                    onClick={() => setSettingsTab(tab.id)}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Agent Configuration */}
          {agentTabs.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Agent Configuration
              </h3>
              <ul className="space-y-1">
                {agentTabs.map((tab) => (
                  <TabButton
                    key={tab.id}
                    tab={tab}
                    isActive={settingsTab === tab.id}
                    onClick={() => setSettingsTab(tab.id)}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Platform Settings */}
          {platformTabs.length > 0 && isDeveloper && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                Platform
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium">
                  DEV
                </span>
              </h3>
              <ul className="space-y-1">
                {platformTabs.map((tab) => (
                  <TabButton
                    key={tab.id}
                    tab={tab}
                    isActive={settingsTab === tab.id}
                    onClick={() => setSettingsTab(tab.id)}
                    isDeveloperTab
                  />
                ))}
              </ul>
            </div>
          )}
        </nav>

        {/* Role Indicator */}
        <div className="border-t border-border p-4">
          <div
            className={cn(
              "rounded-xl border p-4",
              currentRoleConfig.color === "amber"
                ? "border-amber-500/20 bg-amber-500/5"
                : currentRoleConfig.color === "primary"
                  ? "border-primary/20 bg-primary/5"
                  : "border-border bg-muted/50",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  currentRoleConfig.color === "amber"
                    ? "bg-amber-500"
                    : currentRoleConfig.color === "primary"
                      ? "bg-primary"
                      : "bg-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  currentRoleConfig.color === "amber"
                    ? "text-amber-500"
                    : currentRoleConfig.color === "primary"
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                {currentRoleConfig.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {currentRoleConfig.description}
            </p>
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto bg-background p-8 scrollbar-thin">
        <AnimatePresence mode="wait">
          <motion.div
            key={settingsTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {settingsTab === "general" && <GeneralTab />}
            {settingsTab === "agent" && <AgentTab />}
            {settingsTab === "voice" && <VoiceTab />}
            {settingsTab === "greetings" && <GreetingsTab />}
            {settingsTab === "responses" && <ResponsesTab />}
            {settingsTab === "instructions" && <InstructionsTab />}
            {settingsTab === "hours" && <HoursTab />}
            {settingsTab === "escalation" && <EscalationTab />}
            {settingsTab === "billing" && <BillingTab />}
            {settingsTab === "pricing" && isDeveloper && <PricingTab />}
            {settingsTab === "integrations" && (
              <div className="max-w-2xl space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Integrations
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manage connected services from the standalone integrations
                  settings page.
                </p>
                <Link
                  href="/settings/integrations"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Open Integrations
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            )}
            {settingsTab === "advanced" && isDeveloper && <AdvancedTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============================================================================
// TAB BUTTON COMPONENT
// ============================================================================

interface TabButtonProps {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
  isDeveloperTab?: boolean;
}

function TabButton({ tab, isActive, onClick, isDeveloperTab }: TabButtonProps) {
  const Icon = tab.icon;
  const hasLink = !!tab.href;

  const buttonContent = (
    <>
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          isActive
            ? isDeveloperTab
              ? "bg-amber-500/10"
              : "bg-primary/10"
            : "bg-muted group-hover:bg-background",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {tab.label}
          {hasLink && <ExternalLink className="h-3 w-3 opacity-50" />}
        </div>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="truncate text-[10px] opacity-70"
          >
            {tab.description}
          </motion.div>
        )}
      </div>
      {isActive && !hasLink && <ChevronRight className="h-4 w-4 opacity-50" />}
    </>
  );

  const buttonClasses = cn(
    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
    isActive
      ? isDeveloperTab
        ? "bg-amber-500/10 text-amber-500"
        : "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

  if (hasLink) {
    return (
      <li>
        <Link href={tab.href!} className={buttonClasses}>
          {buttonContent}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button type="button" onClick={onClick} className={buttonClasses}>
        {buttonContent}
      </button>
    </li>
  );
}

// ============================================================================
// ADVANCED TAB (Developer Only - Platform Infrastructure)
// ============================================================================

function AdvancedTab() {
  const { config } = useConfig();

  if (!config) return null;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Advanced Settings
        </h3>
        <p className="text-sm text-muted-foreground">
          System-level configuration and feature flags
        </p>
      </div>

      {/* Feature Flags */}
      <section className="space-y-4">
        <div className="border-b border-border pb-3">
          <h4 className="text-sm font-medium text-foreground">Feature Flags</h4>
          <p className="text-xs text-muted-foreground">
            Enable or disable system features
          </p>
        </div>

        <div className="space-y-3">
          {Object.entries(config.features).map(([key, enabled]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
            >
              <div>
                <div className="text-sm font-medium text-foreground">
                  {key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (s) => s.toUpperCase())}
                </div>
                <div className="text-xs text-muted-foreground">
                  {enabled ? "Enabled" : "Disabled"}
                </div>
              </div>
              <div
                className={cn(
                  "h-3 w-3 rounded-full",
                  enabled ? "bg-green-500" : "bg-muted-foreground/30",
                )}
              />
            </div>
          ))}
        </div>
      </section>

      {/* System Info */}
      <section className="space-y-4">
        <div className="border-b border-border pb-3">
          <h4 className="text-sm font-medium text-foreground">
            System Information
          </h4>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Industry
              </div>
              <div className="mt-1 font-mono text-sm text-foreground">
                {config.industry}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                User Role
              </div>
              <div className="mt-1 font-mono text-sm text-foreground">
                {config.userRole}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Configured
              </div>
              <div className="mt-1 font-mono text-sm text-foreground">
                {config.isConfigured ? "Yes" : "No"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Last Modified
              </div>
              <div className="mt-1 font-mono text-sm text-foreground">
                {config.lastModified
                  ? new Date(config.lastModified).toLocaleString()
                  : "Never"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4">
        <div className="border-b border-destructive/30 pb-3">
          <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">
                Reset Configuration
              </div>
              <div className="text-xs text-muted-foreground">
                This will clear all settings and return to setup wizard
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm("Are you sure? This cannot be undone.")) {
                  localStorage.removeItem("soniq_config_v2");
                  window.location.reload();
                }
              }}
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              Reset
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  GeneralTab,
  VoiceTab,
  PricingTab,
  HoursTab,
  BillingTab,
  GreetingsTab,
  ResponsesTab,
  AgentTab,
  EscalationTab,
  InstructionsTab,
};
