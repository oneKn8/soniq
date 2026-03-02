"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const SIZE_MAP = {
  sm: { container: "h-8 w-8", icon: "h-4 w-4", text: "text-lg" },
  md: { container: "h-10 w-10", icon: "h-5 w-5", text: "text-xl" },
  lg: { container: "h-12 w-12", icon: "h-6 w-6", text: "text-2xl" },
};

export function AuthLogo({
  className,
  size = "md",
  showText = true,
}: AuthLogoProps) {
  const sizes = SIZE_MAP[size];

  return (
    <Link href="/" className={cn("inline-flex items-center gap-2", className)}>
      <motion.div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-primary",
          sizes.container,
        )}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-xl bg-primary"
          animate={{
            boxShadow: [
              "0 0 20px rgba(99, 102, 241, 0.3)",
              "0 0 30px rgba(99, 102, 241, 0.5)",
              "0 0 20px rgba(99, 102, 241, 0.3)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <Zap
          className={cn("relative z-10 text-primary-foreground", sizes.icon)}
        />
      </motion.div>
      {showText && (
        <span className={cn("font-bold", sizes.text)}>Soniq</span>
      )}
    </Link>
  );
}
