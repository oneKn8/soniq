"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectionCardProps {
  selected: boolean;
  onClick: () => void;
  icon?: React.ElementType;
  title: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function SelectionCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  badge,
  disabled = false,
  children,
  className,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative w-full rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-muted-foreground/40",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {selected && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}

      {Icon && (
        <div
          className={cn(
            "mb-3 flex h-10 w-10 items-center justify-center rounded-lg",
            selected
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      )}

      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {badge && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {badge}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}

      {children}
    </button>
  );
}
