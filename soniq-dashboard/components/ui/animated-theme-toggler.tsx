"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

interface AnimatedThemeTogglerProps {
  className?: string;
  size?: number;
}

export function AnimatedThemeToggler({
  className,
  size = 24,
}: AnimatedThemeTogglerProps) {
  const { toggleTheme, isDark } = useTheme();

  const center = size / 2;
  const sunRadius = size * 0.25;
  const rayOffset = size * 0.38;
  const rayLength = size * 0.12;

  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 * Math.PI) / 180;
    return {
      x1: center + Math.cos(angle) * (rayOffset - rayLength),
      y1: center + Math.sin(angle) * (rayOffset - rayLength),
      x2: center + Math.cos(angle) * rayOffset,
      y2: center + Math.sin(angle) * rayOffset,
      index: i,
    };
  });

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "relative inline-flex items-center justify-center rounded-md p-2 transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        className="overflow-visible"
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isDark ? (
            <motion.g
              key="sun"
              initial={{ scale: 0.6, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.6, rotate: 90, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {rays.map((ray) => (
                <motion.line
                  key={ray.index}
                  x1={ray.x1}
                  y1={ray.y1}
                  x2={ray.x2}
                  y2={ray.y2}
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    transition: { delay: ray.index * 0.05 },
                  }}
                  className="text-amber-500"
                />
              ))}
              <motion.circle
                cx={center}
                cy={center}
                r={sunRadius}
                fill="currentColor"
                className="text-amber-500"
              />
            </motion.g>
          ) : (
            <motion.g
              key="moon"
              initial={{ scale: 0.6, rotate: 90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.6, rotate: -90, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <motion.path
                d={`M ${center - sunRadius * 0.8} ${center - sunRadius} A ${sunRadius} ${sunRadius} 0 1 0 ${center - sunRadius * 0.8} ${center + sunRadius} A ${sunRadius * 0.75} ${sunRadius * 0.75} 0 1 1 ${center - sunRadius * 0.8} ${center - sunRadius} Z`}
                fill="currentColor"
                className="text-indigo-400"
              />
              <motion.circle
                cx={center + sunRadius * 0.8}
                cy={center - sunRadius * 0.6}
                r={1.5}
                fill="currentColor"
                initial={{ scale: 0 }}
                animate={{ scale: 1, transition: { delay: 0.15 } }}
                className="text-indigo-300"
              />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </button>
  );
}
