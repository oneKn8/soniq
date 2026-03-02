import type { TemplateConfig, TemplateCategory } from "./types";
import { getTemplateCategory } from "./types";

// Default template - generic workstation
const DEFAULT_TEMPLATE: TemplateConfig = {
  id: "default",
  name: "Default Workstation",
  description: "General-purpose workstation layout",
  industries: [],
  layout: "dashboard",
  widgets: [
    {
      type: "today-schedule",
      title: "Today's Schedule",
      size: "lg",
      order: 1,
      enabled: true,
    },
    {
      type: "quick-actions",
      title: "Quick Actions",
      size: "md",
      order: 2,
      enabled: true,
    },
    {
      type: "recent-calls",
      title: "Recent Calls",
      size: "md",
      order: 3,
      enabled: true,
    },
    {
      type: "activity-feed",
      title: "Activity",
      size: "md",
      order: 4,
      enabled: true,
    },
    {
      type: "stats-summary",
      title: "Today's Stats",
      size: "sm",
      order: 5,
      enabled: true,
    },
  ],
  quickActions: [
    {
      id: "new-contact",
      label: "New Contact",
      icon: "UserPlus",
      action: "/contacts?new=true",
    },
    {
      id: "new-booking",
      label: "New Booking",
      icon: "CalendarPlus",
      action: "/calendar?new=true",
    },
    {
      id: "view-calls",
      label: "Call History",
      icon: "Phone",
      action: "/calls",
    },
  ],
  primaryMetric: {
    label: "Today's Bookings",
    key: "todayBookings",
    format: "number",
  },
  columns: {
    time: "Time",
    entity: "Contact",
    status: "Status",
    action: "Action",
  },
};

// Healthcare template - Clinics, Medical, Dental
const HEALTHCARE_TEMPLATE: TemplateConfig = {
  id: "healthcare",
  name: "Patient Schedule",
  description: "Optimized for medical practices and clinics",
  industries: ["medical", "dental"],
  layout: "timeline",
  widgets: [
    {
      type: "today-schedule",
      title: "Today's Appointments",
      size: "xl",
      order: 1,
      enabled: true,
    },
    {
      type: "waitlist",
      title: "Waiting Room",
      size: "md",
      order: 2,
      enabled: true,
    },
    {
      type: "availability",
      title: "Provider Availability",
      size: "md",
      order: 3,
      enabled: true,
    },
    {
      type: "quick-actions",
      title: "Quick Actions",
      size: "sm",
      order: 4,
      enabled: true,
    },
    {
      type: "recent-calls",
      title: "Recent Calls",
      size: "sm",
      order: 5,
      enabled: true,
    },
  ],
  quickActions: [
    {
      id: "check-in",
      label: "Check In Patient",
      icon: "ClipboardCheck",
      action: "check-in",
      variant: "primary",
    },
    {
      id: "new-appointment",
      label: "New Appointment",
      icon: "CalendarPlus",
      action: "/calendar?new=true",
    },
    {
      id: "new-patient",
      label: "New Patient",
      icon: "UserPlus",
      action: "/contacts?new=true",
    },
    {
      id: "call-patient",
      label: "Call Patient",
      icon: "Phone",
      action: "call",
    },
  ],
  primaryMetric: {
    label: "Patients Today",
    key: "todayPatients",
    format: "number",
  },
  columns: {
    time: "Appointment Time",
    entity: "Patient",
    status: "Status",
    action: "Action",
  },
};

// Hospitality - Hotels template
const HOTEL_TEMPLATE: TemplateConfig = {
  id: "hotel",
  name: "Front Desk",
  description: "Hotel and lodging front desk workstation",
  industries: ["hotel", "motel"],
  layout: "grid",
  widgets: [
    {
      type: "room-grid",
      title: "Room Status",
      size: "xl",
      order: 1,
      enabled: true,
    },
    {
      type: "today-schedule",
      title: "Today's Arrivals",
      size: "lg",
      order: 2,
      enabled: true,
    },
    {
      type: "today-schedule",
      title: "Today's Departures",
      size: "md",
      order: 3,
      enabled: true,
    },
    {
      type: "quick-actions",
      title: "Quick Actions",
      size: "sm",
      order: 4,
      enabled: true,
    },
    {
      type: "notifications",
      title: "VIP Alerts",
      size: "sm",
      order: 5,
      enabled: true,
    },
  ],
  quickActions: [
    {
      id: "check-in",
      label: "Check In Guest",
      icon: "LogIn",
      action: "check-in",
      variant: "primary",
    },
    {
      id: "check-out",
      label: "Check Out",
      icon: "LogOut",
      action: "check-out",
    },
    {
      id: "new-reservation",
      label: "New Reservation",
      icon: "CalendarPlus",
      action: "/calendar?new=true",
    },
    {
      id: "room-status",
      label: "Room Status",
      icon: "BedDouble",
      action: "/resources",
    },
  ],
  primaryMetric: {
    label: "Arrivals Today",
    key: "todayArrivals",
    format: "number",
  },
  columns: {
    time: "Check-in Time",
    entity: "Guest",
    status: "Room Status",
    action: "Action",
  },
};

