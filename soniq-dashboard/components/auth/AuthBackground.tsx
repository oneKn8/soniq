"use client";

import { MeshGradientBg } from "@/components/effects/MeshGradientBg";
import { Particles } from "@/components/magicui/particles";
import { useTheme } from "@/context/ThemeContext";

interface AuthBackgroundProps {
  className?: string;
}

export function AuthBackground({ className }: AuthBackgroundProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Deep, subtle colors for background gradient
  const gradientColors = isDark
    ? ["#09090b", "#18181b", "#1e1b4b", "#18181b", "#09090b"]
    : ["#fafafa", "#f4f4f5", "#e0e7ff", "#f4f4f5", "#fafafa"];

  const particleColor = isDark ? "#6366f1" : "#6366f1";

  return (
    <div className={className}>
      {/* Animated mesh gradient base layer */}
      <MeshGradientBg
        colors={gradientColors}
        speed={0.003}
        className="opacity-80"
      />

      {/* Subtle floating particles overlay */}
      <Particles
        className="absolute inset-0"
        quantity={30}
        color={particleColor}
        size={0.4}
        staticity={70}
        ease={80}
      />

      {/* Soft radial gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at center, transparent 0%, rgba(9, 9, 11, 0.6) 70%)"
            : "radial-gradient(ellipse at center, transparent 0%, rgba(250, 250, 250, 0.8) 70%)",
        }}
      />
    </div>
  );
}
