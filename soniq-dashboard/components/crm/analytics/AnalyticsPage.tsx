"use client";

import * as React from "react";
import {
  Phone,
  Calendar,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAnalytics,
  useDashboardStats,
  type TimeSeriesPoint,
  type OutcomeData,
} from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ============================================================================
// COLORS
// ============================================================================

const CHART_COLORS = {
  primary: "#6366f1", // indigo
  secondary: "#22c55e", // green
  accent: "#f59e0b", // amber
  muted: "#71717a", // zinc
};

const OUTCOME_COLORS: Record<string, string> = {
  booking: "#22c55e", // green
  inquiry: "#3b82f6", // blue
  support: "#f59e0b", // amber
  escalation: "#ef4444", // red
  hangup: "#71717a", // zinc
  unknown: "#a1a1aa", // zinc-400
};

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  loading?: boolean;
}

function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  loading,
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="mt-2">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-2xl font-semibold text-foreground">
              {value}
            </div>
            {change !== undefined && (
              <div className="mt-1 flex items-center gap-1 text-xs">
                {isPositive ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={isPositive ? "text-emerald-500" : "text-red-500"}
                >
                  {Math.abs(change)}%
                </span>
                <span className="text-muted-foreground">
                  {changeLabel || "vs last period"}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CHART CARDS
// ============================================================================

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
}

function ChartCard({
  title,
  description,
  children,
  loading,
  className,
}: ChartCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="border-b border-border p-4">
        <h3 className="font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex h-[250px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnalyticsPage() {
  const [period, setPeriod] = React.useState(30);
  const {
    data: analytics,
    loading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useAnalytics(period);
  const {
    stats,
    loading: statsLoading,
    refetch: refetchStats,
  } = useDashboardStats();

  const loading = analyticsLoading || statsLoading;

  const handleRefresh = () => {
    refetchAnalytics();
    refetchStats();
  };

  // Format date for x-axis
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Call performance and booking insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Stats Grid */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Calls"
            value={analytics?.summary.totalCalls || 0}
            icon={Phone}
            loading={loading}
          />
          <StatCard
            title="Bookings Made"
            value={analytics?.summary.totalBookings || 0}
            icon={Calendar}
            loading={loading}
          />
          <StatCard
            title="Conversion Rate"
            value={`${analytics?.summary.conversionRate || 0}%`}
            icon={TrendingUp}
            loading={loading}
          />
          <StatCard
            title="Avg Call Duration"
            value={formatDuration(analytics?.summary.avgDurationSeconds || 0)}
            icon={Clock}
            loading={loading}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Call Volume Chart */}
          <ChartCard
            title="Call Volume"
            description="Daily call count over time"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics?.timeSeries || []}>
                <defs>
                  <linearGradient
                    id="callsGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={CHART_COLORS.primary}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_COLORS.primary}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={{ stroke: "#27272a" }}
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={{ stroke: "#27272a" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke={CHART_COLORS.primary}
                  fill="url(#callsGradient)"
                  strokeWidth={2}
                  name="Calls"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Outcome Distribution */}
          <ChartCard
            title="Call Outcomes"
            description="Distribution of call results"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics?.outcomes || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={{ stroke: "#71717a" }}
                >
                  {analytics?.outcomes.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        OUTCOME_COLORS[entry.name] || OUTCOME_COLORS.unknown
                      }
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Bookings vs Calls */}
          <ChartCard
            title="Calls vs Bookings"
            description="Conversion over time"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics?.timeSeries || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={{ stroke: "#27272a" }}
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={{ stroke: "#27272a" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="calls"
                  fill={CHART_COLORS.primary}
                  name="Calls"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="bookings"
                  fill={CHART_COLORS.secondary}
                  name="Bookings"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Peak Hours */}
          <ChartCard
            title="Peak Call Hours"
            description="Busiest times of day"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={
                  analytics?.peakHours?.map((h) => ({
                    ...h,
                    label: `${h.hour}:00`,
                  })) || []
                }
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  type="number"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={{ stroke: "#27272a" }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={{ stroke: "#27272a" }}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  fill={CHART_COLORS.accent}
                  name="Calls"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="mt-6">
            <h3 className="mb-4 font-medium text-foreground">
              Period Comparison
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm text-muted-foreground">
                  Calls This Week
                </div>
                <div className="mt-1 text-xl font-semibold text-foreground">
                  {stats.calls.week}
                </div>
                <div className="text-xs text-muted-foreground">
                  Today: {stats.calls.today} | Month: {stats.calls.month}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm text-muted-foreground">
                  Bookings This Week
                </div>
                <div className="mt-1 text-xl font-semibold text-foreground">
                  {stats.bookings.week}
                </div>
                <div className="text-xs text-muted-foreground">
                  Today: {stats.bookings.today} | Month: {stats.bookings.month}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm text-muted-foreground">
                  Est. Revenue This Week
                </div>
                <div className="mt-1 text-xl font-semibold text-foreground">
                  ${stats.revenue.week.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Today: ${stats.revenue.today} | Month: $
                  {stats.revenue.month.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
