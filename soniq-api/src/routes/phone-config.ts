import { Hono } from "hono";
import { queryOne } from "../services/database/client.js";
import {
  insertOne,
  updateOne,
  upsert,
} from "../services/database/query-helpers.js";
import { getAuthUserId } from "../middleware/index.js";
import { encryptIfNeeded } from "../services/crypto/encryption.js";
import {
  searchAvailableNumbers,
  provisionNumber,
  configureNumberWebhooks,
} from "../services/signalwire/phone.js";
import {
  createSipEndpoint,
  configureSipRouting,
  getSipEndpointStatus,
} from "../services/signalwire/sip.js";

export const phoneConfigRoutes = new Hono();

function withWebhookSecret(url: string): string {
  const secret = process.env.SIGNALWIRE_WEBHOOK_SECRET;
  if (!secret) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("webhook_secret", secret);
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Type definitions for database rows */
interface MembershipRow {
  tenant_id: string;
  role: string;
}

interface PhoneConfigRow {
  id: string;
  tenant_id: string;
  phone_number: string | null;
  setup_type: string;
  provider: string | null;
  provider_sid: string | null;
  status: string;
  verified_at: string | null;
  port_request_id: string | null;
}

interface PortRequestRow {
  id: string;
  tenant_id: string;
  phone_number: string;
  current_carrier: string;
  account_number: string | null;
  pin: string | null;
  authorized_name: string;
  status: string;
  estimated_completion: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  completed_at: string | null;
}

/**
 * GET /api/phone/available
 * Search for available phone numbers
 */
phoneConfigRoutes.get("/available", async (c) => {
  const areaCode = c.req.query("areaCode");

  const { numbers, error } = await searchAvailableNumbers(areaCode);

  if (error) {
    return c.json({ error }, 500);
  }

  return c.json({ numbers });
});

/**
 * GET /api/phone/config
 * Get current phone configuration
 */
phoneConfigRoutes.get("/config", async (c) => {
  const userId = getAuthUserId(c);

  try {
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
      return c.json({ config: null });
    }

    const configSql = `
      SELECT *
      FROM phone_configurations
      WHERE tenant_id = $1
      LIMIT 1
    `;
    const config = await queryOne<PhoneConfigRow>(configSql, [
      membership.tenant_id,
    ]);

    // Get port request if exists
    let portRequest = null;
    if (config?.port_request_id) {
      const portRequestSql = `
        SELECT *
        FROM port_requests
        WHERE id = $1
      `;
      portRequest = await queryOne<PortRequestRow>(portRequestSql, [
        config.port_request_id,
      ]);
    }

    return c.json({ config, portRequest });
  } catch (error) {
    console.error("[PHONE] Error fetching config:", error);
    return c.json({ error: "Failed to fetch phone configuration" }, 500);
  }
});

/**
 * POST /api/phone/provision
 * Provision a new phone number
 */
phoneConfigRoutes.post("/provision", async (c) => {
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  if (!body.phoneNumber) {
    return c.json({ error: "phoneNumber is required" }, 400);
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

    const tenantId = membership.tenant_id;

    // Provision number with SignalWire
    const { sid, error: provisionError } = await provisionNumber(
      body.phoneNumber,
    );

    if (provisionError || !sid) {
      return c.json(
        { error: provisionError || "Failed to provision number" },
        500,
      );
    }

    // Configure webhooks
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3100";
    const webhookUrl = `${backendUrl}/sip/forward`;
    await configureNumberWebhooks(sid, webhookUrl);

    // Create or update phone configuration
    const config = await upsert<PhoneConfigRow>(
      "phone_configurations",
      {
        tenant_id: tenantId,
        phone_number: body.phoneNumber,
        setup_type: "new",
        provider: "signalwire",
        provider_sid: sid,
        status: "active",
        verified_at: new Date().toISOString(),
      },
      ["tenant_id"],
    );

    // Update tenant's phone number
    await updateOne(
      "tenants",
      {
        phone_number: body.phoneNumber,
        updated_at: new Date().toISOString(),
      },
      { id: tenantId },
    );

    return c.json({
      success: true,
      phoneNumber: body.phoneNumber,
      configId: config.id,
    });
  } catch (error) {
    console.error("[PHONE] Error provisioning number:", error);
    return c.json({ error: "Failed to provision phone number" }, 500);
  }
});

/**
 * POST /api/phone/port
 * Submit a number port request
 */
