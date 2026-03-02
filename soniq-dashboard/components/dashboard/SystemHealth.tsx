"use client";

import React from "react";
import { useConfig } from "@/context/ConfigContext";
import { useIndustry } from "@/context/IndustryContext";
import { formatCurrency, formatPercentage } from "@/lib/mockData";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Phone,
  Activity,
  Zap,
  Users,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// SYSTEM HEALTH PANEL - Left Column
// ============================================================================

interface Benchmark {
  good: number;
  warning: number;
}

interface MetricWithBenchmark {
  label: string;
  value: string;
  rawValue: number;
  benchmark: Benchmark;
  unit?: string;
  trend?: "up" | "down" | "stable";
  icon?: React.ElementType;
}

export default function SystemHealth() {
  const { config, metrics, industryMetrics } = useConfig();
  const { transactionPluralLabel, revenueLabel, industryLabel } = useIndustry();

  if (!config || !metrics) {
    return (
      <div className="flex h-full items-center justify-center">
        <Activity className="h-6 w-6 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            System Health
          </h2>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {/* Revenue Card - Primary KPI */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wide text-primary">
              {revenueLabel} Today
            </span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {formatCurrency(metrics.business?.revenueToday || 0)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {metrics.business?.transactionsToday || 0}{" "}
            {transactionPluralLabel.toLowerCase()}
          </div>
        </div>

        {/* System Metrics with Benchmarks */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <Zap className="h-3 w-3" />
            Performance
          </h3>
          <div className="space-y-3">
            <BenchmarkedMetric
              label="Latency"
              value={`${metrics.system.latency}ms`}
              rawValue={metrics.system.latency}
              benchmark={{ good: 50, warning: 100 }}
              unit="ms"
              icon={Clock}
            />
            <BenchmarkedMetric
              label="Uptime"
              value={formatPercentage(metrics.system.uptime)}
              rawValue={100 - metrics.system.uptime}
              benchmark={{ good: 0.1, warning: 1 }}
              unit="% downtime"
              trend={metrics.system.uptime > 99.9 ? "up" : "stable"}
            />
            <SimpleMetric
              label="Active Calls"
              value={String(metrics.system.activeCalls)}
              status={metrics.system.activeCalls > 0 ? "active" : "neutral"}
              icon={Phone}
            />
            <BenchmarkedMetric
              label="Queue"
              value={String(metrics.system.queuedCalls)}
              rawValue={metrics.system.queuedCalls}
              benchmark={{ good: 2, warning: 5 }}
              unit="calls"
            />
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Industry-Specific Metrics */}
        {industryMetrics && industryMetrics.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="h-3 w-3" />
              {industryLabel} Metrics
            </h3>
            <div className="space-y-3">
              {industryMetrics.map(
                (metric: {
                  id: string;
                  value: number;
                  trend?: "up" | "down" | "stable";
                  status?: string;
                }) => (
                  <SimpleMetric
                    key={metric.id}
                    label={metric.id.replace(/_/g, " ").toUpperCase()}
                    value={
                      typeof metric.value === "number"
                        ? metric.id.includes("rate") ||
                          metric.id.includes("conversion")
                          ? formatPercentage(metric.value)
                          : String(Math.round(metric.value))
                        : String(metric.value)
                    }
                    trend={metric.trend}
                    status={
                      metric.status === "good"
                        ? "nominal"
                        : metric.status === "warning"
                          ? "warning"
                          : "neutral"
                    }
                  />
                ),
              )}
            </div>
          </section>
        )}

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Call Metrics */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <Phone className="h-3 w-3" />
            Call Stats
          </h3>
          <div className="space-y-3">
            <SimpleMetric
              label="Today"
              value={String(metrics.calls?.totalToday || 0)}
              icon={Phone}
            />
            <SimpleMetric
              label="Avg Duration"
              value={`${Math.floor((metrics.calls?.avgDuration || 0) / 60)}m ${(metrics.calls?.avgDuration || 0) % 60}s`}
              icon={Clock}
            />
            <BenchmarkedMetric
              label="Abandon Rate"
              value={formatPercentage(metrics.calls?.abandonRate || 0)}
              rawValue={metrics.calls?.abandonRate || 0}
              benchmark={{ good: 3, warning: 5 }}
              unit="%"
            />
            <SimpleMetric
              label="Missed"
              value={String(metrics.business?.missedOpportunities || 0)}
              status={
                (metrics.business?.missedOpportunities || 0) > 0
                  ? "warning"
                  : "nominal"
              }
              icon={AlertTriangle}
            />
          </div>
        </section>
      </div>

      {/* Footer Status */}
      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Last Updated</span>
          <span className="font-mono text-muted-foreground">
            {new Date().toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BENCHMARKED METRIC - With progress bar
// ============================================================================

function BenchmarkedMetric({
  label,
  value,
  rawValue,
  benchmark,
  unit,
  trend,
  icon: Icon,
}: MetricWithBenchmark) {
  const getStatus = (val: number): "nominal" | "warning" | "critical" => {
    if (val <= benchmark.good) return "nominal";
    if (val <= benchmark.warning) return "warning";
    return "critical";
  };

  const status = getStatus(rawValue);

  const statusColors = {
    nominal: "bg-emerald-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
  };

  const maxValue = benchmark.warning * 1.5;
  const progressWidth = Math.min((rawValue / maxValue) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {trend && <TrendIndicator trend={trend} />}
          <span className="text-sm font-mono font-medium text-foreground">
            {value}
          </span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            statusColors[status],
          )}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0</span>
        <span className="text-emerald-500">
          Target: {benchmark.good}
          {unit}
        </span>
        <span>
          {maxValue}
          {unit}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// SIMPLE METRIC ROW
// ============================================================================

interface SimpleMetricProps {
  label: string;
  value: string;
  trend?: "up" | "down" | "stable";
  status?: "nominal" | "warning" | "critical" | "active" | "neutral";
  icon?: React.ElementType;
}

function SimpleMetric({
  label,
  value,
  trend,
  status = "neutral",
  icon: Icon,
}: SimpleMetricProps) {
  const statusColors = {
    nominal: "text-emerald-500",
    warning: "text-amber-500",
    critical: "text-red-500",
    active: "text-primary",
    neutral: "text-foreground",
  };

  const statusBgColors = {
    nominal: "bg-emerald-500/10",
    warning: "bg-amber-500/10",
    critical: "bg-red-500/10",
    active: "bg-primary/10",
    neutral: "bg-muted",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2.5 rounded-lg",
        statusBgColors[status],
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {trend && <TrendIndicator trend={trend} />}
        <span
          className={cn("text-sm font-mono font-medium", statusColors[status])}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// TREND INDICATOR
// ============================================================================

function TrendIndicator({ trend }: { trend: "up" | "down" | "stable" }) {
  const icons = {
    up: <TrendingUp className="h-3 w-3 text-emerald-500" />,
    down: <TrendingDown className="h-3 w-3 text-red-500" />,
    stable: <Minus className="h-3 w-3 text-muted-foreground" />,
  };

  return icons[trend];
}
