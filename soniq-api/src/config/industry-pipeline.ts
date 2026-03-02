// Industry-Specific Deal Pipeline Configuration
// Defines per-industry deal stages, terminology, and task types.
// Source of truth for the API side -- dashboard mirrors this in industryPresets.ts.

export interface StageConfig {
  id: string;
  label: string;
  color: string; // Tailwind color name (e.g., "blue", "emerald")
  isTerminal: boolean;
}

export interface PipelineConfig {
  dealLabel: string;
  dealLabelPlural: string;
  stages: StageConfig[];
  defaultStage: string;
  completedStage: string;
  cancelledStage: string;
  taskTypes: { value: string; label: string }[];
}

// Universal task types available to all industries
const UNIVERSAL_TASK_TYPES = [
  { value: "follow_up", label: "Follow Up" },
  { value: "call_back", label: "Call Back" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "review", label: "Review" },
  { value: "custom", label: "Custom" },
];

const PIPELINES: Record<string, PipelineConfig> = {
  medical: {
    dealLabel: "Case",
    dealLabelPlural: "Cases",
    stages: [
      { id: "inquiry", label: "Inquiry", color: "blue", isTerminal: false },
      { id: "scheduled", label: "Scheduled", color: "cyan", isTerminal: false },
      {
        id: "confirmed",
        label: "Confirmed",
        color: "amber",
        isTerminal: false,
      },
      {
        id: "completed",
        label: "Completed",
        color: "emerald",
        isTerminal: true,
      },
      { id: "no_show", label: "No-Show", color: "orange", isTerminal: true },
      { id: "cancelled", label: "Cancelled", color: "red", isTerminal: true },
    ],
    defaultStage: "inquiry",
    completedStage: "completed",
    cancelledStage: "cancelled",
    taskTypes: [
      ...UNIVERSAL_TASK_TYPES,
      { value: "insurance_verification", label: "Insurance Verification" },
      { value: "prescription_refill", label: "Prescription Refill" },
    ],
  },

  dental: {
    dealLabel: "Case",
    dealLabelPlural: "Cases",
    stages: [
      { id: "inquiry", label: "Inquiry", color: "blue", isTerminal: false },
      { id: "scheduled", label: "Scheduled", color: "cyan", isTerminal: false },
      {
        id: "confirmed",
        label: "Confirmed",
        color: "amber",
        isTerminal: false,
      },
      {
        id: "completed",
        label: "Completed",
        color: "emerald",
        isTerminal: true,
      },
      { id: "no_show", label: "No-Show", color: "orange", isTerminal: true },
      { id: "cancelled", label: "Cancelled", color: "red", isTerminal: true },
    ],
    defaultStage: "inquiry",
    completedStage: "completed",
    cancelledStage: "cancelled",
    taskTypes: [
      ...UNIVERSAL_TASK_TYPES,
      { value: "insurance_verification", label: "Insurance Verification" },
    ],
  },

  restaurant: {
    dealLabel: "Reservation",
    dealLabelPlural: "Reservations",
    stages: [
      { id: "inquiry", label: "Inquiry", color: "blue", isTerminal: false },
      { id: "reserved", label: "Reserved", color: "cyan", isTerminal: false },
      {
        id: "confirmed",
        label: "Confirmed",
        color: "amber",
        isTerminal: false,
      },
      { id: "seated", label: "Seated", color: "purple", isTerminal: false },
      {
        id: "completed",
        label: "Completed",
        color: "emerald",
        isTerminal: true,
      },
      { id: "no_show", label: "No-Show", color: "orange", isTerminal: true },
      { id: "cancelled", label: "Cancelled", color: "red", isTerminal: true },
    ],
    defaultStage: "inquiry",
    completedStage: "completed",
    cancelledStage: "cancelled",
    taskTypes: [
      ...UNIVERSAL_TASK_TYPES,
      { value: "vendor_order", label: "Vendor Order" },
      { value: "event_setup", label: "Event Setup" },
    ],
  },

  hotel: {
    dealLabel: "Booking",
    dealLabelPlural: "Bookings",
    stages: [
      { id: "inquiry", label: "Inquiry", color: "blue", isTerminal: false },
      { id: "reserved", label: "Reserved", color: "cyan", isTerminal: false },
      {
        id: "checked_in",
        label: "Checked In",
        color: "amber",
        isTerminal: false,
      },
      {
        id: "checked_out",
        label: "Checked Out",
        color: "emerald",
        isTerminal: true,
      },
      { id: "cancelled", label: "Cancelled", color: "red", isTerminal: true },
      { id: "no_show", label: "No-Show", color: "orange", isTerminal: true },
    ],
    defaultStage: "inquiry",
    completedStage: "checked_out",
    cancelledStage: "cancelled",
    taskTypes: UNIVERSAL_TASK_TYPES,
  },

  motel: {
    dealLabel: "Booking",
    dealLabelPlural: "Bookings",
    stages: [
      { id: "inquiry", label: "Inquiry", color: "blue", isTerminal: false },
      { id: "reserved", label: "Reserved", color: "cyan", isTerminal: false },
      {
        id: "checked_in",
        label: "Checked In",
        color: "amber",
        isTerminal: false,
      },
      {
        id: "checked_out",
        label: "Checked Out",
        color: "emerald",
        isTerminal: true,
      },
      { id: "cancelled", label: "Cancelled", color: "red", isTerminal: true },
      { id: "no_show", label: "No-Show", color: "orange", isTerminal: true },
    ],
    defaultStage: "inquiry",
    completedStage: "checked_out",
    cancelledStage: "cancelled",
    taskTypes: UNIVERSAL_TASK_TYPES,
  },

  salon: {
    dealLabel: "Appointment",
    dealLabelPlural: "Appointments",
    stages: [
      { id: "inquiry", label: "Inquiry", color: "blue", isTerminal: false },
      { id: "booked", label: "Booked", color: "cyan", isTerminal: false },
      {
        id: "confirmed",
        label: "Confirmed",
        color: "amber",
        isTerminal: false,
      },
      {
        id: "completed",
        label: "Completed",
        color: "emerald",
        isTerminal: true,
      },
      { id: "no_show", label: "No-Show", color: "orange", isTerminal: true },
      { id: "cancelled", label: "Cancelled", color: "red", isTerminal: true },
    ],
    defaultStage: "inquiry",
    completedStage: "completed",
    cancelledStage: "cancelled",
    taskTypes: UNIVERSAL_TASK_TYPES,
  },

  auto_service: {
    dealLabel: "Service Order",
    dealLabelPlural: "Service Orders",
    stages: [
      { id: "inquiry", label: "Inquiry", color: "blue", isTerminal: false },
      { id: "quoted", label: "Quoted", color: "cyan", isTerminal: false },
      {
        id: "scheduled",
        label: "Scheduled",
        color: "amber",
        isTerminal: false,
      },
      {
        id: "in_progress",
        label: "In Progress",
        color: "purple",
        isTerminal: false,
      },
      {
        id: "completed",
        label: "Completed",
        color: "emerald",
        isTerminal: true,
      },
      { id: "cancelled", label: "Cancelled", color: "red", isTerminal: true },
    ],
    defaultStage: "inquiry",
    completedStage: "completed",
    cancelledStage: "cancelled",
    taskTypes: [
      ...UNIVERSAL_TASK_TYPES,
      { value: "parts_order", label: "Parts Order" },
      { value: "vehicle_pickup", label: "Vehicle Pickup" },
    ],
  },
};

