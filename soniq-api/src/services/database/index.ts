/**
 * Database Module Exports
 *
 * Provides a clean interface for database operations throughout the application.
 */

// Core pool functions
export {
  initPool,
  getPool,
  query,
  queryOne,
  queryAll,
  queryCount,
  transaction,
  closePool,
} from "./pool.js";

// High-level client functions
export { initDatabase, getDbStatus } from "./client.js";

// Query helpers for common operations
export {
  buildWhereClause,
  buildOrderClause,
  buildPaginationClause,
  paginatedQuery,
  insertOne,
  updateOne,
  updateMany,
  deleteRows,
  rpc,
  upsert,
  batchUpsert,
} from "./query-helpers.js";

// Tenant cache for low-latency lookups
export {
  initTenantCache,
  getTenantByPhone,
  getTenantById,
  getTenantByPhoneWithFallback,
  invalidateTenant,
  getTenantCacheStats,
} from "./tenant-cache.js";
