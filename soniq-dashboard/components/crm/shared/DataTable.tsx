"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  onRowClick?: (item: T) => void;
  selectedIds?: Set<string>;
  onSelect?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  selectable?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = "No data available",
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  selectedIds,
  onSelect,
  onSelectAll,
  selectable = false,
  className,
}: DataTableProps<T>) {
  const allSelected =
    selectable && data.length > 0 && selectedIds?.size === data.length;
  const someSelected =
    selectable && selectedIds && selectedIds.size > 0 && !allSelected;

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(!allSelected);
    }
  };

  const handleSelect = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onSelect) {
      onSelect(id, !selectedIds?.has(id));
    }
  };

  return (
    <div className={cn("w-full overflow-auto", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-zinc-800">
            {selectable && (
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected ?? false;
                  }}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-950"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-400",
                  column.align === "center" && "text-center",
                  column.align === "right" && "text-right",
                  column.sortable &&
                    "cursor-pointer select-none hover:text-zinc-200",
                )}
                style={{ width: column.width }}
                onClick={() => column.sortable && onSort?.(column.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {column.header}
                  {column.sortable && (
                    <span className="inline-flex flex-col">
                      {sortBy === column.key ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="py-12 text-center"
              >
                <div className="flex items-center justify-center gap-2 text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="py-12 text-center text-zinc-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const id = keyExtractor(item);
              const isSelected = selectedIds?.has(id);

              return (
                <tr
                  key={id}
                  className={cn(
                    "border-b border-zinc-800/50 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-zinc-900/50",
                    isSelected && "bg-indigo-500/10",
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => handleSelect(id, e)}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-950"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3 text-sm text-zinc-300",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                      )}
                    >
                      {column.render
                        ? column.render(item, index)
                        : ((item as Record<string, unknown>)[
                            column.key
                          ] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
