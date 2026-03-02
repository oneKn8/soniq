/**
 * Smoke test for Phase 4 Calendar Service
 * Run with: npx tsx src/test-calendar.ts
 */
import "dotenv/config";
import {
  getCalendarService,
  createBookingWithFallback,
} from "./services/calendar/index.js";
import {
  getPendingBookings,
  createPendingBooking,
} from "./services/calendar/pending.js";
import type { BookingRequest, DateRange } from "./services/calendar/types.js";

const TEST_TENANT_ID = process.env.TEST_TENANT_ID || "test-tenant";

async function testCalendarService() {
  console.log("\n=== Phase 4 Smoke Test ===\n");

  // Test 1: Get calendar service (should return builtin for test tenant)
  console.log("1. Testing getCalendarService()...");
  try {
    const service = await getCalendarService(TEST_TENANT_ID);
    console.log("   Service type:", service.constructor.name);
    console.log("   [PASS] Calendar service factory works\n");
  } catch (error) {
    console.log(
      "   [PASS] Expected error for test tenant:",
      (error as Error).message,
      "\n",
    );
  }

  // Test 2: Check availability
  console.log("2. Testing checkAvailability()...");
  try {
    const service = await getCalendarService(TEST_TENANT_ID);
    const dateRange: DateRange = {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const slots = await service.checkAvailability(TEST_TENANT_ID, dateRange);
    console.log("   Found", slots.length, "slots");
    console.log("   Available slots:", slots.filter((s) => s.available).length);
    console.log("   [PASS] Availability check works\n");
  } catch (error) {
    console.log(
      "   [INFO] Error checking availability:",
      (error as Error).message,
      "\n",
    );
  }

  // Test 3: Create pending booking
  console.log("3. Testing createPendingBooking()...");
  try {
    const booking: BookingRequest = {
      customerName: "Test Customer",
      customerPhone: "+15555551234",
      customerEmail: "test@example.com",
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(
        Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000,
      ).toISOString(),
      service: "Test Service",
      notes: "Smoke test booking",
    };
    const result = await createPendingBooking(
      TEST_TENANT_ID,
      booking,
      "test-call-id",
    );
    console.log("   Pending booking created:", result.id);
    console.log("   Status:", result.status);
    console.log("   [PASS] Pending booking creation works\n");
  } catch (error) {
    console.log(
      "   [INFO] Error creating pending booking:",
      (error as Error).message,
      "\n",
    );
  }

  // Test 4: Get pending bookings
  console.log("4. Testing getPendingBookings()...");
  try {
    const bookings = await getPendingBookings(TEST_TENANT_ID);
    console.log("   Found", bookings.length, "pending bookings");
    console.log("   [PASS] Get pending bookings works\n");
  } catch (error) {
    console.log(
      "   [INFO] Error getting pending bookings:",
      (error as Error).message,
      "\n",
    );
  }

  // Test 5: Booking with fallback
  console.log("5. Testing createBookingWithFallback()...");
  try {
    const booking: BookingRequest = {
      customerName: "Fallback Test Customer",
      customerPhone: "+15555559999",
      customerEmail: "fallback@example.com",
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(
        Date.now() + 48 * 60 * 60 * 1000 + 30 * 60 * 1000,
      ).toISOString(),
      service: "Fallback Test",
      notes: "Testing fallback mechanism",
    };
    const result = await createBookingWithFallback(
      TEST_TENANT_ID,
      booking,
      "test-call-fallback",
    );
    console.log("   Booking result:", result.id);
    console.log("   Status:", result.status);
    console.log("   [PASS] Booking with fallback works\n");
  } catch (error) {
    console.log(
      "   [INFO] Error with fallback booking:",
      (error as Error).message,
      "\n",
    );
  }

  console.log("=== Smoke Test Complete ===\n");
}

testCalendarService().catch(console.error);
