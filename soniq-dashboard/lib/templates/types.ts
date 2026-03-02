import type { IndustryType } from "@/types";

// Template widget types
export type WidgetType =
  | "today-schedule"
  | "quick-actions"
  | "activity-feed"
  | "stats-summary"
  | "room-grid"
  | "table-map"
  | "waitlist"
  | "availability"
  | "recent-calls"
  | "notifications"
  | "escalation-queue";

// Widget size variants
export type WidgetSize = "sm" | "md" | "lg" | "xl" | "full";

// Widget configuration
export interface WidgetConfig {
  type: WidgetType;
  title: string;
  size: WidgetSize;
  order: number;
  enabled: boolean;
}

// Quick action configuration
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  variant?: "default" | "primary" | "destructive";
}

// Template configuration
export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  industries: IndustryType[];

  // Layout
  layout: "dashboard" | "grid" | "timeline" | "kanban";

  // Widgets
  widgets: WidgetConfig[];

  // Quick actions shown prominently
  quickActions: QuickAction[];

  // Primary metric to show
  primaryMetric: {
    label: string;
    key: string;
    format: "number" | "currency" | "percentage" | "duration";
  };

  // Column labels for list views
  columns?: {
    time: string;
    entity: string;
    status: string;
    action: string;
  };
}

// Template category for grouping
export type TemplateCategory =
  | "healthcare"
  | "hospitality"
  | "personal_care"
  | "automotive"
  | "default";

// Mapping of industries to template categories
export const INDUSTRY_TO_CATEGORY: Record<string, TemplateCategory> = {
  // Healthcare
  medical: "healthcare",
  dental: "healthcare",

  // Hospitality
  hotel: "hospitality",
  motel: "hospitality",
  restaurant: "hospitality",

  // Personal Care
  salon: "personal_care",

  // Automotive
  auto_service: "automotive",
};

// Get template category for an industry
export function getTemplateCategory(industry: string): TemplateCategory {
  return INDUSTRY_TO_CATEGORY[industry] || "default";
}
