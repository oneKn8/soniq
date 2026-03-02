"use client";

import * as React from "react";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  Filter,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  MessageSquare,
  User,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/crm/shared/DataTable";
import { Pagination } from "@/components/crm/shared/Pagination";
import { EmptyCallsState } from "@/components/crm/shared/EmptyState";
import { useCalls, useCall, type Call } from "@/hooks/useCalls";
import { useIndustry } from "@/context/IndustryContext";
import { CallDetail } from "./CallDetail";
import { cn } from "@/lib/utils";

// ============================================================================
// OUTCOME BADGE
// ============================================================================

function OutcomeBadge({ outcome }: { outcome?: string }) {
  const { transactionLabel } = useIndustry();
  const config: Record<
    string,
    { label: string; className: string; icon: React.ElementType }
  > = {
    booking: {
      label: transactionLabel,
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      icon: CheckCircle,
    },
    inquiry: {
      label: "Inquiry",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      icon: MessageSquare,
    },
    support: {
      label: "Support",
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      icon: User,
    },
    escalation: {
      label: "Escalated",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
      icon: ArrowUpRight,
    },
    hangup: {
      label: "Hangup",
      className: "bg-muted text-muted-foreground border-border",
      icon: XCircle,
    },
  };

  const item = config[outcome || ""] || {
    label: outcome || "Unknown",
    className: "bg-muted text-muted-foreground border-border",
    icon: Phone,
  };

  const Icon = item.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        item.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {item.label}
    </span>
  );
}

// ============================================================================
// DURATION FORMAT
// ============================================================================

function formatDuration(seconds?: number): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// CALL TIMELINE BAR - Visual representation of call flow
// ============================================================================

function CallTimelineBar({ call }: { call: Call }) {
  // Generate segments based on call outcome
  const segments = React.useMemo(() => {
    const segs = [];
    // Greeting - always present
    segs.push({ type: "greeting", width: 15, color: "bg-emerald-500" });

    if (call.outcome_type === "booking") {
      segs.push({ type: "booking", width: 50, color: "bg-blue-500" });
      segs.push({ type: "confirmation", width: 25, color: "bg-emerald-500" });
    } else if (call.outcome_type === "escalation") {
      segs.push({ type: "inquiry", width: 40, color: "bg-amber-500" });
      segs.push({ type: "escalation", width: 30, color: "bg-red-500" });
    } else if (call.outcome_type === "inquiry") {
      segs.push({ type: "inquiry", width: 60, color: "bg-blue-500" });
      segs.push({ type: "close", width: 15, color: "bg-muted" });
    } else {
      segs.push({ type: "conversation", width: 60, color: "bg-muted" });
      segs.push({ type: "end", width: 15, color: "bg-muted" });
    }
    return segs;
  }, [call.outcome_type]);

  return (
    <div className="flex items-center gap-1 h-1.5 w-24">
      {segments.map((seg, i) => (
        <div
          key={i}
          className={cn("h-full rounded-full", seg.color)}
          style={{ width: `${seg.width}%` }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// TABLE COLUMNS
// ============================================================================

const columns: Column<Call>[] = [
  {
    key: "direction",
    header: "",
    width: "40px",
    render: (call) => (
      <div className="flex items-center justify-center">
        {call.direction === "inbound" ? (
          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <PhoneIncoming className="h-4 w-4 text-emerald-500" />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <PhoneOutgoing className="h-4 w-4 text-blue-500" />
          </div>
        )}
      </div>
    ),
  },
  {
    key: "caller",
    header: "Caller",
    sortable: true,
    render: (call) => (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">
            {(call.caller_name || "?").charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div className="font-medium text-foreground">
            {call.caller_name || "Unknown Caller"}
          </div>
          <div className="text-xs text-muted-foreground">
            {call.caller_phone}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "outcome",
    header: "Outcome",
    render: (call) => <OutcomeBadge outcome={call.outcome_type} />,
  },
  {
    key: "timeline",
    header: "Flow",
    width: "120px",
    render: (call) => <CallTimelineBar call={call} />,
  },
  {
    key: "duration",
    header: "Duration",
    width: "100px",
    render: (call) => (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span className="text-sm font-mono">
          {formatDuration(call.duration_seconds)}
        </span>
      </div>
    ),
  },
  {
    key: "created_at",
    header: "When",
    sortable: true,
    width: "100px",
    render: (call) => (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span className="text-sm">{formatDate(call.created_at)}</span>
      </div>
    ),
  },
];

// ============================================================================
// CALLS PAGE
// ============================================================================

export default function CallsPage() {
  const { transactionLabel } = useIndustry();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [outcome, setOutcome] = React.useState<string>("");
  const [offset, setOffset] = React.useState(0);
  const [selectedCallId, setSelectedCallId] = React.useState<string | null>(
    null,
  );
  const limit = 20;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { calls, total, loading, error, refetch } = useCalls({
    search: debouncedSearch,
    outcome: outcome || undefined,
    limit,
    offset,
  });

  const { call: selectedCall, loading: loadingDetail } =
    useCall(selectedCallId);

  // Handle row click
  const handleRowClick = (call: Call) => {
    setSelectedCallId(call.id);
  };

  // Close detail
  const handleCloseDetail = () => {
    setSelectedCallId(null);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Call History
          </h1>
          <p className="text-sm text-muted-foreground">{total} total calls</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-border px-6 py-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={outcome}
            onChange={(e) => {
              setOutcome(e.target.value);
              setOffset(0);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All Outcomes</option>
            <option value="booking">{transactionLabel}</option>
            <option value="inquiry">Inquiry</option>
            <option value="support">Support</option>
            <option value="escalation">Escalated</option>
            <option value="hangup">Hangup</option>
          </select>

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <Filter className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table */}
        <div className="flex-1 overflow-auto">
          {error ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : calls.length === 0 && !loading ? (
            <EmptyCallsState searchQuery={search} />
          ) : (
            <DataTable<Call>
              columns={columns}
              data={calls}
              keyExtractor={(call) => call.id}
              isLoading={loading}
              onRowClick={handleRowClick}
              selectedIds={
                selectedCallId ? new Set([selectedCallId]) : undefined
              }
            />
          )}
        </div>

        {/* Detail Panel */}
        {selectedCallId && (
          <div className="w-[400px] border-l border-border overflow-auto bg-card">
            <CallDetail
              call={selectedCall}
              loading={loadingDetail}
              onClose={handleCloseDetail}
            />
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="border-t border-border px-6 py-3">
          <Pagination
            total={total}
            limit={limit}
            offset={offset}
            onPageChange={setOffset}
          />
        </div>
      )}
    </div>
  );
}
