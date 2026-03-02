"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    variant?: "default" | "primary" | "destructive";
  }>;
  width?: "sm" | "md" | "lg";
  className?: string;
}

const WIDTH_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function ContextPanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  actions = [],
  width = "md",
  className,
}: ContextPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-border bg-background shadow-elevated",
              WIDTH_CLASSES[width],
              className,
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border p-4">
              <div className="min-w-0">
                {title && (
                  <h2 className="text-lg font-semibold text-foreground truncate">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-sm text-muted-foreground truncate">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {children}
            </div>

            {/* Actions */}
            {actions.length > 0 && (
              <div className="border-t border-border p-4">
                <div className="flex flex-wrap gap-2">
                  {actions.map((action) => {
                    const Icon = action.icon;
                    const isPrimary = action.variant === "primary";
                    const isDestructive = action.variant === "destructive";

                    return (
                      <button
                        key={action.id}
                        onClick={action.onClick}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                          isPrimary
                            ? "bg-industry text-white hover:bg-industry/90"
                            : isDestructive
                              ? "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
                              : "bg-secondary text-foreground hover:bg-accent",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Helper component for info rows in the context panel
interface InfoRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
}

export function InfoRow({ icon: Icon, label, value, onClick }: InfoRowProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 py-2",
        onClick && "w-full text-left hover:bg-accent rounded-lg px-2 -mx-2",
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
      {onClick && (
        <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
      )}
    </Component>
  );
}

// Helper component for sections in the context panel
interface SectionProps {
  title: string;
  children: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function Section({ title, children, action }: SectionProps) {
  return (
    <div className="py-4 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs text-industry hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
