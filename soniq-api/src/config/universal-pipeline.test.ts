import { describe, it, expect } from "vitest";
import {
  getPipelineConfig,
  getStages,
  getTaskTypes,
  getAllValidStages,
  getAllValidTaskTypes,
} from "./universal-pipeline.js";

describe("universal-pipeline config", () => {
  it("returns the universal default pipeline with the expected stages", () => {
    const config = getPipelineConfig();
    expect(config.dealLabel).toBe("Deal");
    expect(config.defaultStage).toBe("new");
    expect(config.completedStage).toBe("won");
    expect(config.cancelledStage).toBe("lost");

    const stageIds = config.stages.map((s) => s.id);
    expect(stageIds).toEqual(["new", "qualified", "won", "lost"]);
  });

  it("marks terminal stages correctly (won/lost terminal, new/qualified not)", () => {
    const terminal = Object.fromEntries(
      getStages().map((s) => [s.id, s.isTerminal]),
    );
    expect(terminal.new).toBe(false);
    expect(terminal.qualified).toBe(false);
    expect(terminal.won).toBe(true);
    expect(terminal.lost).toBe(true);
  });

  it("defaultStage, completedStage, cancelledStage are all real stage ids", () => {
    const config = getPipelineConfig();
    const ids = new Set(config.stages.map((s) => s.id));
    expect(ids.has(config.defaultStage)).toBe(true);
    expect(ids.has(config.completedStage)).toBe(true);
    expect(ids.has(config.cancelledStage)).toBe(true);
  });

  it("exposes the universal task types", () => {
    const values = getTaskTypes().map((t) => t.value);
    expect(values).toContain("follow_up");
    expect(values).toContain("call_back");
    expect(values).toContain("custom");
  });

  it("getAllValidStages returns a Set of every stage id", () => {
    const stages = getAllValidStages();
    expect(stages).toBeInstanceOf(Set);
    expect(stages.has("new")).toBe(true);
    expect(stages.has("won")).toBe(true);
    expect(stages.has("nonexistent")).toBe(false);
    expect(stages.size).toBe(4);
  });

  it("getAllValidStages is memoized (returns the same Set instance)", () => {
    expect(getAllValidStages()).toBe(getAllValidStages());
  });

  it("getAllValidTaskTypes returns a Set of every task type value", () => {
    const types = getAllValidTaskTypes();
    expect(types.has("follow_up")).toBe(true);
    expect(types.has("meeting")).toBe(true);
    expect(types.has("not-a-type")).toBe(false);
  });
});
