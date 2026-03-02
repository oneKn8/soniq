import { queryAll, queryOne } from "./client.js";
import type { Tenant } from "../../types/database.js";

/**
 * In-Memory Tenant Cache
 *
 * CRITICAL for low-latency webhook responses.
 * The assistant-request webhook must respond in <50ms.
 * Database queries take 20-50ms, so we cache tenant configs in memory.
 *
 * Cache is keyed by phone number for O(1) lookup during incoming calls.
 */

// Cache storage
const tenantCache = new Map<string, Tenant>();
const vapiPhoneIdCache = new Map<string, Tenant>(); // Key by vapi_phone_number_id
let cacheInitialized = false;
let lastRefresh: Date | null = null;

// Refresh interval (5 minutes)
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Initialize the tenant cache on startup
 */
export async function initTenantCache(): Promise<void> {
  try {
    await refreshCache();
    cacheInitialized = true;

    // Set up periodic refresh
    setInterval(() => {
      refreshCache().catch((err) => {
        console.error("[CACHE] Failed to refresh tenant cache:", err);
      });
    }, REFRESH_INTERVAL_MS);
  } catch (err) {
    console.error("[CACHE] Failed to initialize tenant cache:", err);
    // Don't throw - we can still query DB as fallback
  }
}

/**
 * Refresh the entire cache from database
 */
async function refreshCache(): Promise<void> {
  const startTime = Date.now();

  const tenants = await queryAll<Tenant>(
    `SELECT * FROM tenants WHERE is_active = true`,
  );

  // Clear and rebuild cache
  tenantCache.clear();
  vapiPhoneIdCache.clear();

  for (const tenant of tenants) {
    // Key by phone number for fast lookup during incoming calls
    if (tenant.phone_number) {
      tenantCache.set(normalizePhone(tenant.phone_number), tenant);
    }
    // Also key by tenant ID for other lookups
    tenantCache.set(`id:${tenant.id}`, tenant);
    // Key by Vapi phone number ID for direct webhook lookup
    if (tenant.vapi_phone_number_id) {
      vapiPhoneIdCache.set(tenant.vapi_phone_number_id, tenant);
    }
  }

  lastRefresh = new Date();
  const latency = Date.now() - startTime;

  console.log(`[CACHE] Refreshed ${tenants.length} tenants in ${latency}ms`);
}

/**
 * Get tenant by phone number (for incoming call lookup)
 * FAST: O(1) from cache, no DB query
 */
export function getTenantByPhone(phoneNumber: string): Tenant | null {
  const normalized = normalizePhone(phoneNumber);
  return tenantCache.get(normalized) || null;
}

/**
 * Get tenant by ID
 */
export function getTenantById(tenantId: string): Tenant | null {
  return tenantCache.get(`id:${tenantId}`) || null;
}

/**
 * Get tenant by Vapi phone number ID (for webhook lookup)
 * FAST: O(1) from cache, no DB query or Vapi API call
 */
export function getTenantByVapiPhoneId(
  vapiPhoneNumberId: string,
): Tenant | null {
  return vapiPhoneIdCache.get(vapiPhoneNumberId) || null;
}

/**
 * Get tenant by SIP URI with DB fallback
 * For SIP-originated calls where the 'to' field is a SIP URI
 */
export async function getTenantBySipUri(
  sipUri: string,
): Promise<Tenant | null> {
  // Extract username from SIP URI (e.g., "user@space.signalwire.com" or "sip:user@space")
  const cleaned = sipUri.replace(/^sip:/, "");

  // Check cache first - iterate through cached tenants looking for SIP URI match
  for (const [key, tenant] of tenantCache.entries()) {
    if (key.startsWith("sip:") && key === `sip:${cleaned}`) {
      return tenant;
    }
  }

  // Fallback to DB query via phone_configurations
  console.log("[CACHE] SIP cache miss, querying database for:", cleaned);

  try {
    const result = await queryOne<{ tenant_id: string }>(
      `SELECT tenant_id FROM phone_configurations
       WHERE sip_uri = $1 AND setup_type = 'sip' AND status = 'active'`,
      [cleaned],
    );

    if (!result) {
      return null;
    }

    const tenant = await queryOne<Tenant>(
      `SELECT * FROM tenants WHERE id = $1 AND is_active = true`,
      [result.tenant_id],
    );

    if (tenant) {
      // Add to cache
      tenantCache.set(`sip:${cleaned}`, tenant);
      tenantCache.set(`id:${tenant.id}`, tenant);
    }

    return tenant;
  } catch {
    return null;
  }
}

