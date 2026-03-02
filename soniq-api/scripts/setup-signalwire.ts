#!/usr/bin/env npx tsx
/**
 * SignalWire Setup Script
 * Configures phone number webhooks via REST API (bypasses broken dashboard)
 *
 * Usage: npx tsx scripts/setup-signalwire.ts
 */

import "dotenv/config";
import { setupSignalWirePhone } from "../src/services/signalwire/client.js";

async function main() {
  console.log("SignalWire Setup Script");
  console.log("=======================\n");

  // Check required env vars
  const required = [
    "SIGNALWIRE_PROJECT_ID",
    "SIGNALWIRE_API_TOKEN",
    "SIGNALWIRE_SPACE_URL",
    "SIGNALWIRE_PHONE_NUMBER",
    "BACKEND_URL",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    missing.forEach((key) => console.error(`  - ${key}`));
    console.error("\nPlease set these in your .env file and try again.");
    process.exit(1);
  }

  console.log("Configuration:");
  console.log(`  Project ID: ${process.env.SIGNALWIRE_PROJECT_ID}`);
  console.log(`  Space URL:  ${process.env.SIGNALWIRE_SPACE_URL}`);
  console.log(`  Phone:      ${process.env.SIGNALWIRE_PHONE_NUMBER}`);
  console.log(`  Backend:    ${process.env.BACKEND_URL}`);
  console.log("");

  try {
    await setupSignalWirePhone(process.env.BACKEND_URL!);
    console.log(
      "\nSetup complete! Your SignalWire phone number is now configured.",
    );
    console.log("\nNext steps:");
    console.log("  1. Set VOICE_PROVIDER=custom in your .env");
    console.log("  2. Restart the server");
    console.log("  3. Call your SignalWire number to test");
  } catch (error) {
    console.error("\nSetup failed:", error);
    process.exit(1);
  }
}

main();
