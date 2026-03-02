import { Hono } from "hono";
import { queryOne, queryAll } from "../services/database/client.js";
import {
  updateOne,
  upsert,
  deleteRows,
} from "../services/database/query-helpers.js";
import { getAuthUserId } from "../middleware/index.js";
import type { IntegrationProvider } from "../types/database.js";

export const integrationsRoutes = new Hono();

// In-memory OAuth state storage (in production, use Redis)
const oauthStates = new Map<
  string,
  { tenantId: string; provider: string; expiresAt: number }
>();

// Clean up expired states periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of oauthStates.entries()) {
    if (value.expiresAt < now) {
      oauthStates.delete(key);
    }
  }
}, 60000); // Every minute

// OAuth provider configurations
const OAUTH_CONFIGS: Record<
  string,
  {
    authUrl: string;
    tokenUrl: string;
    scopes: string;
    clientIdEnv: string;
    clientSecretEnv: string;
  }
> = {
  google_calendar: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: "https://www.googleapis.com/auth/calendar",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
  outlook: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: "https://graph.microsoft.com/Calendars.ReadWrite offline_access",
    clientIdEnv: "MICROSOFT_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_CLIENT_SECRET",
  },
  calendly: {
    authUrl: "https://auth.calendly.com/oauth/authorize",
    tokenUrl: "https://auth.calendly.com/oauth/token",
    scopes: "default",
    clientIdEnv: "CALENDLY_CLIENT_ID",
    clientSecretEnv: "CALENDLY_CLIENT_SECRET",
  },
};

import { randomBytes } from "crypto";
import { encrypt, decrypt } from "../services/crypto/encryption.js";

function generateState(): string {
  return randomBytes(32).toString("hex");
}

function getFrontendBaseUrl(): string {
  const configured = process.env.FRONTEND_URL || "http://localhost:3000";
  return configured.split(",")[0].trim();
}

function renderOAuthCallbackResultHtml(params: {
  frontendUrl: string;
  provider: string;
  success: boolean;
  error?: string;
}): string {
  const { frontendUrl, provider, success, error } = params;
  const redirectUrl = new URL("/setup/integrations", frontendUrl);
  if (success) {
    redirectUrl.searchParams.set("success", "true");
    redirectUrl.searchParams.set("provider", provider);
  } else {
    redirectUrl.searchParams.set("error", error || "unknown_error");
    redirectUrl.searchParams.set("provider", provider);
  }

  const payload = success
    ? { type: "oauth_success", provider }
    : { type: "oauth_error", provider, error: error || "unknown_error" };

  const payloadJson = JSON.stringify(payload);
  const redirectHref = redirectUrl.toString();
  const openerOrigin = redirectUrl.origin;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>OAuth Complete</title>
  </head>
  <body>
    <script>
      (function () {
        const payload = ${payloadJson};
        const redirectHref = ${JSON.stringify(redirectHref)};
        const openerOrigin = ${JSON.stringify(openerOrigin)};
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, openerOrigin);
            window.close();
            return;
          }
        } catch (_) {}
        window.location.replace(redirectHref);
      })();
    </script>
  </body>
