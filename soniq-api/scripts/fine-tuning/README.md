# LLM Fine-Tuning Guide for Voice Agent Function Calling

## Understanding the Landscape

**Groq is an inference platform, NOT a fine-tuning platform.**

To use a fine-tuned model, you need to:

1. Fine-tune elsewhere (Together AI, Modal, Replicate, Fireworks)
2. Deploy the fine-tuned model on a compatible inference platform
3. Switch your API calls to that platform

## Recommended Path: Together AI

Together AI supports:

- Fine-tuning Llama 3.1/3.3 models
- Native function calling
- API compatible with Groq/OpenAI
- Reasonable pricing ($2-5 per million tokens for fine-tuned models)

## When to Fine-Tune (vs Prompt Engineering)

| Approach               | Best For                       | Expected Improvement |
| ---------------------- | ------------------------------ | -------------------- |
| **Prompt Engineering** | 80% of cases                   | 30-50% accuracy gain |
| **Few-shot Examples**  | Domain-specific responses      | 20-30% accuracy gain |
| **Fine-tuning**        | High-volume, specific patterns | 50-80% accuracy gain |

**Fine-tune when:**

- You have 1000+ labeled examples of tool calls
- Prompt engineering hit its ceiling
- You need consistent formatting/behavior
- Latency/cost of 70B model is too high (fine-tune 8B instead)

## Training Data Format

For function calling fine-tuning, use this format:

```jsonl
{
  "messages": [
    {
      "role": "system",
      "content": "You are a pizza ordering assistant..."
    },
    {
      "role": "user",
      "content": "I'd like a large pepperoni for delivery to 123 Main St"
    },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_1",
          "type": "function",
          "function": {
            "name": "create_order",
            "arguments": "{\"customer_name\": \"caller\", \"order_type\": \"delivery\", \"items\": \"Large Pepperoni Pizza\", \"delivery_address\": \"123 Main St\"}"
          }
        }
      ]
    }
  ]
}
```

## Data Generation

Run the data generation script to create training data from your call logs:

```bash
npx tsx scripts/fine-tuning/generate-training-data.ts
```

This will:

1. Query your Supabase database for completed calls with transcripts
2. Extract successful tool calls
3. Format them for fine-tuning
4. Output to `training_data.jsonl`

## Fine-Tuning with Together AI

1. **Install Together CLI:**

```bash
pip install together
```

2. **Upload training data:**

```bash
together files upload training_data.jsonl
```

3. **Start fine-tuning job:**

```bash
together fine-tuning create \
  --training-file file-xxx \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --n-epochs 3 \
  --learning-rate 1e-5 \
  --suffix "voice-agent-v1"
```

4. **Monitor progress:**

```bash
together fine-tuning list
together fine-tuning retrieve ft-xxx
```

5. **Use fine-tuned model:**
   Update your `.env`:

```
GROQ_TOOL_MODEL=your-org/Llama-3.1-8B-Instruct-voice-agent-v1
LLM_PROVIDER=together
TOGETHER_API_KEY=your-key
```

## Cost Estimates

| Model         | Fine-tuning Cost  | Inference Cost            |
| ------------- | ----------------- | ------------------------- |
| Llama 3.1 8B  | ~$0.30/1K samples | $0.20/$0.20 per 1M tokens |
| Llama 3.1 70B | ~$2.00/1K samples | $0.90/$0.90 per 1M tokens |

For 5,000 training samples on 8B: ~$1.50 fine-tuning cost

## Integration Code

After fine-tuning, update [client.ts](../../src/services/groq/client.ts) to support Together AI:

```typescript
import Together from "together-ai";

const provider = process.env.LLM_PROVIDER || "groq";

export const llmClient =
  provider === "together"
    ? new Together({ apiKey: process.env.TOGETHER_API_KEY })
    : new Groq({ apiKey: process.env.GROQ_API_KEY });
```

## Evaluation

After fine-tuning, evaluate with:

```bash
npx tsx scripts/fine-tuning/evaluate-model.ts
```

This compares:

- Tool selection accuracy
- Parameter extraction accuracy
- Response latency
- Cost per call
