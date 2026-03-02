/**
 * Database Client
 *
 * This module provides the database interface for the application.
 * Uses PostgreSQL with connection pooling via the 'pg' package.
 */

import {
  initPool,
  getPool,
  query,
  queryOne,
  queryAll,
  queryCount,
  transaction,
  tenantQuery,
  tenantQueryOne,
  tenantQueryAll,
  tenantQueryCount,
  tenantTransaction,
  checkHealth,
  closePool,
} from "./pool.js";

// Re-export pool functions
export {
  initPool,
  getPool,
  query,
  queryOne,
  queryAll,
  queryCount,
  transaction,
  tenantQuery,
  tenantQueryOne,
  tenantQueryAll,
  tenantQueryCount,
  tenantTransaction,
  closePool,
};

/**
 * Get database connection status
 * Compatible with existing health check interface
 */
export async function getDbStatus(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const health = await checkHealth();
  return {
    connected: health.connected,
    latency: health.latency,
    error: health.error,
  };
}

/**
 * Initialize database connection
 * Call this at application startup
 */
export function initDatabase(): void {
  initPool();
  console.log("[DB] Database client initialized");
}
