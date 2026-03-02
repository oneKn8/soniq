/**
 * Middleware exports
 */

export {
  authMiddleware,
  userAuthMiddleware,
  optionalAuthMiddleware,
  requireRole,
  getAuthTenantId,
  getAuthUserId,
  getAuthContext,
  type AuthContext,
} from "./auth.js";

export {
  rateLimit,
  strictRateLimit,
  criticalRateLimit,
  readRateLimit,
  tenantRateLimit,
} from "./rate-limit.js";
