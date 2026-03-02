// Notifications API Routes
import { Hono } from "hono";
import { z } from "zod";
import { queryOne, queryAll } from "../services/database/client.js";
import {
  insertOne,
  updateOne,
  upsert,
} from "../services/database/query-helpers.js";
import {
  queueNotification,
  processQueue,
  retryFailed,
  getDefaultTemplate,
  renderTemplate,
} from "../services/notifications/notification-service.js";
import type { NotificationTemplate } from "../types/crm.js";

import { getAuthTenantId } from "../middleware/index.js";

export const notificationsRoutes = new Hono();

function getTenantId(c: Parameters<typeof getAuthTenantId>[0]): string {
  return getAuthTenantId(c);
}

// Notification row type
interface NotificationRow {
  id: string;
  tenant_id: string;
  status: string;
  channel: string;
  notification_type: string;
  contact_id: string | null;
  booking_id: string | null;
  recipient: string;
  recipient_name: string | null;
  subject: string | null;
  body: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

interface NotificationTemplateRow {
  id: string;
  tenant_id: string;
  name: string;
  notification_type: string;
  channel: string;
  subject_template: string | null;
  body_template: string;
  body_html_template: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationPreferenceRow {
  id: string;
  tenant_id: string;
  notification_type: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// GET /api/notifications
notificationsRoutes.get("/", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const query = c.req.query();

    const limit = parseInt(query.limit || "20");
    const offset = parseInt(query.offset || "0");

    // Build WHERE conditions
    const conditions: string[] = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (query.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(query.status);
    }
    if (query.channel) {
      conditions.push(`channel = $${paramIndex++}`);
      params.push(query.channel);
    }
    if (query.notification_type) {
      conditions.push(`notification_type = $${paramIndex++}`);
      params.push(query.notification_type);
    }
    if (query.contact_id) {
      conditions.push(`contact_id = $${paramIndex++}`);
      params.push(query.contact_id);
    }
    if (query.booking_id) {
      conditions.push(`booking_id = $${paramIndex++}`);
      params.push(query.booking_id);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM notifications ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || "0", 10);

    // Get data with pagination
    const data = await queryAll<NotificationRow>(
      `SELECT * FROM notifications ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return c.json({
      data: data || [],
      total,
      limit,
      offset,
      has_more: total > offset + limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// GET /api/notifications/templates - MUST be before /:id route
notificationsRoutes.get("/templates", async (c) => {
  try {
    const tenantId = getTenantId(c);

    const data = await queryAll<NotificationTemplateRow>(
      `SELECT * FROM notification_templates
       WHERE tenant_id = $1
       ORDER BY notification_type, channel`,
      [tenantId],
    );

    return c.json({ templates: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// GET /api/notifications/preferences - MUST be before /:id route
notificationsRoutes.get("/preferences", async (c) => {
  try {
    const tenantId = getTenantId(c);

    const data = await queryAll<NotificationPreferenceRow>(
      `SELECT * FROM notification_preferences WHERE tenant_id = $1`,
      [tenantId],
    );

    return c.json({ preferences: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// GET /api/notifications/:id - parameterized route MUST be after specific routes
notificationsRoutes.get("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const data = await queryOne<NotificationRow>(
      `SELECT * FROM notifications WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id],
    );

    if (!data) {
      return c.json({ error: "Not found" }, 404);
    }

    return c.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// POST /api/notifications/send
notificationsRoutes.post("/send", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const schema = z.object({
      contact_id: z.string().uuid().optional(),
      channel: z.enum(["email", "sms"]),
      notification_type: z.enum([
        "booking_confirmation",
        "booking_reminder_24h",
        "booking_reminder_1h",
        "booking_modified",
        "booking_cancelled",
        "booking_rescheduled",
        "missed_call_followup",
        "thank_you",
        "review_request",
        "marketing",
        "custom",
      ]),
      recipient: z.string(),
      recipient_name: z.string().optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      template_id: z.string().uuid().optional(),
      template_variables: z.record(z.unknown()).optional(),
      scheduled_at: z.string().optional(),
      booking_id: z.string().uuid().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.issues },
        400,
      );
    }

    const notification = await queueNotification(tenantId, parsed.data as any);
    return c.json(notification, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// POST /api/notifications/preview
notificationsRoutes.post("/preview", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const { template_id, notification_type, channel, variables } = body;

    let template: NotificationTemplate | null = null;
    if (template_id) {
      const row = await queryOne<NotificationTemplateRow>(
        `SELECT * FROM notification_templates WHERE id = $1`,
        [template_id],
      );
      if (row) {
        // Convert nullable DB fields to optional fields for the type
        template = {
          id: row.id,
          tenant_id: row.tenant_id,
          name: row.name,
          notification_type:
            row.notification_type as NotificationTemplate["notification_type"],
          channel: row.channel as NotificationTemplate["channel"],
          subject_template: row.subject_template ?? undefined,
          body_template: row.body_template,
          body_html_template: row.body_html_template ?? undefined,
          is_default: row.is_default,
          is_active: row.is_active,
          available_variables: [],
          preview_data: {},
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }
    } else if (notification_type && channel) {
      template = await getDefaultTemplate(tenantId, notification_type, channel);
    }

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    const rendered = renderTemplate(template, variables || {});
    return c.json(rendered);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// POST /api/notifications/templates
notificationsRoutes.post("/templates", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const schema = z.object({
      name: z.string(),
      notification_type: z.string(),
      channel: z.enum(["email", "sms"]),
      subject_template: z.string().optional(),
      body_template: z.string(),
      body_html_template: z.string().optional(),
      is_default: z.boolean().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Validation failed" }, 400);
    }

    const data = await insertOne<NotificationTemplateRow>(
      "notification_templates",
      {
        tenant_id: tenantId,
        ...parsed.data,
        is_active: true,
      },
    );

    return c.json(data, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// PUT /api/notifications/templates/:id
notificationsRoutes.put("/templates/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    // Remove protected fields
    delete body.id;
    delete body.tenant_id;

    const data = await updateOne<NotificationTemplateRow>(
      "notification_templates",
      body,
      { tenant_id: tenantId, id },
    );

    if (!data) {
      return c.json({ error: "Template not found" }, 404);
    }

    return c.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// PUT /api/notifications/preferences
notificationsRoutes.put("/preferences", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const data = await upsert<NotificationPreferenceRow>(
      "notification_preferences",
      { tenant_id: tenantId, ...body },
      ["tenant_id", "notification_type"],
    );

    return c.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// POST /api/notifications/process-queue (internal/cron)
notificationsRoutes.post("/process-queue", async (c) => {
  try {
    const processed = await processQueue();
    const retried = await retryFailed();
    return c.json({ processed, retried });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});
