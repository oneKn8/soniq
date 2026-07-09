// Universal Deal Pipeline Configuration
// One default set of deal stages, terminology, and task types for every tenant.
// No per-industry pipelines. Tenants may override stages later via JSONB config.

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

// Universal task types available to every tenant.
const UNIVERSAL_TASK_TYPES = [
  { value: "follow_up", label: "Follow Up" },
  { value: "call_back", label: "Call Back" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "review", label: "Review" },
  { value: "custom", label: "Custom" },
];

// The single universal pipeline.
const UNIVERSAL_PIPELINE: PipelineConfig = {
  dealLabel: "Deal",
  dealLabelPlural: "Deals",
  stages: [
    { id: "new", label: "New", color: "blue", isTerminal: false },
    { id: "qualified", label: "Qualified", color: "amber", isTerminal: false },
    { id: "won", label: "Won", color: "emerald", isTerminal: true },
    { id: "lost", label: "Lost", color: "red", isTerminal: true },
  ],
  defaultStage: "new",
  completedStage: "won",
  cancelledStage: "lost",
  taskTypes: UNIVERSAL_TASK_TYPES,
};

export function getPipelineConfig(): PipelineConfig {
  return UNIVERSAL_PIPELINE;
}

export function getStages(): StageConfig[] {
  return UNIVERSAL_PIPELINE.stages;
}

export function getTaskTypes(): { value: string; label: string }[] {
  return UNIVERSAL_PIPELINE.taskTypes;
}

// Returns all valid stage IDs (for loose validation).
let _allStagesCache: Set<string> | null = null;
export function getAllValidStages(): Set<string> {
  if (_allStagesCache) return _allStagesCache;
  const stages = new Set<string>();
  for (const stage of UNIVERSAL_PIPELINE.stages) {
    stages.add(stage.id);
  }
  _allStagesCache = stages;
  return _allStagesCache;
}

// Returns all valid task type IDs.
let _allTaskTypesCache: Set<string> | null = null;
export function getAllValidTaskTypes(): Set<string> {
  if (_allTaskTypesCache) return _allTaskTypesCache;
  const types = new Set<string>();
  for (const t of UNIVERSAL_PIPELINE.taskTypes) {
    types.add(t.value);
  }
  _allTaskTypesCache = types;
  return _allTaskTypesCache;
}