phoneConfigRoutes.post("/port", async (c) => {
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  // Validate required fields
  if (!body.phone_number || !body.current_carrier || !body.authorized_name) {
    return c.json(
      {
        error:
          "phone_number, current_carrier, and authorized_name are required",
      },
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

    const tenantId = membership.tenant_id;

    // Create port request
    const portRequest = await insertOne<PortRequestRow>("port_requests", {
      tenant_id: tenantId,
      phone_number: body.phone_number,
      current_carrier: body.current_carrier,
      account_number: encryptIfNeeded(body.account_number),
      pin: encryptIfNeeded(body.pin),
      authorized_name: body.authorized_name,
      status: "draft",
    });

    // If user wants a temporary number while porting
    let temporaryNumber = null;
    let tempSid = null;
    if (body.use_temp_number) {
      // Search for a number in the same area code
      const areaCode = body.phone_number.substring(2, 5);
      const { numbers } = await searchAvailableNumbers(areaCode);
      if (numbers.length > 0) {
        const { sid } = await provisionNumber(numbers[0]);
        if (sid) {
          temporaryNumber = numbers[0];
          tempSid = sid;

          // Configure webhooks for temp number
          const backendUrl = process.env.BACKEND_URL || "http://localhost:3100";
          const webhookUrl = `${backendUrl}/sip/forward`;
          await configureNumberWebhooks(sid, webhookUrl);
        }
      }
    }

    // Create phone configuration
    const status = temporaryNumber ? "porting_with_temp" : "porting";
    const config = await upsert<PhoneConfigRow>(
      "phone_configurations",
      {
        tenant_id: tenantId,
        phone_number: temporaryNumber || null,
        setup_type: "port",
        provider: "signalwire",
        provider_sid: tempSid,
        status,
        port_request_id: portRequest.id,
      },
      ["tenant_id"],
    );

    // Update tenant phone number if we have a temp number
    if (temporaryNumber) {
      await updateOne(
        "tenants",
        {
          phone_number: temporaryNumber,
          updated_at: new Date().toISOString(),
        },
        { id: tenantId },
      );
    }

    return c.json({
      success: true,
      portRequestId: portRequest.id,
      estimatedCompletion: null, // Would come from carrier
      temporaryNumber,
      configId: config.id,
    });
  } catch (error) {
    console.error("[PHONE] Error submitting port request:", error);
    return c.json({ error: "Failed to submit port request" }, 500);
  }
});

/**
 * GET /api/phone/port/:id/status
 * Get port request status
 */
phoneConfigRoutes.get("/port/:id/status", async (c) => {
  const id = c.req.param("id");
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
      return c.json({ error: "Forbidden" }, 403);
    }

    const portRequestSql = `
      SELECT *
      FROM port_requests
      WHERE id = $1
        AND tenant_id = $2
    `;
    const portRequest = await queryOne<PortRequestRow>(portRequestSql, [
      id,
      membership.tenant_id,
    ]);

    if (!portRequest) {
      return c.json({ error: "Port request not found" }, 404);
    }

    return c.json({
      status: portRequest.status,
      estimatedCompletion: portRequest.estimated_completion,
      rejectionReason: portRequest.rejection_reason,
      submittedAt: portRequest.submitted_at,
      completedAt: portRequest.completed_at,
    });
  } catch (error) {
    console.error("[PHONE] Error fetching port status:", error);
    return c.json({ error: "Failed to fetch port request status" }, 500);
  }
});

/**
 * POST /api/phone/forward
 * Set up call forwarding
 */
phoneConfigRoutes.post("/forward", async (c) => {
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  if (!body.business_number) {
    return c.json({ error: "business_number is required" }, 400);
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

    const tenantId = membership.tenant_id;

    // Provision a Soniq number for receiving forwarded calls
    const areaCode = body.business_number.replace(/\D/g, "").substring(0, 3);
    const { numbers } = await searchAvailableNumbers(areaCode);

    if (numbers.length === 0) {
      return c.json({ error: "No numbers available in that area code" }, 400);
    }

    const { sid, error: provisionError } = await provisionNumber(numbers[0]);

    if (provisionError || !sid) {
      return c.json(
        { error: provisionError || "Failed to provision number" },
        500,
      );
    }

    // Configure webhooks
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3100";
    const webhookUrl = `${backendUrl}/sip/forward`;
    await configureNumberWebhooks(sid, webhookUrl);

    // Create phone configuration
    const config = await upsert<PhoneConfigRow>(
      "phone_configurations",
      {
        tenant_id: tenantId,
        phone_number: numbers[0],
        setup_type: "forward",
        provider: "signalwire",
        provider_sid: sid,
        status: "pending", // Pending until user confirms forwarding is active
      },
      ["tenant_id"],
    );

    // Update tenant phone number
    await updateOne(
      "tenants",
      {
        phone_number: numbers[0],
        updated_at: new Date().toISOString(),
      },
      { id: tenantId },
    );

    // Generate conditional forwarding instructions (busy/no-answer, not unconditional)
    const instructions = `To forward unanswered calls from ${body.business_number} to your AI assistant:

1. Contact your carrier or use the codes below to set up conditional forwarding
2. Forward to: ${numbers[0]}

Common carrier codes (for no-answer forwarding):
- AT&T: Dial *92, then enter ${numbers[0]}
- Verizon: Dial *71, then enter ${numbers[0]} (or use My Verizon app)
- T-Mobile: Dial **61*${numbers[0]}# and press Call
- Other: Contact your carrier and ask for "conditional call forwarding" (busy + no answer)

To cancel forwarding later:
- AT&T: Dial *93
- Verizon: Dial *73
- T-Mobile: Dial ##61#

Note: This only forwards calls you miss -- your phone still rings first.`;

    return c.json({
      success: true,
      forwardTo: numbers[0],
      instructions,
      configId: config.id,
    });
  } catch (error) {
    console.error("[PHONE] Error setting up forwarding:", error);
    return c.json({ error: "Failed to set up call forwarding" }, 500);
  }
});

