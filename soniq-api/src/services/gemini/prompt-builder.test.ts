import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./chat.js";

const personality = { tone: "friendly", verbosity: "concise", empathy: "high" };

describe("buildSystemPrompt (universal prompt from tenant config)", () => {
  it("interpolates the agent and business names into the role section", () => {
    const prompt = buildSystemPrompt("Ava", "Blue Bottle Coffee", personality);
    expect(prompt).toContain("You are Ava, the receptionist at Blue Bottle Coffee.");
    expect(prompt).toContain("Business: Blue Bottle Coffee");
    // Token placeholders must be fully replaced.
    expect(prompt).not.toContain("{agentName}");
    expect(prompt).not.toContain("{businessName}");
  });

  it("reflects personality selections (tone/verbosity/empathy) in the prompt", () => {
    const prompt = buildSystemPrompt("Ava", "Acme", {
      tone: "professional",
      verbosity: "detailed",
      empathy: "low",
    });
    expect(prompt).toContain("professional and businesslike");
    expect(prompt).toContain("thorough explanations");
    expect(prompt).toContain("Focus on efficiency");
  });

  it("always includes the universal critical rules and call flow", () => {
    const prompt = buildSystemPrompt("Ava", "Acme", personality);
    expect(prompt).toContain("## CRITICAL RULES");
    expect(prompt).toContain("NEVER say you are an AI");
    expect(prompt).toContain("## Call Flow");
  });

  it("appends only instruction blocks for enabled capabilities", () => {
    const prompt = buildSystemPrompt("Ava", "Acme", personality, {
      capabilities: ["appointment_booking", "faq"],
    });
    expect(prompt).toContain("## Booking Appointments");
    expect(prompt).toContain("## Answering Questions");
    // A capability NOT enabled must not leak its block.
    expect(prompt).not.toContain("## Taking Orders and Requests");
  });

  it("ignores unknown capability ids without throwing", () => {
    const prompt = buildSystemPrompt("Ava", "Acme", personality, {
      capabilities: ["not_a_real_capability", "order_taking"],
    });
    expect(prompt).toContain("## Taking Orders and Requests");
  });

  it("includes optional context (location, timezone, escalation, custom instructions) when provided", () => {
    const prompt = buildSystemPrompt("Ava", "Acme", personality, {
      locationAddress: "123 Main St",
      locationCity: "Springfield",
      timezone: "America/New_York",
      escalationPhone: "+15551234567",
      customInstructions: "We are cash only.",
    });
    expect(prompt).toContain("Location: 123 Main St, Springfield");
    expect(prompt).toContain("Timezone: America/New_York");
    expect(prompt).toContain("Transfer phone: +15551234567");
    expect(prompt).toContain("## Business-Specific Instructions");
    expect(prompt).toContain("We are cash only.");
  });

  it("emits the no-transfer fallback when no escalation phone is set", () => {
    const prompt = buildSystemPrompt("Ava", "Acme", personality);
    expect(prompt).toContain("No transfer phone configured");
  });

  it("renders operating hours when a schedule is supplied", () => {
    const prompt = buildSystemPrompt("Ava", "Acme", personality, {
      operatingHours: {
        schedule: [{ day: "Monday", open: "09:00", close: "17:00" }],
        holidays: ["Christmas"],
      },
    });
    expect(prompt).toContain("## Operating Hours");
    expect(prompt).toContain("Monday: 09:00 - 17:00");
    expect(prompt).toContain("Closed on: Christmas");
  });
});
