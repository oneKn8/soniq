"use client";

import React, { useCallback, useState } from "react";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  ChevronRight,
  Wand2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// QUESTIONNAIRE CONFIG
// ============================================================================

interface QuestionOption {
  value: string;
  label: string;
}

interface Question {
  id: string;
  question: string;
  description?: string;
  type: "select" | "multiselect" | "text" | "textarea";
  options?: QuestionOption[];
  placeholder?: string;
  industries?: string[]; // If specified, only show for these industries
}

const QUESTIONS: Question[] = [
  {
    id: "primary_goal",
    question: "What is the primary goal of your voice agent?",
    description: "This helps us tailor the agent's behavior",
    type: "select",
    options: [
      { value: "booking", label: "Schedule appointments/reservations" },
      { value: "support", label: "Answer customer questions" },
      { value: "sales", label: "Handle orders and sales" },
      { value: "hybrid", label: "All of the above" },
    ],
  },
  {
    id: "call_volume",
    question: "How would you describe your typical call volume?",
    type: "select",
    options: [
      { value: "low", label: "Low (under 50 calls/day)" },
      { value: "medium", label: "Medium (50-200 calls/day)" },
      { value: "high", label: "High (200+ calls/day)" },
    ],
  },
  {
    id: "customer_type",
    question: "Who are your typical callers?",
    type: "select",
    options: [
      { value: "new", label: "Mostly new customers" },
      { value: "returning", label: "Mostly returning customers" },
      { value: "mixed", label: "A mix of both" },
    ],
  },
  {
    id: "services",
    question: "What services or products should the agent know about?",
    description: "List your main offerings (one per line)",
    type: "textarea",
    placeholder:
      "Example:\nStandard Room - $99/night\nDeluxe Suite - $199/night\nPenthouse - $399/night",
  },
  {
    id: "special_instructions",
    question: "Are there any special instructions or rules?",
    description: "Things the agent should always or never do",
    type: "textarea",
    placeholder:
      "Example:\n- Always mention our free parking\n- Never quote exact prices for custom orders\n- Transfer to manager if caller is upset",
  },
  {
    id: "faq_items",
    question: "What are the most common questions callers ask?",
    description: "List questions and their answers",
    type: "textarea",
    placeholder:
      "Q: What are your hours?\nA: We're open Monday-Friday 9am-5pm\n\nQ: Do you accept walk-ins?\nA: Yes, but appointments are recommended",
  },
  {
    id: "booking_requirements",
    question: "What information do you need to complete a booking?",
    type: "multiselect",
    options: [
      { value: "name", label: "Full name" },
      { value: "phone", label: "Phone number" },
      { value: "email", label: "Email address" },
      { value: "date", label: "Preferred date/time" },
      { value: "party_size", label: "Number of guests/party size" },
      { value: "special_requests", label: "Special requests" },
    ],
    industries: [
      "hotel",
      "motel",
      "restaurant",
      "medical",
      "dental",
      "salon",
      "auto_service",
    ],
  },
  {
    id: "payment_policy",
    question: "How do you handle payments?",
    type: "select",
    options: [
      { value: "none", label: "No payment over phone" },
      { value: "deposit", label: "Collect deposit/card on file" },
      { value: "full", label: "Full payment required" },
      { value: "varies", label: "Depends on service" },
    ],
  },
  {
    id: "cancellation_policy",
    question: "What is your cancellation policy?",
    type: "text",
    placeholder: "e.g., 24-hour notice required, $50 cancellation fee",
  },
];

// ============================================================================
// PROMPT GENERATOR
// ============================================================================

