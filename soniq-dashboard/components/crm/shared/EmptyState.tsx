"use client";

import {
  Phone,
  Users,
  Calendar,
  Zap,
  Bell,
  Briefcase,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIndustry } from "@/context/IndustryContext";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
  variant?: "default" | "compact" | "card";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  const handleClick = (item: { onClick?: () => void; href?: string }) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      window.location.href = item.href;
    }
  };

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-center",
          className,
        )}
      >
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {description}
          </p>
        )}
        {action && (
          <Button
            size="sm"
            className="mt-3"
            onClick={() => handleClick(action)}
          >
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border bg-card/50 p-8",
          className,
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {description}
            </p>
          )}
          <div className="flex gap-3 mt-4">
            {action && (
              <Button onClick={() => handleClick(action)}>
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant="outline"
                onClick={() => handleClick(secondaryAction)}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          {description}
        </p>
      )}
      <div className="flex gap-3 mt-6">
        {action && (
          <Button onClick={() => handleClick(action)}>{action.label}</Button>
        )}
        {secondaryAction && (
          <Button
            variant="outline"
            onClick={() => handleClick(secondaryAction)}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// Pre-built empty states for common scenarios
export function EmptyCallsState({ searchQuery }: { searchQuery?: string }) {
  return (
    <EmptyState
      icon={Phone}
      title={searchQuery ? "No calls found" : "No calls yet"}
      description={
        searchQuery
          ? "Try adjusting your search terms or filters"
          : "Your AI agent is ready to handle calls. Share your number to get started."
      }
      action={
        searchQuery
          ? undefined
          : {
              label: "View Phone Settings",
              href: "/settings/phone",
            }
      }
    />
  );
}

export function EmptyContactsState({ onAdd }: { onAdd?: () => void } = {}) {
  const { customerPluralLabel } = useIndustry();
  return (
    <EmptyState
      icon={Users}
      title={`No ${customerPluralLabel.toLowerCase()} yet`}
      description={`${customerPluralLabel} will appear here when callers reach out to your AI agent.`}
      action={onAdd ? { label: "Add Contact", onClick: onAdd } : undefined}
      variant="card"
    />
  );
}

export function EmptyBookingsState() {
  const { transactionPluralLabel } = useIndustry();
  return (
    <EmptyState
      icon={Calendar}
      title={`No ${transactionPluralLabel.toLowerCase()} yet`}
      description={`${transactionPluralLabel} made through your AI agent will appear here.`}
      action={{
        label: "View Calendar",
        href: "/calendar",
      }}
      variant="card"
    />
  );
}

export function EmptyDashboardState() {
  return (
    <EmptyState
      icon={Zap}
      title="Welcome to Soniq"
      description="Your AI voice agent dashboard is ready. Complete your setup to start receiving calls."
      action={{
        label: "Complete Setup",
        href: "/setup",
      }}
      secondaryAction={{
        label: "View Settings",
        href: "/settings",
      }}
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="No notifications yet"
      description="Notifications will appear here as your AI agent handles calls."
      variant="card"
    />
  );
}

export function EmptyResources({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={Briefcase}
      title="No resources yet"
      description="Add resources like rooms, services, or staff to help your AI agent provide accurate information."
      action={onAdd ? { label: "Add Resource", onClick: onAdd } : undefined}
      variant="card"
    />
  );
}

export function EmptySearchResults() {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search terms or filters."
      variant="compact"
    />
  );
}

// Aliases for consumers using shorter names
export { EmptyContactsState as EmptyContacts };
export { EmptyBookingsState as EmptyBookings };