/**
 * Get tenant by phone with DB fallback
 * Use this when cache might not have the tenant (new tenant, etc.)
 */
export async function getTenantByPhoneWithFallback(
  phoneNumber: string,
): Promise<Tenant | null> {
  // Try cache first
  const cached = getTenantByPhone(phoneNumber);
  if (cached) {
    return cached;
  }

  // Normalize phone number - ensure it has + prefix for US numbers
  let normalized = phoneNumber.replace(/[^\d]/g, ""); // digits only
  if (normalized.length === 10) {
    normalized = "+1" + normalized;
  } else if (normalized.length === 11 && normalized.startsWith("1")) {
    normalized = "+" + normalized;
  } else if (!phoneNumber.startsWith("+")) {
    normalized = "+" + normalized;
  } else {
    normalized = phoneNumber;
  }

  // Fallback to DB query
  console.log("[CACHE] Cache miss, querying database for:", normalized);

  try {
    const tenant = await queryOne<Tenant>(
      `SELECT * FROM tenants WHERE phone_number = $1 AND is_active = true`,
      [normalized],
    );

    if (!tenant) {
      return null;
    }

    // Add to cache for future lookups
    tenantCache.set(normalizePhone(tenant.phone_number), tenant);
    tenantCache.set(`id:${tenant.id}`, tenant);

    return tenant;
  } catch {
    return null;
  }
}

/**
 * Invalidate cache for a specific tenant (call after updates)
 */
export async function invalidateTenant(tenantId: string): Promise<void> {
  const tenant = tenantCache.get(`id:${tenantId}`);

  if (tenant) {
    // Remove from cache
    tenantCache.delete(`id:${tenantId}`);
    if (tenant.phone_number) {
      tenantCache.delete(normalizePhone(tenant.phone_number));
    }

    // Refresh this tenant from DB
    try {
      const refreshedTenant = await queryOne<Tenant>(
        `SELECT * FROM tenants WHERE id = $1`,
        [tenantId],
      );

      if (refreshedTenant && refreshedTenant.is_active) {
        tenantCache.set(
          normalizePhone(refreshedTenant.phone_number),
          refreshedTenant,
        );
        tenantCache.set(`id:${refreshedTenant.id}`, refreshedTenant);
      }
    } catch {
      // Silent fail - will refresh on next cycle
    }
  }
}

/**
 * Get cache statistics
 */
export function getTenantCacheStats(): {
  initialized: boolean;
  size: number;
  lastRefresh: string | null;
} {
  // Count unique tenants (entries with id: prefix)
  let tenantCount = 0;
  for (const key of tenantCache.keys()) {
    if (key.startsWith("id:")) {
      tenantCount++;
    }
  }

  return {
    initialized: cacheInitialized,
    size: tenantCount,
    lastRefresh: lastRefresh?.toISOString() || null,
  };
}

/**
 * Normalize phone number for consistent lookup
 * Ensures +1 prefix for US numbers
 */
function normalizePhone(phone: string): string {
  // Extract digits only
  const digits = phone.replace(/[^\d]/g, "");

  // Add proper prefix
  if (digits.length === 10) {
    return "+1" + digits; // US number without country code
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return "+" + digits; // US number with country code but no +
  }

  // Already has + or international format
  if (phone.startsWith("+")) {
    return phone.replace(/[^\d+]/g, "");
  }

  return "+" + digits;
}
