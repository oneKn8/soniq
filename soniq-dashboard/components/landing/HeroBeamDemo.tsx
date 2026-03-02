"use client";

import { forwardRef, useRef } from "react";
import { motion } from "framer-motion";
import { Phone, Calendar, BarChart3, MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/magicui/animated-beam";

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white/10 backdrop-blur-sm border-white/20 p-3 shadow-[0_0_20px_-12px_rgba(99,102,241,0.8)]",
        className,
      )}
    >
      {children}
    </div>
  );
});

Circle.displayName = "Circle";

export function HeroBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      className="relative flex h-[280px] w-full max-w-xl mx-auto items-center justify-center mt-8"
      ref={containerRef}
    >
      <div className="flex h-full w-full flex-row items-center justify-between gap-4 px-4">
        {/* Left side - incoming call */}
        <div className="flex flex-col items-center gap-2">
          <Circle
            ref={phoneRef}
            className="h-14 w-14 border-green-500/50 shadow-[0_0_20px_-12px_rgba(34,197,94,0.8)]"
          >
            <Phone className="h-6 w-6 text-green-400" />
          </Circle>
          <span className="text-xs text-gray-400">Incoming</span>
        </div>

        {/* Center - Soniq AI */}
        <div className="flex flex-col items-center gap-2">
          <Circle
            ref={centerRef}
            className="h-20 w-20 border-indigo-500/50 shadow-[0_0_30px_-8px_rgba(99,102,241,0.8)]"
          >
            <Zap className="h-8 w-8 text-indigo-400" />
          </Circle>
          <span className="text-xs text-gray-400">AI Agent</span>
        </div>

        {/* Right side - outputs */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <Circle ref={calendarRef} className="h-12 w-12 border-blue-500/50">
              <Calendar className="h-5 w-5 text-blue-400" />
            </Circle>
            <span className="text-[10px] text-gray-500">Book</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Circle
              ref={analyticsRef}
              className="h-12 w-12 border-purple-500/50"
            >
              <BarChart3 className="h-5 w-5 text-purple-400" />
            </Circle>
            <span className="text-[10px] text-gray-500">Track</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Circle ref={messageRef} className="h-12 w-12 border-pink-500/50">
              <MessageSquare className="h-5 w-5 text-pink-400" />
            </Circle>
            <span className="text-[10px] text-gray-500">Notify</span>
          </div>
        </div>
      </div>

      {/* Animated beams */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={phoneRef}
        toRef={centerRef}
        curvature={0}
        pathColor="rgba(34, 197, 94, 0.2)"
        gradientStartColor="#22c55e"
        gradientStopColor="#6366f1"
        pathWidth={2}
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={centerRef}
        toRef={calendarRef}
        curvature={-30}
        pathColor="rgba(99, 102, 241, 0.2)"
        gradientStartColor="#6366f1"
        gradientStopColor="#3b82f6"
        pathWidth={2}
        duration={3}
        delay={0.5}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={centerRef}
        toRef={analyticsRef}
        curvature={0}
        pathColor="rgba(99, 102, 241, 0.2)"
        gradientStartColor="#6366f1"
        gradientStopColor="#8b5cf6"
        pathWidth={2}
        duration={3}
        delay={1}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={centerRef}
        toRef={messageRef}
        curvature={30}
        pathColor="rgba(99, 102, 241, 0.2)"
        gradientStartColor="#6366f1"
        gradientStopColor="#ec4899"
        pathWidth={2}
        duration={3}
        delay={1.5}
      />
    </motion.div>
  );
}