</html>`;
}

/** Type definitions for database rows */
interface MembershipRow {
  tenant_id: string;
  role: string;
}

interface IntegrationRow {
  id: string;
  tenant_id: string;
  provider: string;
  status: string;
  external_account_id: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/integrations
 * Returns tenant's connected integrations
 */
integrationsRoutes.get("/", async (c) => {
  const userId = getAuthUserId(c);

  try {
    // Get tenant
    const membershipSql = `
      SELECT tenant_id
      FROM tenant_members
      WHERE user_id = $1
        AND is_active = true
      LIMIT 1
    `;
    const membership = await queryOne<{ tenant_id: string }>(membershipSql, [
      userId,
    ]);

    if (!membership) {
      return c.json({ integrations: [] });
    }

    const integrationsSql = `
      SELECT id, provider, status, external_account_id, created_at, updated_at
      FROM tenant_integrations
      WHERE tenant_id = $1
    `;
    const integrations = await queryAll<IntegrationRow>(integrationsSql, [
      membership.tenant_id,
    ]);

    return c.json({ integrations: integrations || [] });
  } catch (error) {
    console.error("[INTEGRATIONS] Error fetching integrations:", error);
    return c.json({ error: "Failed to fetch integrations" }, 500);
  }
});

/**
 * GET /api/integrations/providers
 * Returns available integration providers
 */
integrationsRoutes.get("/providers", async (c) => {
  const providers = [
    {
      id: "google_calendar",
      name: "Google Calendar",
      icon: "google",
      description: "Sync appointments with Google Calendar",
      configured: !!process.env.GOOGLE_CLIENT_ID,
    },
    {
      id: "outlook",
      name: "Microsoft Outlook",
      icon: "microsoft",
      description: "Sync appointments with Outlook Calendar",
      configured: !!process.env.MICROSOFT_CLIENT_ID,
    },
    {
      id: "calendly",
      name: "Calendly",
      icon: "calendly",
      description: "Connect your Calendly scheduling",
      configured: !!process.env.CALENDLY_CLIENT_ID,
    },
    {
      id: "acuity",
      name: "Acuity Scheduling",
      icon: "calendar",
      description: "Connect your Acuity scheduling",
      configured: false, // Not yet implemented
    },
    {
      id: "square",
      name: "Square Appointments",
      icon: "square",
      description: "Sync with Square Appointments",
      configured: false, // Not yet implemented
    },
  ];

  return c.json({ providers });
});

/**
 * GET /api/integrations/:provider/authorize
 * Initiates OAuth flow - returns authorization URL
 */
integrationsRoutes.get("/:provider/authorize", async (c) => {
  const provider = c.req.param("provider") as IntegrationProvider;
  const userId = getAuthUserId(c);

  // Validate provider
  const config = OAUTH_CONFIGS[provider];
  if (!config) {
    return c.json({ error: "Unsupported provider" }, 400);
  }

  // Check if OAuth is configured
  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    return c.json(
      { error: `${provider} integration not configured on server` },
      400,
    );
  }

  try {
    // Get tenant
    const membershipSql = `
      SELECT tenant_id, role
      FROM tenant_members
      WHERE user_id = $1
        AND is_active = true
        AND role = ANY($2)
      LIMIT 1
    `;
    const membership = await queryOne<MembershipRow>(membershipSql, [
      userId,
      ["owner", "admin"],
    ]);

    if (!membership) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Generate state parameter
    const state = generateState();

    // Store state with tenant ID (expires in 10 minutes)
    oauthStates.set(state, {
      tenantId: membership.tenant_id,
      provider,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Build redirect URI
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3100";
    const redirectUri = `${backendUrl}/api/integrations/${provider}/callback`;

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scopes,
      state,
      access_type: "offline", // For refresh token (Google)
      prompt: "consent", // Force consent to get refresh token
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;

    return c.json({ authUrl });
  } catch (error) {
    console.error("[INTEGRATIONS] Error initiating OAuth:", error);
    return c.json({ error: "Failed to initiate OAuth flow" }, 500);
  }
});

/**
 * GET /api/integrations/:provider/callback
 * Handles OAuth callback
 */
integrationsRoutes.get("/:provider/callback", async (c) => {
  const provider = c.req.param("provider") as IntegrationProvider;
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  const frontendUrl = getFrontendBaseUrl();

  // Handle OAuth errors
  if (error) {
    return c.html(
      renderOAuthCallbackResultHtml({
        frontendUrl,
        provider,
        success: false,
        error,
      }),
    );
  }

  if (!code || !state) {
    return c.html(
      renderOAuthCallbackResultHtml({
        frontendUrl,
        provider,
        success: false,
        error: "missing_params",
      }),
    );
  }

  // Verify state
  const stateData = oauthStates.get(state);
  if (!stateData || stateData.expiresAt < Date.now()) {
    oauthStates.delete(state);
    return c.html(
      renderOAuthCallbackResultHtml({
        frontendUrl,
        provider,
        success: false,
        error: "invalid_state",
      }),
    );
  }

  // Remove used state
  oauthStates.delete(state);

  // Get OAuth config
  const config = OAUTH_CONFIGS[provider];
  if (!config) {
    return c.html(
      renderOAuthCallbackResultHtml({
        frontendUrl,
        provider,
        success: false,
        error: "unsupported_provider",
      }),
    );
  }

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  if (!clientId || !clientSecret) {
    return c.html(
      renderOAuthCallbackResultHtml({
        frontendUrl,
        provider,
        success: false,
        error: "server_config_error",
      }),
    );
  }

  try {
    // Exchange code for tokens
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3100";
    const redirectUri = `${backendUrl}/api/integrations/${provider}/callback`;

    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(
        `[OAUTH] Token exchange failed for ${provider}:`,
        errorText,
      );
      return c.html(
        renderOAuthCallbackResultHtml({
          frontendUrl,
          provider,
          success: false,
          error: "token_exchange_failed",
        }),
      );
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    // Get user info / external account ID
    let externalAccountId = null;
    try {
      if (provider === "google_calendar") {
        const userInfo = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          },
        );
        if (userInfo.ok) {
          const user = (await userInfo.json()) as { email?: string };
          externalAccountId = user.email;
        }
      } else if (provider === "outlook") {
        const userInfo = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (userInfo.ok) {
          const user = (await userInfo.json()) as {
            userPrincipalName?: string;
          };
          externalAccountId = user.userPrincipalName;
        }
      }
    } catch (e) {
      console.error(`[OAUTH] Failed to get user info for ${provider}:`, e);
    }

    // Calculate token expiration
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Upsert integration
    await upsert(
      "tenant_integrations",
      {
        tenant_id: stateData.tenantId,
        provider,
        access_token: encrypt(tokens.access_token),
        refresh_token: tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : null,
        token_expires_at: expiresAt,
        scopes: config.scopes,
        external_account_id: externalAccountId,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      ["tenant_id", "provider"],
    );

    return c.html(
      renderOAuthCallbackResultHtml({
        frontendUrl,
        provider,
        success: true,
      }),
    );
  } catch (e) {
    console.error(`[OAUTH] Error during callback for ${provider}:`, e);
    return c.html(
      renderOAuthCallbackResultHtml({
        frontendUrl,
        provider,
        success: false,
        error: "server_error",
      }),
    );
  }
});

/**
 * DELETE /api/integrations/:id
 * Disconnects an integration
 */
integrationsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const userId = getAuthUserId(c);

  try {
    // Get tenant membership
    const membershipSql = `
      SELECT tenant_id, role
      FROM tenant_members
      WHERE user_id = $1
        AND is_active = true
        AND role = ANY($2)
      LIMIT 1
    `;
    const membership = await queryOne<MembershipRow>(membershipSql, [
      userId,
      ["owner", "admin"],
    ]);

    if (!membership) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Verify integration belongs to tenant
    const integrationSql = `
      SELECT id, tenant_id, provider
      FROM tenant_integrations
      WHERE id = $1
    `;
    const integration = await queryOne<IntegrationRow>(integrationSql, [id]);

    if (!integration || integration.tenant_id !== membership.tenant_id) {
      return c.json({ error: "Integration not found" }, 404);
    }

    // Delete integration
    await deleteRows("tenant_integrations", { id });

    return c.json({ success: true });
  } catch (error) {
    console.error("[INTEGRATIONS] Error deleting integration:", error);
    return c.json({ error: "Failed to delete integration" }, 500);
  }
});

/**
 * POST /api/integrations/:id/refresh
 * Refreshes an integration's access token
 */
integrationsRoutes.post("/:id/refresh", async (c) => {
  const id = c.req.param("id");
  const userId = getAuthUserId(c);

  try {
    // Get tenant membership
    const membershipSql = `
      SELECT tenant_id, role
      FROM tenant_members
      WHERE user_id = $1
        AND is_active = true
        AND role = ANY($2)
      LIMIT 1
    `;
    const membership = await queryOne<MembershipRow>(membershipSql, [
      userId,
      ["owner", "admin"],
    ]);

    if (!membership) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Get integration
    const integrationSql = `
      SELECT *
      FROM tenant_integrations
      WHERE id = $1
        AND tenant_id = $2
    `;
    const integration = await queryOne<IntegrationRow>(integrationSql, [
      id,
      membership.tenant_id,
    ]);

    if (!integration) {
      return c.json({ error: "Integration not found" }, 404);
    }

    if (!integration.refresh_token) {
      return c.json({ error: "No refresh token available" }, 400);
    }

    // Get OAuth config
    const config = OAUTH_CONFIGS[integration.provider];
    if (!config) {
      return c.json({ error: "Unsupported provider" }, 400);
    }

    const clientId = process.env[config.clientIdEnv];
    const clientSecret = process.env[config.clientSecretEnv];

    if (!clientId || !clientSecret) {
      return c.json({ error: "Server configuration error" }, 500);
    }

    // Refresh token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: decrypt(integration.refresh_token),
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      // Token refresh failed - mark integration as expired
      await updateOne(
        "tenant_integrations",
        {
          status: "expired",
          updated_at: new Date().toISOString(),
        },
        { id },
      );

      return c.json({ error: "Token refresh failed", status: "expired" }, 400);
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    // Update integration
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await updateOne(
      "tenant_integrations",
      {
        access_token: encrypt(tokens.access_token),
        refresh_token: tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : integration.refresh_token,
        token_expires_at: expiresAt,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { id },
    );

    return c.json({ success: true, status: "active" });
  } catch (e) {
    console.error(`[OAUTH] Token refresh error:`, e);
    return c.json({ error: "Server error" }, 500);
  }
});
