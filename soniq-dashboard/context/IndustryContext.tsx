"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTenant } from "./TenantContext";
import { INDUSTRY_PRESETS } from "@/lib/industryPresets";
import type {
  IndustryPreset,
  IndustryType,
  PipelineStageConfig,
  IndustryTaskType,
} from "@/types";

// Fallback preset for unknown industries
const DEFAULT_INDUSTRY: IndustryType = "restaurant";

interface TenantInfo {
  id: string;
  industry: IndustryType;
  business_name: string;
  agent_name: string;
}

interface IndustryContextValue {
  // Core data
  industry: IndustryType;
  preset: IndustryPreset;
  tenant: TenantInfo | null;

  // Terminology shortcuts
  transactionLabel: string;
  transactionPluralLabel: string;
  customerLabel: string;
  customerPluralLabel: string;
  availabilityLabel: string;
  revenueLabel: string;
  dealLabel: string;
  dealPluralLabel: string;
  industryLabel: string;

  // Pipeline & task config
  pipelineStages: PipelineStageConfig[];
  taskTypes: IndustryTaskType[];

  // Loading state
  isLoading: boolean;

  // Check if industry is fully supported
  isSupported: boolean;
}

const IndustryContext = createContext<IndustryContextValue | undefined>(
  undefined,
);

// Supported (priority) industries
const SUPPORTED_INDUSTRIES = new Set<IndustryType>([
  "medical",
  "dental",
  "hotel",
  "motel",
  "restaurant",
  "salon",
  "auto_service",
]);

interface IndustryProviderProps {
  children: ReactNode;
}

export function IndustryProvider({ children }: IndustryProviderProps) {
  const { currentTenant, isLoading: tenantLoading } = useTenant();

  // Derive industry from TenantContext (single source of truth)
  const industry =
    (currentTenant?.industry as IndustryType) || DEFAULT_INDUSTRY;
  const preset =
    INDUSTRY_PRESETS[industry] || INDUSTRY_PRESETS[DEFAULT_INDUSTRY];
  const terminology = preset.terminology;

  // Derive tenant info for backward compatibility with existing consumers
  const tenant: TenantInfo | null = currentTenant
    ? {
        id: currentTenant.id,
        industry,
        business_name: currentTenant.business_name,
        agent_name: currentTenant.agent_name || "Assistant",
      }
    : null;

  const value: IndustryContextValue = {
    industry,
    preset,
    tenant,
    transactionLabel: terminology.transaction,
    transactionPluralLabel: terminology.transactionPlural,
    customerLabel: terminology.customer,
    customerPluralLabel: terminology.customerPlural,
    availabilityLabel: terminology.availability,
    revenueLabel: terminology.revenue,
    dealLabel: terminology.deal || "Deal",
    dealPluralLabel: terminology.dealPlural || "Deals",
    industryLabel: preset.label,
    pipelineStages: preset.pipeline?.stages || [],
    taskTypes: preset.taskTypes || [],
    isLoading: tenantLoading,
    isSupported: SUPPORTED_INDUSTRIES.has(industry),
  };

  return (
    <IndustryContext.Provider value={value}>
      {children}
    </IndustryContext.Provider>
  );
}

export function useIndustry() {
  const context = useContext(IndustryContext);
  if (context === undefined) {
    throw new Error("useIndustry must be used within an IndustryProvider");
  }
  return context;
}

// Helper hook for just terminology (simpler API)
export function useTerminology() {
  const { preset } = useIndustry();
  return preset.terminology;
}
