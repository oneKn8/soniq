import { describe, it, expect } from "vitest";
import {
  useTerminology,
  createDefaultConfig,
  UNIVERSAL_TERMINOLOGY,
  UNIVERSAL_PIPELINE_STAGES,
  UNIVERSAL_TASK_TYPES,
} from "./terminology";

describe("useTerminology", () => {
  it("returns the fixed universal labels regardless of tenant", () => {
    const t = useTerminology();

    expect(t.customerLabel).toBe("Customer");
    expect(t.customerPluralLabel).toBe("Customers");
    expect(t.transactionLabel).toBe("Booking");
    expect(t.transactionPluralLabel).toBe("Bookings");
    expect(t.dealLabel).toBe("Deal");
    expect(t.dealPluralLabel).toBe("Deals");
    expect(t.availabilityLabel).toBe("Availability");
    expect(t.revenueLabel).toBe("Revenue");
  });

  it("maps directly onto the frozen UNIVERSAL_TERMINOLOGY source of truth", () => {
    const t = useTerminology();

    expect(t.customerLabel).toBe(UNIVERSAL_TERMINOLOGY.customer);
    expect(t.transactionLabel).toBe(UNIVERSAL_TERMINOLOGY.booking);
    expect(t.dealPluralLabel).toBe(UNIVERSAL_TERMINOLOGY.dealPlural);
    expect(t.revenueLabel).toBe(UNIVERSAL_TERMINOLOGY.revenue);
  });

  it("is deterministic: repeated calls return identical label values", () => {
    const a = useTerminology();
    const b = useTerminology();

    expect(a.customerLabel).toBe(b.customerLabel);
    expect(a.transactionPluralLabel).toBe(b.transactionPluralLabel);
    expect(a.pipelineStages).toEqual(b.pipelineStages);
    expect(a.taskTypes).toEqual(b.taskTypes);
  });

  it("exposes the universal pipeline stages and task types", () => {
    const t = useTerminology();

    expect(t.pipelineStages).toBe(UNIVERSAL_PIPELINE_STAGES);
    expect(t.taskTypes).toBe(UNIVERSAL_TASK_TYPES);
  });
});

describe("UNIVERSAL_PIPELINE_STAGES", () => {
  it("defines exactly the four canonical stages in order", () => {
    expect(UNIVERSAL_PIPELINE_STAGES.map((s) => s.id)).toEqual([
      "new",
      "qualified",
      "won",
      "lost",
    ]);
  });

  it("marks only won and lost as terminal stages", () => {
    const terminal = UNIVERSAL_PIPELINE_STAGES.filter((s) => s.isTerminal).map(
      (s) => s.id,
    );
    expect(terminal).toEqual(["won", "lost"]);
  });

  it("gives every stage a label plus color tokens", () => {
    for (const stage of UNIVERSAL_PIPELINE_STAGES) {
      expect(stage.label.length).toBeGreaterThan(0);
      expect(stage.color).toMatch(/^text-/);
      expect(stage.bgColor).toMatch(/^bg-/);
      expect(stage.borderColor).toMatch(/^border-/);
    }
  });
});

describe("UNIVERSAL_TASK_TYPES", () => {
  it("exposes the six universal task types with unique values", () => {
    const values = UNIVERSAL_TASK_TYPES.map((t) => t.value);
    expect(values).toEqual([
      "follow_up",
      "call_back",
      "email",
      "meeting",
      "review",
      "custom",
    ]);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("createDefaultConfig", () => {
  it("produces an unconfigured, industry-agnostic default config", () => {
    const cfg = createDefaultConfig();

    expect(cfg.industry).toBe("general");
    expect(cfg.agentName).toBe("Soniq");
    expect(cfg.isConfigured).toBe(false);
    expect(cfg.userRole).toBe("developer");
  });

  it("honors the requested user role", () => {
    expect(createDefaultConfig("admin").userRole).toBe("admin");
    expect(createDefaultConfig("staff").userRole).toBe("staff");
  });

  it("returns fresh nested objects that are not shared between instances", () => {
    const a = createDefaultConfig();
    const b = createDefaultConfig();

    expect(a.agentVoice).not.toBe(b.agentVoice);
    expect(a.greetings).not.toBe(b.greetings);
    expect(a.pricing.fees).not.toBe(b.pricing.fees);

    a.agentVoice.voiceName = "Mutated";
    expect(b.agentVoice.voiceName).toBe("Nova");
  });

  it("seeds sane escalation defaults", () => {
    const cfg = createDefaultConfig();
    expect(cfg.escalation.enabled).toBe(true);
    expect(cfg.escalation.triggers.map((t) => t.id)).toEqual([
      "angry",
      "emergency",
      "complex",
    ]);
  });
});
