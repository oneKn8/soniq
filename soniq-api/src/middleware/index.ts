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
  chatIpRateLimit,
  enforceRateLimit,
  getClientKey,
  getClientIp,
} from "./rate-limit.js";

export { verifyTelephonyWebhook } from "./webhook-signature.js";
