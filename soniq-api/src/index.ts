import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as httpLogger } from "hono/logger";
import { timing } from "hono/timing";

import { healthRoutes } from "./routes/health.js";
import { callsRoutes } from "./routes/calls.js";
import { bookingsRoutes } from "./routes/bookings.js";
import { tenantsRoutes } from "./routes/tenants.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { contactsRoutes } from "./routes/contacts.js";
import { availabilityRoutes } from "./routes/availability.js";
import { notificationsRoutes } from "./routes/notifications.js";
import { resourcesRoutes } from "./routes/resources.js";
import {
  voicemailRoutes,
  voicemailWebhookRoutes,
} from "./routes/voicemails.js";
import trainingDataRoutes from "./routes/training-data.js";
import { chatRoutes } from "./routes/chat.js";
import { setupRoutes } from "./routes/setup.js";
import { capabilitiesRoutes } from "./routes/capabilities.js";
import { integrationsRoutes } from "./routes/integrations.js";
import { phoneConfigRoutes } from "./routes/phone-config.js";
import { escalationRoutes } from "./routes/escalation.js";
import { promotionsRoutes } from "./routes/promotions.js";
import { pendingBookingsRoutes } from "./routes/pending-bookings.js";
import { dealsRoutes } from "./routes/deals.js";
import { tasksRoutes } from "./routes/tasks.js";
import { internalRoutes } from "./routes/internal.js";
import { initTenantCache } from "./services/database/tenant-cache.js";
import { initDatabase, closePool } from "./services/database/client.js";
import { startScheduler } from "./jobs/scheduler.js";
import {
  authMiddleware,
  userAuthMiddleware,
  rateLimit,
  verifyTelephonyWebhook,
} from "./middleware/index.js";
import { logger } from "./lib/logger.js";
import {
  initErrorReporting,
  captureException,
} from "./lib/error-reporting.js";

const app = new Hono();

// Middleware
app.use("*", httpLogger());
app.use("*", timing());
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = process.env.FRONTEND_URL || "http://localhost:3000";
      const allowedOrigins = allowed.split(",").map((o) => o.trim());
      const isProduction = process.env.NODE_ENV === "production";

      // In production, only allow configured origins
      if (isProduction) {
        return allowedOrigins.includes(origin || "") ? origin : null;
      }

      // In development, allow localhost on any port
      if (origin && origin.startsWith("http://localhost:")) {
        return origin;
      }
      return allowedOrigins.includes(origin || "") ? origin : allowedOrigins[0];
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Tenant-ID",
      "X-User-ID",
      "X-User-Name",
    ],
    credentials: true,
  }),
);

// Global rate limiting
app.use("*", rateLimit({ windowMs: 60000, max: 100 }));