// Hospitality - Restaurant template
const RESTAURANT_TEMPLATE: TemplateConfig = {
  id: "restaurant",
  name: "Host Station",
  description: "Restaurant and dining host workstation",
  industries: ["restaurant"],
  layout: "kanban",
  widgets: [
    {
      type: "table-map",
      title: "Floor Plan",
      size: "xl",
      order: 1,
      enabled: true,
    },
    {
      type: "today-schedule",
      title: "Reservations",
      size: "lg",
      order: 2,
      enabled: true,
    },
    {
      type: "waitlist",
      title: "Waitlist",
      size: "md",
      order: 3,
      enabled: true,
    },
    {
      type: "quick-actions",
      title: "Quick Actions",
      size: "sm",
      order: 4,
      enabled: true,
    },
  ],
  quickActions: [
    {
      id: "seat-party",
      label: "Seat Party",
      icon: "Users",
      action: "seat",
      variant: "primary",
    },
    {
      id: "add-waitlist",
      label: "Add to Waitlist",
      icon: "ListPlus",
      action: "waitlist",
    },
    {
      id: "new-reservation",
      label: "New Reservation",
      icon: "CalendarPlus",
      action: "/calendar?new=true",
    },
    {
      id: "notify-table",
      label: "Notify Table Ready",
      icon: "Bell",
      action: "notify",
    },
  ],
  primaryMetric: {
    label: "Reservations Today",
    key: "todayReservations",
    format: "number",
  },
  columns: {
    time: "Reservation Time",
    entity: "Party Name",
    status: "Table Status",
    action: "Action",
  },
};

// Personal Care - Salon/Spa template
const SALON_TEMPLATE: TemplateConfig = {
  id: "salon",
  name: "Appointment Book",
  description: "Salon, spa, and personal care workstation",
  industries: ["salon"],
  layout: "timeline",
  widgets: [
    {
      type: "today-schedule",
      title: "Today's Appointments",
      size: "xl",
      order: 1,
      enabled: true,
    },
    {
      type: "availability",
      title: "Stylist Schedule",
      size: "lg",
      order: 2,
      enabled: true,
    },
    {
      type: "quick-actions",
      title: "Quick Actions",
      size: "md",
      order: 3,
      enabled: true,
    },
    {
      type: "recent-calls",
      title: "Recent Calls",
      size: "sm",
      order: 4,
      enabled: true,
    },
  ],
  quickActions: [
    {
      id: "check-in",
      label: "Check In Client",
      icon: "ClipboardCheck",
      action: "check-in",
      variant: "primary",
    },
    {
      id: "new-appointment",
      label: "Book Appointment",
      icon: "CalendarPlus",
      action: "/calendar?new=true",
    },
    {
      id: "new-client",
      label: "New Client",
      icon: "UserPlus",
      action: "/contacts?new=true",
    },
    {
      id: "reschedule",
      label: "Reschedule",
      icon: "CalendarClock",
      action: "reschedule",
    },
  ],
  primaryMetric: {
    label: "Appointments Today",
    key: "todayAppointments",
    format: "number",
  },
  columns: {
    time: "Appointment",
    entity: "Client",
    status: "Status",
    action: "Action",
  },
};

// Automotive template
const AUTOMOTIVE_TEMPLATE: TemplateConfig = {
  id: "automotive",
  name: "Service Desk",
  description: "Auto service and dealership workstation",
  industries: ["auto_service"],
  layout: "dashboard",
  widgets: [
    {
      type: "today-schedule",
      title: "Today's Appointments",
      size: "lg",
      order: 1,
      enabled: true,
    },
    {
      type: "availability",
      title: "Bay Status",
      size: "md",
      order: 2,
      enabled: true,
    },
    {
      type: "quick-actions",
      title: "Quick Actions",
      size: "md",
      order: 3,
      enabled: true,
    },
    {
      type: "recent-calls",
      title: "Recent Calls",
      size: "sm",
      order: 4,
      enabled: true,
    },
  ],
  quickActions: [
    {
      id: "check-in",
      label: "Check In Vehicle",
      icon: "Car",
      action: "check-in",
      variant: "primary",
    },
    {
      id: "new-appointment",
      label: "New Appointment",
      icon: "CalendarPlus",
      action: "/calendar?new=true",
    },
    {
      id: "new-customer",
      label: "New Customer",
      icon: "UserPlus",
      action: "/contacts?new=true",
    },
    {
      id: "service-status",
      label: "Service Status",
      icon: "Wrench",
      action: "/resources",
    },
  ],
  primaryMetric: {
    label: "Vehicles Today",
    key: "todayVehicles",
    format: "number",
  },
  columns: {
    time: "Drop-off Time",
    entity: "Customer / Vehicle",
    status: "Service Status",
    action: "Action",
  },
};

// All templates indexed by category
export const TEMPLATE_CONFIGS: Record<TemplateCategory, TemplateConfig> = {
  default: DEFAULT_TEMPLATE,
  healthcare: HEALTHCARE_TEMPLATE,
  hospitality: HOTEL_TEMPLATE,
  personal_care: SALON_TEMPLATE,
  automotive: AUTOMOTIVE_TEMPLATE,
};

// Specific industry overrides (e.g., restaurant differs from hotel)
export const INDUSTRY_TEMPLATE_OVERRIDES: Partial<
  Record<string, TemplateConfig>
> = {
  restaurant: RESTAURANT_TEMPLATE,
};

// Get template config for an industry
export function getTemplateConfig(industry: string): TemplateConfig {
  // Check for specific industry override first
  if (INDUSTRY_TEMPLATE_OVERRIDES[industry]) {
    return INDUSTRY_TEMPLATE_OVERRIDES[industry]!;
  }

  // Fall back to category template
  const category = getTemplateCategory(industry);

  return TEMPLATE_CONFIGS[category] || TEMPLATE_CONFIGS.default;
}
