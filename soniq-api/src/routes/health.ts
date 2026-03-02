import { Hono } from "hono";
import { getDbStatus } from "../services/database/client.js";
import { getTenantCacheStats } from "../services/database/tenant-cache.js";

export const healthRoutes = new Hono();

healthRoutes.get("/", async (c) => {
  const startTime = Date.now();
  const dbStatus = await getDbStatus();
  const cacheStats = getTenantCacheStats();
  const latency = Date.now() - startTime;

  const healthy = dbStatus.connected;

  return c.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      latency: `${latency}ms`,
      services: {
        database: dbStatus,
        tenantCache: cacheStats,
      },
      config: {
        voiceStack: "livekit-agents",
        nodeEnv: process.env.NODE_ENV || "development",
      },
    },
    healthy ? 200 : 503,
  );
});

// Quick health check for load balancers (no DB check)
healthRoutes.get("/ping", (c) => {
  return c.text("pong");
});
