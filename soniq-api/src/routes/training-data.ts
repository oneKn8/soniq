import { Hono } from "hono";
import { queryOne, queryAll, queryCount } from "../services/database/client.js";
import { updateOne } from "../services/database/query-helpers.js";

const app = new Hono();

// Types for export formats
interface ShareGPTMessage {
  from: "system" | "human" | "gpt";
  value: string;
}

interface ShareGPTConversation {
  conversations: ShareGPTMessage[];
}

interface AlpacaEntry {
  instruction: string;
  input: string;
  output: string;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIEntry {
  messages: OpenAIMessage[];
}

interface ConversationLog {
  id: string;
  tenant_id: string;
  call_id: string | null;
  session_id: string;
  industry: string | null;
  scenario_type: string | null;
  language: string;
  messages: Array<{
    role: string;
    content: string;
    tool_name?: string;
    tool_result?: unknown;
  }>;
  quality_score: number | null;
  is_complete: boolean;
  has_tool_calls: boolean;
  has_escalation: boolean;
  outcome_success: boolean | null;
  turn_count: number;
  user_turns: number;
  assistant_turns: number;
  tool_calls_count: number;
  total_tokens_estimate: number | null;
  duration_seconds: number | null;
  reviewed: boolean;
  flagged: boolean;
  flag_reason: string | null;
  tags: string[];
  notes: string | null;
  exported_at: string | null;
  export_format: string | null;
  created_at: string;
  updated_at: string;
}

// List conversation logs with filtering
app.get("/:tenantId", async (c) => {
  try {
    const tenantId = c.req.param("tenantId");
    const {
      scenario,
      minQuality,
      reviewed,
      flagged,
      hasTools,
      limit = "50",
      offset = "0",
    } = c.req.query();

    // Build WHERE conditions
    const conditions: string[] = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (scenario) {
      conditions.push(`scenario_type = $${paramIndex++}`);
      params.push(scenario);
    }
    if (minQuality) {
      conditions.push(`quality_score >= $${paramIndex++}`);
      params.push(parseFloat(minQuality));
    }
    if (reviewed !== undefined) {
      conditions.push(`reviewed = $${paramIndex++}`);
      params.push(reviewed === "true");
    }
    if (flagged !== undefined) {
      conditions.push(`flagged = $${paramIndex++}`);
      params.push(flagged === "true");
    }
    if (hasTools !== undefined) {
      conditions.push(`has_tool_calls = $${paramIndex++}`);
      params.push(hasTools === "true");
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM conversation_logs ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || "0", 10);

    // Get data with pagination
    const data = await queryAll<ConversationLog>(
      `SELECT * FROM conversation_logs ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offsetNum],
    );

    return c.json({
      data,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Get single conversation log
app.get("/:tenantId/:id", async (c) => {
  try {
    const tenantId = c.req.param("tenantId");
    const id = c.req.param("id");

    const data = await queryOne<ConversationLog>(
      `SELECT * FROM conversation_logs WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id],
    );

    if (!data) {
      return c.json({ error: "Conversation log not found" }, 404);
    }

    return c.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Update conversation log (for review/flagging)
app.patch("/:tenantId/:id", async (c) => {
  try {
    const tenantId = c.req.param("tenantId");
    const id = c.req.param("id");
    const body = await c.req.json();

    const allowedFields = [
      "reviewed",
      "flagged",
      "flag_reason",
      "tags",
      "notes",
      "quality_score",
      "scenario_type",
    ];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    const data = await updateOne<ConversationLog>(
      "conversation_logs",
      updateData,
      { tenant_id: tenantId, id },
    );

    if (!data) {
      return c.json({ error: "Conversation log not found" }, 404);
    }

    return c.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Bulk review
app.post("/:tenantId/bulk-review", async (c) => {
  try {
    const tenantId = c.req.param("tenantId");
    const { ids, reviewed, flagged, tags } = await c.req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: "ids must be a non-empty array" }, 400);
    }

    const updateData: Record<string, unknown> = {};
    if (reviewed !== undefined) updateData.reviewed = reviewed;
    if (flagged !== undefined) updateData.flagged = flagged;
    if (tags !== undefined) updateData.tags = tags;

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    // Build UPDATE query with IN clause
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      setClauses.push(`${key} = $${paramIndex++}`);
      params.push(value);
    }

    params.push(tenantId);
    params.push(ids);

    const sql = `UPDATE conversation_logs
                 SET ${setClauses.join(", ")}
                 WHERE tenant_id = $${paramIndex++}
                 AND id = ANY($${paramIndex})`;

    const updated = await queryCount(sql, params);

    return c.json({ updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Export training data in various formats
app.get("/:tenantId/export/:format", async (c) => {
  try {
    const tenantId = c.req.param("tenantId");
    const format = c.req.param("format") as
      | "jsonl"
      | "sharegpt"
      | "alpaca"
      | "openai";
    const {
      minQuality = "0.7",
      scenario,
      hasTools,
      limit = "1000",
    } = c.req.query();

    // Build query for export-ready data
    const conditions: string[] = [
      "tenant_id = $1",
      "reviewed = true",
      "flagged = false",
      "is_complete = true",
      "quality_score >= $2",
    ];
    const params: unknown[] = [tenantId, parseFloat(minQuality)];
    let paramIndex = 3;

    if (scenario) {
      conditions.push(`scenario_type = $${paramIndex++}`);
      params.push(scenario);
    }
    if (hasTools !== undefined) {
      conditions.push(`has_tool_calls = $${paramIndex++}`);
      params.push(hasTools === "true");
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const data = await queryAll<ConversationLog>(
      `SELECT * FROM conversation_logs ${whereClause}
       ORDER BY quality_score DESC
       LIMIT $${paramIndex}`,
      [...params, parseInt(limit)],
    );

    if (!data || data.length === 0) {
      return c.json({ error: "No training data found matching criteria" }, 404);
    }

    const conversations = data;

    // Mark as exported
    const ids = conversations.map((d: ConversationLog) => d.id);
    await queryCount(
      `UPDATE conversation_logs
       SET exported_at = $1, export_format = $2
       WHERE id = ANY($3)`,
      [new Date().toISOString(), format, ids],
    );

    // Convert based on format
    let output: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "jsonl":
        output = conversations
          .map((conv: ConversationLog) =>
            JSON.stringify(convertToOpenAI(conv.messages)),
          )
          .join("\n");
        contentType = "application/jsonl";
        filename = `training_data_${tenantId}_${Date.now()}.jsonl`;
        break;

      case "sharegpt":
        output = JSON.stringify(
          conversations.map((conv: ConversationLog) =>
            convertToShareGPT(conv.messages),
          ),
          null,
          2,
        );
        contentType = "application/json";
        filename = `training_data_sharegpt_${tenantId}_${Date.now()}.json`;
        break;

      case "alpaca":
        const alpacaEntries: AlpacaEntry[] = [];
        for (const conv of conversations) {
          alpacaEntries.push(...convertToAlpaca(conv.messages));
        }
        output = JSON.stringify(alpacaEntries, null, 2);
        contentType = "application/json";
        filename = `training_data_alpaca_${tenantId}_${Date.now()}.json`;
        break;

      case "openai":
      default:
        output = JSON.stringify(
          conversations.map((conv: ConversationLog) =>
            convertToOpenAI(conv.messages),
          ),
          null,
          2,
        );
        contentType = "application/json";
        filename = `training_data_openai_${tenantId}_${Date.now()}.json`;
        break;
    }

    c.header("Content-Type", contentType);
    c.header("Content-Disposition", `attachment; filename="${filename}"`);

    return c.body(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Stats endpoint
app.get("/:tenantId/stats", async (c) => {
  try {
    const tenantId = c.req.param("tenantId");

    const data = await queryAll<{
      scenario_type: string | null;
      quality_score: number | null;
      reviewed: boolean;
      flagged: boolean;
      has_tool_calls: boolean;
      turn_count: number;
    }>(
      `SELECT scenario_type, quality_score, reviewed, flagged, has_tool_calls, turn_count
       FROM conversation_logs
       WHERE tenant_id = $1`,
      [tenantId],
    );

    if (!data) {
      return c.json({ error: "Failed to fetch stats" }, 500);
    }

    type StatsRow = {
      scenario_type: string | null;
      quality_score: number | null;
      reviewed: boolean;
      flagged: boolean;
      has_tool_calls: boolean;
      turn_count: number;
    };

    const rows = data as StatsRow[];

    const stats = {
      total: rows.length,
      reviewed: rows.filter((d: StatsRow) => d.reviewed).length,
      flagged: rows.filter((d: StatsRow) => d.flagged).length,
      exportReady: rows.filter(
        (d: StatsRow) =>
          d.reviewed && !d.flagged && (d.quality_score ?? 0) >= 0.7,
      ).length,
      avgQuality:
        rows.reduce(
          (sum: number, d: StatsRow) => sum + (d.quality_score || 0),
          0,
        ) / rows.length || 0,
      avgTurns:
        rows.reduce(
          (sum: number, d: StatsRow) => sum + (d.turn_count || 0),
          0,
        ) / rows.length || 0,
      byScenario: {} as Record<string, number>,
      withToolCalls: rows.filter((d: StatsRow) => d.has_tool_calls).length,
    };

    for (const conv of rows) {
      const scenario = conv.scenario_type || "unknown";
      stats.byScenario[scenario] = (stats.byScenario[scenario] || 0) + 1;
    }

    return c.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Helper: Convert to OpenAI format (for fine-tuning)
function convertToOpenAI(
  messages: Array<{
    role: string;
    content: string;
    tool_name?: string;
    tool_result?: unknown;
  }>,
): OpenAIEntry {
  const openaiMessages: OpenAIMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "tool") continue; // Skip tool messages for basic format

    openaiMessages.push({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    });
  }

  return { messages: openaiMessages };
}

// Helper: Convert to ShareGPT format
function convertToShareGPT(
  messages: Array<{ role: string; content: string }>,
): ShareGPTConversation {
  const conversations: ShareGPTMessage[] = [];

  for (const msg of messages) {
    let from: "system" | "human" | "gpt";
    switch (msg.role) {
      case "user":
        from = "human";
        break;
      case "assistant":
        from = "gpt";
        break;
      case "system":
        from = "system";
        break;
      default:
        continue; // Skip tool messages
    }

    conversations.push({ from, value: msg.content });
  }

  return { conversations };
}

// Helper: Convert to Alpaca format (instruction/input/output)
function convertToAlpaca(
  messages: Array<{ role: string; content: string }>,
): AlpacaEntry[] {
  const entries: AlpacaEntry[] = [];
  let systemPrompt = "";

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.role === "system") {
      systemPrompt = msg.content;
      continue;
    }

    if (msg.role === "user" && i + 1 < messages.length) {
      const nextMsg = messages[i + 1];
      if (nextMsg.role === "assistant") {
        entries.push({
          instruction: systemPrompt || "You are a helpful AI voice assistant.",
          input: msg.content,
          output: nextMsg.content,
        });
      }
    }
  }

  return entries;
}

export default app;