function generateCustomInstructions(
  answers: Record<string, string | string[]>,
  _industry: string,
  _businessName: string,
): string {
  const lines: string[] = [];

  // Primary goal
  if (answers.primary_goal) {
    const goalMap: Record<string, string> = {
      booking:
        "Focus primarily on helping callers schedule appointments and make reservations.",
      support:
        "Focus primarily on answering customer questions and providing helpful information.",
      sales:
        "Focus primarily on processing orders and assisting with purchases.",
      hybrid:
        "Balance between scheduling, answering questions, and processing orders as needed.",
    };
    lines.push(goalMap[answers.primary_goal as string] || "");
  }

  // Services
  if (answers.services) {
    lines.push("\n## Available Services/Products");
    lines.push(answers.services as string);
  }

  // Special instructions
  if (answers.special_instructions) {
    lines.push("\n## Special Instructions");
    lines.push(answers.special_instructions as string);
  }

  // FAQ
  if (answers.faq_items) {
    lines.push("\n## Frequently Asked Questions");
    lines.push(answers.faq_items as string);
  }

  // Booking requirements
  if (
    answers.booking_requirements &&
    Array.isArray(answers.booking_requirements)
  ) {
    const reqLabels: Record<string, string> = {
      name: "full name",
      phone: "phone number",
      email: "email address",
      date: "preferred date and time",
      party_size: "number of guests",
      special_requests: "any special requests",
    };
    const reqs = (answers.booking_requirements as string[])
      .map((r) => reqLabels[r])
      .filter(Boolean);
    if (reqs.length > 0) {
      lines.push(
        `\n## Booking Requirements\nWhen booking, always collect: ${reqs.join(", ")}.`,
      );
    }
  }

  // Payment policy
  if (answers.payment_policy && answers.payment_policy !== "none") {
    const paymentMap: Record<string, string> = {
      deposit: "Collect a deposit or card on file to hold reservations.",
      full: "Full payment is required at time of booking.",
      varies:
        "Payment requirements vary by service - ask the caller for details.",
    };
    if (paymentMap[answers.payment_policy as string]) {
      lines.push(
        `\n## Payment Policy\n${paymentMap[answers.payment_policy as string]}`,
      );
    }
  }

  // Cancellation policy
  if (answers.cancellation_policy) {
    lines.push(`\n## Cancellation Policy\n${answers.cancellation_policy}`);
  }

  return lines.filter(Boolean).join("\n").trim();
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function InstructionsTab() {
  const { tenant, isLoading, saveStatus, error, updateSettings } =
    useTenantConfig();

  const [activeSection, setActiveSection] = useState<
    "questionnaire" | "manual"
  >("questionnaire");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [customInstructions, setCustomInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync from tenant on tenant change (render-time, React recommended pattern)
  const [prevTenantId, setPrevTenantId] = useState<string | null>(null);
  if (tenant && tenant.id !== prevTenantId) {
    setPrevTenantId(tenant.id);
    if (tenant.custom_instructions) {
      setCustomInstructions(tenant.custom_instructions);
    }
    if (tenant.questionnaire_answers) {
      setAnswers(
        tenant.questionnaire_answers as Record<string, string | string[]>,
      );
    }
  }

  // Update answer
  const updateAnswer = useCallback(
    (questionId: string, value: string | string[]) => {
      const newAnswers = { ...answers, [questionId]: value };
      setAnswers(newAnswers);
      updateSettings({ questionnaire_answers: newAnswers });
    },
    [answers, updateSettings],
  );

  // Toggle multiselect option
  const toggleMultiselect = useCallback(
    (questionId: string, optionValue: string) => {
      const current = (answers[questionId] as string[]) || [];
      const newValue = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      updateAnswer(questionId, newValue);
    },
    [answers, updateAnswer],
  );

  // Generate instructions from questionnaire
  const handleGenerate = useCallback(() => {
    if (!tenant) return;

    setIsGenerating(true);
    // Simulate a brief delay for better UX
    setTimeout(() => {
      const generated = generateCustomInstructions(
        answers,
        tenant.industry,
        tenant.business_name,
      );
      setCustomInstructions(generated);
      updateSettings({
        custom_instructions: generated,
        questionnaire_answers: answers,
      });
      setIsGenerating(false);
      setActiveSection("manual");
    }, 500);
  }, [answers, tenant, updateSettings]);

  // Save manual instructions on blur
  const handleSaveInstructions = useCallback(() => {
    updateSettings({ custom_instructions: customInstructions || undefined });
  }, [customInstructions, updateSettings]);

  if (isLoading || !tenant) return null;

  const industry = tenant.industry;

  // Filter questions by industry
  const filteredQuestions = QUESTIONS.filter(
    (q) => !q.industries || q.industries.includes(industry),
  );

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Custom Instructions
          </h3>
          <p className="text-sm text-zinc-500">
            Configure how your AI agent behaves and what it knows
          </p>
        </div>

        {/* Save Status */}
        <div className="flex items-center gap-2">
          {error && (
            <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              <span>Failed to save</span>
            </div>
          )}
          {!error && saveStatus === "saving" && (
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          {!error && saveStatus === "saved" && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
              <Check className="h-3 w-3" />
              <span>Saved</span>
            </div>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection("questionnaire")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeSection === "questionnaire"
              ? "bg-indigo-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white",
          )}
        >
          <Sparkles className="h-4 w-4" />
          Guided Setup
        </button>
        <button
          onClick={() => setActiveSection("manual")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeSection === "manual"
              ? "bg-indigo-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white",
          )}
        >
          <FileText className="h-4 w-4" />
          Manual Edit
        </button>
      </div>

      {/* Questionnaire Section */}
      {activeSection === "questionnaire" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="text-sm text-indigo-300">
              Answer these questions to automatically generate custom
              instructions for your AI agent. You can fine-tune the result in
              Manual Edit mode.
            </p>
          </div>

          {filteredQuestions.map((q, index) => (
            <section key={q.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-400">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <Label className="text-white">{q.question}</Label>
                  {q.description && (
                    <p className="text-xs text-zinc-600">{q.description}</p>
                  )}
                </div>
              </div>

              <div className="ml-9">
                {q.type === "select" && q.options && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateAnswer(q.id, opt.value)}
                        className={cn(
                          "rounded-lg border p-3 text-left text-sm transition-all",
                          answers[q.id] === opt.value
                            ? "border-indigo-500 bg-indigo-500/10 text-white"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === "multiselect" && q.options && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => {
                      const selected = (
                        (answers[q.id] as string[]) || []
                      ).includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleMultiselect(q.id, opt.value)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm transition-all",
                            selected
                              ? "border-indigo-500 bg-indigo-500/10 text-white"
                              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white",
                          )}
                        >
                          {selected && (
                            <Check className="mr-1 inline h-3 w-3" />
                          )}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.type === "text" && (
                  <input
                    type="text"
                    value={(answers[q.id] as string) || ""}
                    onChange={(e) => updateAnswer(q.id, e.target.value)}
                    placeholder={q.placeholder}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                )}

                {q.type === "textarea" && (
                  <textarea
                    value={(answers[q.id] as string) || ""}
                    onChange={(e) => updateAnswer(q.id, e.target.value)}
                    placeholder={q.placeholder}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                )}
              </div>
            </section>
          ))}

          {/* Generate Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Generate Instructions
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Manual Edit Section */}
      {activeSection === "manual" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-sm text-zinc-400">
              These instructions are added to the AI agent&apos;s system prompt.
              Use markdown formatting for better organization.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-400">Custom Instructions</Label>
              {Object.keys(answers).length > 0 && (
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate from questionnaire
                </button>
              )}
            </div>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              onBlur={handleSaveInstructions}
              placeholder="Enter custom instructions for your AI agent...

Example:
## Services
- Standard Room: $99/night
- Deluxe Suite: $199/night

## Rules
- Always mention free parking
- Offer early check-in when available

## FAQ
Q: Do you allow pets?
A: Yes, we are pet-friendly with a $25/night fee."
              rows={16}
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span>{customInstructions.length} characters</span>
              <span>Changes save automatically</span>
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="text-sm font-medium text-amber-400">
              Tips for better instructions
            </div>
            <ul className="mt-2 space-y-1 text-xs text-zinc-400">
              <li>Use ## headers to organize sections</li>
              <li>Be specific about prices, hours, and policies</li>
              <li>Include common Q&A pairs for better responses</li>
              <li>List things the agent should always or never do</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
