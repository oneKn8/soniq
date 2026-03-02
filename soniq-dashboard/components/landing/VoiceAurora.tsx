"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface VoiceAuroraProps {
  className?: string;
}

export function VoiceAurora({ className }: VoiceAuroraProps) {
  return (
    <div
      className={cn("absolute inset-0 overflow-hidden bg-slate-950", className)}
    >
      {/* Deep base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />

      {/* Layer 1: Bottom aurora wave - Indigo */}
      <motion.div
        className="absolute -bottom-[20%] left-0 right-0 h-[60vh] opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 100%, 
              rgba(99, 102, 241, 0.4) 0%, 
              rgba(99, 102, 241, 0.2) 30%, 
              rgba(99, 102, 241, 0.05) 60%, 
              transparent 100%
            )
          `,
          filter: "blur(60px)",
        }}
        animate={{
          scaleX: [1, 1.1, 0.95, 1.05, 1],
          x: ["0%", "-2%", "1%", "-1%", "0%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Layer 2: Middle aurora wave - Cyan/Purple mix */}
      <motion.div
        className="absolute -bottom-[10%] left-0 right-0 h-[50vh] opacity-50"
        style={{
          background: `
            radial-gradient(ellipse 70% 40% at 30% 100%, 
              rgba(6, 182, 212, 0.35) 0%, 
              rgba(6, 182, 212, 0.15) 40%, 
              transparent 80%
            ),
            radial-gradient(ellipse 60% 35% at 70% 100%, 
              rgba(139, 92, 246, 0.3) 0%, 
              rgba(139, 92, 246, 0.1) 50%, 
              transparent 100%
            )
          `,
          filter: "blur(50px)",
        }}
        animate={{
          scaleX: [1, 0.95, 1.08, 0.98, 1],
          x: ["0%", "3%", "-2%", "1%", "0%"],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Layer 3: Wave-like flowing ribbons */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full h-[40vh] opacity-30"
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0)" />
            <stop offset="30%" stopColor="rgba(99, 102, 241, 0.6)" />
            <stop offset="50%" stopColor="rgba(139, 92, 246, 0.4)" />
            <stop offset="70%" stopColor="rgba(99, 102, 241, 0.6)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(6, 182, 212, 0)" />
            <stop offset="40%" stopColor="rgba(6, 182, 212, 0.5)" />
            <stop offset="60%" stopColor="rgba(6, 182, 212, 0.3)" />
            <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
          </linearGradient>
        </defs>

        {/* Wave 1 */}
        <motion.path
          d="M0,300 Q360,200 720,300 T1440,300 L1440,400 L0,400 Z"
          fill="url(#waveGrad1)"
          animate={{
            d: [
              "M0,300 Q360,200 720,300 T1440,300 L1440,400 L0,400 Z",
              "M0,280 Q360,320 720,250 T1440,280 L1440,400 L0,400 Z",
              "M0,320 Q360,180 720,320 T1440,320 L1440,400 L0,400 Z",
              "M0,300 Q360,200 720,300 T1440,300 L1440,400 L0,400 Z",
            ],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Wave 2 - offset */}
        <motion.path
          d="M0,350 Q480,280 960,350 T1440,350 L1440,400 L0,400 Z"
          fill="url(#waveGrad2)"
          animate={{
            d: [
              "M0,350 Q480,280 960,350 T1440,350 L1440,400 L0,400 Z",
              "M0,330 Q480,380 960,300 T1440,330 L1440,400 L0,400 Z",
              "M0,360 Q480,260 960,380 T1440,360 L1440,400 L0,400 Z",
              "M0,350 Q480,280 960,350 T1440,350 L1440,400 L0,400 Z",
            ],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        />
      </svg>

      {/* Layer 4: Subtle floating orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)",
          filter: "blur(80px)",
          left: "10%",
          top: "30%",
        }}
        animate={{
          x: [0, 50, 30, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)",
          filter: "blur(60px)",
          right: "15%",
          top: "40%",
        }}
        animate={{
          x: [0, -40, 20, 0],
          y: [0, 40, -20, 0],
          scale: [1, 0.9, 1.05, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
      />

      {/* Layer 5: Very subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Layer 6: Top gradient for navbar readability */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950/80 to-transparent z-10" />

      {/* Layer 7: Bottom gradient for content transition */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent z-10" />

      {/* Layer 8: Center vignette for content focus */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(2, 6, 23, 0.4) 100%)",
        }}
      />
    </div>
  );
}
