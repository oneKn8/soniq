// Contact Cache - LRU cache for voice agent performance
// Target: <50ms lookup time for incoming calls

import { Contact } from "../../types/crm";

interface CacheEntry {
  contact: Contact;
  timestamp: number;
}

/**
 * LRU Cache for contact lookups
 * Optimized for voice agent performance with fast phone-based lookups
 */
class ContactCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttlMs: number;

  constructor(options: { maxSize?: number; ttlMs?: number } = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 10000;
    this.ttlMs = options.ttlMs || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Generate cache key from tenant and phone
   */
  private getKey(tenantId: string, phoneNormalized: string): string {
    return `${tenantId}:${phoneNormalized}`;
  }

  /**
   * Get contact from cache
   * Returns null if not found or expired
   */
  get(tenantId: string, phoneNormalized: string): Contact | null {
    const key = this.getKey(tenantId, phoneNormalized);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.contact;
  }

  /**
   * Set contact in cache
   */
  set(tenantId: string, phoneNormalized: string, contact: Contact): void {
    const key = this.getKey(tenantId, phoneNormalized);

    // If at max size, remove oldest entry (first in map)
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      contact,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate a specific contact
   */
  invalidate(tenantId: string, phoneNormalized: string): void {
    const key = this.getKey(tenantId, phoneNormalized);
    this.cache.delete(key);
  }

  /**
   * Invalidate all contacts for a tenant
   */
  invalidateTenant(tenantId: string): void {
    const prefix = `${tenantId}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttlMs: number;
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }

  /**
   * Warm the cache with contacts for a tenant
   * Call this on startup or when needed
   */
  warmCache(contacts: Contact[]): void {
    for (const contact of contacts) {
      this.set(contact.tenant_id, contact.phone_normalized, contact);
    }
  }

  /**
   * Get all cached contacts for a tenant (for debugging)
   */
  getTenantContacts(tenantId: string): Contact[] {
    const prefix = `${tenantId}:`;
    const contacts: Contact[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(prefix)) {
        // Check if not expired
        if (Date.now() - entry.timestamp <= this.ttlMs) {
          contacts.push(entry.contact);
        }
      }
    }

    return contacts;
  }

  /**
   * Prune expired entries
   * Call periodically to clean up memory
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }
}

// Singleton instance
export const contactCache = new ContactCache({
  maxSize: 10000,
  ttlMs: 5 * 60 * 1000, // 5 minutes
});

// Prune expired entries every minute
setInterval(() => {
  const pruned = contactCache.prune();
  if (pruned > 0) {
    console.log(`[ContactCache] Pruned ${pruned} expired entries`);
  }
}, 60 * 1000);
