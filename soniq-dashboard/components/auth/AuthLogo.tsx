"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { SoniqMark } from "@/components/brand/SoniqMark";
import { SoniqWordmark } from "@/components/brand/SoniqWordmark";
import { cn } from "@/lib/utils";

interface AuthLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const SIZE_MAP = {
  sm: { container: "h-8 w-8", wordmark: "h-4", gap: "gap-2" },
  md: { container: "h-10 w-10", wordmark: "h-5", gap: "gap-2.5" },
  lg: { container: "h-12 w-12", wordmark: "h-6", gap: "gap-3" },
};

export function AuthLogo({
  className,
  size = "md",
  showText = true,
}: AuthLogoProps) {
  const sizes = SIZE_MAP[size];

  return (
    <Link
      href="/"
      aria-label="Soniq home"
      className={cn("inline-flex items-center", sizes.gap, className)}
    >
      <motion.div
        className={cn("relative", sizes.container)}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <motion.div
          className="absolute inset-1 rounded-[16px] bg-cyan-400/20 blur-md"
          animate={{
            opacity: [0.35, 0.7, 0.35],
            scale: [0.94, 1.02, 0.94],
            boxShadow: [
              "0 0 18px rgba(34, 211, 238, 0.18)",
              "0 0 26px rgba(99, 102, 241, 0.28)",
              "0 0 18px rgba(34, 211, 238, 0.18)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <SoniqMark
          className="relative z-10 h-full w-full"
          animated
          decorative
        />
      </motion.div>
      {showText ? (
        <SoniqWordmark
          className={cn(sizes.wordmark, "w-auto text-foreground")}
          decorative
        />
      ) : null}
    </Link>
  );
}
