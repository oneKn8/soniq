/**
 * Deals API client
 * Pipeline and deal management
 */

import { get, post, put, patch, del } from "./client";

// ============================================================================
// TYPES
// ============================================================================

// Industry-specific stages -- see industryPresets.ts for per-industry definitions
export type DealStage = string;

export interface Deal {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  company?: string;
  stage: DealStage;
  sort_index: number;
  amount_cents: number;
  expected_close?: string;
  contact_id?: string;
  call_id?: string;
  source: string;
  created_by?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
  contact_name?: string;
}

export interface PipelineStage {
  stage: DealStage;
  count: number;
  total_amount_cents: number;
  deals: Deal[];
}

export interface CreateDealInput {
  name: string;
  description?: string;
  company?: string;
  stage?: DealStage;
  amount_cents?: number;
  expected_close?: string;
  contact_id?: string;
  source?: string;
}

export interface UpdateDealInput {
  name?: string;
  description?: string;
  company?: string;
  stage?: DealStage;
  amount_cents?: number;
  expected_close?: string;
  contact_id?: string;
}

// ============================================================================
// PIPELINE
// ============================================================================

/**
 * Get full pipeline with deals grouped by stage
 */
export async function getPipeline(): Promise<PipelineStage[]> {
  const res = await get<{ stages: PipelineStage[] }>("/api/deals/pipeline");
  return res.stages;
}

// ============================================================================
// LIST & SEARCH
// ============================================================================

/**
 * Search deals with filters
 */
export async function searchDeals(
  params?: Record<string, string>,
): Promise<{ data: Deal[]; total: number; has_more: boolean }> {
  return get<{ data: Deal[]; total: number; has_more: boolean }>(
    "/api/deals",
    params,
  );
}

// ============================================================================
// CRUD
// ============================================================================

/**
 * Get a single deal by ID
 */
export async function getDeal(id: string): Promise<Deal> {
  return get<Deal>(`/api/deals/${id}`);
}

/**
 * Create a new deal
 */
export async function createDeal(input: CreateDealInput): Promise<Deal> {
  return post<Deal>("/api/deals", input);
}

/**
 * Update a deal
 */
export async function updateDeal(
  id: string,
  input: UpdateDealInput,
): Promise<Deal> {
  return put<Deal>(`/api/deals/${id}`, input);
}

/**
 * Update deal stage (for drag and drop)
 */
export async function updateDealStage(
  id: string,
  stage: DealStage,
  sortIndex?: number,
): Promise<Deal> {
  return patch<Deal>(`/api/deals/${id}/stage`, {
    stage,
    sort_index: sortIndex,
  });
}

/**
 * Archive (soft delete) a deal
 */
export async function archiveDeal(id: string): Promise<void> {
  return del(`/api/deals/${id}`);
}
