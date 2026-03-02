"use client";

import { motion } from "framer-motion";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "How does Soniq handle complex conversations?",
    answer:
      "Soniq uses advanced large language models fine-tuned for business conversations. It can handle multi-turn dialogues, understand context, and gracefully escalate to humans when needed. Our AI is trained on millions of real business calls.",
  },
  {
    question: "Can I customize the AI responses for my business?",
    answer:
      "Absolutely! You can customize greetings, responses, business hours, booking rules, and more. We also offer 27 industry-specific presets that you can further customize to match your brand voice.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Most businesses are up and running in under 15 minutes. Simply select your industry, configure your hours and services, and connect your phone number. Our setup wizard guides you through every step.",
  },
  {
    question: "What happens if the AI cant answer a question?",
    answer:
      "Soniq intelligently detects when a human is needed and can either take a message, schedule a callback, or live transfer to your team. You have full control over escalation rules.",
  },
  {
    question: "Is my data secure and private?",
    answer:
      "Yes. We are SOC 2 Type II certified, HIPAA compliant, and GDPR ready. All calls are encrypted end-to-end, and we never share your data. You retain full ownership of all your customer data.",
  },
  {
    question: "Can I try before I buy?",
    answer:
      "Yes! We offer a 14-day free trial with full access to all features. No credit card required. You can test with real calls and see the value before committing.",
  },
  {
    question: "How does billing work?",
    answer:
      "We offer monthly or annual billing. Annual plans come with a 20% discount. You can upgrade, downgrade, or cancel at any time. Unused calls dont roll over, but you can purchase additional call packs if needed.",
  },
  {
    question: "Do you integrate with my existing tools?",
    answer:
      "We integrate with popular CRMs, calendars, and practice management systems including Salesforce, HubSpot, Google Calendar, Calendly, and many healthcare-specific platforms. Custom integrations are available on Enterprise plans.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-24 relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30 pointer-events-none" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 mb-4 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20"
          >
            <HelpCircle className="h-4 w-4" />
            Got questions?
          </motion.div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know about Soniq.
          </p>
        </motion.div>

        <Accordion.Root type="single" collapsible className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Accordion.Item
                value={`item-${i}`}
                className="rounded-lg border border-border bg-card overflow-hidden group hover:border-primary/30 transition-colors duration-200"
              >
                <Accordion.Header>
                  <Accordion.Trigger
                    className={cn(
                      "flex w-full items-center justify-between px-6 py-4 text-left font-medium transition-all",
                      "hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180",
                    )}
                  >
                    {faq.question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="px-6 pb-4 text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            </motion.div>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
