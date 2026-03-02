import { Hono } from "hono";
import {
  queryOne,
  queryAll,
  transaction,
} from "../services/database/client.js";
import { getAuthUserId } from "../middleware/index.js";
import type { PoolClient } from "pg";

export const capabilitiesRoutes = new Hono();

/** Type definitions for database rows */
interface MembershipRow {
  tenant_id: string;
  role: string;
}

interface CapabilityRow {
  id: string;
  tenant_id: string;
  capability: string;
  config: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Capability definitions by industry
const CAPABILITY_OPTIONS: Record<
  string,
  {
    id: string;
    label: string;
    description: string;
    icon: string;
    category: "core" | "communication" | "advanced";
    requiresIntegration?: boolean;
  }[]
> = {
  // Restaurant/Food Service
  restaurant: [
    {
      id: "reservations",
      label: "Take Reservations",
      description: "Book tables for customers",
      icon: "calendar",
      category: "core",
    },
    {
      id: "takeaway",
      label: "Takeaway Orders",
      description: "Handle pickup and delivery orders",
      icon: "package",
      category: "core",
    },
    {
      id: "menu_questions",
      label: "Menu Questions",
      description: "Answer questions about menu items, ingredients, allergies",
      icon: "utensils",
      category: "core",
    },
    {
      id: "hours_location",
      label: "Hours & Location",
      description: "Provide business hours and directions",
      icon: "clock",
      category: "core",
    },
    {
      id: "messages",
      label: "Take Messages",
      description: "Record messages for follow-up",
      icon: "message-square",
      category: "communication",
    },
    {
      id: "faq",
      label: "FAQ Handling",
      description: "Answer common questions automatically",
      icon: "help-circle",
      category: "advanced",
    },
    {
      id: "transfer_human",
      label: "Transfer to Human",
      description: "Connect callers to staff when needed",
      icon: "phone-forwarded",
      category: "communication",
    },
  ],
  pizza: [
    {
      id: "takeaway",
      label: "Take Orders",
      description: "Handle pickup and delivery orders",
      icon: "package",
      category: "core",
    },
    {
      id: "menu_questions",
      label: "Menu Questions",
      description: "Answer questions about menu items and specials",
      icon: "utensils",
      category: "core",
    },
    {
      id: "hours_location",
      label: "Hours & Location",
      description: "Provide business hours and directions",
      icon: "clock",
      category: "core",
    },
    {
      id: "messages",
      label: "Take Messages",
      description: "Record messages for follow-up",
      icon: "message-square",
      category: "communication",
    },
    {
      id: "transfer_human",
      label: "Transfer to Human",
      description: "Connect callers to staff when needed",
      icon: "phone-forwarded",
      category: "communication",
    },
  ],

  // Healthcare
  medical: [
    {
      id: "appointments",
      label: "Schedule Appointments",
      description: "Book and manage patient appointments",
      icon: "calendar",
      category: "core",
      requiresIntegration: true,
    },
    {
      id: "patient_intake",
      label: "Patient Intake",
      description: "Collect patient information before visits",
      icon: "clipboard",
      category: "core",
    },
    {
      id: "insurance_questions",
      label: "Insurance Questions",
      description: "Answer common insurance and billing questions",
      icon: "shield",
      category: "core",
    },
    {
      id: "prescription_refills",
      label: "Prescription Refills",
      description: "Take refill requests for processing",
      icon: "pill",
      category: "advanced",
    },
    {
      id: "hours_location",
      label: "Hours & Location",
      description: "Provide office hours and directions",
      icon: "clock",
      category: "core",
    },
    {
      id: "messages",
      label: "Take Messages",
      description: "Record messages for medical staff",
      icon: "message-square",
      category: "communication",
    },
    {
      id: "transfer_human",
      label: "Transfer to Staff",
      description: "Connect urgent calls to medical staff",
      icon: "phone-forwarded",
      category: "communication",
    },
  ],
  dental: [
    {
      id: "appointments",
      label: "Schedule Appointments",
      description: "Book dental appointments",
      icon: "calendar",
      category: "core",
      requiresIntegration: true,
    },
    {
      id: "patient_intake",
      label: "New Patient Intake",
      description: "Collect information from new patients",
      icon: "clipboard",
      category: "core",
    },
    {
      id: "insurance_questions",
      label: "Insurance Questions",
      description: "Answer dental insurance questions",
      icon: "shield",
      category: "core",
    },
    {
      id: "hours_location",
      label: "Hours & Location",
      description: "Provide office hours and directions",
      icon: "clock",
      category: "core",
    },
    {
      id: "messages",
      label: "Take Messages",
      description: "Record messages for dental staff",
      icon: "message-square",
      category: "communication",
    },
    {
      id: "faq",
      label: "FAQ Handling",
      description: "Answer common dental questions",
      icon: "help-circle",
      category: "advanced",
    },
    {
      id: "transfer_human",
      label: "Transfer to Staff",
      description: "Connect callers to staff when needed",
      icon: "phone-forwarded",
      category: "communication",
    },
  ],

  // Home Services
  home_services: [
    {
      id: "service_appointments",
      label: "Schedule Service Calls",
      description: "Book service appointments",
      icon: "calendar",
      category: "core",
    },
    {
      id: "emergency_dispatch",
      label: "Emergency Dispatch",
      description: "Handle urgent service requests",
      icon: "alert-triangle",
      category: "core",
    },
    {
      id: "quotes",
      label: "Quote Requests",
      description: "Collect information for estimates",
      icon: "file-text",
      category: "core",
    },
    {
      id: "service_area",
      label: "Service Area Info",
      description: "Answer questions about service areas",
      icon: "map",
      category: "core",
    },
    {
      id: "messages",
      label: "Take Messages",
      description: "Record messages for technicians",
      icon: "message-square",
      category: "communication",
    },
    {
      id: "transfer_human",
      label: "Transfer to Dispatcher",
      description: "Connect urgent calls to dispatch",
      icon: "phone-forwarded",
      category: "communication",
    },
  ],
  hvac: [
    {
      id: "service_appointments",
      label: "Schedule Service",
      description: "Book HVAC service appointments",
      icon: "calendar",
      category: "core",
    },
    {
      id: "emergency_dispatch",
      label: "Emergency Service",
      description: "Handle emergency heating/cooling calls",
      icon: "alert-triangle",
      category: "core",
    },
    {
      id: "quotes",
      label: "Quote Requests",
      description: "Collect information for estimates",
      icon: "file-text",
      category: "core",
    },
    {
      id: "service_area",
      label: "Service Area Info",
      description: "Answer questions about service areas",
      icon: "map",
      category: "core",
    },
    {
      id: "messages",
      label: "Take Messages",
      description: "Record messages for technicians",
      icon: "message-square",
      category: "communication",
    },
    {
      id: "transfer_human",
      label: "Transfer to Dispatcher",
      description: "Connect urgent calls to dispatch",
      icon: "phone-forwarded",
      category: "communication",
    },
  ],
  plumbing: [
    {
      id: "service_appointments",
      label: "Schedule Service",
      description: "Book plumbing service appointments",
      icon: "calendar",
      category: "core",
    },
    {
      id: "emergency_dispatch",
      label: "Emergency Service",
      description: "Handle emergency plumbing calls",
      icon: "alert-triangle",
      category: "core",
    },
    {
      id: "quotes",
      label: "Quote Requests",
      description: "Collect information for estimates",
      icon: "file-text",
      category: "core",
    },
    {
      id: "service_area",
      label: "Service Area Info",
      description: "Answer questions about service areas",
      icon: "map",
      category: "core",
    },
    {
      id: "messages",
      label: "Take Messages",
      description: "Record messages for plumbers",
      icon: "message-square",
      category: "communication",
    },
    {
      id: "transfer_human",
      label: "Transfer to Dispatcher",
      description: "Connect urgent calls to dispatch",
      icon: "phone-forwarded",
      category: "communication",
    },
  ],

  // Professional Services
  legal: [
    {
      id: "consultations",
      label: "Schedule Consultations",
      description: "Book consultation appointments",
      icon: "calendar",
      category: "core",
      requiresIntegration: true,
    },
    {
      id: "case_intake",
      label: "Case Intake",
      description: "Collect initial case information",
      icon: "clipboard",
      category: "core",
    },
    {
      id: "practice_questions",
      label: "Practice Information",
      description: "Answer questions about practice areas",
      icon: "briefcase",
      category: "core",
    },
    {
      id: "messages",
      label: "Take Messages",
      description: "Record messages for attorneys",
      icon: "message-square",
      category: "communication",
    },
    {
      id: "transfer_human",
      label: "Transfer to Staff",
      description: "Connect callers to legal staff",
      icon: "phone-forwarded",
      category: "communication",
    },
  ],

  // Salon/Spa
  salon: [
    {
      id: "appointments",
      label: "Book Appointments",
      description: "Schedule salon services",
      icon: "calendar",
      category: "core",
      requiresIntegration: true,
    },
    {
      id: "services_info",
      label: "Services & Pricing",
      description: "Provide information about services and prices",
      icon: "scissors",
      category: "core",
    },
    {
      id: "hours_location",
      label: "Hours & Location",
      description: "Provide salon hours and directions",
      icon: "clock",
      category: "core",
    },
    {
      id: "messages",
      label: "Take Messages",
      description: "Record messages for stylists",
      icon: "message-square",
      category: "communication",
    },
    {
      id: "transfer_human",
      label: "Transfer to Staff",
      description: "Connect callers to salon staff",
      icon: "phone-forwarded",
      category: "communication",
    },
  ],
  spa: [
    {
      id: "appointments",
      label: "Book Appointments",
      description: "Schedule spa services",
      icon: "calendar",
      category: "core",
      requiresIntegration: true,
    },
    {
      id: "services_info",
      label: "Services & Pricing",
      description: "Provide information about treatments and prices",
      icon: "sparkles",
      category: "core",
    },
    {
      id: "hours_location",
      label: "Hours & Location",
      description: "Provide spa hours and directions",
      icon: "clock",
      category: "core",
    },
    {
      id: "messages",
      label: "Take Messages",
      description: "Record messages for staff",
      icon: "message-square",
      category: "communication",
    },
    {
      id: "transfer_human",
      label: "Transfer to Staff",
      description: "Connect callers to spa staff",
      icon: "phone-forwarded",
      category: "communication",
    },
  ],

  // Hotel/Hospitality
  hotel: [
    {
      id: "reservations",
      label: "Room Reservations",
      description: "Book and manage room reservations",
      icon: "bed",
      category: "core",
      requiresIntegration: true,
    },
    {
      id: "guest_services",
      label: "Guest Services",
      description: "Handle guest requests and inquiries",
      icon: "concierge-bell",
      category: "core",
    },
    {
      id: "amenities_info",
      label: "Amenities Info",
      description: "Provide information about hotel amenities",
      icon: "star",
      category: "core",
    },
    {
      id: "hours_location",
      label: "Hours & Directions",
      description: "Provide check-in times and directions",
      icon: "clock",
      category: "core",
    },
    {
      id: "messages",
      label: "Take Messages",
      description: "Record messages for guests and staff",
      icon: "message-square",
      category: "communication",
    },
    {
      id: "transfer_human",
      label: "Transfer to Front Desk",
      description: "Connect callers to front desk staff",
      icon: "phone-forwarded",
      category: "communication",
    },
  ],
};

// Default capabilities for unlisted industries
const DEFAULT_CAPABILITIES = [
  {
    id: "appointments",
    label: "Schedule Appointments",
    description: "Book appointments and consultations",
    icon: "calendar",
    category: "core" as const,
    requiresIntegration: true,
  },
  {
    id: "hours_location",
    label: "Hours & Location",
    description: "Provide business hours and directions",
    icon: "clock",
    category: "core" as const,
  },
  {
    id: "faq",
    label: "FAQ Handling",
    description: "Answer common questions automatically",
    icon: "help-circle",
    category: "advanced" as const,
  },
  {
    id: "messages",
    label: "Take Messages",
    description: "Record messages for follow-up",
    icon: "message-square",
    category: "communication" as const,
  },
  {
    id: "transfer_human",
    label: "Transfer to Human",
    description: "Connect callers to staff when needed",
    icon: "phone-forwarded",
    category: "communication" as const,
  },
];

/**
 * GET /api/capabilities/options/:industry
 * Returns available capabilities for an industry
 */
capabilitiesRoutes.get("/options/:industry", async (c) => {
  const industry = c.req.param("industry");

  const capabilities = CAPABILITY_OPTIONS[industry] || DEFAULT_CAPABILITIES;

  return c.json({ capabilities });
});

/**
 * GET /api/capabilities
 * Returns tenant's enabled capabilities
 */
capabilitiesRoutes.get("/", async (c) => {
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
      return c.json({ capabilities: [] });
    }

    const capabilitiesSql = `
      SELECT *
      FROM tenant_capabilities
      WHERE tenant_id = $1
      ORDER BY created_at ASC
    `;
    const capabilities = await queryAll<CapabilityRow>(capabilitiesSql, [
      membership.tenant_id,
    ]);

    return c.json({ capabilities: capabilities || [] });
  } catch (error) {
    console.error("[CAPABILITIES] Error fetching capabilities:", error);
    return c.json({ error: "Failed to fetch capabilities" }, 500);
  }
});

