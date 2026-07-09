import { describe, it, expect } from "vitest";
import {
  getUniversalCapabilities,
  getDefaultCapabilities,
  getCapabilityById,
  UNIVERSAL_CAPABILITY_DEFS,
} from "./capabilities";

describe("getUniversalCapabilities", () => {
  it("returns the full flat capability set shared by every tenant", () => {
    const caps = getUniversalCapabilities();
    expect(caps).toBe(UNIVERSAL_CAPABILITY_DEFS);
    expect(caps.map((c) => c.id)).toEqual([
      "appointment_booking",
      "order_taking",
      "faq",
      "call_transfer",
      "voicemail",
      "callbacks",
    ]);
  });

  it("gives every capability an id, label, description and category", () => {
    for (const cap of getUniversalCapabilities()) {
      expect(cap.id.length).toBeGreaterThan(0);
      expect(cap.label.length).toBeGreaterThan(0);
      expect(cap.description.length).toBeGreaterThan(0);
      expect(["core", "communication"]).toContain(cap.category);
    }
  });

  it("uses unique capability ids", () => {
    const ids = getUniversalCapabilities().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getDefaultCapabilities", () => {
  it("enables every capability except order_taking by default", () => {
    const defaults = getDefaultCapabilities();
    expect(defaults).toEqual([
      "appointment_booking",
      "faq",
      "call_transfer",
      "voicemail",
      "callbacks",
    ]);
    expect(defaults).not.toContain("order_taking");
  });

  it("returns a fresh array each call so callers cannot mutate the source", () => {
    const a = getDefaultCapabilities();
    const b = getDefaultCapabilities();
    expect(a).not.toBe(b);

    a.push("order_taking");
    expect(getDefaultCapabilities()).not.toContain("order_taking");
  });

  it("only lists ids that exist in the universal capability set", () => {
    const known = new Set(UNIVERSAL_CAPABILITY_DEFS.map((c) => c.id));
    for (const id of getDefaultCapabilities()) {
      expect(known.has(id)).toBe(true);
    }
  });
});

describe("getCapabilityById", () => {
  it("resolves a known capability by id", () => {
    const cap = getCapabilityById("appointment_booking");
    expect(cap).toBeDefined();
    expect(cap?.label).toBe("Appointment Booking");
    expect(cap?.questions.map((q) => q.id)).toContain("default_duration");
  });

  it("returns undefined for an unknown capability id", () => {
    expect(getCapabilityById("does_not_exist")).toBeUndefined();
    expect(getCapabilityById("")).toBeUndefined();
  });

  it("returns capabilities that carry no questions where none are defined", () => {
    const transfer = getCapabilityById("call_transfer");
    expect(transfer?.questions).toEqual([]);
  });
});
