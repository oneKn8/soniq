"use client";

import { useState } from "react";
import { useTenant } from "@/context/TenantContext";
import {
  AlertCircle,
  X,
  ChevronRight,
  MapPin,
  Calendar,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface IncompleteItem {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  priority: "high" | "medium" | "low";
}

// Extended tenant type for setup banner checks
interface TenantWithSetupFields {
  id: string;
  business_name: string;
  industry: string;
  phone_number: string;
  is_active: boolean;
  created_at: string;
  role: string;
  // Setup wizard fields (may not be present on basic Tenant type)
  location_address?: string;
  location_city?: string;
  assisted_mode?: boolean;
  setup_completed_at?: string;
  setup_step?: string;
  escalation_enabled?: boolean;
  escalation_phone?: string;
}

function getIncompleteItems(tenant: TenantWithSetupFields): IncompleteItem[] {
  const items: IncompleteItem[] = [];

  // Check for missing business address
  if (!tenant.location_address) {
    items.push({
      key: "address",
      label: "Add business address",
      description: "Help customers find you with directions",
      href: "/settings?tab=general",
      icon: MapPin,
      priority: "medium",
    });
  }

  // Check for assisted mode without escalation contacts
  if (tenant.assisted_mode && !tenant.escalation_phone) {
    items.push({
      key: "escalation",
      label: "Configure escalation",
      description: "Set up who to call when bookings need confirmation",
      href: "/settings?tab=escalation",
      icon: Phone,
      priority: "high",
    });
  }

  // Check if setup was never completed
  if (!tenant.setup_completed_at && tenant.setup_step) {
    items.push({
      key: "setup",
      label: "Complete setup wizard",
      description: "Finish configuring your AI assistant",
      href: "/setup",
      icon: Calendar,
      priority: "high",
    });
  }

  return items;
}

export function SetupIncompleteBanner() {
  const { currentTenant } = useTenant();
  const [dismissed, setDismissed] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  if (dismissed || !currentTenant) return null;

  // Cast to extended type for setup field checks
  const tenant = currentTenant as TenantWithSetupFields;
  const incompleteItems = getIncompleteItems(tenant);

  if (incompleteItems.length === 0) return null;

  // Sort by priority
  const sortedItems = [...incompleteItems].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const highPriorityCount = sortedItems.filter(
    (item) => item.priority === "high",
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "rounded-lg border p-4 mb-6",
        highPriorityCount > 0
          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
          : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
              highPriorityCount > 0
                ? "bg-amber-100 dark:bg-amber-900/50"
                : "bg-blue-100 dark:bg-blue-900/50",
            )}
          >
            <AlertCircle
              className={cn(
                "h-4 w-4",
                highPriorityCount > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-blue-600 dark:text-blue-400",
              )}
            />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Complete your setup</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sortedItems.length === 1
                ? "1 item needs your attention"
                : `${sortedItems.length} items need your attention`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Items */}
      <div className="mt-4 space-y-2">
        <AnimatePresence>
          {sortedItems.map((item, index) => {
            const Icon = item.icon;
            const isExpanded = expandedItem === item.key;

            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center justify-between rounded-md border bg-background/80 p-3 transition-all hover:bg-background hover:shadow-sm",
                    item.priority === "high"
                      ? "border-amber-200 dark:border-amber-800/50"
                      : "border-border",
                  )}
                  onMouseEnter={() => setExpandedItem(item.key)}
                  onMouseLeave={() => setExpandedItem(null)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        item.priority === "high"
                          ? "bg-amber-100 dark:bg-amber-900/30"
                          : "bg-muted",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          item.priority === "high"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.label}
                      </p>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-muted-foreground"
                          >
                            {item.description}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.priority === "high" && (
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        Important
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Quick action for high priority */}
      {highPriorityCount > 0 && sortedItems.length > 1 && (
        <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800/50">
          <Link
            href={sortedItems[0].href}
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            Start with the most important item
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}
