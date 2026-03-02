"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Phone,
  Calendar,
  Users,
  Clock,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIndustry } from "@/context/IndustryContext";

interface Stat {
  id: string;
  label: string;
  value: string | number;
  change?: number; // Percentage change
  changeLabel?: string;
  icon?: keyof typeof ICON_MAP;
}

interface StatsSummaryProps {
  stats?: Stat[];
  title?: string;
  className?: string;
}

const ICON_MAP = {
  phone: Phone,
  calendar: Calendar,
  users: Users,
  clock: Clock,
  dollar: DollarSign,
};

// Mock stats
const MOCK_STATS: Stat[] = [
  {
    id: "bookings",
    label: "Today's Bookings",
    value: 12,
    change: 20,
    changeLabel: "vs yesterday",
    icon: "calendar",
  },
  {
    id: "calls",
    label: "Calls Handled",
    value: 28,
    change: -5,
    changeLabel: "vs yesterday",
    icon: "phone",
  },
  {
    id: "contacts",
    label: "New Contacts",
    value: 4,
    change: 0,
    changeLabel: "vs yesterday",
    icon: "users",
  },
  {
    id: "avgWait",
    label: "Avg Wait Time",
    value: "8 min",
    change: -12,
    changeLabel: "improved",
    icon: "clock",
  },
];

export function StatsSummary({
  stats = MOCK_STATS,
  title = "Today's Stats",
  className,
}: StatsSummaryProps) {
  const { customerLabel, transactionLabel } = useIndustry();

  // Replace generic labels with industry terms
  const getLabel = (stat: Stat): string => {
    if (stat.label.includes("Bookings")) {
      return stat.label.replace("Bookings", transactionLabel + "s");
    }
    if (stat.label.includes("Contacts")) {
      return stat.label.replace("Contacts", customerLabel + "s");
    }
    return stat.label;
  };

  const getTrendIcon = (change?: number) => {
    if (change === undefined || change === 0) {
      return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
    if (change > 0) {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    }
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  const getTrendColor = (change?: number) => {
    if (change === undefined || change === 0) return "text-muted-foreground";
    return change > 0 ? "text-green-500" : "text-red-500";
  };

  return (
    <div className={cn("card-soft p-4", className)}>
      <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon ? ICON_MAP[stat.icon] : null;

          return (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs text-muted-foreground">
                  {getLabel(stat)}
                </span>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground/50" />}
              </div>

              <div className="mt-1">
                <span className="text-2xl font-semibold tabular-nums text-foreground">
                  {stat.value}
                </span>
              </div>

              {stat.change !== undefined && (
                <div className="mt-1 flex items-center gap-1">
                  {getTrendIcon(stat.change)}
                  <span className={cn("text-xs", getTrendColor(stat.change))}>
                    {Math.abs(stat.change)}%
                  </span>
                  {stat.changeLabel && (
                    <span className="text-xs text-muted-foreground">
                      {stat.changeLabel}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