// Fallback for unknown industries -- generic B2B pipeline
const DEFAULT_PIPELINE: PipelineConfig = {
  dealLabel: "Deal",
  dealLabelPlural: "Deals",
  stages: [
    { id: "new", label: "New", color: "blue", isTerminal: false },
    { id: "contacted", label: "Contacted", color: "cyan", isTerminal: false },
    { id: "qualified", label: "Qualified", color: "amber", isTerminal: false },
    { id: "proposal", label: "Proposal", color: "purple", isTerminal: false },
    {
      id: "negotiation",
      label: "Negotiation",
      color: "orange",
      isTerminal: false,
    },
    { id: "won", label: "Won", color: "emerald", isTerminal: true },
    { id: "lost", label: "Lost", color: "red", isTerminal: true },
  ],
  defaultStage: "new",
  completedStage: "won",
  cancelledStage: "lost",
  taskTypes: UNIVERSAL_TASK_TYPES,
};

export function getPipelineConfig(industry: string): PipelineConfig {
  return PIPELINES[industry] || DEFAULT_PIPELINE;
}

export function getStagesForIndustry(industry: string): StageConfig[] {
  return getPipelineConfig(industry).stages;
}

export function getTaskTypesForIndustry(
  industry: string,
): { value: string; label: string }[] {
  return getPipelineConfig(industry).taskTypes;
}

// Returns all valid stage IDs across all industries (for loose validation)
let _allStagesCache: Set<string> | null = null;
export function getAllValidStages(): Set<string> {
  if (_allStagesCache) return _allStagesCache;
  const stages = new Set<string>();
  for (const config of [...Object.values(PIPELINES), DEFAULT_PIPELINE]) {
    for (const stage of config.stages) {
      stages.add(stage.id);
    }
  }
  _allStagesCache = stages;
  return _allStagesCache;
}

// Returns all valid task type IDs across all industries
let _allTaskTypesCache: Set<string> | null = null;
export function getAllValidTaskTypes(): Set<string> {
  if (_allTaskTypesCache) return _allTaskTypesCache;
  const types = new Set<string>();
  for (const config of [...Object.values(PIPELINES), DEFAULT_PIPELINE]) {
    for (const t of config.taskTypes) {
      types.add(t.value);
    }
  }
  _allTaskTypesCache = types;
  return _allTaskTypesCache;
}
