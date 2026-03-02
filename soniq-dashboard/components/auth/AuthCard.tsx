"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface AuthCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
}

export function AuthCard({ children, className, ...props }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "relative w-full max-w-md",
        "rounded-2xl border border-border bg-card/95 backdrop-blur-sm",
        "p-8 shadow-elevated",
        className,
      )}
      {...props}
    >
      {/* Subtle glow effect behind card */}
      <div
        className="absolute -inset-px rounded-2xl opacity-50 -z-10 blur-xl"
        style={{
          background:
            "linear-gradient(135deg, var(--primary) 0%, transparent 50%, var(--primary) 100%)",
          opacity: 0.1,
        }}
      />
      {children}
    </motion.div>
  );
}
