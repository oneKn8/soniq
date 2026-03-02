"use client";

import * as React from "react";
import { GripVertical, Calendar, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Deal } from "@/lib/api/deals";

// ============================================================================
// TYPES
// ============================================================================

interface DealCardProps {
  deal: Deal;
  customerLabel?: string;
  onClick?: (deal: Deal) => void;
  onDragStart?: (e: React.DragEvent, deal: Deal) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatAmount(amountCents: number): string {
  if (amountCents === 0) return "$0";
  return `$${(amountCents / 100).toLocaleString()}`;
}

function formatDate(dateString?: string): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays <= 7) return `${diffDays}d`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DealCard({
  deal,
  customerLabel: _customerLabel,
  onClick,
  onDragStart,
}: DealCardProps) {
  const closeDateText = formatDate(deal.expected_close);
  const isOverdue =
    deal.expected_close && new Date(deal.expected_close) < new Date();

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, deal)}
      onClick={() => onClick?.(deal)}
      className={cn(
        "group cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition-all",
        "hover:border-zinc-700 hover:bg-zinc-900",
        "active:scale-[0.98]",
      )}
    >
      {/* Top row: name + drag handle */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="truncate text-sm font-medium text-zinc-100">
          {deal.name}
        </h4>
        <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="h-4 w-4 text-zinc-600" />
        </div>
      </div>

      {/* Contact name */}
      {deal.contact_name && (
        <p className="mt-1 truncate text-xs text-zinc-500">
          {deal.contact_name}
        </p>
      )}

      {/* Company */}
      {deal.company && (
        <div className="mt-1 flex items-center gap-1">
          <Building2 className="h-3 w-3 text-zinc-600" />
          <span className="truncate text-xs text-zinc-500">{deal.company}</span>
        </div>
      )}

      {/* Bottom row: amount + expected close */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-200">
          {formatAmount(deal.amount_cents)}
        </span>
        {closeDateText && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue ? "text-red-400" : "text-zinc-500",
            )}
          >
            <Calendar className="h-3 w-3" />
            <span>{closeDateText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