/**
 * POST /api/phone/verify-forward
 * Mark forwarding as verified/active
 */
phoneConfigRoutes.post("/verify-forward", async (c) => {
  const userId = getAuthUserId(c);

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

    const updateSql = `
      UPDATE phone_configurations
      SET status = $1, verified_at = $2
      WHERE tenant_id = $3 AND setup_type = 'forward'
      RETURNING id
    `;
    const result = await queryOne<{ id: string }>(updateSql, [
      "active",
      new Date().toISOString(),
      membership.tenant_id,
    ]);

    if (!result) {
      return c.json({ error: "No forwarding configuration found" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("[PHONE] Error verifying forward:", error);
    return c.json({ error: "Failed to verify forwarding" }, 500);
  }
});

/**
 * POST /api/phone/sip
 * Create a SIP trunk endpoint
 */
phoneConfigRoutes.post("/sip", async (c) => {
  const userId = getAuthUserId(c);

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

    const tenantId = membership.tenant_id;
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3100";
    const webhookUrl = withWebhookSecret(`${backendUrl}/sip/forward`);

    // Create SIP endpoint on SignalWire
    const { endpoint, error: sipError } = await createSipEndpoint(tenantId);

    if (sipError || !endpoint) {
      return c.json(
        { error: sipError || "Failed to create SIP endpoint" },
        500,
      );
    }

    // Configure routing to point to our voice webhook
    const { error: routingError } = await configureSipRouting(
      endpoint.endpointId,
      webhookUrl,
    );

    if (routingError) {
      console.warn("[PHONE] SIP routing config failed:", routingError);
      // Non-fatal: endpoint was created, routing can be retried
    }

    // Create phone configuration
    const config = await upsert<PhoneConfigRow>(
      "phone_configurations",
      {
        tenant_id: tenantId,
        setup_type: "sip",
        provider: "signalwire",
        provider_sid: endpoint.endpointId,
        sip_uri: endpoint.sipUri,
        sip_username: endpoint.username,
        status: "pending",
      },
      ["tenant_id"],
    );

    return c.json({
      success: true,
      sipUri: endpoint.sipUri,
      username: endpoint.username,
      password: endpoint.password,
      configId: config.id,
    });
  } catch (error) {
    console.error("[PHONE] Error creating SIP endpoint:", error);
    return c.json({ error: "Failed to create SIP endpoint" }, 500);
  }
});

/**
 * GET /api/phone/sip/status
 * Check SIP endpoint registration status
 */
phoneConfigRoutes.get("/sip/status", async (c) => {
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
      return c.json({ error: "Forbidden" }, 403);
    }

    // Get SIP config
    const configSql = `
      SELECT provider_sid, sip_uri, status
      FROM phone_configurations
      WHERE tenant_id = $1 AND setup_type = 'sip'
      LIMIT 1
    `;
    const config = await queryOne<{
      provider_sid: string;
      sip_uri: string;
      status: string;
    }>(configSql, [membership.tenant_id]);

    if (!config || !config.provider_sid) {
      return c.json({ error: "No SIP configuration found" }, 404);
    }

    // Check registration status with SignalWire
    const { registered, error: statusError } = await getSipEndpointStatus(
      config.provider_sid,
    );

    if (statusError) {
      return c.json({
        registered: false,
        sipUri: config.sip_uri,
        status: config.status,
        error: statusError,
      });
    }

    // Update status if PBX has connected
    if (registered && config.status === "pending") {
      const updateSql = `
        UPDATE phone_configurations
        SET status = 'active', verified_at = $1
        WHERE tenant_id = $2 AND setup_type = 'sip'
      `;
      await queryOne(updateSql, [
        new Date().toISOString(),
        membership.tenant_id,
      ]);
    }

    return c.json({
      registered,
      sipUri: config.sip_uri,
      status: registered ? "active" : config.status,
    });
  } catch (error) {
    console.error("[PHONE] Error checking SIP status:", error);
    return c.json({ error: "Failed to check SIP status" }, 500);
  }
});
