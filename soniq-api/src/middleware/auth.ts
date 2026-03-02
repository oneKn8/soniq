/**
 * Authentication Middleware
 * Verifies Supabase JWT and validates tenant access
 */

import { Context, Next } from "hono";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

// Auth context stored on request
export interface AuthContext {
  user: User;
  userId: string;
  tenantId: string;
  role: string;
}

// Extend Hono context with auth
declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

// Supabase client for auth verification (uses anon key)
let authClient: SupabaseClient | null = null;

function getAuthClient(): SupabaseClient {
  if (!authClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    }

    authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return authClient;
}

// Service client for database operations (uses service role key)
let serviceClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serviceClient;
}

/**
 * Extract Bearer token from Authorization header
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

/**
 * Verify tenant access for a user
 */
async function verifyTenantAccess(
  userId: string,
  tenantId: string,
): Promise<{ hasAccess: boolean; role: string | null }> {
  const db = getServiceClient();

  const { data, error } = await db
    .from("tenant_members")
    .select("role")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return { hasAccess: false, role: null };
  }

  return { hasAccess: true, role: data.role };
}

/**
 * User-only authentication middleware
 * Verifies JWT but does NOT require X-Tenant-ID.
 * Use for routes where the user may not have a tenant yet (setup, tenant listing).
 * If X-Tenant-ID is present, tenant access is verified and context is populated.
 */
export function userAuthMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");
    const token = extractToken(authHeader);

    if (!token) {
      return c.json(
        {
          error: "Unauthorized",
          message: "Missing or invalid Authorization header",
        },
        401,
      );
    }

    const supabase = getAuthClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json(
        {
          error: "Unauthorized",
          message: "Invalid or expired token",
        },
        401,
      );
    }

    // Optionally resolve tenant if header is present
    const tenantId = c.req.header("X-Tenant-ID");
    let role = "";

    if (tenantId) {
      const access = await verifyTenantAccess(user.id, tenantId);
      if (access.hasAccess) {
        role = access.role!;
      }
    }

    c.set("auth", {
      user,
      userId: user.id,
      tenantId: tenantId || "",
      role,
    });

    await next();
  };
}

/**
 * Authentication middleware
 * Verifies JWT and validates tenant access (requires X-Tenant-ID)
 */
export function authMiddleware() {
  return async (c: Context, next: Next) => {
    // Skip if already authenticated by a more specific middleware
    if (c.get("auth")) {
      await next();
      return;
    }

    // Extract token from Authorization header
    const authHeader = c.req.header("Authorization");
    const token = extractToken(authHeader);

    if (!token) {
      return c.json(
        {
          error: "Unauthorized",
          message: "Missing or invalid Authorization header",
        },
        401,
      );
    }

    // Verify JWT with Supabase
    const supabase = getAuthClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json(
        {
          error: "Unauthorized",
          message: "Invalid or expired token",
        },
        401,
      );
    }

    // Get tenant ID from header
    const tenantId = c.req.header("X-Tenant-ID");

    if (!tenantId) {
      return c.json(
        {
          error: "Bad Request",
          message: "X-Tenant-ID header is required",
        },
        400,
      );
    }

    // Verify user has access to this tenant
    const { hasAccess, role } = await verifyTenantAccess(user.id, tenantId);

    if (!hasAccess) {
      return c.json(
        {
          error: "Forbidden",
          message: "You do not have access to this tenant",
        },
        403,
      );
    }

    // Set auth context
    c.set("auth", {
      user,
      userId: user.id,
      tenantId,
      role: role!,
    });

    await next();
  };
}

/**
 * Optional auth middleware
 * Adds auth context if token is present, but doesn't require it
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
export function optionalAuthMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");
    const token = extractToken(authHeader);

    if (token) {
      const supabase = getAuthClient();
      const {
        data: { user },
      } = await supabase.auth.getUser(token);

      if (user) {
        const tenantId = c.req.header("X-Tenant-ID");

        if (tenantId) {
          const { hasAccess, role } = await verifyTenantAccess(
            user.id,
            tenantId,
          );

          if (hasAccess) {
            c.set("auth", {
              user,
              userId: user.id,
              tenantId,
              role: role!,
            });
          }
        }
      }
    }

    await next();
  };
}

/**
 * Role-based access control middleware
 * Requires specific roles for access
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const auth = c.get("auth");

    if (!auth) {
      return c.json(
        {
          error: "Unauthorized",
          message: "Authentication required",
        },
        401,
      );
    }

    if (!allowedRoles.includes(auth.role)) {
      return c.json(
        {
          error: "Forbidden",
          message: `Required role: ${allowedRoles.join(" or ")}`,
        },
        403,
      );
    }

    await next();
  };
}

/**
 * Get authenticated tenant ID from context
 * Use this instead of reading X-Tenant-ID header directly
 */
export function getAuthTenantId(c: Context): string {
  const auth = c.get("auth");
  if (!auth) {
    throw new Error("Auth context not set - is authMiddleware applied?");
  }
  return auth.tenantId;
}

/**
 * Get authenticated user ID from context
 */
export function getAuthUserId(c: Context): string {
  const auth = c.get("auth");
  if (!auth) {
    throw new Error("Auth context not set - is authMiddleware applied?");
  }
  return auth.userId;
}

/**
 * Get full auth context
 */
export function getAuthContext(c: Context): AuthContext {
  const auth = c.get("auth");
  if (!auth) {
    throw new Error("Auth context not set - is authMiddleware applied?");
  }
  return auth;
}