// SIP forwarding endpoint - SignalWire calls this to route calls to LiveKit SIP bridge
// Public (no JWT) since SignalWire calls it directly, but signature-verified so
// only the telephony provider can trigger call routing.
app.post("/sip/forward", verifyTelephonyWebhook(), (c) => {
  const livekitSipHost = process.env.LIVEKIT_SIP_HOST || "178.156.205.145";
  const livekitSipPort = process.env.LIVEKIT_SIP_PORT || "5060";
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>sip:${livekitSipHost}:${livekitSipPort};transport=udp</Sip>
  </Dial>
</Response>`;
  return c.text(twiml, 200, { "Content-Type": "application/xml" });
});

// Public routes (no auth required)
app.route("/health", healthRoutes);
app.route("/api/chat", chatRoutes); // Chat widget is public
app.route("/internal", internalRoutes); // LiveKit agent API (own auth via INTERNAL_API_KEY)
// SignalWire voicemail webhooks: public path (not under /api/* JWT), each
// endpoint signature-verified inside the router so the provider can reach them.
app.route("/webhooks/voicemail", voicemailWebhookRoutes);

// User-only auth (no tenant required) for setup and tenant listing
app.use("/api/setup/*", userAuthMiddleware());
app.use("/api/tenants", userAuthMiddleware());
app.use("/api/tenants/*", userAuthMiddleware());

// Full auth (requires X-Tenant-ID) for all other API routes
app.use("/api/*", authMiddleware());

// Protected API routes
app.route("/api/calls", callsRoutes);
app.route("/api/bookings", bookingsRoutes);
app.route("/api/tenants", tenantsRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/contacts", contactsRoutes);
app.route("/api/availability", availabilityRoutes);
app.route("/api/notifications", notificationsRoutes);
app.route("/api/resources", resourcesRoutes);
app.route("/api/voicemails", voicemailRoutes);
app.route("/api/training", trainingDataRoutes);
// Setup wizard routes
app.route("/api/setup", setupRoutes);
app.route("/api/capabilities", capabilitiesRoutes);
app.route("/api/integrations", integrationsRoutes);
app.route("/api/phone", phoneConfigRoutes);
app.route("/api/escalation", escalationRoutes);
app.route("/api/promotions", promotionsRoutes);
app.route("/api/pending-bookings", pendingBookingsRoutes);
app.route("/api/deals", dealsRoutes);
app.route("/api/tasks", tasksRoutes);

// Root
app.get("/", (c) => {
  return c.json({
    name: "Soniq API",
    version: "0.1.0",
    status: "operational",
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

// Error handler
app.onError((err, c) => {
  logger.error({ err }, "[ERROR]");
  // No-op unless a Sentry/GlitchTip DSN is configured.
  captureException(err, { path: c.req.path, method: c.req.method });
  return c.json(
    {
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500,
  );
});

// Startup
const port = parseInt(process.env.PORT || "3001", 10);

async function start() {
  logger.info("[STARTUP] Initializing Soniq API...");

  // Initialize error reporting first so startup failures are captured.
  // No-op when neither SENTRY_DSN nor GLITCHTIP_DSN is set.
  initErrorReporting();

  const isProduction = process.env.NODE_ENV === "production";

  // Validate critical environment variables at startup.
  // ENCRYPTION_KEY is required in ALL environments so encrypt/decrypt fail
  // closed and never silently persist plaintext.
  const requiredEnv = ["DATABASE_URL", "ENCRYPTION_KEY"];
  if (isProduction) {
    requiredEnv.push("FRONTEND_URL", "BACKEND_URL");
  }
  const recommendedEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

  const missingRequired = requiredEnv.filter((key) => !process.env[key]);
  if (missingRequired.length > 0) {
    logger.error(`[STARTUP] FATAL: Missing required env vars: ${missingRequired.join(", ")}`);
    process.exit(1);
  }

  // Inbound telephony webhooks are signature-verified. In production a signing
  // secret MUST be present, otherwise every SignalWire webhook fails closed
  // (breaking calls) - fail fast at boot rather than ship broken telephony.
  if (
    isProduction &&
    !process.env.SIGNALWIRE_SIGNING_KEY &&
    !process.env.SIGNALWIRE_WEBHOOK_SECRET
  ) {
    logger.error("[STARTUP] FATAL: production requires SIGNALWIRE_SIGNING_KEY (or SIGNALWIRE_WEBHOOK_SECRET) for webhook signature verification");
    process.exit(1);
  }

  const missingRecommended = recommendedEnv.filter((key) => !process.env[key]);
  if (missingRecommended.length > 0) {
    logger.warn(`[STARTUP] WARNING: Missing recommended env vars: ${missingRecommended.join(", ")}`);
  }

  if (!isProduction) {
    logger.warn(`[STARTUP] WARNING: NODE_ENV is "${process.env.NODE_ENV || "undefined"}" - set to "production" for production deploys`);
  }

  // Initialize database connection pool
  initDatabase();
  logger.info("[STARTUP] Database pool initialized");

  // Initialize tenant cache for low-latency webhook responses
  await initTenantCache();
  logger.info("[STARTUP] Tenant cache initialized");

  // Start background job scheduler
  startScheduler();
  logger.info("[STARTUP] Job scheduler started");

  // Start HTTP server
  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      logger.info(`[STARTUP] Server running on http://localhost:${info.port}`);
      logger.info("[STARTUP] Voice stack: LiveKit Agents (Deepgram + OpenAI + Cartesia)");
    },
  );

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    logger.info(`[SHUTDOWN] Received ${signal}, closing connections...`);
    await closePool();
    logger.info("[SHUTDOWN] Database pool closed");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  logger.error({ err }, "[FATAL] Failed to start server:");
  captureException(err, { phase: "startup" });
  process.exit(1);
});

export default app;
