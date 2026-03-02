"use client";

import { motion } from "framer-motion";
import {
  Phone,
  Calendar,
  BarChart3,
  MessageSquare,
  Globe,
  Shield,
  Zap,
  Users,
} from "lucide-react";
import { BentoGrid, BentoGridItem } from "@/components/aceternity/bento-grid";
import { SpotlightNew } from "@/components/aceternity/spotlight";

const features = [
  {
    title: "24/7 AI Voice Agent",
    description:
      "Human-like AI handles calls around the clock. Never miss a lead or customer inquiry again.",
    icon: Phone,
    className: "md:col-span-2",
    gradient: "from-green-500/20 via-emerald-500/10 to-teal-500/20",
    iconColor: "text-green-500",
    glowColor: "rgba(34, 197, 94, 0.3)",
  },
  {
    title: "Smart Scheduling",
    description:
      "Automatically book appointments directly into your calendar with intelligent slot management.",
    icon: Calendar,
    className: "md:col-span-1",
    gradient: "from-blue-500/20 via-cyan-500/10 to-sky-500/20",
    iconColor: "text-blue-500",
    glowColor: "rgba(59, 130, 246, 0.3)",
  },
  {
    title: "Real-time Analytics",
    description:
      "Track call metrics, sentiment analysis, and conversion rates in a beautiful dashboard.",
    icon: BarChart3,
    className: "md:col-span-1",
    gradient: "from-purple-500/20 via-violet-500/10 to-fuchsia-500/20",
    iconColor: "text-purple-500",
    glowColor: "rgba(168, 85, 247, 0.3)",
  },
  {
    title: "Multi-channel Support",
    description:
      "SMS confirmations, email notifications, and voice calls all in one platform.",
    icon: MessageSquare,
    className: "md:col-span-2",
    gradient: "from-pink-500/20 via-rose-500/10 to-red-500/20",
    iconColor: "text-pink-500",
    glowColor: "rgba(236, 72, 153, 0.3)",
  },
  {
    title: "27 Industry Presets",
    description:
      "Pre-configured for dental, medical, legal, automotive, restaurant, and more.",
    icon: Globe,
    className: "md:col-span-1",
    gradient: "from-amber-500/20 via-orange-500/10 to-yellow-500/20",
    iconColor: "text-amber-500",
    glowColor: "rgba(245, 158, 11, 0.3)",
  },
  {
    title: "Enterprise Security",
    description:
      "HIPAA-compliant, SOC 2 certified, with end-to-end encryption.",
    icon: Shield,
    className: "md:col-span-1",
    gradient: "from-indigo-500/20 via-blue-500/10 to-violet-500/20",
    iconColor: "text-indigo-500",
    glowColor: "rgba(99, 102, 241, 0.3)",
  },
  {
    title: "Lightning Fast",
    description: "Sub-300ms response times for natural, fluid conversations.",
    icon: Zap,
    className: "md:col-span-1",
    gradient: "from-yellow-500/20 via-amber-500/10 to-orange-500/20",
    iconColor: "text-yellow-500",
    glowColor: "rgba(234, 179, 8, 0.3)",
  },
  {
    title: "Live Takeover",
    description:
      "Seamlessly transfer to a human agent when needed with full context.",
    icon: Users,
    className: "md:col-span-1",
    gradient: "from-teal-500/20 via-cyan-500/10 to-emerald-500/20",
    iconColor: "text-teal-500",
    glowColor: "rgba(20, 184, 166, 0.3)",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-24 bg-muted/30 relative overflow-hidden"
    >
      {/* Spotlight effect */}
      <SpotlightNew
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(250, 100%, 85%, .08) 0, hsla(250, 100%, 55%, .02) 50%, hsla(250, 100%, 45%, 0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(250, 100%, 85%, .06) 0, hsla(250, 100%, 55%, .02) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(250, 100%, 85%, .04) 0, hsla(250, 100%, 45%, .02) 80%, transparent 100%)"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-sm font-medium text-primary mb-4 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20"
          >
            Powerful Features
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Everything you need to scale
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to automate your customer communications
            and grow your business.
          </p>
        </motion.div>

        <BentoGrid className="max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <BentoGridItem
              key={feature.title}
              title={feature.title}
              description={feature.description}
              header={
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                  className={`flex items-center justify-center h-full min-h-[6rem] rounded-xl bg-gradient-to-br ${feature.gradient} relative group`}
                >
                  {/* Icon glow effect */}
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                    style={{
                      background: `radial-gradient(circle at center, ${feature.glowColor} 0%, transparent 70%)`,
                    }}
                  />
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <feature.icon
                      className={`h-10 w-10 ${feature.iconColor} relative z-10 drop-shadow-lg`}
                    />
                  </motion.div>
                </motion.div>
              }
              className={feature.className}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
