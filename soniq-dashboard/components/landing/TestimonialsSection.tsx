"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { InfiniteMovingCards } from "@/components/aceternity/infinite-moving-cards";

const testimonials = [
  {
    quote:
      "Soniq transformed our dental practice. We went from missing 40% of calls to capturing every single one. Our bookings increased by 60% in the first month.",
    name: "Dr. Sarah Chen",
    title: "Owner, Smile Dental Clinic",
  },
  {
    quote:
      "As a solo attorney, I was losing clients to missed calls. Now my AI assistant handles intake 24/7 and I wake up to qualified leads every morning.",
    name: "Michael Rodriguez",
    title: "Principal, Rodriguez Law",
  },
  {
    quote:
      "The ROI is incredible. We calculated that Soniq saves us the equivalent of 2 full-time receptionists while providing better service.",
    name: "Jennifer Park",
    title: "COO, AutoMax Dealership",
  },
  {
    quote:
      "Our patients love the natural conversation. Many dont even realize theyre talking to AI until we tell them. Its that good.",
    name: "Dr. James Wilson",
    title: "Director, City Medical Center",
  },
  {
    quote:
      "Setup took 15 minutes and it just works. The industry presets meant zero configuration for our restaurant booking flow.",
    name: "Maria Santos",
    title: "Owner, Bella Italia Restaurant",
  },
  {
    quote:
      "The analytics dashboard alone is worth the price. We finally understand our call patterns and can staff accordingly.",
    name: "David Thompson",
    title: "Operations Manager, TechServ Inc",
  },
];

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="py-24 bg-muted/30 overflow-hidden relative"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />

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
            className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 mb-4 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20"
          >
            <Star className="h-4 w-4 fill-current" />
            <Star className="h-4 w-4 fill-current" />
            <Star className="h-4 w-4 fill-current" />
            <Star className="h-4 w-4 fill-current" />
            <Star className="h-4 w-4 fill-current" />
            <span className="ml-1">4.9/5 rating</span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Loved by businesses everywhere
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of businesses that trust Soniq to handle their
            customer calls.
          </p>
        </motion.div>

        <InfiniteMovingCards
          items={testimonials}
          direction="left"
          speed="slow"
        />
      </div>
    </section>
  );
}
