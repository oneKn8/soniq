import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  ToolExecutionContext,
  CreateOrderArgs,
} from "../../types/voice.js";

// Mock all DB / contact access so no real database is touched.
const queryAll = vi.fn();
const query = vi.fn();
const queryOne = vi.fn();
const insertOne = vi.fn();
const findOrCreateByPhone = vi.fn();

vi.mock("../database/client.js", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
  queryAll: (...a: unknown[]) => queryAll(...a),
}));

vi.mock("../database/query-helpers.js", () => ({
  insertOne: (...a: unknown[]) => insertOne(...a),
}));

vi.mock("../contacts/contact-service.js", () => ({
  findOrCreateByPhone: (...a: unknown[]) => findOrCreateByPhone(...a),
}));

// Import AFTER mocks are registered.
const { executeTool, executeCreateOrder } = await import("./tools.js");

const context: ToolExecutionContext = {
  tenantId: "tenant-123",
  callSid: "CA-abc",
  callerPhone: "+14155552671",
  escalationPhone: "+15550000000",
};

const validOrder: CreateOrderArgs = {
  customer_name: "Jordan",
  request_summary: "Two large pepperoni pizzas",
  fulfillment_type: "pickup",
};

beforeEach(() => {
  queryAll.mockReset();
  query.mockReset();
  queryOne.mockReset();
  insertOne.mockReset();
  findOrCreateByPhone.mockReset();
});

describe("executeTool dispatch", () => {
  it("throws on an unknown tool name", async () => {
    await expect(executeTool("nope", {}, context)).rejects.toThrow(
      /Unknown tool: nope/,
    );
  });

  it("dispatches a known tool (end_call) without touching the DB", async () => {
    const result = (await executeTool("end_call", { reason: "done" }, context)) as {
      ended: boolean;
    };
    expect(result.ended).toBe(true);
    expect(insertOne).not.toHaveBeenCalled();
  });

  it("routes create_order through the order path (gated) via executeTool", async () => {
    // No enabled capabilities -> gated off.
    queryAll.mockResolvedValue([]);
    const result = (await executeTool(
      "create_order",
      validOrder as unknown as Record<string, unknown>,
      context,
    )) as { success: boolean };
    expect(result.success).toBe(false);
    expect(queryAll).toHaveBeenCalledTimes(1);
  });
});

describe("executeCreateOrder capability gating", () => {
  it("rejects when the order_taking capability is NOT enabled and never inserts", async () => {
    queryAll.mockResolvedValue([]); // no capabilities enabled
    const result = await executeCreateOrder(validOrder, context);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not set up to take orders/i);
    expect(insertOne).not.toHaveBeenCalled();
  });

  it("proceeds when order_taking is enabled and returns an OR- confirmation code", async () => {
    queryAll.mockResolvedValue([{ capability: "order_taking" }]);
    insertOne.mockResolvedValue({ id: "order-1" });

    const result = await executeCreateOrder(validOrder, context);

    expect(result.success).toBe(true);
    expect(result.order_id).toBe("order-1");
    expect(result.confirmation_code).toMatch(/^OR-[A-Z0-9]{6}$/);
    expect(insertOne).toHaveBeenCalledTimes(1);
    // Inserted into the bookings table for the right tenant.
    const [table, row] = insertOne.mock.calls[0];
    expect(table).toBe("bookings");
    expect((row as Record<string, unknown>).tenant_id).toBe("tenant-123");
  });

  it("accepts legacy capability aliases (e.g. 'takeaway') as order_taking", async () => {
    queryAll.mockResolvedValue([{ capability: "takeaway" }]);
    insertOne.mockResolvedValue({ id: "order-2" });
    const result = await executeCreateOrder(validOrder, context);
    expect(result.success).toBe(true);
  });

  it("rejects a delivery order that is missing an address (validation) without inserting", async () => {
    queryAll.mockResolvedValue([{ capability: "order_taking" }]);
    const result = await executeCreateOrder(
      { ...validOrder, fulfillment_type: "delivery" },
      context,
    );
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/delivery address/i);
    expect(insertOne).not.toHaveBeenCalled();
  });

  it("rejects a placeholder customer name after passing the gate", async () => {
    queryAll.mockResolvedValue([{ capability: "order_taking" }]);
    const result = await executeCreateOrder(
      { ...validOrder, customer_name: "unknown" },
      context,
    );
    expect(result.success).toBe(false);
    expect(insertOne).not.toHaveBeenCalled();
  });

  it("fails closed (no order) when the capability lookup query throws", async () => {
    queryAll.mockRejectedValue(new Error("db down"));
    const result = await executeCreateOrder(validOrder, context);
    expect(result.success).toBe(false);
    expect(insertOne).not.toHaveBeenCalled();
  });
});
