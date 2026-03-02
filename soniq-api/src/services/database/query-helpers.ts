/**
 * Query Helpers
 *
 * Utilities for building SQL queries with proper parameterization.
 * Replaces Supabase query builder patterns with raw SQL.
 */

import {
  queryOne,
  queryAll,
  queryCount,
  tenantQueryOne,
  tenantQueryAll,
  tenantQueryCount,
} from "./pool.js";
import { QueryResultRow } from "pg";

/**
 * Build a WHERE clause from filter conditions
 */
export function buildWhereClause(
  filters: Record<string, unknown>,
  startIndex = 1,
): { clause: string; params: unknown[]; nextIndex: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = startIndex;

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      // IN clause
      conditions.push(`${key} = ANY($${paramIndex})`);
      params.push(value);
    } else if (value === null) {
      conditions.push(`${key} IS NULL`);
      continue; // No param needed
    } else {
      conditions.push(`${key} = $${paramIndex}`);
      params.push(value);
    }
    paramIndex++;
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
    nextIndex: paramIndex,
  };
}

/**
 * Build ORDER BY clause
 */
export function buildOrderClause(
  sortBy: string,
  sortOrder: "asc" | "desc" = "asc",
): string {
  const direction = sortOrder === "desc" ? "DESC" : "ASC";
  return `ORDER BY ${sortBy} ${direction}`;
}

/**
 * Build LIMIT/OFFSET clause
 */
export function buildPaginationClause(
  limit: number,
  offset: number,
  startIndex: number,
): { clause: string; params: unknown[]; nextIndex: number } {
  return {
    clause: `LIMIT $${startIndex} OFFSET $${startIndex + 1}`,
    params: [limit, offset],
    nextIndex: startIndex + 2,
  };
}

/**
 * Execute a SELECT query with pagination and return PaginatedResult
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export async function paginatedQuery<T extends QueryResultRow>(
  table: string,
  options: {
    select?: string;
    where?: Record<string, unknown>;
    whereRaw?: { clause: string; params: unknown[] };
    orderBy?: string;
    orderDir?: "asc" | "desc";
    limit?: number;
    offset?: number;
    tenantId?: string;
  },
): Promise<PaginatedResult<T>> {
  const select = options.select || "*";
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  const orderBy = options.orderBy || "created_at";
  const orderDir = options.orderDir || "desc";
  const qOne = options.tenantId
    ? <R extends QueryResultRow>(sql: string, params: unknown[]) =>
        tenantQueryOne<R>(options.tenantId!, sql, params)
    : queryOne;
  const qAll = options.tenantId
    ? <R extends QueryResultRow>(sql: string, params: unknown[]) =>
        tenantQueryAll<R>(options.tenantId!, sql, params)
    : queryAll;

  let paramIndex = 1;
  const allParams: unknown[] = [];
  let whereClause = "";

  // Build WHERE clause
  if (options.whereRaw) {
    whereClause = options.whereRaw.clause;
    allParams.push(...options.whereRaw.params);
    paramIndex = options.whereRaw.params.length + 1;
  } else if (options.where) {
    const where = buildWhereClause(options.where, paramIndex);
    whereClause = where.clause;
    allParams.push(...where.params);
    paramIndex = where.nextIndex;
  }

  // Count query
  const countSql = `SELECT COUNT(*) as total FROM ${table} ${whereClause}`;
  const countResult = await qOne<{ total: string }>(countSql, allParams);
  const total = parseInt(countResult?.total || "0", 10);

  // Data query
  const orderClause = buildOrderClause(orderBy, orderDir);
  const pagination = buildPaginationClause(limit, offset, paramIndex);

  const dataSql = `SELECT ${select} FROM ${table} ${whereClause} ${orderClause} ${pagination.clause}`;
  const data = await qAll<T>(dataSql, [...allParams, ...pagination.params]);

  return {
    data,
    total,
    limit,
    offset,
    has_more: total > offset + limit,
  };
}

/**
 * Insert a row and return it
 */
