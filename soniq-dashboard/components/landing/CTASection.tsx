"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { ShimmerButton } from "@/components/magicui/shimmer-button";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5" />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/20 rounded-full blur-3xl"
        />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20"
          >
            <Sparkles className="h-4 w-4" />
            Limited Time: 20% off annual plans
          </motion.div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Ready to transform your
            <br />
            <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
              customer experience?
            </span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of businesses using Soniq to capture every
            opportunity. Start your free trial today.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <ShimmerButton
                className="h-14 px-10 text-lg font-semibold"
                background="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </ShimmerButton>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. 14-day free trial.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
