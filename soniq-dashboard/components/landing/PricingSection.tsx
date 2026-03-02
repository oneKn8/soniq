"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShineBorder } from "@/components/magicui/shine-border";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    description: "Perfect for small businesses getting started with AI voice.",
    features: [
      "300 calls/month included",
      "Pay-as-you-go after limit",
      "Basic AI responses",
      "Email support",
      "Standard voices",
      "Basic analytics",
      "1 phone number",
    ],
    badge: "$0.08/min after limit",
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$199",
    period: "/month",
    description: "For growing businesses that need more power and features.",
    features: [
      "1,000 calls/month included",
      "Pay-as-you-go after limit",
      "Advanced AI + sentiment",
      "Priority support",
      "Premium voices",
      "Custom greetings",
      "SMS confirmations",
      "Live call takeover",
      "3 phone numbers",
    ],
    badge: "$0.08/min after limit",
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with custom requirements.",
    features: [
      "Unlimited calls",
      "Full AI capabilities",
      "Dedicated support",
      "Custom integrations",
      "Multi-location",
      "SLA guarantee",
      "White-label option",
      "Unlimited numbers",
    ],
    badge: null,
    cta: "Contact Sales",
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none opacity-30" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
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
            className="inline-flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400 mb-4 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20"
          >
            <Zap className="h-4 w-4" />
            Pay only for what you use
          </motion.div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Start with a 14-day free trial. No credit card required.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {plan.highlighted ? (
                <ShineBorder
                  borderRadius={16}
                  borderWidth={2}
                  color={["#6366f1", "#8b5cf6", "#6366f1"]}
                  className="w-full p-0 min-w-0"
                >
                  <PricingCard plan={plan} highlighted />
                </ShineBorder>
              ) : (
                <PricingCard plan={plan} />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  plan,
  highlighted = false,
}: {
  plan: (typeof plans)[0];
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col h-full rounded-2xl border p-6",
        highlighted ? "border-primary/50 bg-card" : "border-border bg-card",
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold">{plan.name}</h3>
        <div className="mt-2 flex items-baseline">
          <span className="text-4xl font-bold">{plan.price}</span>
          <span className="ml-1 text-muted-foreground">{plan.period}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
        {plan.badge && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {plan.badge}
          </div>
        )}
      </div>

      <ul className="mb-8 space-y-3 flex-grow">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={
          plan.name === "Enterprise"
            ? "/contact"
            : "/signup?plan=" + plan.name.toLowerCase()
        }
      >
        <Button
          className={cn(
            "w-full",
            highlighted && "bg-primary hover:bg-primary/90",
          )}
          variant={highlighted ? "default" : "outline"}
        >
          {plan.cta}
        </Button>
      </Link>
    </div>
  );
}
