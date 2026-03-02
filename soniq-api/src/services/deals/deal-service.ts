// Deal Service - Sales pipeline operations
// Handles CRUD, search, pipeline view, and stage management

import { queryOne, queryAll } from "../database/client.js";
import { insertOne, updateOne } from "../database/query-helpers.js";
import {
  Deal,
  DealStage,
  CreateDealInput,
  UpdateDealInput,
  DealFilters,
  PipelineStage,
  PaginationParams,
  PaginatedResult,
} from "../../types/crm.js";
import {
  getStagesForIndustry,
  getPipelineConfig,
} from "../../config/industry-pipeline.js";

// Allowed columns for ORDER BY (prevents SQL injection via sort_by param)
const ALLOWED_SORT_COLUMNS = new Set([
  "created_at",
  "updated_at",
  "name",
  "stage",
  "amount_cents",
  "expected_close",
  "company",
  "sort_index",
]);

// ============================================================================
// SEARCH & LIST
// ============================================================================

/**
 * Search deals with filters and pagination.
 * Excludes archived deals by default.
 */
export async function searchDeals(
  tenantId: string,
  filters: DealFilters = {},
  pagination: PaginationParams = {},
): Promise<PaginatedResult<Deal>> {
  const limit = Math.min(pagination.limit || 20, 100);
  const offset = pagination.offset || 0;
  const rawSort = pagination.sort_by || "created_at";
  const sortBy = ALLOWED_SORT_COLUMNS.has(rawSort) ? rawSort : "created_at";
  const sortOrder = pagination.sort_order || "desc";

  // Build dynamic WHERE clause
  const conditions: string[] = ["d.tenant_id = $1", "d.archived_at IS NULL"];
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    conditions.push(
      `(d.name ILIKE $${paramIndex} OR d.company ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`,
    );
    params.push(searchPattern);
    paramIndex++;
  }

  if (filters.stage) {
    const stages = Array.isArray(filters.stage)
      ? filters.stage
      : [filters.stage];
    conditions.push(`d.stage = ANY($${paramIndex})`);
    params.push(stages);
    paramIndex++;
  }

  if (filters.contact_id) {
    conditions.push(`d.contact_id = $${paramIndex}`);
    params.push(filters.contact_id);
    paramIndex++;
  }

  if (filters.source) {
    const sources = Array.isArray(filters.source)
      ? filters.source
      : [filters.source];
    conditions.push(`d.source = ANY($${paramIndex})`);
    params.push(sources);
    paramIndex++;
  }

  if (filters.start_date) {
    conditions.push(`d.created_at >= $${paramIndex}`);
    params.push(filters.start_date);
    paramIndex++;
  }

  if (filters.end_date) {
    conditions.push(`d.created_at <= $${paramIndex}`);
    params.push(filters.end_date);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  // Count query
  const countResult = await queryOne<{ total: string }>(
    `SELECT COUNT(*) as total FROM deals d ${whereClause}`,
    params,
  );
  const total = parseInt(countResult?.total || "0", 10);

  // Data query with joined contact name
  const direction = sortOrder === "desc" ? "DESC" : "ASC";
  const data = await queryAll<Deal>(
    `SELECT d.*, c.name as contact_name
     FROM deals d
     LEFT JOIN contacts c ON c.id = d.contact_id
     ${whereClause}
     ORDER BY d.${sortBy} ${direction}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset],
  );

  return {
    data: data || [],
    total,
    limit,
    offset,
    has_more: total > offset + limit,
  };
}

// ============================================================================
// PIPELINE VIEW
// ============================================================================

/**
 * Get pipeline view grouped by stage.
 * Returns counts, totals, and deals array per stage, ordered by sort_index.
 * Stages are determined by the tenant's industry. Deals with unrecognized
 * stages are collected into a trailing "other" bucket.
 */
export async function getPipeline(
  tenantId: string,
  industry: string,
): Promise<PipelineStage[]> {
  const stageConfigs = getStagesForIndustry(industry);
  const knownStageIds = new Set(stageConfigs.map((s) => s.id));

  // Get aggregate counts per stage
  const stageCounts = await queryAll<{
    stage: DealStage;
    count: string;
    total_amount_cents: string;
  }>(
    `SELECT stage, COUNT(*) as count, COALESCE(SUM(amount_cents), 0) as total_amount_cents
     FROM deals
     WHERE tenant_id = $1 AND archived_at IS NULL
     GROUP BY stage`,
    [tenantId],
  );

  // Get all active deals with contact names, ordered by sort_index
  const deals = await queryAll<Deal>(
    `SELECT d.*, c.name as contact_name
     FROM deals d
     LEFT JOIN contacts c ON c.id = d.contact_id
     WHERE d.tenant_id = $1 AND d.archived_at IS NULL
     ORDER BY d.sort_index ASC, d.created_at DESC`,
    [tenantId],
  );

  // Build a map of stage counts
  const countMap = new Map<
    string,
    { count: number; total_amount_cents: number }
  >();
  for (const row of stageCounts || []) {
    countMap.set(row.stage, {
      count: parseInt(row.count, 10),
      total_amount_cents: parseInt(row.total_amount_cents, 10),
    });
  }

  // Group deals by stage
  const dealsByStage = new Map<string, Deal[]>();
  for (const deal of deals || []) {
    const existing = dealsByStage.get(deal.stage) || [];
    existing.push(deal);
    dealsByStage.set(deal.stage, existing);
  }

  // Build result with industry-specific stages (even empty ones)
  const result: PipelineStage[] = stageConfigs.map((sc) => ({
    stage: sc.id,
    count: countMap.get(sc.id)?.count || 0,
    total_amount_cents: countMap.get(sc.id)?.total_amount_cents || 0,
    deals: dealsByStage.get(sc.id) || [],
  }));

  // Collect deals whose stage doesn't match this industry's stages into "other"
  let otherCount = 0;
  let otherAmount = 0;
  const otherDeals: Deal[] = [];

  for (const [stage, stageDeals] of dealsByStage) {
    if (!knownStageIds.has(stage)) {
      otherDeals.push(...stageDeals);
      otherCount += countMap.get(stage)?.count || stageDeals.length;
      otherAmount += countMap.get(stage)?.total_amount_cents || 0;
    }
  }

  if (otherDeals.length > 0) {
    result.push({
      stage: "other",
      count: otherCount,
      total_amount_cents: otherAmount,
      deals: otherDeals,
    });
  }

  return result;
}

// ============================================================================
// CRUD
// ============================================================================

/**
 * Get a single deal by ID with joined contact name.
 */
export async function getDeal(
  tenantId: string,
  id: string,
): Promise<Deal | null> {
  return queryOne<Deal>(
    `SELECT d.*, c.name as contact_name
     FROM deals d
     LEFT JOIN contacts c ON c.id = d.contact_id
     WHERE d.tenant_id = $1 AND d.id = $2`,
    [tenantId, id],
  );
}

/**
 * Create a new deal.
 * When no stage is specified, defaults to the industry's default stage.
 */
export async function createDeal(
  tenantId: string,
  input: CreateDealInput,
  industry: string = "default",
): Promise<Deal> {
  const defaultStage = getPipelineConfig(industry).defaultStage;
  const data: Record<string, unknown> = {
    tenant_id: tenantId,
    name: input.name,
    stage: input.stage || defaultStage,
    source: input.source || "manual",
    amount_cents: input.amount_cents || 0,
    sort_index: 0,
  };

  if (input.description !== undefined) data.description = input.description;
  if (input.company !== undefined) data.company = input.company;
  if (input.expected_close !== undefined)
    data.expected_close = input.expected_close;
  if (input.contact_id !== undefined) data.contact_id = input.contact_id;
  if (input.call_id !== undefined) data.call_id = input.call_id;
  if (input.created_by !== undefined) data.created_by = input.created_by;

  return insertOne<Deal>("deals", data);
}

/**
 * Update an existing deal.
 */
export async function updateDeal(
  tenantId: string,
  id: string,
  input: UpdateDealInput,
): Promise<Deal> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.company !== undefined) updateData.company = input.company;
  if (input.stage !== undefined) updateData.stage = input.stage;
  if (input.amount_cents !== undefined)
    updateData.amount_cents = input.amount_cents;
  if (input.expected_close !== undefined)
    updateData.expected_close = input.expected_close;
  if (input.contact_id !== undefined) updateData.contact_id = input.contact_id;

  const result = await updateOne<Deal>("deals", updateData, {
    tenant_id: tenantId,
    id,
  });

  if (!result) {
    throw new Error("Deal not found");
  }

  return result;
}

/**
 * Update deal stage and optional sort index (for Kanban drag-and-drop).
 */
export async function updateStage(
  tenantId: string,
  id: string,
  stage: DealStage,
  sortIndex?: number,
): Promise<Deal> {
  const updateData: Record<string, unknown> = {
    stage,
    updated_at: new Date().toISOString(),
  };

  if (sortIndex !== undefined) {
    updateData.sort_index = sortIndex;
  }

  const result = await updateOne<Deal>("deals", updateData, {
    tenant_id: tenantId,
    id,
  });

  if (!result) {
    throw new Error("Deal not found");
  }

  return result;
}

/**
 * Soft-delete a deal by setting archived_at.
 */
export async function archiveDeal(tenantId: string, id: string): Promise<Deal> {
  const result = await updateOne<Deal>(
    "deals",
    {
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { tenant_id: tenantId, id },
  );

  if (!result) {
    throw new Error("Deal not found");
  }

  return result;
}

/**
 * Get all deals for a specific contact.
 */
export async function getDealsForContact(
  tenantId: string,
  contactId: string,
): Promise<Deal[]> {
  return queryAll<Deal>(
    `SELECT d.*, c.name as contact_name
     FROM deals d
     LEFT JOIN contacts c ON c.id = d.contact_id
     WHERE d.tenant_id = $1 AND d.contact_id = $2 AND d.archived_at IS NULL
     ORDER BY d.created_at DESC`,
    [tenantId, contactId],
  );
}