/**
 * PUT /api/capabilities
 * Updates tenant's capabilities
 */
capabilitiesRoutes.put("/", async (c) => {
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  if (!body.capabilities || !Array.isArray(body.capabilities)) {
    return c.json({ error: "capabilities array is required" }, 400);
  }

  try {
    // Get tenant (must be owner or admin)
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

    // Delete existing capabilities and insert new ones in a transaction
    await transaction(async (client: PoolClient) => {
      // Delete existing capabilities
      await client.query(
        "DELETE FROM tenant_capabilities WHERE tenant_id = $1",
        [tenantId],
      );

      // Insert new capabilities
      for (const cap of body.capabilities) {
        await client.query(
          `INSERT INTO tenant_capabilities (tenant_id, capability, config, is_enabled)
           VALUES ($1, $2, $3, $4)`,
          [tenantId, cap.capability, JSON.stringify(cap.config || {}), true],
        );
      }
    });

    // Return updated list
    const updatedSql = `
      SELECT *
      FROM tenant_capabilities
      WHERE tenant_id = $1
      ORDER BY created_at ASC
    `;
    const updated = await queryAll<CapabilityRow>(updatedSql, [tenantId]);

    return c.json({ capabilities: updated || [] });
  } catch (error) {
    console.error("[CAPABILITIES] Error updating capabilities:", error);
    return c.json({ error: "Failed to update capabilities" }, 500);
  }
});

/**
 * PUT /api/capabilities/:capability
 * Update a specific capability's config
 */
capabilitiesRoutes.put("/:capability", async (c) => {
  const capability = c.req.param("capability");
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  try {
    // Get tenant (must be owner or admin)
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
      UPDATE tenant_capabilities
      SET config = $1, is_enabled = $2
      WHERE tenant_id = $3 AND capability = $4
      RETURNING *
    `;
    const data = await queryOne<CapabilityRow>(updateSql, [
      JSON.stringify(body.config || {}),
      body.is_enabled !== undefined ? body.is_enabled : true,
      membership.tenant_id,
      capability,
    ]);

    if (!data) {
      return c.json({ error: "Capability not found" }, 404);
    }

    return c.json(data);
  } catch (error) {
    console.error("[CAPABILITIES] Error updating capability:", error);
    return c.json({ error: "Failed to update capability" }, 500);
  }
});