export async function insertOne<T extends QueryResultRow>(
  table: string,
  data: Record<string, unknown>,
  returning = "*",
  tenantId?: string,
): Promise<T> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  const qOne = tenantId
    ? (sql: string, params: unknown[]) =>
        tenantQueryOne<T>(tenantId, sql, params)
    : (sql: string, params: unknown[]) => queryOne<T>(sql, params);

  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING ${returning}`;
  const result = await qOne(sql, values);

  if (!result) {
    throw new Error(`Failed to insert into ${table}`);
  }

  return result;
}

/**
 * Update rows and return the first updated row
 */
export async function updateOne<T extends QueryResultRow>(
  table: string,
  data: Record<string, unknown>,
  where: Record<string, unknown>,
  returning = "*",
  tenantId?: string,
): Promise<T | null> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    setClauses.push(`${key} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  const whereClauses: string[] = [];
  for (const [key, value] of Object.entries(where)) {
    whereClauses.push(`${key} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  const sql = `UPDATE ${table} SET ${setClauses.join(", ")} WHERE ${whereClauses.join(" AND ")} RETURNING ${returning}`;
  return tenantId
    ? tenantQueryOne<T>(tenantId, sql, params)
    : queryOne<T>(sql, params);
}

/**
 * Update rows without returning
 */
export async function updateMany(
  table: string,
  data: Record<string, unknown>,
  where: Record<string, unknown>,
  tenantId?: string,
): Promise<number> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    setClauses.push(`${key} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  const whereClauses: string[] = [];
  for (const [key, value] of Object.entries(where)) {
    whereClauses.push(`${key} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  const sql = `UPDATE ${table} SET ${setClauses.join(", ")} WHERE ${whereClauses.join(" AND ")}`;
  return tenantId
    ? tenantQueryCount(tenantId, sql, params)
    : queryCount(sql, params);
}

/**
 * Delete rows
 */
export async function deleteRows(
  table: string,
  where: Record<string, unknown>,
  tenantId?: string,
): Promise<number> {
  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(where)) {
    whereClauses.push(`${key} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  const sql = `DELETE FROM ${table} WHERE ${whereClauses.join(" AND ")}`;
  return tenantId
    ? tenantQueryCount(tenantId, sql, params)
    : queryCount(sql, params);
}

/**
 * Call a database function (RPC)
 */
export async function rpc<T = unknown>(
  functionName: string,
  params: Record<string, unknown>,
): Promise<T | null> {
  const paramNames = Object.keys(params);
  const paramValues = Object.values(params);
  const placeholders = paramNames.map((name, i) => `${name} := $${i + 1}`);

  const sql = `SELECT ${functionName}(${placeholders.join(", ")})`;
  const result = await queryOne<{ [key: string]: T }>(sql, paramValues);

  return result ? result[functionName] : null;
}

/**
 * Upsert (insert or update on conflict)
 */
export async function upsert<T extends QueryResultRow>(
  table: string,
  data: Record<string, unknown>,
  conflictColumns: string[],
  returning = "*",
): Promise<T> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`);

  const updateClauses = columns
    .filter((col) => !conflictColumns.includes(col))
    .map((col) => `${col} = EXCLUDED.${col}`);

  const sql = `
    INSERT INTO ${table} (${columns.join(", ")})
    VALUES (${placeholders.join(", ")})
    ON CONFLICT (${conflictColumns.join(", ")})
    DO UPDATE SET ${updateClauses.join(", ")}
    RETURNING ${returning}
  `;

  const result = await queryOne<T>(sql, values);
  if (!result) {
    throw new Error(`Failed to upsert into ${table}`);
  }

  return result;
}

/**
 * Batch upsert
 */
export async function batchUpsert(
  table: string,
  records: Record<string, unknown>[],
  conflictColumns: string[],
  options: { ignoreDuplicates?: boolean } = {},
): Promise<number> {
  if (records.length === 0) return 0;

  const columns = Object.keys(records[0]);
  const valuesSets: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const record of records) {
    const placeholders = columns.map(() => `$${paramIndex++}`);
    valuesSets.push(`(${placeholders.join(", ")})`);
    params.push(...columns.map((col) => record[col]));
  }

  let sql: string;
  if (options.ignoreDuplicates) {
    sql = `
      INSERT INTO ${table} (${columns.join(", ")})
      VALUES ${valuesSets.join(", ")}
      ON CONFLICT (${conflictColumns.join(", ")}) DO NOTHING
    `;
  } else {
    const updateClauses = columns
      .filter((col) => !conflictColumns.includes(col))
      .map((col) => `${col} = EXCLUDED.${col}`);

    sql = `
      INSERT INTO ${table} (${columns.join(", ")})
      VALUES ${valuesSets.join(", ")}
      ON CONFLICT (${conflictColumns.join(", ")})
      DO UPDATE SET ${updateClauses.join(", ")}
    `;
  }

  return queryCount(sql, params);
}
