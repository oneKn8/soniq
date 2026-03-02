"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
  showSummary?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Pagination({
  total,
  limit,
  offset,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50, 100],
  showSummary = true,
  className,
}: PaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const startItem = total === 0 ? 0 : offset + 1;
  const endItem = Math.min(offset + limit, total);

  const canGoPrev = offset > 0;
  const canGoNext = offset + limit < total;

  const goToPage = (page: number) => {
    const newOffset = (page - 1) * limit;
    onPageChange(newOffset);
  };

  const goToPrev = () => {
    if (canGoPrev) {
      onPageChange(offset - limit);
    }
  };

  const goToNext = () => {
    if (canGoNext) {
      onPageChange(offset + limit);
    }
  };

  // Generate page numbers to show
  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (total === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {showSummary && (
        <div className="text-sm text-zinc-400">
          Showing <span className="font-medium text-zinc-200">{startItem}</span>{" "}
          to <span className="font-medium text-zinc-200">{endItem}</span> of{" "}
          <span className="font-medium text-zinc-200">{total}</span> results
        </div>
      )}

      <div className="flex items-center gap-2">
        {onLimitChange && (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {limitOptions.map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </select>
        )}

        <nav className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToPrev}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {getPageNumbers().map((page, index) =>
            page === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-2 text-zinc-500">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="icon-sm"
                onClick={() => goToPage(page)}
                className="w-8"
              >
                {page}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToNext}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
