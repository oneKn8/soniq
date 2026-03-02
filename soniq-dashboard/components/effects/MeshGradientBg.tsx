"use client";

import { cn } from "@/lib/utils";

interface MeshGradientBgProps {
  className?: string;
  colors?: string[];
  speed?: number;
}

export function MeshGradientBg({
  className,
  colors = ["#0f172a", "#1e3a5f", "#312e81", "#1e1b4b", "#0c0a1d"],
  speed = 0.01,
}: MeshGradientBgProps) {
  // Convert speed to animation duration (slower speed = longer duration)
  const duration = Math.max(10, Math.round(1 / speed));

  return (
    <div className={cn("absolute inset-0 z-0 overflow-hidden", className)}>
      <div
        className="absolute inset-0 animate-mesh-gradient"
        style={
          {
            "--color-1": colors[0] || "#0f172a",
            "--color-2": colors[1] || "#1e3a5f",
            "--color-3": colors[2] || "#312e81",
            "--color-4": colors[3] || "#1e1b4b",
            "--color-5": colors[4] || "#0c0a1d",
            "--duration": `${duration}s`,
            background: `
              radial-gradient(at 40% 20%, var(--color-1) 0px, transparent 50%),
              radial-gradient(at 80% 0%, var(--color-2) 0px, transparent 50%),
              radial-gradient(at 0% 50%, var(--color-3) 0px, transparent 50%),
              radial-gradient(at 80% 50%, var(--color-4) 0px, transparent 50%),
              radial-gradient(at 0% 100%, var(--color-5) 0px, transparent 50%),
              radial-gradient(at 80% 100%, var(--color-1) 0px, transparent 50%),
              radial-gradient(at 0% 0%, var(--color-2) 0px, transparent 50%)
            `,
            backgroundSize: "200% 200%",
            animation: `meshGradient var(--duration) ease infinite`,
          } as React.CSSProperties
        }
      />
      <style jsx>{`
        @keyframes meshGradient {
          0%,
          100% {
            background-position: 0% 0%;
          }
          25% {
            background-position: 100% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
          75% {
            background-position: 0% 100%;
          }
        }
      `}</style>
    </div>
  );
}
