"use client";

import { useEffect, useMemo } from "react";
import { motion, useAnimation, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceWaveformProps {
  isActive?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number; // 0-1 normalized audio level
  barCount?: number;
  className?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CONFIG = {
  sm: { height: 24, barWidth: 2, gap: 2 },
  md: { height: 40, barWidth: 3, gap: 3 },
  lg: { height: 56, barWidth: 4, gap: 4 },
};

export function VoiceWaveform({
  isActive = false,
  isSpeaking = false,
  barCount = 12,
  className,
  color,
  size = "md",
}: VoiceWaveformProps) {
  const config = SIZE_CONFIG[size];
  const controls = useAnimation();

  // Generate deterministic delays for each bar to create organic movement
  // Using golden ratio for visually pleasing distribution
  const barDelays = useMemo(
    () => Array.from({ length: barCount }, (_, i) => ((i * 0.618) % 1) * 0.3),
    [barCount],
  );

  // Generate base heights for visual pattern (center bars taller)
  const baseHeights = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      const center = (barCount - 1) / 2;
      const distance = Math.abs(i - center) / center;
      return 0.3 + (1 - distance) * 0.7; // Range from 0.3 to 1.0
    });
  }, [barCount]);

  // Animate bars when speaking
  useEffect(() => {
    if (isSpeaking) {
      controls.start("speaking");
    } else if (isActive) {
      controls.start("idle");
    } else {
      controls.start("inactive");
    }
  }, [isSpeaking, isActive, controls]);

  const barVariants: Variants = {
    inactive: (i: number) => ({
      scaleY: 0.1,
      opacity: 0.3,
      transition: {
        duration: 0.3,
        delay: barDelays[i],
      },
    }),
    idle: (i: number) => ({
      scaleY: [0.2, baseHeights[i] * 0.4, 0.2],
      opacity: 0.6,
      transition: {
        duration: 1.5 + Math.random() * 0.5,
        repeat: Infinity,
        repeatType: "mirror" as const,
        delay: barDelays[i],
        ease: "easeInOut",
      },
    }),
    speaking: (i: number) => ({
      scaleY: [0.2, baseHeights[i], 0.3, baseHeights[i] * 0.8, 0.2],
      opacity: 1,
      transition: {
        duration: 0.4 + Math.random() * 0.2,
        repeat: Infinity,
        repeatType: "mirror" as const,
        delay: barDelays[i] * 0.5,
        ease: "easeOut",
      },
    }),
  };

  const totalWidth = barCount * config.barWidth + (barCount - 1) * config.gap;

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      style={{
        width: totalWidth,
        height: config.height,
      }}
    >
      <div
        className="flex items-center justify-center gap-px"
        style={{ gap: config.gap }}
      >
        {Array.from({ length: barCount }).map((_, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={barVariants}
            animate={controls}
            initial="inactive"
            className="rounded-full"
            style={{
              width: config.barWidth,
              height: config.height,
              backgroundColor: color || "currentColor",
              originY: 0.5,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Circular waveform variant for avatar-style display
interface CircularWaveformProps {
  isActive?: boolean;
  isSpeaking?: boolean;
  size?: number;
  className?: string;
}

export function CircularWaveform({
  isActive = false,
  isSpeaking = false,
  size = 80,
  className,
}: CircularWaveformProps) {
  const ringCount = 3;
  const controls = useAnimation();

  useEffect(() => {
    if (isSpeaking) {
      controls.start("speaking");
    } else if (isActive) {
      controls.start("idle");
    } else {
      controls.start("inactive");
    }
  }, [isSpeaking, isActive, controls]);

  const ringVariants: Variants = {
    inactive: {
      scale: 1,
      opacity: 0,
      transition: { duration: 0.3 },
    },
    idle: (i: number) => ({
      scale: [1, 1.1, 1],
      opacity: [0.1, 0.2, 0.1],
      transition: {
        duration: 2,
        repeat: Infinity,
        delay: i * 0.3,
        ease: "easeInOut",
      },
    }),
    speaking: (i: number) => ({
      scale: [1, 1.3 + i * 0.1, 1],
      opacity: [0.3, 0.5 - i * 0.1, 0.3],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        delay: i * 0.1,
        ease: "easeOut",
      },
    }),
  };

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Animated rings */}
      {Array.from({ length: ringCount }).map((_, i) => (
        <motion.div
          key={i}
          custom={i}
          variants={ringVariants}
          animate={controls}
          initial="inactive"
          className="absolute inset-0 rounded-full border-2 border-current"
          style={{
            borderColor: "var(--industry-accent, currentColor)",
          }}
        />
      ))}

      {/* Center dot */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.1, 1] : 1,
          opacity: isActive ? 1 : 0.5,
        }}
        transition={{
          duration: 0.3,
          repeat: isSpeaking ? Infinity : 0,
          repeatType: "mirror",
        }}
        className="relative z-10 rounded-full bg-current"
        style={{
          width: size * 0.3,
          height: size * 0.3,
          backgroundColor: "var(--industry-accent, currentColor)",
        }}
      />
    </div>
  );
}
