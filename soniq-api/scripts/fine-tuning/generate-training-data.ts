/**
 * Generate Training Data for LLM Fine-Tuning
 *
 * Extracts successful function calls from your call history
 * and formats them for fine-tuning on Together AI/Modal
 *
 * Usage: npx tsx scripts/fine-tuning/generate-training-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load environment
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TrainingExample {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }>;
  }>;
}

interface FunctionCallLog {
  id: string;
  tenant_id: string;
  call_sid: string;
  function_name: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown>;
  success: boolean;
  user_message: string;
}

interface Tenant {
  id: string;
  business_name: string;
  industry: string;
  agent_name: string;
  agent_personality: {
    tone: string;
    verbosity: string;
    empathy: string;
  };
}

// Build system prompt (simplified version for training)
function buildSystemPrompt(tenant: Tenant): string {
  return `You are ${tenant.agent_name}, the AI voice assistant for ${tenant.business_name}.
You help callers with inquiries, bookings, and orders. Keep responses concise for voice.
Industry: ${tenant.industry}
Tone: ${tenant.agent_personality.tone}

Available tools:
- check_availability: Check available slots for a date
- create_booking: Create an appointment booking
- create_order: Place a food order (pickup or delivery)
- transfer_to_human: Transfer to human staff
- end_call: End the conversation`;
}

async function generateTrainingData(): Promise<void> {
  console.log("Fetching successful function calls from database...");

  // Query successful function calls with tenant info
  const { data: calls, error } = await supabase
    .from("llm_function_calls")
    .select(
      `
      id,
      tenant_id,
      call_sid,
      function_name,
      arguments,
      result,
      success,
      user_message,
      tenants!inner (
        id,
        business_name,
        industry,
        agent_name,
        agent_personality
      )
    `,
    )
    .eq("success", true)
    .not("user_message", "is", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("Error fetching data:", error);
    process.exit(1);
  }

  if (!calls || calls.length === 0) {
    console.log("No function call data found. Run some calls first!");
    console.log("\nTo generate synthetic training data, use:");
    console.log("npx tsx scripts/fine-tuning/generate-synthetic-data.ts");
    process.exit(0);
  }

  console.log(`Found ${calls.length} successful function calls`);

  const trainingExamples: TrainingExample[] = [];

  for (const call of calls) {
    const tenant = (call as unknown as { tenants: Tenant }).tenants;
    if (!tenant) continue;

    // Create training example
    const example: TrainingExample = {
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(tenant),
        },
        {
          role: "user",
          content: call.user_message,
        },
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: `call_${call.id.substring(0, 8)}`,
              type: "function",
              function: {
                name: call.function_name,
                arguments: JSON.stringify(call.arguments),
              },
            },
          ],
        },
      ],
    };

    trainingExamples.push(example);
  }

  // Split into train/validation sets (90/10)
  const shuffled = trainingExamples.sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * 0.9);
  const trainSet = shuffled.slice(0, splitIndex);
  const valSet = shuffled.slice(splitIndex);

  // Write JSONL files
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const trainPath = path.join(outputDir, "train.jsonl");
  const valPath = path.join(outputDir, "validation.jsonl");

  fs.writeFileSync(
    trainPath,
    trainSet.map((ex) => JSON.stringify(ex)).join("\n"),
  );
  fs.writeFileSync(valPath, valSet.map((ex) => JSON.stringify(ex)).join("\n"));

  console.log(`\nGenerated training data:`);
  console.log(`  Training examples: ${trainSet.length}`);
  console.log(`  Validation examples: ${valSet.length}`);
  console.log(`\nOutput files:`);
  console.log(`  ${trainPath}`);
  console.log(`  ${valPath}`);

  // Print function distribution
  const fnCounts = new Map<string, number>();
  for (const ex of trainingExamples) {
    const fn = ex.messages[2].tool_calls?.[0].function.name;
    if (fn) {
      fnCounts.set(fn, (fnCounts.get(fn) || 0) + 1);
    }
  }

  console.log("\nFunction distribution:");
  for (const [fn, count] of fnCounts) {
    console.log(
      `  ${fn}: ${count} (${((count / trainingExamples.length) * 100).toFixed(1)}%)`,
    );
  }

  console.log("\nNext steps:");
  console.log(
    "1. Upload to Together AI: together files upload output/train.jsonl",
  );
  console.log("2. Start fine-tuning job (see README.md for details)");
}

// Run
generateTrainingData().catch(console.error);
